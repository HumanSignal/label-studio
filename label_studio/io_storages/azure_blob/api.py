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
    Get all Azure import storages

    Get list of all Azure import storages

    post:
    Create Azure import storage

    Create a new Azure import storage
    """
    queryset = AzureBlobImportStorage.objects.all()
    serializer_class = AzureBlobImportStorageSerializer


class AzureBlobImportStorageDetailAPI(ImportStorageDetailAPI):
    """
    get:
    Get Azure import storage

    Get Azure import storage

    patch:
    Update Azure import storage

    Update Azure import storage

    delete:
    Delete Azure import storage

    Delete Azure import storage
    """
    queryset = AzureBlobImportStorage.objects.all()
    serializer_class = AzureBlobImportStorageSerializer


class AzureBlobImportStorageSyncAPI(ImportStorageSyncAPI):
    """
    post:
    Sync Azure import storage

    Sync with Azure import storage
    """
    serializer_class = AzureBlobImportStorageSerializer


class AzureBlobImportStorageValidateAPI(ImportStorageValidateAPI):
    """
    post:
    Validate Azure import storage

    Validate Azure import storage
    """
    serializer_class = AzureBlobImportStorageSerializer


class AzureBlobExportStorageValidateAPI(ExportStorageValidateAPI):
    """
    post:
    Validate Azure export storage

    Validate Azure export storage
    """
    serializer_class = AzureBlobExportStorageSerializer


class AzureBlobExportStorageListAPI(ExportStorageListAPI):
    """
    get:
    Get all Azure export storages

    Get list of all Azure export storages

    post:
    Create Azure export storage

    Create a new Azure export storage
    """
    queryset = AzureBlobExportStorage.objects.all()
    serializer_class = AzureBlobExportStorageSerializer


class AzureBlobExportStorageDetailAPI(ExportStorageDetailAPI):
    """
    get:
    Get Azure export storage

    Get Azure export storage

    patch:
    Update Azure export storage

    Update Azure export storage

    delete:
    Delete Azure export storage

    Delete Azure export storage
    """
    queryset = AzureBlobExportStorage.objects.all()
    serializer_class = AzureBlobExportStorageSerializer


class AzureBlobImportStorageFormLayoutAPI(ImportStorageFormLayoutAPI):
    pass


class AzureBlobExportStorageFormLayoutAPI(ExportStorageFormLayoutAPI):
    pass
