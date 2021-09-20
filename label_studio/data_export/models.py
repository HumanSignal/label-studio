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

import django_rq
import ujson as json
from core import version
from core.label_config import parse_config
from core.redis import redis_connected
from core.utils.common import batch
from core.utils.io import get_all_files_from_dir, get_temp_dir, read_bytes_stream
from django.conf import settings
from django.core.cache.backends.base import default_key_func
from django.core.files import File
from django.db import models, transaction
from django.utils.translation import gettext_lazy as _
from django_rq import queues
from label_studio_converter import Converter
from projects.models import Project
from tasks.models import Annotation

logger = logging.getLogger(__name__)


class Export(models.Model):
    class Status(models.TextChoices):
        CREATED = 'created', _('Created')
        IN_PROGRESS = 'in_progress', _('In progress')
        FAILED = 'failed', _('Failed')
        COMPLETED = 'completed', _('Completed')

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
        _('Exporting status'),
        max_length=64,
        choices=Status.choices,
        default=Status.CREATED,
    )
    counters = models.JSONField(_('Exporting meta data'), default=dict)

    only_finished = models.BooleanField(
        _('Only finished'),
        default=False,
        help_text=_('If true - it exports only finished tasks'),
    )
    task_ids = models.JSONField(
        _('Task ids list'),
        default=list,
        help_text=_('If list is empty - download all tasks'),
    )

    def has_permission(self, user):
        return self.project.has_permission(user)

    def get_export_data(self):
        from .serializers import ExportDataSerializer

        with transaction.atomic():
            counters = Project.objects.with_counts().filter(id=self.project.id)[0].get_counters()
            tasks = self.project.tasks.select_related('project').prefetch_related('annotations', 'predictions')
            if self.task_ids:
                tasks = tasks.filter(id__in=self.task_ids)
            if self.only_finished:
                tasks = tasks.filter(annotations__isnull=False).distinct()

            task_ids = list(tasks.values_list('id', flat=True))

            logger.debug('Serialize tasks for export')
            result = []
            for _task_ids in batch(task_ids, 1000):
                result += ExportDataSerializer(tasks.filter(id__in=_task_ids), many=True).data
        return result, counters

    def export_to_file(self):
        try:
            data, counters = self.get_export_data()

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

    def run_file_exporting(self):
        if self.status == self.Status.IN_PROGRESS:
            logger.warning('Try to export with in progress stage')
            return

        self.status = self.Status.IN_PROGRESS
        self.save(update_fields=['status'])

        if redis_connected():
            queue = django_rq.get_queue('default')
            job = queue.enqueue(export_background, self.id)
            logger.info(f'File exporting background job {job.id} for export {self} has been started')
        else:
            logger.info(f'Start file_exporting {self}')
            self.export_to_file()

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


def export_background(export_id):
    Export.objects.get(id=export_id).export_to_file()


class DataExport(object):
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
