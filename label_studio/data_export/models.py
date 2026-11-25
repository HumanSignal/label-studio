"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license."""

import hashlib
import logging
import os
import shutil
from copy import deepcopy
from datetime import datetime, timedelta

import ujson as json
from core.utils.common import load_func
from core.utils.io import get_all_files_from_dir, get_temp_dir, path_to_open_binary_file
from data_export.functions import CONVERTER_ACCESS_TOKEN, converter_http_session
from django.conf import settings
from django.db import models, transaction
from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver
from django.utils import timezone
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
    since = models.DateTimeField(
        _('since'),
        null=True,
        blank=True,
        help_text='Inclusive lower bound for Task.updated_at when this snapshot is incremental',
    )
    until = models.DateTimeField(
        _('until'),
        null=True,
        blank=True,
        help_text='Exclusive upper bound for Task.updated_at; use as next since for cron hops',
    )
    ephemeral = models.BooleanField(
        _('ephemeral'),
        default=False,
        null=True,
        db_default=False,
        help_text='When true, excluded from list endpoints; TTL GC via RQ cron when enabled',
    )

    def _detach_shared_files(self):
        """Blank this export's file fields whose blob another export still uses.

        ``delete_export_file_on_commit`` removes the file of every deleted Export / ConvertedFormat row. Blanking a
        shared field first (in the same transaction as the row delete) makes that receiver skip the blob, so the
        export that still points at it keeps its file.
        """
        for converted in self.converted_formats.all():
            if converted.file and self._blob_referenced_elsewhere(converted.file.name):
                ConvertedFormat.objects.filter(pk=converted.pk).update(file='')
        if self.file and self._blob_referenced_elsewhere(self.file.name):
            Export.objects.filter(pk=self.pk).update(file='')
            self.file = ''

    def _blob_referenced_elsewhere(self, name):
        """True when another export (or another export's converted format) points at the same blob.

        Export file names are ``project-<id>-at-<minute>-<md5[:8]>``, so a listed export and an ephemeral one
        with identical content finished in the same minute share a key: the sweep must not delete it. The key
        embeds the project id, so only this project's rows can share it; filtering by project keeps the lookup
        on the project index instead of scanning the unindexed ``file`` columns.
        """
        return (
            Export.objects.filter(project_id=self.project_id, file=name).exclude(pk=self.pk).exists()
            or ConvertedFormat.objects.filter(export__project_id=self.project_id, file=name)
            .exclude(export_id=self.pk)
            .exists()
        )

    @classmethod
    def cleanup_expired_ephemeral(cls, ttl_hours=None):
        """Delete ephemeral exports older than TTL (default settings.EPHEMERAL_EXPORT_TTL_HOURS).

        Intended for the LSE RQ cron sweep (``htx.cron_jobs.cleanup_expired_ephemeral_exports``).
        Not invoked from export list/create request paths. Files are removed on commit by
        ``delete_export_file_on_commit``, like any export delete, except blobs another export still uses.
        One export's failure is logged and the sweep moves on.
        """
        from core.utils.iterators import iterate_queryset

        if ttl_hours is None:
            ttl_hours = getattr(settings, 'EPHEMERAL_EXPORT_TTL_HOURS', 24)
        cutoff = timezone.now() - timedelta(hours=ttl_hours)
        deleted = 0
        qs = cls.objects.filter(ephemeral=True, created_at__lt=cutoff)
        for export in iterate_queryset(qs):
            try:
                with transaction.atomic():
                    export._detach_shared_files()
                    export.delete()
                deleted += 1
            except Exception:
                logger.exception('Failed to delete expired ephemeral export id=%s', export.id)
        return deleted


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
    def generate_export_file(project, tasks, output_format, download_resources, get_args, hostname=None, user=None):
        """Generate export file and return it as an open file object.

        Media stored in Label Studio is fetched from ``hostname`` as ``user``, the user who exports.
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
            access_token=CONVERTER_ACCESS_TOKEN,
            hostname=hostname,
            local_files_resolver=project_local_files_resolver(project),
            http_session=converter_http_session(hostname, user),
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
