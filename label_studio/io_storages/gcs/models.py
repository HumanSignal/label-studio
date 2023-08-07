"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import logging
import json

from core.redis import start_job_async_or_sync
from django.db import models
from django.utils.translation import gettext_lazy as _
from django.conf import settings
from django.dispatch import receiver
from django.db.models.signals import post_save

from io_storages.gcs.utils import GCS
from tasks.models import Annotation
from io_storages.base_models import (
    ExportStorage,
    ExportStorageLink,
    ImportStorage,
    ImportStorageLink,
    ProjectStorageMixin
)

logger = logging.getLogger(__name__)


class GCSStorageMixin(models.Model):
    bucket = models.TextField(
        _('bucket'), null=True, blank=True,
        help_text='GCS bucket name')
    prefix = models.TextField(
        _('prefix'), null=True, blank=True,
        help_text='GCS bucket prefix')
    regex_filter = models.TextField(
        _('regex_filter'), null=True, blank=True,
        help_text='Cloud storage regex for filtering objects')
    use_blob_urls = models.BooleanField(
        _('use_blob_urls'), default=False,
        help_text='Interpret objects as BLOBs and generate URLs')
    google_application_credentials = models.TextField(
        _('google_application_credentials'), null=True, blank=True,
        help_text='The content of GOOGLE_APPLICATION_CREDENTIALS json file')
    google_project_id = models.TextField(
        _('Google Project ID'), null=True, blank=True,
        help_text='Google project ID')

    def get_client(self):  # type: ignore[no-untyped-def]
        return GCS.get_client(
            google_project_id=self.google_project_id,  # type: ignore[arg-type]
            google_application_credentials=self.google_application_credentials  # type: ignore[arg-type]
        )

    def get_bucket(self, client=None, bucket_name=None):  # type: ignore[no-untyped-def]
        if not client:
            client = self.get_client()  # type: ignore[no-untyped-call]
        return client.get_bucket(bucket_name or self.bucket)

    def validate_connection(self):  # type: ignore[no-untyped-def]
        GCS.validate_connection(
            self.bucket,  # type: ignore[arg-type]
            self.google_project_id,  # type: ignore[arg-type]
            self.google_application_credentials,  # type: ignore[arg-type]
            # we don't need to validate path for export storage, it will be created automatically
            None if 'Export' in self.__class__.__name__ else self.prefix  # type: ignore[arg-type]
        )


class GCSImportStorageBase(GCSStorageMixin, ImportStorage):  # type: ignore[misc]
    url_scheme = 'gs'

    presign = models.BooleanField(
        _('presign'), default=True,
        help_text='Generate presigned URLs')
    presign_ttl = models.PositiveSmallIntegerField(
        _('presign_ttl'), default=1,
        help_text='Presigned URLs TTL (in minutes)'
    )

    def iterkeys(self):  # type: ignore[no-untyped-def]
        return GCS.iter_blobs(
            client=self.get_client(),  # type: ignore[no-untyped-call]
            bucket_name=self.bucket,  # type: ignore[arg-type]
            prefix=self.prefix,  # type: ignore[arg-type]
            regex_filter=self.regex_filter,  # type: ignore[arg-type]
            return_key=True
        )

    def get_data(self, key):  # type: ignore[no-untyped-def]
        if self.use_blob_urls:
            return {settings.DATA_UNDEFINED_NAME: GCS.get_uri(self.bucket, key)}  # type: ignore[no-untyped-call]
        return GCS.read_file(
            client=self.get_client(),  # type: ignore[no-untyped-call]
            bucket_name=self.bucket,  # type: ignore[arg-type]
            key=key,
            convert_to=GCS.ConvertBlobTo.JSON_DICT
        )
        
    def generate_http_url(self, url):  # type: ignore[no-untyped-def]
        return GCS.generate_http_url(
            url=url,
            google_application_credentials=self.google_application_credentials,  # type: ignore[arg-type]
            google_project_id=self.google_project_id,  # type: ignore[arg-type]
            presign_ttl=self.presign_ttl
        )

    def scan_and_create_links(self):  # type: ignore[no-untyped-def]
        return self._scan_and_create_links(GCSImportStorageLink)  # type: ignore[no-untyped-call]

    def get_blob_metadata(self, key):  # type: ignore[no-untyped-def]
        return GCS.get_blob_metadata(
            url=key,
            google_application_credentials=self.google_application_credentials,  # type: ignore[arg-type]
            google_project_id=self.google_project_id  # type: ignore[arg-type]
        )

    class Meta:
        abstract = True


class GCSImportStorage(ProjectStorageMixin, GCSImportStorageBase):  # type: ignore[misc]
    class Meta:
        abstract = False


class GCSExportStorage(GCSStorageMixin, ExportStorage):  # type: ignore[misc]

    def save_annotation(self, annotation):  # type: ignore[no-untyped-def]
        bucket = self.get_bucket()  # type: ignore[no-untyped-call]
        logger.debug(f'Creating new object on {self.__class__.__name__} Storage {self} for annotation {annotation}')
        ser_annotation = self._get_serialized_data(annotation)  # type: ignore[no-untyped-call]

        # get key that identifies this object in storage
        key = GCSExportStorageLink.get_key(annotation)  # type: ignore[no-untyped-call]
        key = str(self.prefix) + '/' + key if self.prefix else key

        # put object into storage
        blob = bucket.blob(key)
        blob.upload_from_string(json.dumps(ser_annotation))

        # create link if everything ok
        GCSExportStorageLink.create(annotation, self)  # type: ignore[no-untyped-call]


def async_export_annotation_to_gcs_storages(annotation):  # type: ignore[no-untyped-def]
    project = annotation.project
    if hasattr(project, 'io_storages_gcsexportstorages'):
        for storage in project.io_storages_gcsexportstorages.all():
            logger.debug(f'Export {annotation} to GCS storage {storage}')
            storage.save_annotation(annotation)


@receiver(post_save, sender=Annotation)
def export_annotation_to_gcs_storages(sender, instance, **kwargs):  # type: ignore[no-untyped-def]
    storages = getattr(instance.project, 'io_storages_gcsexportstorages', None)
    if storages and storages.exists():  # avoid excess jobs in rq
        start_job_async_or_sync(async_export_annotation_to_gcs_storages, instance)  # type: ignore[no-untyped-call]


class GCSImportStorageLink(ImportStorageLink):
    storage = models.ForeignKey(GCSImportStorage, on_delete=models.CASCADE, related_name='links')


class GCSExportStorageLink(ExportStorageLink):
    storage = models.ForeignKey(GCSExportStorage, on_delete=models.CASCADE, related_name='links')
