"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
from django.utils.decorators import method_decorator
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiParameter, OpenApiResponse, extend_schema
from io_storages.api import (
    ExportStorageDetailAPI,
    ExportStorageFormLayoutAPI,
    ExportStorageListAPI,
    ExportStorageSyncAPI,
    ExportStorageValidateAPI,
    ImportStorageDetailAPI,
    ImportStorageFormLayoutAPI,
    ImportStorageListAPI,
    ImportStorageSyncAPI,
    ImportStorageValidateAPI,
)
from io_storages.azure_blob.models import AzureBlobExportStorage, AzureBlobImportStorage
from io_storages.azure_blob.serializers import AzureBlobExportStorageSerializer, AzureBlobImportStorageSerializer

from .openapi_schema import (
    _azure_blob_export_storage_schema,
    _azure_blob_export_storage_schema_with_id,
    _azure_blob_import_storage_schema,
    _azure_blob_import_storage_schema_with_id,
)


@method_decorator(
    name='get',
    decorator=extend_schema(
        tags=['Storage: Azure'],
        summary='Get all import storage',
        description='Get list of all Azure import storage connections.',
        parameters=[
            OpenApiParameter(
                name='project',
                type=OpenApiTypes.INT,
                location='query',
                description='Project ID',
                required=True,
            ),
        ],
        request=None,
        extensions={
            'x-fern-sdk-group-name': ['import_storage', 'azure'],
            'x-fern-sdk-method-name': 'list',
            'x-fern-audiences': ['public'],
        },
    ),
)
@method_decorator(
    name='post',
    decorator=extend_schema(
        tags=['Storage: Azure'],
        summary='Create new storage',
        description='Create new Azure import storage',
        request={
            'application/json': _azure_blob_import_storage_schema,
        },
        extensions={
            'x-fern-sdk-group-name': ['import_storage', 'azure'],
            'x-fern-sdk-method-name': 'create',
            'x-fern-audiences': ['public'],
        },
    ),
)
class AzureBlobImportStorageListAPI(ImportStorageListAPI):
    queryset = AzureBlobImportStorage.objects.all()
    serializer_class = AzureBlobImportStorageSerializer


@method_decorator(
    name='get',
    decorator=extend_schema(
        tags=['Storage: Azure'],
        summary='Get import storage',
        description='Get a specific Azure import storage connection.',
        request=None,
        extensions={
            'x-fern-sdk-group-name': ['import_storage', 'azure'],
            'x-fern-sdk-method-name': 'get',
            'x-fern-audiences': ['public'],
        },
    ),
)
@method_decorator(
    name='patch',
    decorator=extend_schema(
        tags=['Storage: Azure'],
        summary='Update import storage',
        description='Update a specific Azure import storage connection.',
        request={
            'application/json': _azure_blob_import_storage_schema,
        },
        extensions={
            'x-fern-sdk-group-name': ['import_storage', 'azure'],
            'x-fern-sdk-method-name': 'update',
            'x-fern-audiences': ['public'],
        },
    ),
)
@method_decorator(
    name='delete',
    decorator=extend_schema(
        tags=['Storage: Azure'],
        summary='Delete import storage',
        description='Delete a specific Azure import storage connection.',
        request=None,
        extensions={
            'x-fern-sdk-group-name': ['import_storage', 'azure'],
            'x-fern-sdk-method-name': 'delete',
            'x-fern-audiences': ['public'],
        },
    ),
)
class AzureBlobImportStorageDetailAPI(ImportStorageDetailAPI):
    queryset = AzureBlobImportStorage.objects.all()
    serializer_class = AzureBlobImportStorageSerializer


@method_decorator(
    name='post',
    decorator=extend_schema(
        tags=['Storage: Azure'],
        summary='Sync import storage',
        description='Sync tasks from an Azure import storage connection.',
        parameters=[
            OpenApiParameter(
                name='id',
                type=OpenApiTypes.INT,
                location='path',
                description='Storage ID',
            ),
        ],
        request=None,
        extensions={
            'x-fern-sdk-group-name': ['import_storage', 'azure'],
            'x-fern-sdk-method-name': 'sync',
            'x-fern-audiences': ['public'],
        },
    ),
)
class AzureBlobImportStorageSyncAPI(ImportStorageSyncAPI):
    serializer_class = AzureBlobImportStorageSerializer


