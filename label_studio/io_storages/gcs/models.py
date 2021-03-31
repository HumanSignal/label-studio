"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import logging
import json
import socket
import re
import google.auth
import re

from google.auth import compute_engine
from google.cloud import storage as google_storage
from google.auth.transport import requests
from urllib.parse import urlparse
from datetime import datetime, timedelta
from django.db import models, transaction
from django.utils.translation import gettext_lazy as _
from django.conf import settings
from django.dispatch import receiver
from django.db.models.signals import post_save

from io_storages.utils import get_uri_via_regex
from io_storages.base_models import ImportStorage, ImportStorageLink, ExportStorage, ExportStorageLink
from io_storages.serializers import StorageAnnotationSerializer
from tasks.models import Annotation

logger = logging.getLogger(__name__)
url_scheme = 'gs'


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

    def get_client(self):
        return google_storage.Client()

    def get_bucket(self, client=None, bucket_name=None):
        if not client:
            client = self.get_client()
        return client.get_bucket(bucket_name or self.bucket)


class GCSImportStorage(ImportStorage, GCSStorageMixin):
    presign = models.BooleanField(
        _('presign'), default=True,
        help_text='Generate presigned URLs')
    presign_ttl = models.PositiveSmallIntegerField(
        _('presign_ttl'), default=1,
        help_text='Presigned URLs TTL (in minutes)'
    )

    def iterkeys(self):
        bucket = self.get_bucket()
        files = bucket.list_blobs(prefix=self.prefix)
        prefix = str(self.prefix) if self.prefix else ''
        regex = re.compile(str(self.regex_filter)) if self.regex_filter else None

        for file in files:
            if file.name == (prefix.rstrip('/') + '/'):
                continue
            # check regex pattern filter
            if regex and not regex.match(file.name):
                logger.debug(file.name + ' is skipped by regex filter')
                continue
            yield file.name

    def get_data(self, key):
        if self.use_blob_urls:
            return {settings.DATA_UNDEFINED_NAME: f'{url_scheme}://{self.bucket}/{key}'}
        bucket = self.get_bucket()
        blob = bucket.blob(key)
        blob_str = blob.download_as_string()
        value = json.loads(blob_str)
        if not isinstance(value, dict):
            raise ValueError(f"Error on key {key}: For {self.__class__.__name__} your JSON file must be a dictionary with one task.")  # noqa
        return value

    @classmethod
    def is_gce_instance(cls):
        """Check if it's GCE instance via DNS lookup to metadata server"""
        try:
            socket.getaddrinfo('metadata.google.internal', 80)
        except socket.gaierror:
            return False
        return True

    def resolve_gs(self, url, **kwargs):
        r = urlparse(url, allow_fragments=False)
        bucket_name = r.netloc
        key = r.path.lstrip('/')
        if self.is_gce_instance():
            logger.debug('Generate signed URL for GCE instance')
            return self.python_cloud_function_get_signed_url(bucket_name, key)
        else:
            logger.debug('Generate signed URL for local instance')
            return self.generate_download_signed_url_v4(bucket_name, key)

    def generate_download_signed_url_v4(self, bucket_name, blob_name):
        """Generates a v4 signed URL for downloading a blob.

        Note that this method requires a service account key file. You can not use
        this if you are using Application Default Credentials from Google Compute
        Engine or from the Google Cloud SDK.
        """
        # bucket_name = 'your-bucket-name'
        # blob_name = 'your-object-name'

        client = self.get_client()
        bucket = self.get_bucket(client, bucket_name)
        blob = bucket.blob(blob_name)

        url = blob.generate_signed_url(
            version="v4",
            # This URL is valid for 15 minutes
            expiration=timedelta(minutes=self.presign_ttl),
            # Allow GET requests using this URL.
            method="GET",
        )

        logger.debug('Generated GCS signed url: ' + url)
        return url

    def python_cloud_function_get_signed_url(self, bucket_name, blob_name):
        # https://gist.github.com/jezhumble/91051485db4462add82045ef9ac2a0ec
        # Copyright 2019 Google LLC.
        # SPDX-License-Identifier: Apache-2.0
        # This snippet shows you how to use Blob.generate_signed_url() from within compute engine / cloud functions
        # as described here: https://cloud.google.com/functions/docs/writing/http#uploading_files_via_cloud_storage
        # (without needing access to a private key)
        # Note: as described in that page, you need to run your function with a service account
        # with the permission roles/iam.serviceAccountTokenCreator
        auth_request = requests.Request()
        credentials, project = google.auth.default()
        storage_client = google_storage.Client(project, credentials)
        data_bucket = storage_client.lookup_bucket(bucket_name)
        signed_blob_path = data_bucket.blob(blob_name)
        expires_at_ms = datetime.now() + timedelta(minutes=self.presign_ttl)
        # This next line is the trick!
        signing_credentials = compute_engine.IDTokenCredentials(auth_request, "",
                                                                service_account_email=credentials.service_account_email)
        signed_url = signed_blob_path.generate_signed_url(expires_at_ms, credentials=signing_credentials, version="v4")
        return signed_url

    def resolve_uri(self, data):
        uri, storage = get_uri_via_regex(data, prefixes=(url_scheme,))
        if not storage:
            return
        logger.debug("Found matching storage uri in task data value: {uri}".format(uri=uri))
        resolved_uri = self.resolve_gs(uri)
        return data.replace(uri, resolved_uri)

    def scan_and_create_links(self):
        return self._scan_and_create_links(GCSImportStorageLink)


class GCSExportStorage(ExportStorage, GCSStorageMixin):

    def save_annotation(self, annotation):
        bucket = self.get_bucket()
        logger.debug(f'Creating new object on {self.__class__.__name__} Storage {self} for annotation {annotation}')
        ser_annotation = StorageAnnotationSerializer(annotation).data
        with transaction.atomic():
            # Create export storage link
            link = GCSExportStorageLink.create(annotation, self)
            key = str(self.prefix) + '/' + link.key if self.prefix else link.key
            try:
                blob = bucket.blob(key)
                blob.upload_from_string(json.dumps(ser_annotation))
            except Exception as exc:
                logger.error(f"Can't export annotation {annotation} to GCS storage {self}. Reason: {exc}", exc_info=True)


@receiver(post_save, sender=Annotation)
def export_annotation_to_gcs_storages(sender, instance, **kwargs):
    project = instance.task.project
    if hasattr(project, 'io_storages_gcsexportstorages'):
        for storage in project.io_storages_gcsexportstorages.all():
            logger.debug(f'Export {instance} to GCS storage {storage}')
            storage.save_annotation(instance)


class GCSImportStorageLink(ImportStorageLink):
    storage = models.ForeignKey(GCSImportStorage, on_delete=models.CASCADE, related_name='links')


class GCSExportStorageLink(ExportStorageLink):
    storage = models.ForeignKey(GCSExportStorage, on_delete=models.CASCADE, related_name='links')
