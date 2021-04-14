"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
from io_storages.gcs.models import GCSImportStorage, GCSExportStorage
from io_storages.gcs.serializers import GCSImportStorageSerializer, GCSExportStorageSerializer
from io_storages.api import (
    ImportStorageListAPI, ImportStorageDetailAPI, ImportStorageSyncAPI, ExportStorageListAPI, ExportStorageDetailAPI,
    ImportStorageValidateAPI, ExportStorageValidateAPI, ImportStorageFormLayoutAPI, ExportStorageFormLayoutAPI
)


class GCSImportStorageListAPI(ImportStorageListAPI):
    """
    get:
    GCS: Get all import storage

    Get a list of all GCS import storage connections.

    post:
    GCS: Create import storage

    Create a new GCS import storage connection.
    """
    queryset = GCSImportStorage.objects.all()
    serializer_class = GCSImportStorageSerializer


class GCSImportStorageDetailAPI(ImportStorageDetailAPI):
    """
    get:
    GCS: Get import storage

    Get a specific GCS import storage connection.

    patch:
    GCS: Update import storage

    Update a specific GCS import storage connection.

    delete:
    GCS: Delete import storage

    Delete a specific GCS import storage connection.
    """
    queryset = GCSImportStorage.objects.all()
    serializer_class = GCSImportStorageSerializer


class GCSImportStorageSyncAPI(ImportStorageSyncAPI):
    """
    post:
    GCS: Sync import storage

    Sync tasks from an GCS import storage connection.
    """
    serializer_class = GCSImportStorageSerializer


class GCSImportStorageValidateAPI(ImportStorageValidateAPI):
    """
    post:
    GCS: Validate import storage

    Validate a specific GCS import storage connection.
    """
    serializer_class = GCSImportStorageSerializer


class GCSExportStorageValidateAPI(ExportStorageValidateAPI):
    """
    post:
    GCS: Validate export storage

    Validate a specific GCS export storage connection.
    """
    serializer_class = GCSExportStorageSerializer


class GCSExportStorageListAPI(ExportStorageListAPI):
    """
    get:
    GCS: Get all export storage

    Get a list of all GCS export storage connections.

    post:
    GCS: Create export storage

    Create a new GCS export storage connection to store annotations.
    """
    queryset = GCSExportStorage.objects.all()
    serializer_class = GCSExportStorageSerializer


class GCSExportStorageDetailAPI(ExportStorageDetailAPI):
    """
    get:
    GCS: Get export storage

    Get a specific GCS export storage connection.

    patch:
    GCS: Update export storage

    Update a specific GCS export storage connection.

    delete:
    GCS: Delete export storage

    Delete a specific GCS export storage connection.
    """
    queryset = GCSExportStorage.objects.all()
    serializer_class = GCSExportStorageSerializer


class GCSImportStorageFormLayoutAPI(ImportStorageFormLayoutAPI):
    pass


class GCSExportStorageFormLayoutAPI(ExportStorageFormLayoutAPI):
    pass
