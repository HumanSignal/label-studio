"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import json
import logging
import os
from pathlib import Path
import re

from django.conf import settings
from django.db import models
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils.translation import gettext_lazy as _
from rest_framework.exceptions import ValidationError

from io_storages.base_models import (
      ExportStorage,
      ExportStorageLink,
      ImportStorage,
      ImportStorageLink,
)
from tasks.models import Annotation

logger = logging.getLogger(__name__)


class LocalFilesMixin(models.Model):
    path = models.TextField(
        _('path'), null=True, blank=True,
        help_text='Local path')
    regex_filter = models.TextField(
        _('regex_filter'), null=True, blank=True,
        help_text='Regex for filtering objects')
    use_blob_urls = models.BooleanField(
        _('use_blob_urls'), default=False,
        help_text='Interpret objects as BLOBs and generate URLs')

    def validate_connection(self):
        path = Path(self.path)
        document_root = Path(settings.LOCAL_FILES_DOCUMENT_ROOT)
        if not path.exists():
            raise ValidationError(f'Path {self.path} does not exist')
        if document_root not in path.parents:
            raise ValidationError(f'Path {self.path} must start with '
                                  f'LOCAL_FILES_DOCUMENT_ROOT={settings.LOCAL_FILES_DOCUMENT_ROOT} '
                                  f'and must be a child, e.g.: {Path(settings.LOCAL_FILES_DOCUMENT_ROOT) / "abc"}')
        if settings.LOCAL_FILES_SERVING_ENABLED is False:
            raise ValidationError("Serving local files can be dangerous, so it's disabled by default. "
                                  'You can enable it with LOCAL_FILES_SERVING_ENABLED environment variable, '
                                  'please check docs: https://labelstud.io/guide/storage.html#Local-storage')


class LocalFilesImportStorage(LocalFilesMixin, ImportStorage):
    url_scheme = 'https'

    def can_resolve_url(self, url):
        return False

    def iterkeys(self):
        path = Path(self.path)
        regex = re.compile(str(self.regex_filter)) if self.regex_filter else None
        # For better control of imported tasks, file reading has been changed to ascending order of filenames.
        # In other words, the task IDs are sorted by filename order.
        for file in sorted(path.rglob('*'), key=os.path.basename):
            if file.is_file():
                key = file.name
                if regex and not regex.match(key):
                    logger.debug(key + ' is skipped by regex filter')
                    continue
                yield str(file)

    def get_data(self, key):
        path = Path(key)
        if self.use_blob_urls:
            # include self-hosted links pointed to local resources via
            # {settings.HOSTNAME}/data/local-files?d=<path/to/local/dir>
            document_root = Path(settings.LOCAL_FILES_DOCUMENT_ROOT)
            relative_path = str(path.relative_to(document_root))
            return {settings.DATA_UNDEFINED_NAME: f'{settings.HOSTNAME}/data/local-files/?d={str(relative_path)}'}

        try:
            with open(path, encoding='utf8') as f:
                value = json.load(f)
        except (UnicodeDecodeError, json.decoder.JSONDecodeError):
            raise ValueError(
                f"Can\'t import JSON-formatted tasks from {key}. If you're trying to import binary objects, "
                f"perhaps you've forgot to enable \"Treat every bucket object as a source file\" option?")

        if not isinstance(value, dict):
            raise ValueError(f"Error on key {key}: For {self.__class__.__name__} your JSON file must be a dictionary with one task.")  # noqa
        return value

    def scan_and_create_links(self):
        return self._scan_and_create_links(LocalFilesImportStorageLink)


class LocalFilesExportStorage(ExportStorage, LocalFilesMixin):

    def save_annotation(self, annotation):
        logger.debug(f'Creating new object on {self.__class__.__name__} Storage {self} for annotation {annotation}')
        ser_annotation = self._get_serialized_data(annotation)

        # get key that identifies this object in storage
        key = LocalFilesExportStorageLink.get_key(annotation)
        key = os.path.join(self.path, f"{key}.json")

        # put object into storage
        with open(key, mode='w') as f:
            json.dump(ser_annotation, f, indent=2)

        # Create export storage link
        LocalFilesExportStorageLink.create(annotation, self)


class LocalFilesImportStorageLink(ImportStorageLink):
    storage = models.ForeignKey(LocalFilesImportStorage, on_delete=models.CASCADE, related_name='links')


class LocalFilesExportStorageLink(ExportStorageLink):
    storage = models.ForeignKey(LocalFilesExportStorage, on_delete=models.CASCADE, related_name='links')


@receiver(post_save, sender=Annotation)
def export_annotation_to_local_files(sender, instance, **kwargs):
    project = instance.task.project
    if hasattr(project, 'io_storages_localfilesexportstorages'):
        for storage in project.io_storages_localfilesexportstorages.all():
            logger.debug(f'Export {instance} to Local Storage {storage}')
            storage.save_annotation(instance)
