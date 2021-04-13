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
    Get all GCS import storages

    Get list of GCS import storages

    post:
    Create GCS import storage

    Create a new GCS import storage
    """
    queryset = GCSImportStorage.objects.all()
    serializer_class = GCSImportStorageSerializer


class GCSImportStorageDetailAPI(ImportStorageDetailAPI):
    """
    get:
    Get GCS import storage

    Get GCS import storage

    patch:
    Update GCS import storage

    Update GCS import storage

    delete:
    Delete GCS import storage

    Delete GCS import storage
    """
    queryset = GCSImportStorage.objects.all()
    serializer_class = GCSImportStorageSerializer


class GCSImportStorageSyncAPI(ImportStorageSyncAPI):
    """
    post:
    Sync GCS import storage

    Sync with GCS import storage
    """
    serializer_class = GCSImportStorageSerializer


class GCSImportStorageValidateAPI(ImportStorageValidateAPI):
    """
    post:
    Validate GCS import storage

    Validate GCS import storage
    """
    serializer_class = GCSImportStorageSerializer


class GCSExportStorageValidateAPI(ExportStorageValidateAPI):
    """
    post:
    Validate GCS export storage

    Validate GCS export storage
    """
    serializer_class = GCSExportStorageSerializer


class GCSExportStorageListAPI(ExportStorageListAPI):
    """
    get:
    Get all GCS export storages

    Get list of all GCS export storages

    post:
    Create GCS export storage

    Create a new GCS export storage
    """
    queryset = GCSExportStorage.objects.all()
    serializer_class = GCSExportStorageSerializer


class GCSExportStorageDetailAPI(ExportStorageDetailAPI):
    """
    get:
    Get GCS export storage

    Get GCS export storage

    patch:
    Update GCS export storage

    Update GCS export storage

    delete:
    Delete GCS export storage

    Delete GCS export storage
    """
    queryset = GCSExportStorage.objects.all()
    serializer_class = GCSExportStorageSerializer


class GCSImportStorageFormLayoutAPI(ImportStorageFormLayoutAPI):
    pass


class GCSExportStorageFormLayoutAPI(ExportStorageFormLayoutAPI):
    pass
