"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""

import json
import logging
import os
import re
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import quote

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.db.models.signals import post_save, pre_delete
from django.dispatch import receiver
from django.utils.translation import gettext_lazy as _
from io_storages.base_models import (
    ExportStorage,
    ExportStorageLink,
    ImportStorage,
    ImportStorageLink,
    ProjectStorageMixin,
)
from io_storages.localfiles.functions import normalize_storage_path
from io_storages.utils import StorageObject, load_tasks_json
from tasks.models import Annotation

logger = logging.getLogger(__name__)


class LocalFilesMixin(models.Model):
    path = models.TextField(_('path'), null=True, blank=True, help_text='Local path')
    regex_filter = models.TextField(
        _('regex_filter'),
        null=True,
        blank=True,
        help_text='Regex for filtering objects',
    )
    use_blob_urls = models.BooleanField(
        _('use_blob_urls'),
        default=False,
        help_text='Interpret objects as BLOBs and generate URLs',
    )

    def clean(self):
        super().clean()
        if self.path is not None:
            self.path = normalize_storage_path(self.path)

    def save(self, *args, **kwargs):
        if self.path is not None:
            self.path = normalize_storage_path(self.path)
        super().save(*args, **kwargs)

    def _get_storage_path_or_raise(self, exception_cls=ValueError) -> str:
        """Return a sanitized storage path or raise a caller-provided exception type.

        All downstream filesystem operations eventually need an absolute path without
        trailing slashes or mixed separators. Centralizing that logic here keeps the
        normalization rules consistent and allows callers to decide what exception
        class (ValidationError vs ValueError) should be raised when the path is
        missing or invalid.
        """
        normalized = normalize_storage_path(self.path)
        if not normalized:
            raise exception_cls('Path must be set for Local Files storage')
        return normalized

    @staticmethod
    def community_auto_hint():
        if settings.VERSION_EDITION == 'Community':
            return (
                ' Community tip: create a "mydata" or "label-studio-data" directory next to the Label Studio '
                'command to auto-enable LOCAL_FILES_DOCUMENT_ROOT when the environment variables are unset.'
            )
        return ''

    def validate_connection(self):
        normalized_path = self._get_storage_path_or_raise(ValidationError)
        self.path = normalized_path
        path = Path(normalized_path)
        document_root = Path(settings.LOCAL_FILES_DOCUMENT_ROOT)
        example_path = Path(settings.LOCAL_FILES_DOCUMENT_ROOT) / 'dataset1'

        if not path.exists():
            raise ValidationError(f'Absolute local path "{self.path}" does not exist')
        if document_root == path:
            raise ValidationError(
                f'Absolute local path "{self.path}" cannot be the same as '
                f'LOCAL_FILES_DOCUMENT_ROOT="{settings.LOCAL_FILES_DOCUMENT_ROOT}" by security reasons. Please add a subdirectory. '
                f'For example: "{example_path}".'
            )
        if document_root not in path.parents:
            raise ValidationError(
                f'Absolute local path "{self.path}" must be a subdirectory of '
                f'LOCAL_FILES_DOCUMENT_ROOT="{settings.LOCAL_FILES_DOCUMENT_ROOT}" by security reasons. '
                f'For example: "{example_path}".'
            )
        if settings.LOCAL_FILES_SERVING_ENABLED is False:
            raise ValidationError(
                'Serving local files from the host filesystem can be a security risk, so '
                'LOCAL_FILES_SERVING_ENABLED is disabled by default. '
                'To enable Local Files storage, set the LOCAL_FILES_SERVING_ENABLED environment '
                'variable to "true" and restart Label Studio. See '
                'https://labelstud.io/guide/storage.html#Local-storage for details.'
                '\n\n'
                f'{self.community_auto_hint()}'
            )


