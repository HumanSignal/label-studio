"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import logging
import json
import re

from datetime import datetime, timedelta
from urllib.parse import urlparse
from django.db import models, transaction
from django.utils.translation import gettext_lazy as _
from django.conf import settings
from django.dispatch import receiver
from django.db.models.signals import post_save

from azure.storage.blob import BlobServiceClient, generate_blob_sas, BlobSasPermissions
from django.dispatch import receiver
from core.utils.params import get_env
from io_storages.base_models import ImportStorage, ImportStorageLink, ExportStorage, ExportStorageLink
from io_storages.utils import get_uri_via_regex
from io_storages.serializers import StorageAnnotationSerializer
from tasks.models import Annotation


logger = logging.getLogger(__name__)
logging.getLogger('azure.core.pipeline.policies.http_logging_policy').setLevel(logging.WARNING)
url_scheme = 'azure-blob'


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

    def get_account_name(self):
        return str(self.account_name) if self.account_name else get_env('AZURE_BLOB_ACCOUNT_NAME')

    def get_account_key(self):
        return str(self.account_key) if self.account_key else get_env('AZURE_BLOB_ACCOUNT_KEY')

    def get_client_and_container(self):
        account_name = self.get_account_name()
        account_key = self.get_account_key()
        if not account_name or not account_key:
            raise ValueError('Azure account name and key must be set using '
                             'environment variables AZURE_BLOB_ACCOUNT_NAME and AZURE_BLOB_ACCOUNT_KEY')
        connection_string = "DefaultEndpointsProtocol=https;AccountName=" + account_name + \
                            ";AccountKey=" + account_key + ";EndpointSuffix=core.windows.net"
        client = BlobServiceClient.from_connection_string(conn_str=connection_string)
        container = client.get_container_client(str(self.container))
        return client, container

    def get_container(self):
        _, container = self.get_client_and_container()
        return container


class AzureBlobImportStorage(ImportStorage, AzureBlobStorageMixin):
    presign = models.BooleanField(
        _('presign'), default=True,
        help_text='Generate presigned URLs')
    presign_ttl = models.PositiveSmallIntegerField(
        _('presign_ttl'), default=1,
        help_text='Presigned URLs TTL (in minutes)'
    )

    def iterkeys(self):
        container = self.get_container()
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

    def get_data(self, key):
        if self.use_blob_urls:
            data_key = settings.DATA_UNDEFINED_NAME
            return {data_key: f'{url_scheme}://{self.container}/{key}'}

        container = self.get_container()
        blob = container.download_blob(key)
        blob_str = blob.content_as_text()
        value = json.loads(blob_str)
        if not isinstance(value, dict):
            raise ValueError(f"Error on key {key}: For {self.__class__.__name__} your JSON file must be a dictionary with one task")  # noqa
        return value

    def resolve_uri(self, data):
        uri, storage = get_uri_via_regex(data, prefixes=(url_scheme,))
        if not storage:
            return
        logger.debug("Found matching storage uri in task data value: {uri}".format(uri=uri))
        resolved_uri = self.resolve_azure_blob(uri)
        return data.replace(uri, resolved_uri)

    def scan_and_create_links(self):
        return self._scan_and_create_links(AzureBlobImportStorageLink)

    def resolve_azure_blob(self, url):
        r = urlparse(url, allow_fragments=False)
        container = r.netloc
        blob = r.path.lstrip('/')

        expiry = datetime.utcnow() + timedelta(minutes=self.presign_ttl)

        sas_token = generate_blob_sas(account_name=self.get_account_name(),
                                      container_name=container,
                                      blob_name=blob,
                                      account_key=self.get_account_key(),
                                      permission=BlobSasPermissions(read=True),
                                      expiry=expiry)
        return 'https://' + self.get_account_name() + '.blob.core.windows.net/' + container + '/' + blob + '?' + sas_token


class AzureBlobExportStorage(ExportStorage, AzureBlobStorageMixin):

    def save_annotation(self, annotation):
        container = self.get_container()
        logger.debug(f'Creating new object on {self.__class__.__name__} Storage {self} for annotation {annotation}')
        ser_annotation = StorageAnnotationSerializer(annotation).data
        with transaction.atomic():
            # Create export storage link
            link = AzureBlobExportStorageLink.create(annotation, self)
            try:
                blob = container.get_blob_client(link.key)
                blob.upload_blob(json.dumps(ser_annotation), overwrite=True)
            except Exception as exc:
                logger.error(f"Can't export annotation {annotation} to Azure storage {self}. Reason: {exc}", exc_info=True)


@receiver(post_save, sender=Annotation)
def export_annotation_to_azure_storages(sender, instance, **kwargs):
    project = instance.task.project
    if hasattr(project, 'io_storages_azureblobexportstorages'):
        for storage in project.io_storages_azureblobexportstorages.all():
            logger.debug(f'Export {instance} to Azure Blob storage {storage}')
            storage.save_annotation(instance)


class AzureBlobImportStorageLink(ImportStorageLink):
    storage = models.ForeignKey(AzureBlobImportStorage, on_delete=models.CASCADE, related_name='links')


class AzureBlobExportStorageLink(ExportStorageLink):
    storage = models.ForeignKey(AzureBlobExportStorage, on_delete=models.CASCADE, related_name='links')

    @property
    def key(self):
        prefix = self.storage.prefix or ''
        key = str(self.annotation.id)
        if self.storage.prefix:
            key = f'{self.storage.prefix}/{key}'
        return key
