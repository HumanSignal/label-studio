"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import logging
import json
import re

from pathlib import Path
from django.db import models, transaction
from django.utils.translation import gettext_lazy as _
from django.conf import settings

from io_storages.base_models import ImportStorage, ImportStorageLink, ExportStorage, ExportStorageLink
from io_storages.serializers import StorageAnnotationSerializer
from core.utils.params import get_env

logger = logging.getLogger(__name__)
url_scheme = 'https'


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


class LocalFilesImportStorage(ImportStorage, LocalFilesMixin):

    def iterkeys(self):
        path = Path(self.path)
        regex = re.compile(str(self.regex_filter)) if self.regex_filter else None
        for file in path.rglob('*'):
            if file.is_file():
                key = file.name
                if regex and not regex.match(key):
                    logger.debug(key + ' is skipped by regex filter')
                    continue
                yield file.name

    def get_data(self, key):
        path = Path(self.path) / key
        if self.use_blob_urls:
            # include self-hosted links pointed to local resources via /data/filename?d=<path/to/local/dir>
            document_root = Path(get_env('LOCAL_FILES_DOCUMENT_ROOT', default='/'))
            relative_path = str(path.relative_to(document_root))
            return {settings.DATA_UNDEFINED_NAME: f'/data/local-files/?d={relative_path}'}
        with open(path) as f:
            value = json.load(f)
        if not isinstance(value, dict):
            raise ValueError(f"Error on key {key}: For {self.__class__.__name__} your JSON file must be a dictionary with one task.")  # noqa
        return value

    def scan_and_create_links(self):
        return self._scan_and_create_links(LocalFilesImportStorageLink)


class LocalFilesExportStorage(ExportStorage, LocalFilesMixin):

    def save_annotation(self, annotation):
        logger.debug(f'Creating new object on {self.__class__.__name__} Storage {self} for annotation {annotation}')
        ser_annotation = StorageAnnotationSerializer(annotation).data
        with transaction.atomic():
            # Create export storage link
            link = LocalFilesExportStorageLink.create(annotation, self)
            try:
                with open(link.key, mode='w') as f:
                    json.dump(ser_annotation, f, indent=2)
            except Exception as exc:
                logger.error(f"Can't export annotation {annotation} to local storage {self}. Reason: {exc}", exc_info=True)


class LocalFilesImportStorageLink(ImportStorageLink):
    storage = models.ForeignKey(LocalFilesImportStorage, on_delete=models.CASCADE, related_name='links')


class LocalFilesExportStorageLink(ExportStorageLink):
    storage = models.ForeignKey(LocalFilesExportStorage, on_delete=models.CASCADE, related_name='links')
