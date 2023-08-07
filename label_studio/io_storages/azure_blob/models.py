"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
from typing import TYPE_CHECKING
import logging
import json
import re

from core.redis import start_job_async_or_sync
from datetime import datetime, timedelta
from urllib.parse import urlparse
from django.db import models
from django.utils.translation import gettext_lazy as _
from django.conf import settings
from django.db.models.signals import post_save

from azure.storage.blob import BlobServiceClient, generate_blob_sas, BlobSasPermissions
from azure.core.exceptions import ResourceNotFoundError
from django.dispatch import receiver
from core.utils.params import get_env
from tasks.models import Annotation
from io_storages.base_models import (
    ExportStorage,
    ExportStorageLink,
    ImportStorage,
    ImportStorageLink,
    ProjectStorageMixin
)

if TYPE_CHECKING:
    from io_storages.azure_blob.utils import AZURE
else:
    from label_studio.io_storages.azure_blob.utils import AZURE

logger = logging.getLogger(__name__)
logging.getLogger('azure.core.pipeline.policies.http_logging_policy').setLevel(logging.WARNING)


class AzureBlobStorageMixin(models.Model):
    container = models.TextField(
        _('container'), null=True, blank=True,
        help_text='Azure blob container')
    prefix = models.TextField(
        _('prefix'), null=True, blank=True,
        help_text='Azure blob prefix name')
    regex_filter = models.TextField(
        _('regex_filter'), null=True, blank=True,
        help_text='Cloud storage regex for filtering objects')
    use_blob_urls = models.BooleanField(
        _('use_blob_urls'), default=False,
        help_text='Interpret objects as BLOBs and generate URLs')
    account_name = models.TextField(
        _('account_name'), null=True, blank=True,
        help_text='Azure Blob account name')
    account_key = models.TextField(
        _('account_key'), null=True, blank=True,
        help_text='Azure Blob account key')

    def get_account_name(self):  # type: ignore[no-untyped-def]
        return str(self.account_name) if self.account_name else get_env('AZURE_BLOB_ACCOUNT_NAME')  # type: ignore[no-untyped-call]

    def get_account_key(self):  # type: ignore[no-untyped-def]
        return str(self.account_key) if self.account_key else get_env('AZURE_BLOB_ACCOUNT_KEY')  # type: ignore[no-untyped-call]

    def get_client_and_container(self):  # type: ignore[no-untyped-def]
        account_name = self.get_account_name()  # type: ignore[no-untyped-call]
        account_key = self.get_account_key()  # type: ignore[no-untyped-call]
        if not account_name or not account_key:
            raise ValueError('Azure account name and key must be set using '
                             'environment variables AZURE_BLOB_ACCOUNT_NAME and AZURE_BLOB_ACCOUNT_KEY')
        connection_string = "DefaultEndpointsProtocol=https;AccountName=" + account_name + \
                            ";AccountKey=" + account_key + ";EndpointSuffix=core.windows.net"
        client = BlobServiceClient.from_connection_string(conn_str=connection_string)
        container = client.get_container_client(str(self.container))
        return client, container

    def get_container(self):  # type: ignore[no-untyped-def]
        _, container = self.get_client_and_container()  # type: ignore[no-untyped-call]
        return container

    def validate_connection(self, **kwargs):  # type: ignore[no-untyped-def]
        logger.debug('Validating Azure Blob Storage connection')
        client, container = self.get_client_and_container()  # type: ignore[no-untyped-call]

        try:
            container_properties = container.get_container_properties()
            logger.debug(f'Container exists: {container_properties.name}')
        except ResourceNotFoundError:
            raise KeyError(f'Container not found: {self.container}')

        # Check path existence for Import storages only
        if self.prefix and 'Export' not in self.__class__.__name__:
            logger.debug(f'Test connection to container {self.container} with prefix {self.prefix}')
            prefix = str(self.prefix)
            blobs = list(container.list_blobs(name_starts_with=prefix, results_per_page=1))

            if not blobs:
                raise KeyError(f'{self.url_scheme}://{self.container}/{self.prefix} not found.')  # type: ignore[attr-defined]


