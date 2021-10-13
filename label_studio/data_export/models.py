"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import hashlib
import io
import logging
import os
import pathlib
import shutil
from copy import deepcopy
from datetime import datetime
from functools import reduce

import django_rq
import ujson as json
from core import version
from core.label_config import parse_config
from core.redis import redis_connected
from core.serializers import SerializerOption, generate_serializer
from core.utils.common import batch
from core.utils.io import get_all_files_from_dir, get_temp_dir, read_bytes_stream
from data_manager.models import View
from django.conf import settings
from django.core.cache.backends.base import default_key_func
from django.core.files import File
from django.db import models, transaction
from django.db.models.query_utils import Q
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import dateformat, timezone
from django.utils.module_loading import module_has_submodule
from django.utils.translation import gettext_lazy as _
from django_rq import queues
from label_studio_converter import Converter
from projects.models import Project
from rest_framework import views
from tasks.models import Annotation, AnnotationDraft, Prediction, Task

logger = logging.getLogger(__name__)

ONLY = 'only'
EXCLUDE = 'exclude'


class Export(models.Model):
    class Status(models.TextChoices):
        CREATED = 'created', _('Created')
        IN_PROGRESS = 'in_progress', _('In progress')
        FAILED = 'failed', _('Failed')
        COMPLETED = 'completed', _('Completed')

    title = models.CharField(
        _('title'),
        blank=True,
        default='',
        max_length=settings.PROJECT_TITLE_MAX_LEN,
    )
    project = models.ForeignKey(
        'projects.Project',
        related_name='exports',
        on_delete=models.CASCADE,
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name='created_exports',
        on_delete=models.SET_NULL,
        null=True,
        verbose_name=_('created by'),
    )
    created_at = models.DateTimeField(
        _('created at'),
        auto_now_add=True,
        help_text='Creation time',
    )
    file = models.FileField(
        upload_to=settings.DELAYED_EXPORT_DIR,
        null=True,
    )
    md5 = models.CharField(
        _('md5 of file'),
        max_length=128,
        default='',
    )
    finished_at = models.DateTimeField(
        _('finished at'),
        help_text='Complete or fail time',
        null=True,
        default=None,
    )

    status = models.CharField(
        _('Export status'),
        max_length=64,
        choices=Status.choices,
        default=Status.CREATED,
    )
    counters = models.JSONField(_('Exporting meta data'), default=dict)

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
                        "field_options": {'many': True},
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
                        "field_options": {'many': True},
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
            counters = Project.objects.with_counts().filter(id=self.project.id)[0].get_counters()
            tasks = self.project.tasks.select_related('project').prefetch_related(
                'annotations', 'predictions', 'drafts'
            )
            tasks = self._get_filtered_tasks(tasks, task_filter_options=task_filter_options)
            tasks = list(tasks)
            for task in tasks:
                task._annotations = list(
                    self._get_filtered_annotations(
                        task.annotations.all(),
                        annotation_filter_options=annotation_filter_options,
                    )
                )

            serializer_option_for_generator = self._get_export_serializer_option(serialization_options)
            serializer_option_for_generator['field_options'] = {
                'many': True,
                'instance': tasks,
            }

            logger.debug('Serialize tasks for export')
            result = generate_serializer(SerializerOption(serializer_option_for_generator)).data

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
            json_data = json.dumps(data, ensure_ascii=False)
            md5 = hashlib.md5(json_data.encode('utf-8')).hexdigest()
            name = f'project-{self.project.id}-at-{now.strftime("%Y-%m-%d-%H-%M")}-{md5[0:8]}.json'

            file_ = File(io.StringIO(json_data), name=name)
            self.file.save(name, file_)
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

        if redis_connected():
            queue = django_rq.get_queue('default')
            job = queue.enqueue(
                export_background, self.id, task_filter_options, annotation_filter_options, serialization_options
            )
            logger.info(f'File exporting background job {job.id} for export {self} has been started')
        else:
            logger.info(f'Start file_exporting {self}')
            self.export_to_file(
                task_filter_options=task_filter_options,
                annotation_filter_options=annotation_filter_options,
                serialization_options=serialization_options,
            )

    def convert_file(self, to):
        with get_temp_dir() as tmp_dir:
            converter = Converter(
                config=self.project.get_parsed_config(),
                project_dir=None,
                upload_dir=tmp_dir,
                # download_resources=download_resources,
            )
            input_name = pathlib.Path(self.file.name).name
            input_file_path = pathlib.Path(tmp_dir) / input_name
            with open(input_file_path, 'wb') as out_file:
                out_file.write(self.file.open().read())

            converter.convert(input_file_path, tmp_dir, to, is_dir=False)

            files = get_all_files_from_dir(tmp_dir)
            output_file = [file_name for file_name in files if pathlib.Path(file_name).name != input_name][0]

            out = read_bytes_stream(output_file)
            filename = pathlib.Path(input_name).stem + pathlib.Path(output_file).suffix
            return File(
                out,
                name=filename,
            )


