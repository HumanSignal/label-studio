"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
from io_storages.redis.models import RedisImportStorage, RedisExportStorage
from io_storages.redis.serializers import RedisImportStorageSerializer, RedisExportStorageSerializer
from io_storages.api import (
    ImportStorageListAPI, ImportStorageDetailAPI, ImportStorageSyncAPI, ExportStorageListAPI, ExportStorageDetailAPI,
    ImportStorageValidateAPI, ExportStorageValidateAPI, ImportStorageFormLayoutAPI, ExportStorageFormLayoutAPI
)

class RedisImportStorageListAPI(ImportStorageListAPI):
    queryset = RedisImportStorage.objects.all()
    serializer_class = RedisImportStorageSerializer


class RedisImportStorageDetailAPI(ImportStorageDetailAPI):
    queryset = RedisImportStorage.objects.all()
    serializer_class = RedisImportStorageSerializer


class RedisImportStorageSyncAPI(ImportStorageSyncAPI):
    serializer_class = RedisImportStorageSerializer


class RedisImportStorageValidateAPI(ImportStorageValidateAPI):
    serializer_class = RedisImportStorageSerializer


class RedisExportStorageValidateAPI(ExportStorageValidateAPI):
    serializer_class = RedisExportStorageSerializer


class RedisExportStorageListAPI(ExportStorageListAPI):
    queryset = RedisExportStorage.objects.all()
    serializer_class = RedisExportStorageSerializer


class RedisExportStorageDetailAPI(ExportStorageDetailAPI):
    queryset = RedisExportStorage.objects.all()
    serializer_class = RedisExportStorageSerializer


class RedisImportStorageFormLayoutAPI(ImportStorageFormLayoutAPI):
    pass


class RedisExportStorageFormLayoutAPI(ExportStorageFormLayoutAPI):
    pass
