"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
from django.utils.decorators import method_decorator
from drf_yasg.utils import swagger_auto_schema
from drf_yasg import openapi as openapi
from io_storages.gcs.models import GCSImportStorage, GCSExportStorage
from io_storages.gcs.serializers import GCSImportStorageSerializer, GCSExportStorageSerializer
from io_storages.api import (
    ImportStorageListAPI,
    ImportStorageDetailAPI,
    ImportStorageSyncAPI,
    ExportStorageListAPI,
    ExportStorageDetailAPI,
    ExportStorageSyncAPI,
    ImportStorageValidateAPI,
    ExportStorageValidateAPI,
    ImportStorageFormLayoutAPI,
    ExportStorageFormLayoutAPI,
)


@method_decorator(
    name='get',
    decorator=swagger_auto_schema(
        tags=['Storage: GCS'],
        operation_summary='Get all import storage',
        operation_description='Get a list of all GCS import storage connections.',
        manual_parameters=[
            openapi.Parameter(
                name='project',
                type=openapi.TYPE_INTEGER,
                in_=openapi.IN_QUERY,
                description='Project ID',
            ),
        ],
    ),
)
@method_decorator(
    name='post',
    decorator=swagger_auto_schema(
        tags=['Storage: GCS'],
        operation_summary='Create import storage',
        operation_description='Create a new GCS import storage connection.',
    ),
)
class GCSImportStorageListAPI(ImportStorageListAPI):
    queryset = GCSImportStorage.objects.all()
    serializer_class = GCSImportStorageSerializer


@method_decorator(
    name='get',
    decorator=swagger_auto_schema(
        tags=['Storage: GCS'],
        operation_summary='Get import storage',
        operation_description='Get a specific GCS import storage connection.',
    ),
)
@method_decorator(
    name='patch',
    decorator=swagger_auto_schema(
        tags=['Storage: GCS'],
        operation_summary='Update import storage',
        operation_description='Update a specific GCS import storage connection.',
    ),
)
@method_decorator(
    name='delete',
    decorator=swagger_auto_schema(
        tags=['Storage: GCS'],
        operation_summary='Delete import storage',
        operation_description='Delete a specific GCS import storage connection.',
    ),
)
class GCSImportStorageDetailAPI(ImportStorageDetailAPI):
    queryset = GCSImportStorage.objects.all()
    serializer_class = GCSImportStorageSerializer


@method_decorator(
    name='post',
    decorator=swagger_auto_schema(
        tags=['Storage: GCS'],
        operation_summary='Sync import storage',
        operation_description='Sync tasks from an GCS import storage connection.',
    ),
)
class GCSImportStorageSyncAPI(ImportStorageSyncAPI):
    serializer_class = GCSImportStorageSerializer


@method_decorator(
    name='post',
    decorator=swagger_auto_schema(
        tags=['Storage: GCS'],
        operation_summary='Sync export storage',
        operation_description='Sync tasks from an GCS export storage connection.',
    ),
)
class GCSExportStorageSyncAPI(ExportStorageSyncAPI):
    serializer_class = GCSExportStorageSerializer


@method_decorator(
    name='post',
    decorator=swagger_auto_schema(
        tags=['Storage: GCS'],
        operation_summary='Validate import storage',
        operation_description='Validate a specific GCS import storage connection.',
    ),
)
class GCSImportStorageValidateAPI(ImportStorageValidateAPI):
    serializer_class = GCSImportStorageSerializer


@method_decorator(
    name='post',
    decorator=swagger_auto_schema(
        tags=['Storage: GCS'],
        operation_summary='Validate export storage',
        operation_description='Validate a specific GCS export storage connection.',
    ),
)
class GCSExportStorageValidateAPI(ExportStorageValidateAPI):
    serializer_class = GCSExportStorageSerializer


@method_decorator(
    name='get',
    decorator=swagger_auto_schema(
        tags=['Storage: GCS'],
        operation_summary='Get all export storage',
        operation_description='Get a list of all GCS export storage connections.',
        manual_parameters=[
            openapi.Parameter(
                name='project',
                type=openapi.TYPE_INTEGER,
                in_=openapi.IN_QUERY,
                description='Project ID',
            ),
        ],
    ),
)
@method_decorator(
    name='post',
    decorator=swagger_auto_schema(
        tags=['Storage: GCS'],
        operation_summary='Create export storage',
        operation_description='Create a new GCS export storage connection to store annotations.',
    ),
)
class GCSExportStorageListAPI(ExportStorageListAPI):
    queryset = GCSExportStorage.objects.all()
    serializer_class = GCSExportStorageSerializer


@method_decorator(
    name='get',
    decorator=swagger_auto_schema(
        tags=['Storage: GCS'],
        operation_summary='Get export storage',
        operation_description='Get a specific GCS export storage connection.',
    ),
)
@method_decorator(
    name='patch',
    decorator=swagger_auto_schema(
        tags=['Storage: GCS'],
        operation_summary='Update export storage',
        operation_description='Update a specific GCS export storage connection.',
    ),
)
@method_decorator(
    name='delete',
    decorator=swagger_auto_schema(
        tags=['Storage: GCS'],
        operation_summary='Delete export storage',
        operation_description='Delete a specific GCS export storage connection.',
    ),
)
class GCSExportStorageDetailAPI(ExportStorageDetailAPI):
    queryset = GCSExportStorage.objects.all()
    serializer_class = GCSExportStorageSerializer


class GCSImportStorageFormLayoutAPI(ImportStorageFormLayoutAPI):
    pass


class GCSExportStorageFormLayoutAPI(ExportStorageFormLayoutAPI):
    pass
