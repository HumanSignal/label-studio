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
    Local: Get all import storage

    Get a list of all local file import storage connections.

    post:
    Local: Create import storage

    Create a new local file import storage connection.
    """
    queryset = LocalFilesImportStorage.objects.all()
    serializer_class = LocalFilesImportStorageSerializer


class LocalFilesImportStorageDetailAPI(ImportStorageDetailAPI):
    """
    get:
    Local: Get import storage

    Get a specific local file import storage connection.

    patch:
    Local: Update import storage

    Update a specific local file import storage connection.

    delete:
    Local: Delete import storage

    Delete a specific local import storage connection.
    """
    queryset = LocalFilesImportStorage.objects.all()
    serializer_class = LocalFilesImportStorageSerializer


class LocalFilesImportStorageSyncAPI(ImportStorageSyncAPI):
    """
    post:
    Local: Sync import storage

    Sync tasks from a local file import storage connection.
    """
    serializer_class = LocalFilesImportStorageSerializer


class LocalFilesImportStorageValidateAPI(ImportStorageValidateAPI):
    """
    post:
    Local: Validate import storage

    Validate a specific local file import storage connection.
    """
    serializer_class = LocalFilesImportStorageSerializer


class LocalFilesExportStorageValidateAPI(ExportStorageValidateAPI):
    """
    post:
    Local: Validate export storage

    Validate a specific local file export storage connection.
    """
    serializer_class = LocalFilesExportStorageSerializer


class LocalFilesExportStorageListAPI(ExportStorageListAPI):
    """
    get:
    Local: Get all export storage

    Get a list of all Local export storage connections.

    post:
    Local: Create export storage

    Create a new local file export storage connection to store annotations.
    """
    queryset = LocalFilesExportStorage.objects.all()
    serializer_class = LocalFilesExportStorageSerializer


class LocalFilesExportStorageDetailAPI(ExportStorageDetailAPI):
    """
    get:
    Local: Get export storage

    Get a specific local file export storage connection.

    patch:
    Local: Update export storage

    Update a specific local file export storage connection.

    delete:
    Local: Delete export storage

    Delete a specific local file export storage connection.
    """
    queryset = LocalFilesExportStorage.objects.all()
    serializer_class = LocalFilesExportStorageSerializer


class LocalFilesImportStorageFormLayoutAPI(ImportStorageFormLayoutAPI):
    pass


class LocalFilesExportStorageFormLayoutAPI(ExportStorageFormLayoutAPI):
    pass
