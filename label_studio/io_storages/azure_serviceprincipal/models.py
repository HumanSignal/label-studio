"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import json
import logging
import re
from datetime import datetime, timedelta, timezone
from string import Template

from azure.core.exceptions import ResourceNotFoundError
from azure.identity import ClientSecretCredential
from azure.storage.blob import (
    BlobSasPermissions,
    BlobServiceClient,
    ContainerClient,
    UserDelegationKey,
    generate_blob_sas,
)
from core.redis import start_job_async_or_sync
from core.utils.params import get_env
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
from tasks.models import Annotation

logger = logging.getLogger(__name__)
logging.getLogger('azure.core.pipeline.policies.http_logging_policy').setLevel(logging.WARNING)

AZURE_ACCOUNT_URL_TEMPLATE = Template('https://${account_name}.blob.core.windows.net')
AZURE_SIGNED_URL_TEMPLATE = Template('${account_url}/${container_name}/${blob_name}?${sas_token}')
AZURE_URL_PATTERN = r'azure_spi://(?P<container_name>[^/]+)/(?P<blob_name>.+)'


class AzureServicePrincipalStorageMixin(models.Model):
    prefix = models.TextField(_('prefix'), null=True, blank=True, help_text='Azure blob prefix name')
    regex_filter = models.TextField(
        _('regex_filter'), null=True, blank=True, help_text='Cloud storage regex for filtering objects'
    )
    use_blob_urls = models.BooleanField(
        _('use_blob_urls'), default=False, help_text='Interpret objects as BLOBs and generate URLs'
    )

    account_name = models.TextField(_('account_name'), null=True, blank=True, help_text='Azure Blob account name')
    container = models.TextField(_('container'), null=True, blank=True, help_text='Azure blob container')
    tenant_id = models.TextField(_('tenant_id'), null=True, blank=True, help_text='Azure Tenant ID')
    client_id = models.TextField(
        _('client_id'), null=True, blank=True, help_text='Azure Blob Service Principal Client ID'
    )
    client_secret = models.TextField(
        _('client_secret'), null=True, blank=True, help_text='Azure Blob Service Principal Client Secret'
    )
    user_delegation_key = models.TextField(
        _('user_delegation_key'), null=True, blank=True, help_text='User Delegation Key (Backend)'
    )

    def get_account_name(self):
        return str(self.account_name) if self.account_name else get_env('AZURE_BLOB_ACCOUNT_NAME')

    def get_account_client_id(self):
        return str(self.client_id) if self.client_id else get_env('AZURE_CLIENT_ID')

    def get_account_client_secret(self):
        return str(self.client_secret) if self.client_secret else get_env('AZURE_CLIENT_SECRET')

    def get_account_tenant_id(self):
        return str(self.tenant_id) if self.tenant_id else get_env('AZURE_TENANT_ID')

    @property
    def delegation_key(self) -> UserDelegationKey:
        key = UserDelegationKey()
        # A function to create a key if necessary...
        def create_key():

            delegation_key_expiry_time = datetime.now() + timedelta(days=1)
            blob_service_client = self.blobservice_client
            user_delegation_key = blob_service_client.get_user_delegation_key(
                key_start_time=datetime.now(), key_expiry_time=delegation_key_expiry_time
            )
            logger.info('User Delegation Key : Regenerated...')
            # We create a serialized version...
            self.user_delegation_key = json.dumps(vars(user_delegation_key))
            self.save(update_fields=['user_delegation_key'])

            return user_delegation_key

        if not self.user_delegation_key:
            key = create_key()
        else:
            key = UserDelegationKey()
            db_key = self.user_delegation_key
            key_dict = json.loads(db_key)
            for prop, val in key_dict.items():
                setattr(key, prop, val)
            now = datetime.now(tz=timezone.utc)
            key_expiration = datetime.strptime(key.signed_expiry, '%Y-%m-%dT%H:%M:%S%z')
            if now + timedelta(hours=1) > key_expiration:
                key = create_key()
        return key

    @property
    def blobservice_client(self) -> BlobServiceClient:
        account_url = self.get_account_url()
        credential = ClientSecretCredential(
            tenant_id=self.get_account_tenant_id(),
            client_id=self.get_account_client_id(),
            client_secret=self.get_account_client_secret(),
        )
        blobservice_client = BlobServiceClient(account_url, credential=credential)
        return blobservice_client

    @property
    def container_client(self) -> ContainerClient:
        blobservice_client = self.blobservice_client
        container_client = blobservice_client.get_container_client((str(self.container)))
        return container_client

    def get_account_url(self):
        account_name = self.get_account_name()
        if not account_name:
            raise ValueError(
                'Azure account name must be set using '
                'environment variables AZURE_BLOB_ACCOUNT_NAME '
                'or account_name fields.'
            )
        if not account_name.startswith('http'):
            account_url = AZURE_ACCOUNT_URL_TEMPLATE.safe_substitute(account_name=account_name)
        else:
            account_url = account_name
        return account_url

    def validate_connection(self, **kwargs):
        logger.debug('Validating Azure Blob Storage connection')

        try:
            container_properties = self.container_client.get_container_properties()
            logger.debug(f'Container exists: {container_properties.name}')
        except ResourceNotFoundError:
            raise KeyError(f'Container not found: {self.container}')

        # Check path existence for Import storages only
        if self.prefix and 'Export' not in self.__class__.__name__:
            logger.debug(f'Test connection to container {self.container} with prefix {self.prefix}')
            prefix = str(self.prefix)
            try:
                blob = next(self.container_client.list_blob_names(name_starts_with=prefix))
            except StopIteration:
                blob = None

            if not blob:
                raise KeyError(f'{self.url_scheme}://{self.container}/{self.prefix} not found.')


