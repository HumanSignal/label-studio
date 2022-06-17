from datetime import datetime
from functools import reduce
import hashlib
import io
import json
import logging
import pathlib
import shutil

from django.core.files import File
from django.core.files import temp as tempfile
from django.db import transaction
from django.db.models import Prefetch
from django.db.models.query_utils import Q
from django.utils import dateformat, timezone
import django_rq
from label_studio_converter import Converter
from django.conf import settings

from core.redis import redis_connected
from core.utils.common import batch
from core.utils.io import (
    get_all_files_from_dir,
    get_temp_dir,
    read_bytes_stream,
    get_all_dirs_from_dir,
    SerializableGenerator,
)
from data_manager.models import View
from projects.models import Project
from tasks.models import Annotation, Task


ONLY = 'only'
EXCLUDE = 'exclude'


logger = logging.getLogger(__name__)


class ExportMixin:
    def has_permission(self, user):
        return self.project.has_permission(user)

    def get_default_title(self):
        return f"{self.project.title.replace(' ', '-')}-at-{dateformat.format(timezone.now(), 'Y-m-d-H-i')}"

    def _get_filtered_tasks(self, tasks, task_filter_options=None):
        """
        task_filter_options: None or Dict({
            view: optional int id or View
            skipped: optional None or str:("include|exclude")
            finished: optional None or str:("include|exclude")
            annotated: optional None or str:("include|exclude")
        })
        """
        if not isinstance(task_filter_options, dict):
            return tasks
        if 'view' in task_filter_options:
            try:
                value = int(task_filter_options['view'])
                prepare_params = View.objects.get(project=self.project, id=value).get_prepare_tasks_params(
                    add_selected_items=True
                )
                tab_tasks = Task.prepared.only_filtered(prepare_params=prepare_params).values_list('id', flat=True)
                tasks = tasks.filter(id__in=tab_tasks)
            except (ValueError, View.DoesNotExist) as exc:
                logger.warning(f'Incorrect view params {exc}')
        if 'skipped' in task_filter_options:
            value = task_filter_options['skipped']
            if value == ONLY:
                tasks = tasks.filter(annotations__was_cancelled=True)
            elif value == EXCLUDE:
                tasks = tasks.exclude(annotations__was_cancelled=True)
        if 'finished' in task_filter_options:
            value = task_filter_options['finished']
            if value == ONLY:
                tasks = tasks.filter(is_labled=True)
            elif value == EXCLUDE:
                tasks = tasks.exclude(is_labled=True)
        if 'annotated' in task_filter_options:
            value = task_filter_options['annotated']
            # if any annotation exists and is not cancelled
            if value == ONLY:
                tasks = tasks.filter(annotations__was_cancelled=False)
            elif value == EXCLUDE:
                tasks = tasks.exclude(annotations__was_cancelled=False)

        return tasks

    def _get_filtered_annotations_queryset(self, annotation_filter_options=None):
        """
        Filtering using disjunction of conditions

        annotation_filter_options: None or Dict({
            usual: optional None or bool:("true|false")
            ground_truth: optional None or bool:("true|false")
            skipped: optional None or bool:("true|false")
        })
        """
        queryset = Annotation.objects.all()
        if not isinstance(annotation_filter_options, dict):
            return queryset

        q_list = []
        if annotation_filter_options.get('usual'):
            q_list.append(Q(was_cancelled=False, ground_truth=False))
        if annotation_filter_options.get('ground_truth'):
            q_list.append(Q(ground_truth=True))
        if annotation_filter_options.get('skipped'):
            q_list.append(Q(was_cancelled=True))
        if not q_list:
            return queryset

        q = reduce(lambda x, y: x | y, q_list)
        return queryset.filter(q)

    def _get_export_serializer_option(self, serialization_options):
        options = {'expand': []}
        if isinstance(serialization_options, dict):
            if (
                'drafts' in serialization_options
                and isinstance(serialization_options['drafts'], dict)
                and not serialization_options['drafts'].get('only_id')
            ):
                options['expand'].append('drafts')
            if (
                'predictions' in serialization_options
                and isinstance(serialization_options['predictions'], dict)
                and not serialization_options['predictions'].get('only_id')
            ):
                options['expand'].append('predictions')
            if 'annotations__completed_by' in serialization_options and not serialization_options[
                'annotations__completed_by'
            ].get('only_id'):
                options['expand'].append('annotations.completed_by')
            options['context'] = {'interpolate_key_frames': settings.INTERPOLATE_KEY_FRAMES}
            if 'interpolate_key_frames' in serialization_options:
                options['context']['interpolate_key_frames'] = serialization_options['interpolate_key_frames']
        return options

    def get_task_queryset(self, ids, annotation_filter_options):
        annotations_qs = self._get_filtered_annotations_queryset(
            annotation_filter_options=annotation_filter_options
        )
        return Task.objects.filter(id__in=ids).prefetch_related(
            Prefetch(
                "annotations",
                queryset=annotations_qs,
            )
        ).select_related('project').prefetch_related(
                'predictions', 'drafts'
            )

    def get_export_data(self, task_filter_options=None, annotation_filter_options=None, serialization_options=None):
        """
        serialization_options: None or Dict({
            drafts: optional
                None
                    or
                Dict({
                    only_id: true/false
                })
            predictions: optional
                None
                    or
                Dict({
                    only_id: true/false
                })
            annotations__completed_by: optional
                None
                    or
                Dict({
                    only_id: true/false
                })
        })
        """
        from .serializers import ExportDataSerializer

        logger.debug('Run get_task_queryset')

        with transaction.atomic():
            # TODO: make counters from queryset
            # counters = Project.objects.with_counts().filter(id=self.project.id)[0].get_counters()
            self.counters = {'task_number': 0}
            result = []
            all_tasks = self.project.tasks
            logger.debug('Tasks filtration')
            task_ids = (
                self._get_filtered_tasks(all_tasks, task_filter_options=task_filter_options)
                .distinct()
                .values_list('id', flat=True)
            )
            base_export_serializer_option = self._get_export_serializer_option(serialization_options)
            i = 0
            BATCH_SIZE = 1000
            for ids in batch(task_ids, BATCH_SIZE):
                i += 1
                tasks = list(self.get_task_queryset(ids, annotation_filter_options))
                logger.debug(f'Batch: {i*BATCH_SIZE}')
                if isinstance(task_filter_options, dict) and task_filter_options.get('only_with_annotations'):
                    tasks = [task for task in tasks if task.annotations.exists()]

                serializer = ExportDataSerializer(tasks, many=True, **base_export_serializer_option)
                self.counters['task_number'] += len(tasks)
                for task in serializer.data:
                    yield task

    @staticmethod
    def eval_md5(file):
        md5_object = hashlib.md5()   # nosec
        block_size = 128 * md5_object.block_size
        chunk = file.read(block_size)
        while chunk:
            md5_object.update(chunk)
            chunk = file.read(block_size)
        md5 = md5_object.hexdigest()
        return md5

    def save_file(self, file, md5):
        now = datetime.now()
        file_name = f'project-{self.project.id}-at-{now.strftime("%Y-%m-%d-%H-%M")}-{md5[0:8]}.json'
        file_path = (
            f'{self.project.id}/{file_name}'
        )  # finally file will be in settings.DELAYED_EXPORT_DIR/self.project.id/file_name
        file_ = File(file, name=file_path)
        self.file.save(file_path, file_)
        self.md5 = md5
        self.save(update_fields=['file', 'md5', 'counters'])

    def export_to_file(self, task_filter_options=None, annotation_filter_options=None, serialization_options=None):
        logger.debug(
            f'Run export for {self.id} with params:\n'
            f'task_filter_options: {task_filter_options}\n'
            f'annotation_filter_options: {annotation_filter_options}\n'
            f'serialization_options: {serialization_options}\n'
        )
        try:
            iter_json = json.JSONEncoder(ensure_ascii=False).iterencode(
                SerializableGenerator(
                    self.get_export_data(
                        task_filter_options=task_filter_options,
                        annotation_filter_options=annotation_filter_options,
                        serialization_options=serialization_options,
                    )
                )
            )
            with tempfile.NamedTemporaryFile(suffix=".export.json", dir=settings.FILE_UPLOAD_TEMP_DIR) as file:
                for chunk in iter_json:
                    encoded_chunk = chunk.encode('utf-8')
                    file.write(encoded_chunk)
                file.seek(0)

                md5 = self.eval_md5(file)
                self.save_file(file, md5)

            self.status = self.Status.COMPLETED
            self.save(update_fields=['status'])

        except Exception as exc:
            self.status = self.Status.FAILED
            self.save(update_fields=['status'])
            logger.exception('Export was failed')
        finally:
            self.finished_at = datetime.now()
            self.save(update_fields=['finished_at'])

    def run_file_exporting(self, task_filter_options=None, annotation_filter_options=None, serialization_options=None):
        if self.status == self.Status.IN_PROGRESS:
            logger.warning('Try to export with in progress stage')
            return

        self.status = self.Status.IN_PROGRESS
        self.save(update_fields=['status'])

        if redis_connected():
            queue = django_rq.get_queue('default')
            job = queue.enqueue(
                export_background,
                self.id,
                task_filter_options,
                annotation_filter_options,
                serialization_options,
                on_failure=set_export_background_failure,
                job_timeout='3h',  # 3 hours
            )
        else:
            self.export_to_file(
                task_filter_options=task_filter_options,
                annotation_filter_options=annotation_filter_options,
                serialization_options=serialization_options,
            )

    def convert_file(self, to_format):
        with get_temp_dir() as tmp_dir:
            OUT = 'out'
            out_dir = pathlib.Path(tmp_dir) / OUT
            out_dir.mkdir(mode=0o700, parents=True, exist_ok=True)

            converter = Converter(
                config=self.project.get_parsed_config(),
                project_dir=None,
                upload_dir=out_dir,
                download_resources=False,
            )
            input_name = pathlib.Path(self.file.name).name
            input_file_path = pathlib.Path(tmp_dir) / input_name

            with open(input_file_path, 'wb') as file_:
                file_.write(self.file.open().read())

            converter.convert(input_file_path, out_dir, to_format, is_dir=False)

            files = get_all_files_from_dir(out_dir)
            dirs = get_all_dirs_from_dir(out_dir)

            if len(files) == 0 and len(dirs) == 0:
                return None
            elif len(files) == 1 and len(dirs) == 0:
                output_file = files[0]
                filename = pathlib.Path(input_name).stem + pathlib.Path(output_file).suffix
            else:
                shutil.make_archive(out_dir, 'zip', out_dir)
                output_file = pathlib.Path(tmp_dir) / (str(out_dir.stem) + '.zip')
                filename = pathlib.Path(input_name).stem + '.zip'

            out = read_bytes_stream(output_file)
            return File(
                out,
                name=filename,
            )


def export_background(
    export_id, task_filter_options, annotation_filter_options, serialization_options, *args, **kwargs
):
    from data_export.models import Export

    Export.objects.get(id=export_id).export_to_file(
        task_filter_options,
        annotation_filter_options,
        serialization_options,
    )


def set_export_background_failure(job, connection, type, value, traceback):
    from data_export.models import Export

    export_id = job.args[0]
    Export.objects.filter(id=export_id).update(status=Export.Status.FAILED)
