"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import hashlib
import logging
import os
import shutil
from copy import deepcopy
from datetime import datetime

import ujson as json
from core import version
from core.utils.common import load_func
from core.utils.io import get_all_files_from_dir, get_temp_dir, read_bytes_stream
from django.conf import settings
from django.db import models
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils.translation import gettext_lazy as _
from label_studio_converter import Converter
from tasks.models import Annotation


logger = logging.getLogger(__name__)


ExportMixin = load_func(settings.EXPORT_MIXIN)


class Export(ExportMixin, models.Model):
    class Status(models.TextChoices):
        CREATED = 'created', _('Created')
        IN_PROGRESS = 'in_progress', _('In progress')
        FAILED = 'failed', _('Failed')
        COMPLETED = 'completed', _('Completed')

    title = models.CharField(
        _('title'),
        blank=True,
        default='',
        max_length=2048,
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
    counters = models.JSONField(
        _('Exporting meta data'),
        default=dict,
    )
    project = models.ForeignKey(
        'projects.Project',
        related_name='exports',
        on_delete=models.CASCADE,
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name='+',
        on_delete=models.SET_NULL,
        null=True,
        verbose_name=_('created by'),
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
        md5 = hashlib.md5(json.dumps(data).encode('utf-8')).hexdigest()   # nosec
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
