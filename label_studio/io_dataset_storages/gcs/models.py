"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import logging

from django.db import models
from django.utils.translation import gettext_lazy as _
from django.conf import settings

from io_dataset_storages.base_models import DatasetStorage
from io_storages.gcs.utils import GCS
from io_storages.gcs.models import GCSStorageMixin

logger = logging.getLogger(__name__)


class GCSDatasetStorage(GCSStorageMixin, DatasetStorage):
    url_scheme = 'gs'

    presign = models.BooleanField(
        _('presign'), default=True,
        help_text='Generate presigned URLs')
    presign_ttl = models.PositiveSmallIntegerField(
        _('presign_ttl'), default=1,
        help_text='Presigned URLs TTL (in minutes)'
    )

    def iterkeys(self):
        return GCS.iter_blobs(
            client=self.get_client(),
            bucket_name=self.bucket,
            prefix=self.prefix,
            regex_filter=self.regex_filter,
            return_key=True
        )

    def get_data(self, key):
        if self.use_blob_urls:
            return {settings.DATA_UNDEFINED_NAME: GCS.get_uri(self.bucket, key)}
        return GCS.read_file(
            client=self.get_client(),
            bucket_name=self.bucket,
            key=key,
            convert_to=GCS.ConvertBlobTo.JSON_DICT
        )
        
    def generate_http_url(self, url):
        return GCS.generate_http_url(
            url=url,
            google_application_credentials=self.google_application_credentials,
            google_project_id=self.google_project_id,
            presign_ttl=self.presign_ttl
        )

    def scan_and_create_links(self):
        return self._scan_and_create_links_v2()
