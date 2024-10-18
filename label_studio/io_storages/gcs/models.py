"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import json
import logging
from typing import Union

from core.redis import start_job_async_or_sync
from django.conf import settings
from django.db import models
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils.translation import gettext_lazy as _
from io_storages.base_models import (
    ExportStorage,
    ExportStorageLink,
    ImportStorage,
    ImportStorageLink,
    ProjectStorageMixin,
)
from io_storages.gcs.utils import GCS
from io_storages.utils import storage_can_resolve_bucket_url
from tasks.models import Annotation

logger = logging.getLogger(__name__)


class GCSStorageMixin(models.Model):
    bucket = models.TextField(_('bucket'), null=True, blank=True, help_text='GCS bucket name')
    prefix = models.TextField(_('prefix'), null=True, blank=True, help_text='GCS bucket prefix')
    regex_filter = models.TextField(
        _('regex_filter'), null=True, blank=True, help_text='Cloud storage regex for filtering objects'
    )
    use_blob_urls = models.BooleanField(
        _('use_blob_urls'), default=False, help_text='Interpret objects as BLOBs and generate URLs'
    )
    google_application_credentials = models.TextField(
        _('google_application_credentials'),
        null=True,
        blank=True,
        help_text='The content of GOOGLE_APPLICATION_CREDENTIALS json file',
    )
    google_project_id = models.TextField(_('Google Project ID'), null=True, blank=True, help_text='Google project ID')

    def get_client(self):
        return GCS.get_client(
            google_project_id=self.google_project_id,
            google_application_credentials=self.google_application_credentials,
        )

    def get_bucket(self, client=None, bucket_name=None):
        if not client:
            client = self.get_client()
        return client.get_bucket(bucket_name or self.bucket)

    def validate_connection(self):
        GCS.validate_connection(
            self.bucket,
            self.google_project_id,
            self.google_application_credentials,
            # we don't need to validate path for export storage, it will be created automatically
            None if 'Export' in self.__class__.__name__ else self.prefix,
        )


class GCSImportStorageBase(GCSStorageMixin, ImportStorage):
    url_scheme = 'gs'

    presign = models.BooleanField(_('presign'), default=True, help_text='Generate presigned URLs')
    presign_ttl = models.PositiveSmallIntegerField(
        _('presign_ttl'), default=1, help_text='Presigned URLs TTL (in minutes)'
    )

    def iterkeys(self):
        return GCS.iter_blobs(
            client=self.get_client(),
            bucket_name=self.bucket,
            prefix=self.prefix,
            regex_filter=self.regex_filter,
            return_key=True,
        )

    def get_data(self, key):
        if self.use_blob_urls:
            return {settings.DATA_UNDEFINED_NAME: GCS.get_uri(self.bucket, key)}
        return GCS.read_file(
            client=self.get_client(), bucket_name=self.bucket, key=key, convert_to=GCS.ConvertBlobTo.JSON_DICT
        )

    def generate_http_url(self, url):
        return GCS.generate_http_url(
            url=url,
            presign=self.presign,
            google_application_credentials=self.google_application_credentials,
            google_project_id=self.google_project_id,
            presign_ttl=self.presign_ttl,
        )

    def can_resolve_url(self, url: Union[str, None]) -> bool:
        return storage_can_resolve_bucket_url(self, url)

    def scan_and_create_links(self):
        return self._scan_and_create_links(GCSImportStorageLink)

    def get_blob_metadata(self, key):
        return GCS.get_blob_metadata(
            url=key,
            google_application_credentials=self.google_application_credentials,
            google_project_id=self.google_project_id,
        )

    class Meta:
        abstract = True


class GCSImportStorage(ProjectStorageMixin, GCSImportStorageBase):
    class Meta:
        abstract = False


class GCSExportStorage(GCSStorageMixin, ExportStorage):
    def save_annotation(self, annotation):
        bucket = self.get_bucket()
        logger.debug(f'Creating new object on {self.__class__.__name__} Storage {self} for annotation {annotation}')
        ser_annotation = self._get_serialized_data(annotation)

        # get key that identifies this object in storage
        key = GCSExportStorageLink.get_key(annotation)
        key = str(self.prefix) + '/' + key if self.prefix else key

        # put object into storage
        blob = bucket.blob(key)
        blob.upload_from_string(json.dumps(ser_annotation))

        # create link if everything ok
        GCSExportStorageLink.create(annotation, self)


def async_export_annotation_to_gcs_storages(annotation):
    project = annotation.project
    if hasattr(project, 'io_storages_gcsexportstorages'):
        for storage in project.io_storages_gcsexportstorages.all():
            logger.debug(f'Export {annotation} to GCS storage {storage}')
            storage.save_annotation(annotation)


@receiver(post_save, sender=Annotation)
def export_annotation_to_gcs_storages(sender, instance, **kwargs):
    storages = getattr(instance.project, 'io_storages_gcsexportstorages', None)
    if storages and storages.exists():  # avoid excess jobs in rq
        start_job_async_or_sync(async_export_annotation_to_gcs_storages, instance)


class GCSImportStorageLink(ImportStorageLink):
    storage = models.ForeignKey(GCSImportStorage, on_delete=models.CASCADE, related_name='links')


class GCSExportStorageLink(ExportStorageLink):
    storage = models.ForeignKey(GCSExportStorage, on_delete=models.CASCADE, related_name='links')