@method_decorator(
    name='post',
    decorator=extend_schema(
        tags=['Storage: Azure'],
        summary='Sync export storage',
        description='Sync tasks from an Azure export storage connection.',
        request=None,
        extensions={
            'x-fern-sdk-group-name': ['export_storage', 'azure'],
            'x-fern-sdk-method-name': 'sync',
            'x-fern-audiences': ['public'],
        },
    ),
)
class AzureBlobExportStorageSyncAPI(ExportStorageSyncAPI):
    serializer_class = AzureBlobExportStorageSerializer


@method_decorator(
    name='post',
    decorator=extend_schema(
        tags=['Storage: Azure'],
        summary='Validate import storage',
        description='Validate a specific Azure import storage connection.',
        request={
            'application/json': _azure_blob_import_storage_schema_with_id,
        },
        responses={200: OpenApiResponse(description='Validation successful')},
        extensions={
            'x-fern-sdk-group-name': ['import_storage', 'azure'],
            'x-fern-sdk-method-name': 'validate',
            'x-fern-audiences': ['public'],
        },
    ),
)
class AzureBlobImportStorageValidateAPI(ImportStorageValidateAPI):
    serializer_class = AzureBlobImportStorageSerializer


@method_decorator(
    name='post',
    decorator=extend_schema(
        tags=['Storage: Azure'],
        summary='Validate export storage',
        description='Validate a specific Azure export storage connection.',
        request={
            'application/json': _azure_blob_export_storage_schema_with_id,
        },
        responses={200: OpenApiResponse(description='Validation successful')},
        extensions={
            'x-fern-sdk-group-name': ['export_storage', 'azure'],
            'x-fern-sdk-method-name': 'validate',
            'x-fern-audiences': ['public'],
        },
    ),
)
class AzureBlobExportStorageValidateAPI(ExportStorageValidateAPI):
    serializer_class = AzureBlobExportStorageSerializer


@method_decorator(
    name='get',
    decorator=extend_schema(
        tags=['Storage: Azure'],
        summary='Get all export storage',
        description='Get a list of all Azure export storage connections.',
        parameters=[
            OpenApiParameter(
                name='project',
                type=OpenApiTypes.INT,
                location='query',
                description='Project ID',
                required=True,
            ),
        ],
        extensions={
            'x-fern-sdk-group-name': ['export_storage', 'azure'],
            'x-fern-sdk-method-name': 'list',
            'x-fern-audiences': ['public'],
        },
    ),
)
@method_decorator(
    name='post',
    decorator=extend_schema(
        tags=['Storage: Azure'],
        summary='Create export storage',
        description='Create a new Azure export storage connection to store annotations.',
        request={
            'application/json': _azure_blob_export_storage_schema,
        },
        extensions={
            'x-fern-sdk-group-name': ['export_storage', 'azure'],
            'x-fern-sdk-method-name': 'create',
            'x-fern-audiences': ['public'],
        },
    ),
)
class AzureBlobExportStorageListAPI(ExportStorageListAPI):
    queryset = AzureBlobExportStorage.objects.all()
    serializer_class = AzureBlobExportStorageSerializer


@method_decorator(
    name='get',
    decorator=extend_schema(
        tags=['Storage: Azure'],
        summary='Get export storage',
        description='Get a specific Azure export storage connection.',
        request=None,
        extensions={
            'x-fern-sdk-group-name': ['export_storage', 'azure'],
            'x-fern-sdk-method-name': 'get',
            'x-fern-audiences': ['public'],
        },
    ),
)
@method_decorator(
    name='patch',
    decorator=extend_schema(
        tags=['Storage: Azure'],
        summary='Update export storage',
        description='Update a specific Azure export storage connection.',
        request={
            'application/json': _azure_blob_export_storage_schema,
        },
        extensions={
            'x-fern-sdk-group-name': ['export_storage', 'azure'],
            'x-fern-sdk-method-name': 'update',
            'x-fern-audiences': ['public'],
        },
    ),
)
@method_decorator(
    name='delete',
    decorator=extend_schema(
        tags=['Storage: Azure'],
        summary='Delete export storage',
        description='Delete a specific Azure export storage connection.',
        request=None,
        extensions={
            'x-fern-sdk-group-name': ['export_storage', 'azure'],
            'x-fern-sdk-method-name': 'delete',
            'x-fern-audiences': ['public'],
        },
    ),
)
class AzureBlobExportStorageDetailAPI(ExportStorageDetailAPI):
    queryset = AzureBlobExportStorage.objects.all()
    serializer_class = AzureBlobExportStorageSerializer


class AzureBlobImportStorageFormLayoutAPI(ImportStorageFormLayoutAPI):
    pass


class AzureBlobExportStorageFormLayoutAPI(ExportStorageFormLayoutAPI):
    pass
