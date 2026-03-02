"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""

import json
import logging
import types
import urllib.parse
from typing import Union
from urllib.parse import urlparse

from core.redis import start_job_async_or_sync
from django.conf import settings
from django.db import models
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils.translation import gettext_lazy as _
from google.auth.transport.requests import AuthorizedSession
from io_storages.base_models import (
    ExportStorage,
    ExportStorageLink,
    ImportStorage,
    ImportStorageLink,
    ProjectStorageMixin,
)
from io_storages.gcs.utils import GCS
from io_storages.utils import (
    StorageObject,
    load_tasks_json,
    parse_range,
    storage_can_resolve_bucket_url,
)
from tasks.models import Annotation

logger = logging.getLogger(__name__)


class GCSStorageMixin(models.Model):
    bucket = models.TextField(_('bucket'), null=True, blank=True, help_text='GCS bucket name')
    prefix = models.TextField(_('prefix'), null=True, blank=True, help_text='GCS bucket prefix')
    regex_filter = models.TextField(
        _('regex_filter'),
        null=True,
        blank=True,
        help_text='Cloud storage regex for filtering objects',
    )
    use_blob_urls = models.BooleanField(
        _('use_blob_urls'),
        default=False,
        help_text='Interpret objects as BLOBs and generate URLs',
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

    def get_bytes_stream(self, uri, range_header=None):
        """Get file bytes from GCS storage as a streaming object with metadata.

        Improved implementation that uses a single HTTP request with streaming response
        instead of making multiple requests per chunk.

        - Accepts ``range_header`` in format ``bytes=start-end``
        - Makes a single HTTP request to GCS API with stream=True
        - Returns a tuple of (stream_with_iter_chunks, content_type, metadata_dict)
        """
        # Parse URI to get bucket and blob name
        parsed_uri = urlparse(uri, allow_fragments=False)
        bucket_name = parsed_uri.netloc
        blob_name = parsed_uri.path.lstrip('/')

        try:
            client = self.get_client()
            bucket = client.get_bucket(bucket_name)
            blob = bucket.blob(blob_name)
            blob.reload()  # populate metadata

            # Parse range header
            start, end = parse_range(range_header)
            # Handle special cases for header requests
            if start is None and end is None:
                start, end = 0, blob.size
            # Browser is requesting just headers for streaming
            if start == 0 and (end == 0 or end == ''):
                start, end = 0, 1

            # Build the direct download URL because GCS doesn't support streaming out of the box
            encoded = urllib.parse.quote(blob_name, safe='')
            download_url = settings.RESOLVER_PROXY_GCS_DOWNLOAD_URL.format(bucket_name=bucket_name, blob_name=encoded)

            # Prepare headers for range request if needed
            headers = {}
            if start > 0 or (end is not None and end != blob.size):
                end_str = str(end) if end is not None else ''
                headers['Range'] = f'bytes={start}-{end_str}'
                logger.debug(f"Using range header: {headers['Range']}")

            # Make a single streaming request
            session = AuthorizedSession(client._credentials)
            logger.debug(f'Making streaming request to {download_url}')
            stream = session.get(
                download_url, headers=headers, stream=True, timeout=settings.RESOLVER_PROXY_GCS_HTTP_TIMEOUT
            )
            stream.raise_for_status()
            logger.debug(f'Got response with status {stream.status_code}, headers: {stream.headers}')

            # Define method to attach to the response
            def _iter_chunks(self_resp, chunk_size=256 * 1024):
                """Iterate over chunks from the single HTTP response"""
                for chunk in self_resp.iter_content(chunk_size=chunk_size):
                    if chunk:
                        yield chunk

            # Monkey patch methods directly onto the response object
            stream.iter_chunks = types.MethodType(_iter_chunks, stream)
            stream.close = types.MethodType(lambda self: self.close() if hasattr(self, 'close') else None, stream)

            # Get content length from the response headers
            total = int(stream.headers.get('Content-Length', '0'))

            # Determine actual range of data we're getting
            if 'Content-Range' in stream.headers:
                # Parse the Content-Range header (format: bytes start-end/total)
                range_parts = stream.headers['Content-Range'].split(' ')[1].split('/')
                byte_range = range_parts[0].split('-')
                actual_start = int(byte_range[0])
                actual_end = int(byte_range[1])
                file_size = int(range_parts[1])
            else:
                actual_start = 0
                actual_end = (total - 1) if total else 0
                file_size = total

            # Build metadata matching S3 format
            metadata = {
                'ETag': blob.etag or '',
                'ContentLength': total,
                'ContentRange': f'bytes {actual_start}-{actual_end}/{file_size}',
                'LastModified': blob.updated,
                'StatusCode': stream.status_code,
            }
            return stream, (blob.content_type or 'application/octet-stream'), metadata

        except Exception as e:
            logger.error(f'Error getting direct stream from GCS for uri {uri}: {e}', exc_info=True)
            return None, None, {}


class GCSImportStorageBase(GCSStorageMixin, ImportStorage):
    url_scheme = 'gs'

    presign = models.BooleanField(_('presign'), default=True, help_text='Generate presigned URLs')
    presign_ttl = models.PositiveSmallIntegerField(
        _('presign_ttl'), default=1, help_text='Presigned URLs TTL (in minutes)'
    )
    recursive_scan = models.BooleanField(
        _('recursive scan'),
        default=False,
        db_default=False,
        null=True,
        help_text=_('Perform recursive scan over the bucket content'),
    )

    def iter_objects(self):
        return GCS.iter_blobs(
            client=self.get_client(),
            bucket_name=self.bucket,
            prefix=self.prefix,
            regex_filter=self.regex_filter,
            return_key=False,
            recursive_scan=bool(self.recursive_scan),
        )

    def iter_keys(self):
        for obj in self.iter_objects():
            yield obj.name

    def get_unified_metadata(self, obj):
        return {
            'key': obj.name,
            'last_modified': obj.updated,
            'size': obj.size,
        }

    def get_data(self, key) -> list[StorageObject]:
        if self.use_blob_urls:
            task = {settings.DATA_UNDEFINED_NAME: GCS.get_uri(self.bucket, key)}
            return [StorageObject(key=key, task_data=task)]
        blob = GCS.read_file(
            client=self.get_client(),
            bucket_name=self.bucket,
            key=key,
        )
        return load_tasks_json(blob, key)

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


def async_export_annotation_to_gcs_storages(annotation: 'Annotation | int'):
    if isinstance(annotation, int):
        try:
            annotation = Annotation.objects.get(pk=annotation)
        except Annotation.DoesNotExist:
            logger.info(f'Annotation {annotation} no longer exists, skipping GCS export')
            return

    project = annotation.project
    if hasattr(project, 'io_storages_gcsexportstorages'):
        for storage in project.io_storages_gcsexportstorages.all():
            logger.debug(f'Export {annotation} to GCS storage {storage}')
            storage.save_annotation(annotation)


@receiver(post_save, sender=Annotation)
def export_annotation_to_gcs_storages(sender, instance, **kwargs):
    storages = getattr(instance.project, 'io_storages_gcsexportstorages', None)
    if storages and storages.exists():  # avoid excess jobs in rq
        start_job_async_or_sync(async_export_annotation_to_gcs_storages, instance.pk)


class GCSImportStorageLink(ImportStorageLink):
    storage = models.ForeignKey(GCSImportStorage, on_delete=models.CASCADE, related_name='links')


class GCSExportStorageLink(ExportStorageLink):
    storage = models.ForeignKey(GCSExportStorage, on_delete=models.CASCADE, related_name='links')
