"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license."""

import hashlib
import logging
import os
import shutil
from copy import deepcopy
from datetime import datetime

import ujson as json
from core.utils.common import load_func
from core.utils.io import get_all_files_from_dir, get_temp_dir, path_to_open_binary_file
from data_export.functions import converter_http_session
from django.conf import settings
from django.db import models, transaction
from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver
from django.utils.translation import gettext_lazy as _
from io_storages.localfiles.functions import project_local_files_resolver
from label_studio_sdk.converter import Converter

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
    @staticmethod
    def get_export_formats(project):
        converter = Converter(config=project.get_parsed_config(), project_dir=None)
        formats = []
        supported_formats = set(converter.supported_formats)
        lse_project = getattr(project, 'lse_project', None)
        if lse_project and getattr(lse_project, 'use_custom_interface', False):
            supported_formats.add('DOCLANG')
        for format, format_info in converter.all_formats().items():
            format_info = deepcopy(format_info)
            format_info['name'] = format.name
            if format.name not in supported_formats:
                format_info['disabled'] = True
            formats.append(format_info)
        return sorted(formats, key=lambda f: f.get('disabled', False))

    @staticmethod
    def generate_export_file(project, tasks, output_format, download_resources, get_args, hostname=None):
        """Generate export file and return it as an open file object.

        Be sure to close the file after using it, to avoid wasting disk space.
        """

        # prepare for saving
        now = datetime.now()
        data = json.dumps(tasks, ensure_ascii=False)
        md5 = hashlib.md5(json.dumps(data).encode('utf-8')).hexdigest()  # nosec
        name = 'project-' + str(project.id) + '-at-' + now.strftime('%Y-%m-%d-%H-%M') + f'-{md5[0:8]}'

        converter = Converter(
            config=project.get_parsed_config(),
            project_dir=None,
            upload_dir=os.path.join(settings.MEDIA_ROOT, settings.UPLOAD_DIR),
            download_resources=download_resources,
            access_token=project.organization.created_by.auth_token.key,
            hostname=hostname,
            local_files_resolver=project_local_files_resolver(project),
            http_session=converter_http_session(hostname),
        )
        # The converter input lives in its own temp dir so it is neither kept on disk nor packed into the output
        with get_temp_dir() as input_dir, get_temp_dir() as tmp_dir:
            input_json = os.path.join(input_dir, name + '.json')
            with open(input_json, 'w', encoding='utf-8') as f:
                f.write(data)
            converter.convert(input_json, tmp_dir, output_format, is_dir=False)
            files = get_all_files_from_dir(tmp_dir)
            # if only one file is exported - no need to create archive
            if len(os.listdir(tmp_dir)) == 1:
                output_file = files[0]
                ext = os.path.splitext(output_file)[-1]
                content_type = f'application/{ext}'
                out = path_to_open_binary_file(output_file)
                filename = name + os.path.splitext(output_file)[-1]
                return out, content_type, filename

            # otherwise pack output directory into archive
            shutil.make_archive(tmp_dir, 'zip', tmp_dir)
            out = path_to_open_binary_file(os.path.abspath(tmp_dir + '.zip'))
            content_type = 'application/zip'
            filename = name + '.zip'
            return out, content_type, filename


class ConvertedFormat(models.Model):
    class Status(models.TextChoices):
        CREATED = 'created', _('Created')
        IN_PROGRESS = 'in_progress', _('In progress')
        FAILED = 'failed', _('Failed')
        COMPLETED = 'completed', _('Completed')

    project = models.ForeignKey(
        'projects.Project',
        null=True,
        related_name='export_conversions',
        on_delete=models.CASCADE,
    )
    organization = models.ForeignKey(
        'organizations.Organization',
        null=True,
        on_delete=models.CASCADE,
        related_name='export_conversions',
    )
    export = models.ForeignKey(
        Export,
        related_name='converted_formats',
        on_delete=models.CASCADE,
        help_text='Export snapshot for this converted file',
    )
    file = models.FileField(
        upload_to=settings.DELAYED_EXPORT_DIR,
        null=True,
    )
    status = models.CharField(
        max_length=64,
        choices=Status.choices,
        default=Status.CREATED,
    )
    traceback = models.TextField(null=True, blank=True, help_text='Traceback report in case of errors')
    export_type = models.CharField(max_length=64)
    created_at = models.DateTimeField(
        _('created at'),
        null=True,
        auto_now_add=True,
        help_text='Creation time',
    )
    updated_at = models.DateTimeField(
        _('updated at'),
        null=True,
        auto_now_add=True,
        help_text='Updated time',
    )
    finished_at = models.DateTimeField(
        _('finished at'),
        help_text='Complete or fail time',
        null=True,
        default=None,
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name='+',
        on_delete=models.SET_NULL,
        null=True,
        verbose_name=_('created by'),
    )


def delete_file_from_storage(field_file):
    """Delete the file behind a FileField value; a file that is already gone is not an error"""
    if field_file and field_file.storage.exists(field_file.name):
        field_file.storage.delete(field_file.name)


@receiver(post_delete, sender=Export)
@receiver(post_delete, sender=ConvertedFormat)
def delete_export_file_on_commit(sender, instance, using, **kwargs):
    """Remove the file once the row deletion is committed, including deletions cascaded
    from a project, an organization or a parent export. Storage errors are only logged here;
    ExportDetailAPI deletes files itself and reports storage errors to the client."""
    field_file = instance.file

    def delete_file():
        try:
            delete_file_from_storage(field_file)
        except Exception:
            logger.warning(f'Could not delete export file {field_file.name} from storage', exc_info=True)

    if field_file:
        transaction.on_commit(delete_file, using=using)
