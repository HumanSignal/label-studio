"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
from io_storages.azure_blob.models import AzureBlobImportStorage, AzureBlobExportStorage
from io_storages.azure_blob.serializers import AzureBlobImportStorageSerializer, AzureBlobExportStorageSerializer
from io_storages.api import (
    ImportStorageListAPI, ImportStorageDetailAPI, ImportStorageSyncAPI, ExportStorageListAPI, ExportStorageDetailAPI,
    ImportStorageValidateAPI, ExportStorageValidateAPI, ImportStorageFormLayoutAPI, ExportStorageFormLayoutAPI
)


class AzureBlobImportStorageListAPI(ImportStorageListAPI):
    """
    get:
    Azure: Get all import storage

    Get list of all Azure import storage connections.

    post:
    Azure: Create import storage

    Create a new Azure import storage connection.
    """
    queryset = AzureBlobImportStorage.objects.all()
    serializer_class = AzureBlobImportStorageSerializer


class AzureBlobImportStorageDetailAPI(ImportStorageDetailAPI):
    """
    get:
    Azure: Get import storage

    Get a specific Azure import storage connection.

    patch:
    Azure: Update import storage

    Update a specific Azure import storage connection.

    delete:
    Azure: Delete import storage

    Delete a specific Azure import storage connection.
    """
    queryset = AzureBlobImportStorage.objects.all()
    serializer_class = AzureBlobImportStorageSerializer


class AzureBlobImportStorageSyncAPI(ImportStorageSyncAPI):
    """
    post:
    Azure: Sync import storage

    Sync tasks from an Azure import storage connection.
    """
    serializer_class = AzureBlobImportStorageSerializer


class AzureBlobImportStorageValidateAPI(ImportStorageValidateAPI):
    """
    post:
    Azure: Validate import storage

    Validate a specific Azure import storage connection.
    """
    serializer_class = AzureBlobImportStorageSerializer


class AzureBlobExportStorageValidateAPI(ExportStorageValidateAPI):
    """
    post:
    Azure: Validate export storage

    Validate a specific Azure export storage connection.
    """
    serializer_class = AzureBlobExportStorageSerializer


class AzureBlobExportStorageListAPI(ExportStorageListAPI):
    """
    get:
    Azure: Get all export storage

    Get a list of all Azure export storage connections.

    post:
    Azure: Create export storage

    Create a new Azure export storage connection to store annotations.
    """
    queryset = AzureBlobExportStorage.objects.all()
    serializer_class = AzureBlobExportStorageSerializer


class AzureBlobExportStorageDetailAPI(ExportStorageDetailAPI):
    """
    get:
    Azure: Get export storage

    Get a specific Azure export storage connection.

    patch:
    Azure: Update export storage

    Update a specific Azure export storage connection.

    delete:
    Azure: Delete export storage

    Delete a specific Azure export storage connection.
    """
    queryset = AzureBlobExportStorage.objects.all()
    serializer_class = AzureBlobExportStorageSerializer


class AzureBlobImportStorageFormLayoutAPI(ImportStorageFormLayoutAPI):
    pass


class AzureBlobExportStorageFormLayoutAPI(ExportStorageFormLayoutAPI):
    pass