class LocalFilesImportStorageBase(LocalFilesMixin, ImportStorage):
    url_scheme = 'https'

    def can_resolve_url(self, url):
        return False

    recursive_scan = models.BooleanField(
        _('recursive scan'),
        default=False,
        db_default=False,
        null=True,
        help_text=_('Perform recursive scan over the directory content'),
    )

    def iter_objects(self):
        path = Path(self._get_storage_path_or_raise())
        regex = re.compile(str(self.regex_filter)) if self.regex_filter else None
        # For better control of imported tasks, file reading has been changed to ascending order of filenames.
        # In other words, the task IDs are sorted by filename order.
        iterator = path.rglob('*') if self.recursive_scan else path.glob('*')
        for file in sorted(iterator, key=os.path.basename):
            if file.is_file():
                key = file.name
                if regex and not regex.match(key):
                    logger.debug(key + ' is skipped by regex filter')
                    continue
                yield file

    def iter_keys(self):
        for obj in self.iter_objects():
            yield str(obj)

    def get_unified_metadata(self, obj):
        stat = obj.stat()
        return {
            'key': str(obj),
            'last_modified': datetime.fromtimestamp(stat.st_mtime, tz=timezone.utc),
            'size': stat.st_size,
        }

    def get_data(self, key) -> list[StorageObject]:
        path = Path(key)
        if self.use_blob_urls:
            # include self-hosted links pointed to local resources via
            # {settings.HOSTNAME}/data/local-files?d=<path/to/local/dir>
            document_root = Path(settings.LOCAL_FILES_DOCUMENT_ROOT)
            relative_path = str(path.relative_to(document_root))
            task = {
                settings.DATA_UNDEFINED_NAME: f'{settings.HOSTNAME}/data/local-files/?d={quote(str(relative_path))}'
            }
            return [StorageObject(key=key, task_data=task)]

        try:
            with open(path, 'rb') as f:
                blob = f.read()
                return load_tasks_json(blob, key)
        except OSError as e:
            raise ValueError(f'Failed to read file {path}: {str(e)}')

    def scan_and_create_links(self):
        return self._scan_and_create_links(LocalFilesImportStorageLink)

    class Meta:
        abstract = True


class LocalFilesImportStorage(ProjectStorageMixin, LocalFilesImportStorageBase):
    class Meta:
        abstract = False


class LocalFilesExportStorage(LocalFilesMixin, ExportStorage):
    def save_annotation(self, annotation):
        logger.debug(f'Creating new object on {self.__class__.__name__} Storage {self} for annotation {annotation}')
        ser_annotation = self._get_serialized_data(annotation)

        # get key that identifies this object in storage
        key = LocalFilesExportStorageLink.get_key(annotation)
        storage_path = self._get_storage_path_or_raise()
        key = os.path.join(storage_path, f'{key}')

        # put object into storage
        with open(key, mode='w') as f:
            json.dump(ser_annotation, f, indent=2)

        # Create export storage link
        LocalFilesExportStorageLink.create(annotation, self)

    def delete_annotation(self, annotation):
        logger.debug(f'Deleting object on {self.__class__.__name__} Storage {self} for annotation {annotation}')
        key = LocalFilesExportStorageLink.get_key(annotation)
        storage_path = self._get_storage_path_or_raise()
        file_path = os.path.join(storage_path, f'{key}')

        try:
            os.remove(file_path)
        except FileNotFoundError:
            logger.warning(f'Export file {file_path} is already missing for annotation {annotation}')  # nosec

        LocalFilesExportStorageLink.objects.filter(storage=self, annotation=annotation).delete()


class LocalFilesImportStorageLink(ImportStorageLink):
    storage = models.ForeignKey(LocalFilesImportStorage, on_delete=models.CASCADE, related_name='links')


class LocalFilesExportStorageLink(ExportStorageLink):
    storage = models.ForeignKey(LocalFilesExportStorage, on_delete=models.CASCADE, related_name='links')


@receiver(post_save, sender=Annotation)
def export_annotation_to_local_files(sender, instance, **kwargs):
    project = instance.project
    if hasattr(project, 'io_storages_localfilesexportstorages'):
        for storage in project.io_storages_localfilesexportstorages.all():
            logger.debug(f'Export {instance} to Local Storage {storage}')
            storage.save_annotation(instance)


@receiver(pre_delete, sender=Annotation)
def delete_annotation_from_local_files(sender, instance, **kwargs):
    links = LocalFilesExportStorageLink.objects.filter(annotation=instance)
    for link in links:
        storage = link.storage
        if storage.can_delete_objects:
            logger.debug(f'Delete {instance} from Local Storage {storage}')  # nosec
            storage.delete_annotation(instance)