def export_background(export_id, task_filter_options, annotation_filter_options, serialization_options):
    Export.objects.get(id=export_id).export_to_file(
        task_filter_options,
        annotation_filter_options,
        serialization_options,
    )


@receiver(post_save, sender=Export)
def set_export_default_name(sender, instance, created, **kwargs):
    if created and not instance.title:
        instance.title = instance.get_default_title()
        instance.save()


class DataExport(object):
    # TODO: deprecated
    @staticmethod
    def save_export_files(project, now, get_args, data, md5, name):
        """Generate two files: meta info and result file and store them locally for logging"""
        filename_results = os.path.join(settings.EXPORT_DIR, name + '.json')
        filename_info = os.path.join(settings.EXPORT_DIR, name + '-info.json')
        annotation_number = Annotation.objects.filter(task__project=project).count()
        try:
            platform_version = version.get_git_version()
        except:
            platform_version = 'none'
            logger.error('Version is not detected in save_export_files()')
        info = {
            'project': {
                'title': project.title,
                'id': project.id,
                'created_at': project.created_at.strftime('%Y-%m-%dT%H:%M:%SZ'),
                'created_by': project.created_by.email,
                'task_number': project.tasks.count(),
                'annotation_number': annotation_number,
            },
            'platform': {'version': platform_version},
            'download': {
                'GET': dict(get_args),
                'time': now.strftime('%Y-%m-%dT%H:%M:%SZ'),
                'result_filename': filename_results,
                'md5': md5,
            },
        }

        with open(filename_results, 'w', encoding='utf-8') as f:
            f.write(data)
        with open(filename_info, 'w', encoding='utf-8') as f:
            json.dump(info, f, ensure_ascii=False)
        return filename_results

    @staticmethod
    def get_export_formats(project):
        converter = Converter(config=project.get_parsed_config(), project_dir=None)
        formats = []
        supported_formats = set(converter.supported_formats)
        for format, format_info in converter.all_formats().items():
            format_info = deepcopy(format_info)
            format_info['name'] = format.name
            if format.name not in supported_formats:
                format_info['disabled'] = True
            formats.append(format_info)
        return sorted(formats, key=lambda f: f.get('disabled', False))

    @staticmethod
    def generate_export_file(project, tasks, output_format, download_resources, get_args):
        # prepare for saving
        now = datetime.now()
        data = json.dumps(tasks, ensure_ascii=False)
        md5 = hashlib.md5(json.dumps(data).encode('utf-8')).hexdigest()
        name = 'project-' + str(project.id) + '-at-' + now.strftime('%Y-%m-%d-%H-%M') + f'-{md5[0:8]}'

        input_json = DataExport.save_export_files(project, now, get_args, data, md5, name)

        converter = Converter(
            config=project.get_parsed_config(),
            project_dir=None,
            upload_dir=os.path.join(settings.MEDIA_ROOT, settings.UPLOAD_DIR),
            download_resources=download_resources,
        )
        with get_temp_dir() as tmp_dir:
            converter.convert(input_json, tmp_dir, output_format, is_dir=False)
            files = get_all_files_from_dir(tmp_dir)
            # if only one file is exported - no need to create archive
            if len(os.listdir(tmp_dir)) == 1:
                output_file = files[0]
                ext = os.path.splitext(output_file)[-1]
                content_type = f'application/{ext}'
                out = read_bytes_stream(output_file)
                filename = name + os.path.splitext(output_file)[-1]
                return out, content_type, filename

            # otherwise pack output directory into archive
            shutil.make_archive(tmp_dir, 'zip', tmp_dir)
            out = read_bytes_stream(os.path.abspath(tmp_dir + '.zip'))
            content_type = 'application/zip'
            filename = name + '.zip'
            return out, content_type, filename
