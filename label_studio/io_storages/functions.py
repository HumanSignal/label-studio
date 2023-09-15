import logging

from .azure_blob.api import AzureBlobExportStorageListAPI, AzureBlobImportStorageListAPI
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
            'title': 'Microsoft Azure',
            'import_list_api': AzureBlobImportStorageListAPI,
            'export_list_api': AzureBlobExportStorageListAPI,
        },
        {
            'name': 'redis',
            'title': 'Redis',
            'import_list_api': RedisImportStorageListAPI,
            'export_list_api': RedisExportStorageListAPI,
        },
    ]
