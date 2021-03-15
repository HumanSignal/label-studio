"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
from io_storages.gcs.models import GCSImportStorage, GCSExportStorage
from io_storages.gcs.serializers import GCSImportStorageSerializer, GCSExportStorageSerializer
from io_storages.api import (
    ImportStorageListAPI, ImportStorageDetailAPI, ImportStorageSyncAPI, ExportStorageListAPI, ExportStorageDetailAPI,
    ImportStorageValidateAPI, ExportStorageValidateAPI, ImportStorageFormLayoutAPI, ExportStorageFormLayoutAPI
)

class GCSImportStorageListAPI(ImportStorageListAPI):
    queryset = GCSImportStorage.objects.all()
    serializer_class = GCSImportStorageSerializer


class GCSImportStorageDetailAPI(ImportStorageDetailAPI):
    queryset = GCSImportStorage.objects.all()
    serializer_class = GCSImportStorageSerializer


class GCSImportStorageSyncAPI(ImportStorageSyncAPI):
    serializer_class = GCSImportStorageSerializer


class GCSImportStorageValidateAPI(ImportStorageValidateAPI):
    serializer_class = GCSImportStorageSerializer


class GCSExportStorageValidateAPI(ExportStorageValidateAPI):
    serializer_class = GCSExportStorageSerializer


class GCSExportStorageListAPI(ExportStorageListAPI):
    queryset = GCSExportStorage.objects.all()
    serializer_class = GCSExportStorageSerializer


class GCSExportStorageDetailAPI(ExportStorageDetailAPI):
    queryset = GCSExportStorage.objects.all()
    serializer_class = GCSExportStorageSerializer


class GCSImportStorageFormLayoutAPI(ImportStorageFormLayoutAPI):
    pass


class GCSExportStorageFormLayoutAPI(ExportStorageFormLayoutAPI):
    pass
