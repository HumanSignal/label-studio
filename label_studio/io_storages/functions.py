import logging
from typing import Dict, Iterable, List, Union

from core.feature_flags import flag_set
from io_storages.base_models import ImportStorage

from .azure_blob.api import AzureBlobExportStorageListAPI, AzureBlobImportStorageListAPI
from .azure_serviceprincipal.api import (
    AzureServicePrincipalExportStorageListAPI,
    AzureServicePrincipalImportStorageListAPI,
)
from .gcs.api import GCSExportStorageListAPI, GCSImportStorageListAPI
from .redis.api import RedisExportStorageListAPI, RedisImportStorageListAPI
from .s3.api import S3ExportStorageListAPI, S3ImportStorageListAPI

logger = logging.getLogger(__name__)


def get_storage_list():
    return [
        {
            'name': 's3',
            'title': 'AWS S3',
            'import_list_api': S3ImportStorageListAPI,
            'export_list_api': S3ExportStorageListAPI,
        },
        {
            'name': 'gcs',
            'title': 'Google Cloud Storage',
            'import_list_api': GCSImportStorageListAPI,
            'export_list_api': GCSExportStorageListAPI,
        },
        {
            'name': 'azure',
            'title': 'Microsoft Azure - AccountKey',
            'import_list_api': AzureBlobImportStorageListAPI,
            'export_list_api': AzureBlobExportStorageListAPI,
        },
        {
            'name': 'azure_spi',
            'title': 'Microsoft Azure - Service Principal',
            'import_list_api': AzureServicePrincipalImportStorageListAPI,
            'export_list_api': AzureServicePrincipalExportStorageListAPI,
        },
        {
            'name': 'redis',
            'title': 'Redis',
            'import_list_api': RedisImportStorageListAPI,
            'export_list_api': RedisExportStorageListAPI,
        },
    ]


def get_storage_by_url(url: Union[str, List, Dict], storage_objects: Iterable[ImportStorage]) -> ImportStorage:
    """Find the first compatible storage and returns storage that can emit pre-signed URL"""

    for storage_object in storage_objects:
        # check url is string because task can have int, float, dict, list
        # and 'can_resolve_url' will fail
        if isinstance(url, str) and storage_object.can_resolve_url(url):
            return storage_object

    # url is list or dict
    if flag_set('fflag_feat_front_lsdv_4661_full_uri_resolve_15032023_short', user='auto'):
        if isinstance(url, dict) or isinstance(url, list):
            for storage_object in storage_objects:
                if storage_object.can_resolve_url(url):
                    # note: only first found storage_object will be used for link resolving
                    # probably we need to use more advanced can_resolve_url mechanics
                    # that takes into account not only prefixes, but bucket path too
                    return storage_object
