"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
from io_storages.s3.models import S3ImportStorage, S3ExportStorage
from io_storages.s3.serializers import S3ImportStorageSerializer, S3ExportStorageSerializer
from io_storages.api import (
    ImportStorageListAPI, ImportStorageDetailAPI, ImportStorageSyncAPI, ExportStorageListAPI, ExportStorageDetailAPI,
    ImportStorageValidateAPI, ExportStorageValidateAPI, ImportStorageFormLayoutAPI, ExportStorageFormLayoutAPI
)


class S3ImportStorageListAPI(ImportStorageListAPI):
    queryset = S3ImportStorage.objects.all()
    serializer_class = S3ImportStorageSerializer


class S3ImportStorageDetailAPI(ImportStorageDetailAPI):
    queryset = S3ImportStorage.objects.all()
    serializer_class = S3ImportStorageSerializer


class S3ImportStorageSyncAPI(ImportStorageSyncAPI):
    serializer_class = S3ImportStorageSerializer


class S3ImportStorageValidateAPI(ImportStorageValidateAPI):
    serializer_class = S3ImportStorageSerializer


class S3ExportStorageValidateAPI(ExportStorageValidateAPI):
    serializer_class = S3ExportStorageSerializer


class S3ExportStorageListAPI(ExportStorageListAPI):
    queryset = S3ExportStorage.objects.all()
    serializer_class = S3ExportStorageSerializer


class S3ExportStorageDetailAPI(ExportStorageDetailAPI):
    queryset = S3ExportStorage.objects.all()
    serializer_class = S3ExportStorageSerializer


class S3ImportStorageFormLayoutAPI(ImportStorageFormLayoutAPI):
    pass


class S3ExportStorageFormLayoutAPI(ExportStorageFormLayoutAPI):
    pass
