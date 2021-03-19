"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
from io_storages.localfiles.models import LocalFilesImportStorage, LocalFilesExportStorage
from io_storages.localfiles.serializers import LocalFilesImportStorageSerializer, LocalFilesExportStorageSerializer
from io_storages.api import (
    ImportStorageListAPI, ImportStorageDetailAPI, ImportStorageSyncAPI, ExportStorageListAPI, ExportStorageDetailAPI,
    ImportStorageValidateAPI, ExportStorageValidateAPI, ImportStorageFormLayoutAPI, ExportStorageFormLayoutAPI
)


class LocalFilesImportStorageListAPI(ImportStorageListAPI):
    queryset = LocalFilesImportStorage.objects.all()
    serializer_class = LocalFilesImportStorageSerializer


class LocalFilesImportStorageDetailAPI(ImportStorageDetailAPI):
    queryset = LocalFilesImportStorage.objects.all()
    serializer_class = LocalFilesImportStorageSerializer


class LocalFilesImportStorageSyncAPI(ImportStorageSyncAPI):
    serializer_class = LocalFilesImportStorageSerializer


class LocalFilesImportStorageValidateAPI(ImportStorageValidateAPI):
    serializer_class = LocalFilesImportStorageSerializer


class LocalFilesExportStorageValidateAPI(ExportStorageValidateAPI):
    serializer_class = LocalFilesExportStorageSerializer


class LocalFilesExportStorageListAPI(ExportStorageListAPI):
    queryset = LocalFilesExportStorage.objects.all()
    serializer_class = LocalFilesExportStorageSerializer


class LocalFilesExportStorageDetailAPI(ExportStorageDetailAPI):
    queryset = LocalFilesExportStorage.objects.all()
    serializer_class = LocalFilesExportStorageSerializer


class LocalFilesImportStorageFormLayoutAPI(ImportStorageFormLayoutAPI):
    pass


class LocalFilesExportStorageFormLayoutAPI(ExportStorageFormLayoutAPI):
    pass