class AzureServicePrincipalImportStorageBase(AzureServicePrincipalStorageMixin, ImportStorage):
    url_scheme = 'azure_spi'

    presign = models.BooleanField(_('presign'), default=True, help_text='Generate presigned URLs')
    presign_ttl = models.PositiveSmallIntegerField(
        _('presign_ttl'), default=1, help_text='Presigned URLs TTL (in minutes)'
    )

    def get_sas_token(self, container_name: str, blob_name: str):
        expiry = datetime.now() + timedelta(minutes=self.presign_ttl)

        sas_token = generate_blob_sas(
            account_name=self.get_account_name(),
            container_name=container_name,
            blob_name=blob_name,
            user_delegation_key=self.delegation_key,
            permission=BlobSasPermissions(read=True),
            expiry=expiry,
        )
        return sas_token

    def iterkeys(self):
        prefix = str(self.prefix) if self.prefix else ''
        files = self.container_client.list_blobs(name_starts_with=prefix)
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
            return {data_key: f'{self.url_scheme}://{self.container}/{key}'}

        blob = self.container_client.download_blob(key)
        blob_str = blob.content_as_text()
        value = json.loads(blob_str)
        if not isinstance(value, dict):
            raise ValueError(
                f'Error on key {key}: For {self.__class__.__name__} your JSON file must be a dictionary with one task'
            )
        return value

    def scan_and_create_links(self):
        return self._scan_and_create_links(AzureServicePrincipalImportStorageLink)

    def generate_http_url(self, url):
        match = re.match(AZURE_URL_PATTERN, url)
        if match:
            container_name = match.group('container_name')
            blob_name = match.group('blob_name')
            sas_token = self.get_sas_token(container_name=container_name, blob_name=blob_name)
            url = f'{self.get_account_url()}/{container_name}/{blob_name}?{sas_token}'
        return url

    def get_blob_metadata(self, key) -> dict:
        blob = self.container_client.get_blob_client(key)
        return dict(blob.get_blob_properties())

    class Meta:
        abstract = True


class AzureServicePrincipalImportStorage(ProjectStorageMixin, AzureServicePrincipalImportStorageBase):
    class Meta:
        abstract = False


class AzureServicePrincipalExportStorage(
    AzureServicePrincipalStorageMixin, ExportStorage
):  # note: order is important!
    def save_annotation(self, annotation):
        logger.debug(f'Creating new object on {self.__class__.__name__} Storage {self} for annotation {annotation}')
        ser_annotation = self._get_serialized_data(annotation)
        # get key that identifies this object in storage
        key = AzureServicePrincipalExportStorageLink.get_key(annotation)
        key = str(self.prefix) + '/' + key if self.prefix else key

        # put object into storage
        blob = self.container_client.get_blob_client(key)
        blob.upload_blob(json.dumps(ser_annotation), overwrite=True)

        # create link if everything ok
        AzureServicePrincipalExportStorageLink.create(annotation, self)


def async_export_annotation_to_azure_storages(annotation):
    project = annotation.project
    if hasattr(project, 'io_storages_azureserviceprincipalexportstorages'):
        for storage in project.io_storages_azureserviceprincipalexportstorages.all():
            logger.debug(f'Export {annotation} to Azure Blob storage {storage}')
            storage.save_annotation(annotation)


@receiver(post_save, sender=Annotation)
def export_annotation_to_azure_storages(sender, instance, **kwargs):
    storages = getattr(instance.project, 'io_storages_azureserviceprincipalexportstorages', None)
    if storages and storages.exists():  # avoid excess jobs in rq
        start_job_async_or_sync(async_export_annotation_to_azure_storages, instance)


class AzureServicePrincipalImportStorageLink(ImportStorageLink):
    storage = models.ForeignKey(AzureServicePrincipalImportStorage, on_delete=models.CASCADE, related_name='links')


class AzureServicePrincipalExportStorageLink(ExportStorageLink):
    storage = models.ForeignKey(AzureServicePrincipalExportStorage, on_delete=models.CASCADE, related_name='links')
