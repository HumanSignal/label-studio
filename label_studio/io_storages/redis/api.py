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
    Get all Redis import storages

    Get list of all Redis import storages

    post:
    Create Redis import storage

    Create a new Redis import storage
    """
    queryset = RedisImportStorage.objects.all()
    serializer_class = RedisImportStorageSerializer


class RedisImportStorageDetailAPI(ImportStorageDetailAPI):
    """
    get:
    Get Redis import storage

    Get Redis import storage

    patch:
    Update Redis import storage

    Update Redis import storage

    delete:
    Delete Redis import storage

    Delete Redis import storage
    """
    queryset = RedisImportStorage.objects.all()
    serializer_class = RedisImportStorageSerializer


class RedisImportStorageSyncAPI(ImportStorageSyncAPI):
    """
    post:
    Sync Redis import storage

    Sync with Redis import storage
    """
    serializer_class = RedisImportStorageSerializer


class RedisImportStorageValidateAPI(ImportStorageValidateAPI):
    """
    post:
    Validate Redis import storage

    Validate Redis import storage
    """
    serializer_class = RedisImportStorageSerializer


class RedisExportStorageValidateAPI(ExportStorageValidateAPI):
    """
    post:
    Validate Redis export storage

    Validate Redis export storage
    """
    serializer_class = RedisExportStorageSerializer


class RedisExportStorageListAPI(ExportStorageListAPI):
    """
    get:
    Get all Redis export storages

    Get list of all Redis export storages

    post:
    Create Redis export storage

    Create a new Redis export storage
    """
    queryset = RedisExportStorage.objects.all()
    serializer_class = RedisExportStorageSerializer


class RedisExportStorageDetailAPI(ExportStorageDetailAPI):
    """
    get:
    Get Redis export storage

    Get Redis export storage

    patch:
    Update Redis export storage

    Update Redis export storage

    delete:
    Delete Redis export storage

    Delete Redis export storage
    """
    queryset = RedisExportStorage.objects.all()
    serializer_class = RedisExportStorageSerializer


class RedisImportStorageFormLayoutAPI(ImportStorageFormLayoutAPI):
    pass


class RedisExportStorageFormLayoutAPI(ExportStorageFormLayoutAPI):
    pass
