import hashlib
import io
import json
import logging
from os import name
import pathlib
from datetime import datetime
from functools import reduce
import shutil
import copy

from core.serializers import SerializerOption, generate_serializer
from core.utils.io import get_all_files_from_dir, get_temp_dir, read_bytes_stream
from data_manager.models import View
from django.core.files import File
from django.db import transaction
from django.db.models.query_utils import Q
from django.utils import dateformat, timezone
from label_studio_converter import Converter
from projects.models import Project
from tasks.models import Annotation, Prediction, Task
from core.utils.common import batch

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
                prepare_params = View.objects.get(
                    project=self.project,
                    id=value,
                ).get_prepare_tasks_params(add_selected_items=True)
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

    def _get_filtered_annotations(self, annotations, annotation_filter_options=None):
        """
        Filtering using disjunction of conditions

        annotation_filter_options: None or Dict({
            usual: optional None or bool:("true|false")
            ground_truth: optional None or bool:("true|false")
            skipped: optional None or bool:("true|false")
        })
        """
        if not isinstance(annotation_filter_options, dict):
            return annotations

        q_list = []
        if annotation_filter_options.get('usual'):
            q_list.append(Q(was_cancelled=False, ground_truth=False))
        if annotation_filter_options.get('ground_truth'):
            q_list.append(Q(ground_truth=True))
        if annotation_filter_options.get('skipped'):
            q_list.append(Q(was_cancelled=True))
        if not q_list:
            return annotations

        q = reduce(lambda x, y: x | y, q_list)
        return annotations.filter(q)

    def _get_export_serializer_option(self, serialization_options):

        from organizations.serializers import UserSerializer
        from rest_framework import serializers
        from tasks.serializers import AnnotationDraftSerializer

        from .serializers import ExportDataSerializer

        drafts = None
        predictions = None
        completed_by = {'serializer_class': UserSerializer}
        if isinstance(serialization_options, dict):
            if 'drafts' in serialization_options and isinstance(serialization_options['drafts'], dict):
                if serialization_options['drafts'].get('only_id'):
                    drafts = {
                        "serializer_class": serializers.PrimaryKeyRelatedField,
                        "field_options": {'many': True, 'read_only': True},
                    }
                else:
                    drafts = {
                        "serializer_class": AnnotationDraftSerializer,
                        "field_options": {'many': True, 'read_only': True},
                    }
            if 'predictions' in serialization_options and isinstance(serialization_options['predictions'], dict):
                if serialization_options['drafts'].get('only_id'):
                    predictions = {
                        "serializer_class": serializers.PrimaryKeyRelatedField,
                        "field_options": {'many': True, 'read_only': True},
                    }
                else:
                    predictions = {
                        "model_class": Prediction,
                        "field_options": {'many': True, 'read_only': True},
                        "nested_fields": {'created_ago': {'serializer_class': serializers.CharField}},
                    }
            if 'annotations__completed_by' in serialization_options:
                if serialization_options['annotations__completed_by'].get('only_id'):
                    completed_by = {
                        'serializer_class': serializers.IntegerField,
                        'field_options': {'source': 'completed_by_id'},
                    }

        result = {
            "model_class": Task,
            "base_serializer": ExportDataSerializer,  # to inherit to_representation
            "exclude": ('overlap', 'is_labeled'),
            "nested_fields": {
                "annotations": {
                    'model_class': Annotation,
                    'field_options': {
                        'many': True,
                        'read_only': True,
                        'source': '_annotations',  # filtered annotations by _get_filtered_annotations
                    },
                    'nested_fields': {'completed_by': completed_by},
                },
            },
        }
        if drafts is not None:
            result['nested_fields']['drafts'] = drafts
        if predictions is not None:
            result['nested_fields']['predictions'] = predictions
        return result

    def get_export_data(
        self,
        task_filter_options=None,
        annotation_filter_options=None,
        serialization_options=None,
    ):
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

        with transaction.atomic():
            # TODO: make counters from queryset
            # counters = Project.objects.with_counts().filter(id=self.project.id)[0].get_counters()
            counters = {'task_number': 0}
            result = []
            all_tasks = self.project.tasks.select_related('project').prefetch_related(
                'annotations', 'predictions', 'drafts'
            )
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
                tasks = list(Task.objects.filter(id__in=ids))
                logger.debug(f'Batch: {i*BATCH_SIZE}')
                # TODO: move _get_filtered_annotations on Prefetch filtering
                for task in tasks:
                    task._annotations = list(
                        self._get_filtered_annotations(
                            task.annotations.all(),
                            annotation_filter_options=annotation_filter_options,
                        ).distinct()
                    )
                if isinstance(task_filter_options, dict) and task_filter_options.get('only_with_annotations'):
                    tasks = [task for task in tasks if task._annotations]

                serializer_option_for_generator = copy.deepcopy(base_export_serializer_option)
                serializer_option_for_generator['field_options'] = {
                    'many': True,
                    'instance': tasks,
                    'read_only': True,
                }

                result += generate_serializer(SerializerOption(serializer_option_for_generator)).data

        counters['task_number'] = len(result)
        return result, counters

    def export_to_file(
        self,
        task_filter_options=None,
        annotation_filter_options=None,
        serialization_options=None,
    ):
        logger.debug(
            f'Run export for {self.id} with params:\n'
            f'task_filter_options: {task_filter_options}\n'
            f'annotation_filter_options: {annotation_filter_options}\n'
            f'serialization_options: {serialization_options}\n'
        )
        try:
            data, counters = self.get_export_data(
                task_filter_options=task_filter_options,
                annotation_filter_options=annotation_filter_options,
                serialization_options=serialization_options,
            )

            now = datetime.now()
            json_data = json.dumps(data, ensure_ascii=False).encode('utf-8')
            md5 = hashlib.md5(json_data).hexdigest()
            file_name = f'project-{self.project.id}-at-{now.strftime("%Y-%m-%d-%H-%M")}-{md5[0:8]}.json'
            file_path = f'{self.project.id}/{file_name}'  # finlay file will be in settings.DELAYED_EXPORT_DIR/self.project.id/file_name
            file_ = File(io.BytesIO(json_data), name=file_path)
            self.file.save(file_path, file_)
            self.md5 = md5
            self.counters = counters
            self.save(update_fields=['file', 'md5', 'counters'])

            self.status = self.Status.COMPLETED
            self.save(update_fields=['status'])
        except Exception as exc:
            self.status = self.Status.FAILED
            self.save(update_fields=['status'])
            logger.exception('Export was failed')
        finally:
            self.finished_at = datetime.now()
            self.save(update_fields=['finished_at'])

    def run_file_exporting(
        self,
        task_filter_options=None,
        annotation_filter_options=None,
        serialization_options=None,
    ):
        if self.status == self.Status.IN_PROGRESS:
            logger.warning('Try to export with in progress stage')
            return

        self.status = self.Status.IN_PROGRESS
        self.save(update_fields=['status'])

        logger.info(f'Start file_exporting {self}')
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
            )
            input_name = pathlib.Path(self.file.name).name
            input_file_path = pathlib.Path(tmp_dir) / input_name

            with open(input_file_path, 'wb') as file_:
                file_.write(self.file.open().read())

            converter.convert(input_file_path, out_dir, to_format, is_dir=False)

            files = get_all_files_from_dir(out_dir)

            if len(files) == 0:
                return None
            elif len(files) == 1:
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
