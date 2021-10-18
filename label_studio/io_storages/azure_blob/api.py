"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
from django.utils.decorators import method_decorator
from drf_yasg.utils import swagger_auto_schema
from drf_yasg import openapi
from io_storages.azure_blob.models import AzureBlobImportStorage, AzureBlobExportStorage
from io_storages.azure_blob.serializers import AzureBlobImportStorageSerializer, AzureBlobExportStorageSerializer
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
        tags=['Storage: Azure'],
        operation_summary='Get all import storage',
        operation_description='Get list of all Azure import storage connections.',
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
        tags=['Storage: Azure'],
        operation_summary='Create new storage',
        operation_description='Get new Azure import storage',
    ),
)
class AzureBlobImportStorageListAPI(ImportStorageListAPI):
    queryset = AzureBlobImportStorage.objects.all()
    serializer_class = AzureBlobImportStorageSerializer


@method_decorator(
    name='get',
    decorator=swagger_auto_schema(
        tags=['Storage: Azure'],
        operation_summary='Get import storage',
        operation_description='Get a specific Azure import storage connection.',
    ),
)
@method_decorator(
    name='patch',
    decorator=swagger_auto_schema(
        tags=['Storage: Azure'],
        operation_summary='Update import storage',
        operation_description='Update a specific Azure import storage connection.',
    ),
)
@method_decorator(
    name='delete',
    decorator=swagger_auto_schema(
        tags=['Storage: Azure'],
        operation_summary='Delete import storage',
        operation_description='Delete a specific Azure import storage connection.',
    ),
)
class AzureBlobImportStorageDetailAPI(ImportStorageDetailAPI):
    queryset = AzureBlobImportStorage.objects.all()
    serializer_class = AzureBlobImportStorageSerializer


@method_decorator(
    name='post',
    decorator=swagger_auto_schema(
        tags=['Storage: Azure'],
        operation_summary='Sync import storage',
        operation_description='Sync tasks from an Azure import storage connection.',
    ),
)
class AzureBlobImportStorageSyncAPI(ImportStorageSyncAPI):
    serializer_class = AzureBlobImportStorageSerializer


@method_decorator(
    name='post',
    decorator=swagger_auto_schema(
        tags=['Storage: Azure'],
        operation_summary='Sync export storage',
        operation_description='Sync tasks from an Azure export storage connection.',
    ),
)
class AzureBlobExportStorageSyncAPI(ExportStorageSyncAPI):
    serializer_class = AzureBlobExportStorageSerializer


@method_decorator(
    name='post',
    decorator=swagger_auto_schema(
        tags=['Storage: Azure'],
        operation_summary='Validate import storage',
        operation_description='Validate a specific Azure import storage connection.',
    ),
)
class AzureBlobImportStorageValidateAPI(ImportStorageValidateAPI):
    serializer_class = AzureBlobImportStorageSerializer


@method_decorator(
    name='post',
    decorator=swagger_auto_schema(
        tags=['Storage: Azure'],
        operation_summary='Validate export storage',
        operation_description='Validate a specific Azure export storage connection.',
    ),
)
class AzureBlobExportStorageValidateAPI(ExportStorageValidateAPI):
    serializer_class = AzureBlobExportStorageSerializer


@method_decorator(
    name='get',
    decorator=swagger_auto_schema(
        tags=['Storage: Azure'],
        operation_summary='Get all export storage',
        operation_description='Get a list of all Azure export storage connections.',
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
        tags=['Storage: Azure'],
        operation_summary='Create export storage',
        operation_description='Create a new Azure export storage connection to store annotations.',
    ),
)
class AzureBlobExportStorageListAPI(ExportStorageListAPI):
    queryset = AzureBlobExportStorage.objects.all()
    serializer_class = AzureBlobExportStorageSerializer


@method_decorator(
    name='get',
    decorator=swagger_auto_schema(
        tags=['Storage: Azure'],
        operation_summary='Get export storage',
        operation_description='Get a specific Azure export storage connection.',
    ),
)
@method_decorator(
    name='patch',
    decorator=swagger_auto_schema(
        tags=['Storage: Azure'],
        operation_summary='Update export storage',
        operation_description='Update a specific Azure export storage connection.',
    ),
)
@method_decorator(
    name='delete',
    decorator=swagger_auto_schema(
        tags=['Storage: Azure'],
        operation_summary='Delete export storage',
        operation_description='Delete a specific Azure export storage connection.',
    ),
)
class AzureBlobExportStorageDetailAPI(ExportStorageDetailAPI):
    queryset = AzureBlobExportStorage.objects.all()
    serializer_class = AzureBlobExportStorageSerializer


class AzureBlobImportStorageFormLayoutAPI(ImportStorageFormLayoutAPI):
    pass


class AzureBlobExportStorageFormLayoutAPI(ExportStorageFormLayoutAPI):
    pass
