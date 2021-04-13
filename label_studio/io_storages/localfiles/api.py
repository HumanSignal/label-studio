"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
from io_storages.localfiles.models import LocalFilesImportStorage, LocalFilesExportStorage
from io_storages.localfiles.serializers import LocalFilesImportStorageSerializer, LocalFilesExportStorageSerializer
from io_storages.api import (
    ImportStorageListAPI, ImportStorageDetailAPI, ImportStorageSyncAPI, ExportStorageListAPI, ExportStorageDetailAPI,
    ImportStorageValidateAPI, ExportStorageValidateAPI, ImportStorageFormLayoutAPI, ExportStorageFormLayoutAPI
)


class LocalFilesImportStorageListAPI(ImportStorageListAPI):
    """
    get:
    Get all Local import storages

    Get list of all Local import storages

    post:
    Create Local import storage

    Create a new Local import storage
    """
    queryset = LocalFilesImportStorage.objects.all()
    serializer_class = LocalFilesImportStorageSerializer


class LocalFilesImportStorageDetailAPI(ImportStorageDetailAPI):
    """
    get:
    Get Local import storage

    Get Local import storage

    patch:
    Update Local import storage

    Update Local import storage

    delete:
    Delete Local import storage

    Delete Local import storage
    """
    queryset = LocalFilesImportStorage.objects.all()
    serializer_class = LocalFilesImportStorageSerializer


class LocalFilesImportStorageSyncAPI(ImportStorageSyncAPI):
    """
    post:
    Sync Local import storage

    Sync with Local import storage
    """
    serializer_class = LocalFilesImportStorageSerializer


class LocalFilesImportStorageValidateAPI(ImportStorageValidateAPI):
    """
    post:
    Validate Local import storage

    Validate Local import storage
    """
    serializer_class = LocalFilesImportStorageSerializer


class LocalFilesExportStorageValidateAPI(ExportStorageValidateAPI):
    """
    post:
    Validate Local export storage

    Validate Local export storage
    """
    serializer_class = LocalFilesExportStorageSerializer


class LocalFilesExportStorageListAPI(ExportStorageListAPI):
    """
    get:
    Get all Local export storages

    Get list of all Local export storages

    post:
    Create Local export storage

    Create a new Local export storage
    """
    queryset = LocalFilesExportStorage.objects.all()
    serializer_class = LocalFilesExportStorageSerializer


class LocalFilesExportStorageDetailAPI(ExportStorageDetailAPI):
    """
    get:
    Get Local export storage

    Get Local export storage

    patch:
    Update Local export storage

    Update Local export storage

    delete:
    Delete Local export storage

    Delete Local export storage
    """
    queryset = LocalFilesExportStorage.objects.all()
    serializer_class = LocalFilesExportStorageSerializer


class LocalFilesImportStorageFormLayoutAPI(ImportStorageFormLayoutAPI):
    pass


class LocalFilesExportStorageFormLayoutAPI(ExportStorageFormLayoutAPI):
    pass
