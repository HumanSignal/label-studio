"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
from label_studio.io_storages.azure_blob.models import AzureBlobImportStorage, AzureBlobImportStorageLink, AzureBlobExportStorage, AzureBlobExportStorageLink
from label_studio.io_storages.s3.models import S3ImportStorage, S3ImportStorageLink, S3ExportStorage, S3ExportStorageLink
from label_studio.io_storages.gcs.models import GCSImportStorage, GCSImportStorageLink, GCSExportStorage, GCSExportStorageLink
from label_studio.io_storages.redis.models import RedisImportStorage, RedisImportStorageLink, RedisExportStorage, RedisExportStorageLink


def get_import_storage_by_url(url):
    if not isinstance(url, str):
        return
    if url.startswith('s3'):
        return S3ImportStorage
    elif url.startswith('gs'):
        return GCSImportStorage
    elif url.startswith('azure'):
        return AzureBlobImportStorage
