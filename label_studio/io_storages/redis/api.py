"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
from io_storages.redis.models import RedisImportStorage, RedisExportStorage
from io_storages.redis.serializers import RedisImportStorageSerializer, RedisExportStorageSerializer
from io_storages.api import (
    ImportStorageListAPI, ImportStorageDetailAPI, ImportStorageSyncAPI, ExportStorageListAPI, ExportStorageDetailAPI,
    ImportStorageValidateAPI, ExportStorageValidateAPI, ImportStorageFormLayoutAPI, ExportStorageFormLayoutAPI
)


class RedisImportStorageListAPI(ImportStorageListAPI):
    """
    get:
    Redis: Get all import storage

    Get a list of all Redis import storage connections.

    post:
    Redis: Create import storage

    Create a new Redis import storage connection.
    """
    queryset = RedisImportStorage.objects.all()
    serializer_class = RedisImportStorageSerializer


class RedisImportStorageDetailAPI(ImportStorageDetailAPI):
    """
    get:
    Redis: Get import storage

    Get a specific Redis import storage connection.

    patch:
    Redis: Update import storage

    Update a specific Redis import storage connection.

    delete:
    Redis: Delete import storage

    Delete a specific Redis import storage connection.
    """
    queryset = RedisImportStorage.objects.all()
    serializer_class = RedisImportStorageSerializer


class RedisImportStorageSyncAPI(ImportStorageSyncAPI):
    """
    post:
    Redis: Sync import storage

    Sync tasks from a specific Redis import storage connection.
    """
    serializer_class = RedisImportStorageSerializer


class RedisImportStorageValidateAPI(ImportStorageValidateAPI):
    """
    post:
    Redis: Validate import storage

    Validate a specific Redis import storage connection.
    """
    serializer_class = RedisImportStorageSerializer


class RedisExportStorageValidateAPI(ExportStorageValidateAPI):
    """
    post:
    Redis: Validate export storage

    Validate a specific Redis export storage connection.
    """
    serializer_class = RedisExportStorageSerializer


class RedisExportStorageListAPI(ExportStorageListAPI):
    """
    get:
    Redis: Get all export storage

    Get a list of all Redis export storage connections.

    post:
    Redis: Create export storage

    Create a new Redis export storage connection to store annotations.
    """
    queryset = RedisExportStorage.objects.all()
    serializer_class = RedisExportStorageSerializer


class RedisExportStorageDetailAPI(ExportStorageDetailAPI):
    """
    get:
    Redis: Get export storage

    Get a specific Redis export storage connection.

    patch:
    Redis: Update export storage

    Update a specific Redis export storage connection.

    delete:
    Redis: Delete export storage

    Delete a specific Redis export storage connection.
    """
    queryset = RedisExportStorage.objects.all()
    serializer_class = RedisExportStorageSerializer


class RedisImportStorageFormLayoutAPI(ImportStorageFormLayoutAPI):
    pass


class RedisExportStorageFormLayoutAPI(ExportStorageFormLayoutAPI):
    pass