class AzureBlobImportStorageBase(AzureBlobStorageMixin, ImportStorage):  # type: ignore[misc]
    url_scheme = 'azure-blob'

    presign = models.BooleanField(
        _('presign'), default=True,
        help_text='Generate presigned URLs')
    presign_ttl = models.PositiveSmallIntegerField(
        _('presign_ttl'), default=1,
        help_text='Presigned URLs TTL (in minutes)'
    )

    def iterkeys(self):  # type: ignore[no-untyped-def]
        container = self.get_container()  # type: ignore[no-untyped-call]
        prefix = str(self.prefix) if self.prefix else ''
        files = container.list_blobs(name_starts_with=prefix)
        regex = re.compile(str(self.regex_filter)) if self.regex_filter else None

        for file in files:
            # skip folder
            if file.name == (prefix.rstrip('/') + '/'):
                continue
            # check regex pattern filter
            if regex and not regex.match(file.name):
                logger.debug(file.name + ' is skipped by regex filter')
                continue
            yield file.name

    def get_data(self, key):  # type: ignore[no-untyped-def]
        if self.use_blob_urls:
            data_key = settings.DATA_UNDEFINED_NAME
            return {data_key: f'{self.url_scheme}://{self.container}/{key}'}

        container = self.get_container()  # type: ignore[no-untyped-call]
        blob = container.download_blob(key)
        blob_str = blob.content_as_text()
        value = json.loads(blob_str)
        if not isinstance(value, dict):
            raise ValueError(f"Error on key {key}: For {self.__class__.__name__} your JSON file must be a dictionary with one task")  # noqa
        return value

    def scan_and_create_links(self):  # type: ignore[no-untyped-def]
        return self._scan_and_create_links(AzureBlobImportStorageLink)  # type: ignore[no-untyped-call]

    def generate_http_url(self, url):  # type: ignore[no-untyped-def]
        r = urlparse(url, allow_fragments=False)
        container = r.netloc
        blob = r.path.lstrip('/')

        expiry = datetime.utcnow() + timedelta(minutes=self.presign_ttl)

        sas_token = generate_blob_sas(account_name=self.get_account_name(),  # type: ignore[no-untyped-call]
                                      container_name=container,
                                      blob_name=blob,
                                      account_key=self.get_account_key(),  # type: ignore[no-untyped-call]
                                      permission=BlobSasPermissions(read=True),  # type: ignore[no-untyped-call]
                                      expiry=expiry)
        return 'https://' + self.get_account_name() + '.blob.core.windows.net/' + container + '/' + blob + '?' + sas_token  # type: ignore[no-untyped-call]

    def get_blob_metadata(self, key):  # type: ignore[no-untyped-def]
        return AZURE.get_blob_metadata(key, self.container, account_name=self.account_name, account_key=self.account_key)  # type: ignore[arg-type, arg-type, arg-type]

    class Meta:
        abstract = True


class AzureBlobImportStorage(ProjectStorageMixin, AzureBlobImportStorageBase):  # type: ignore[misc]
    class Meta:
        abstract = False


class AzureBlobExportStorage(AzureBlobStorageMixin, ExportStorage):    # type: ignore[misc] # note: order is important!

    def save_annotation(self, annotation):  # type: ignore[no-untyped-def]
        container = self.get_container()  # type: ignore[no-untyped-call]
        logger.debug(f'Creating new object on {self.__class__.__name__} Storage {self} for annotation {annotation}')
        ser_annotation = self._get_serialized_data(annotation)  # type: ignore[no-untyped-call]
        # get key that identifies this object in storage
        key = AzureBlobExportStorageLink.get_key(annotation)  # type: ignore[no-untyped-call]
        key = str(self.prefix) + '/' + key if self.prefix else key

        # put object into storage
        blob = container.get_blob_client(key)
        blob.upload_blob(json.dumps(ser_annotation), overwrite=True)

        # create link if everything ok
        AzureBlobExportStorageLink.create(annotation, self)  # type: ignore[no-untyped-call]


def async_export_annotation_to_azure_storages(annotation):  # type: ignore[no-untyped-def]
    project = annotation.project
    if hasattr(project, 'io_storages_azureblobexportstorages'):
        for storage in project.io_storages_azureblobexportstorages.all():
            logger.debug(f'Export {annotation} to Azure Blob storage {storage}')
            storage.save_annotation(annotation)


@receiver(post_save, sender=Annotation)
def export_annotation_to_azure_storages(sender, instance, **kwargs):  # type: ignore[no-untyped-def]
    storages = getattr(instance.project, 'io_storages_azureblobexportstorages', None)
    if storages and storages.exists():  # avoid excess jobs in rq
        start_job_async_or_sync(async_export_annotation_to_azure_storages, instance)  # type: ignore[no-untyped-call]


class AzureBlobImportStorageLink(ImportStorageLink):
    storage = models.ForeignKey(AzureBlobImportStorage, on_delete=models.CASCADE, related_name='links')


class AzureBlobExportStorageLink(ExportStorageLink):
    storage = models.ForeignKey(AzureBlobExportStorage, on_delete=models.CASCADE, related_name='links')
