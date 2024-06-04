"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
from django.utils.decorators import method_decorator
from drf_yasg import openapi
from drf_yasg.utils import no_body, swagger_auto_schema
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

_azure_blob_import_storage_schema = openapi.Schema(
    type=openapi.TYPE_OBJECT,
    properties={
        'project': openapi.Schema(type=openapi.TYPE_INTEGER, description='Project ID'),
        'container': openapi.Schema(type=openapi.TYPE_STRING, description='Azure blob container'),
        'prefix': openapi.Schema(type=openapi.TYPE_STRING, description='Azure blob prefix name'),
        'regex_filter': openapi.Schema(
            type=openapi.TYPE_STRING, description='Cloud storage regex for filtering objects'
        ),
        'use_blob_urls': openapi.Schema(
            type=openapi.TYPE_BOOLEAN, description='Interpret objects as BLOBs and generate URLs'
        ),
        'account_name': openapi.Schema(type=openapi.TYPE_STRING, description='Azure Blob account name'),
        'account_key': openapi.Schema(type=openapi.TYPE_STRING, description='Azure Blob account key'),
        'presign': openapi.Schema(type=openapi.TYPE_BOOLEAN, description='Presign URLs for direct download'),
        'presign_ttl': openapi.Schema(type=openapi.TYPE_INTEGER, description='Presign TTL in minutes'),
    },
    required=[],
)

_azure_blob_export_storage_schema = openapi.Schema(
    type=openapi.TYPE_OBJECT,
    properties={
        'project': openapi.Schema(type=openapi.TYPE_INTEGER, description='Project ID'),
        'container': openapi.Schema(type=openapi.TYPE_STRING, description='Azure blob container'),
        'prefix': openapi.Schema(type=openapi.TYPE_STRING, description='Azure blob prefix name'),
        'account_name': openapi.Schema(type=openapi.TYPE_STRING, description='Azure Blob account name'),
        'account_key': openapi.Schema(type=openapi.TYPE_STRING, description='Azure Blob account key'),
    },
    required=[],
)


@method_decorator(
    name='get',
    decorator=swagger_auto_schema(
        tags=['Storage: Azure'],
        x_fern_sdk_group_name=['import_storage', 'azure'],
        x_fern_sdk_method_name='list',
        x_fern_audiences=['public'],
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
        request_body=no_body,
    ),
)
@method_decorator(
    name='post',
    decorator=swagger_auto_schema(
        tags=['Storage: Azure'],
        x_fern_sdk_group_name=['import_storage', 'azure'],
        x_fern_sdk_method_name='create',
        x_fern_audiences=['public'],
        operation_summary='Create new storage',
        operation_description='Get new Azure import storage',
        request_body=_azure_blob_import_storage_schema,
    ),
)
class AzureBlobImportStorageListAPI(ImportStorageListAPI):
    queryset = AzureBlobImportStorage.objects.all()
    serializer_class = AzureBlobImportStorageSerializer


@method_decorator(
    name='get',
    decorator=swagger_auto_schema(
        tags=['Storage: Azure'],
        x_fern_sdk_group_name=['import_storage', 'azure'],
        x_fern_sdk_method_name='get',
        x_fern_audiences=['public'],
        operation_summary='Get import storage',
        operation_description='Get a specific Azure import storage connection.',
        request_body=no_body,
    ),
)
@method_decorator(
    name='patch',
    decorator=swagger_auto_schema(
        tags=['Storage: Azure'],
        x_fern_sdk_group_name=['import_storage', 'azure'],
        x_fern_sdk_method_name='update',
        x_fern_audiences=['public'],
        operation_summary='Update import storage',
        operation_description='Update a specific Azure import storage connection.',
        request_body=_azure_blob_import_storage_schema,
    ),
)
@method_decorator(
    name='delete',
    decorator=swagger_auto_schema(
        tags=['Storage: Azure'],
        x_fern_sdk_group_name=['import_storage', 'azure'],
        x_fern_sdk_method_name='delete',
        x_fern_audiences=['public'],
        operation_summary='Delete import storage',
        operation_description='Delete a specific Azure import storage connection.',
        request_body=no_body,
    ),
)
class AzureBlobImportStorageDetailAPI(ImportStorageDetailAPI):
    queryset = AzureBlobImportStorage.objects.all()
    serializer_class = AzureBlobImportStorageSerializer


@method_decorator(
    name='post',
    decorator=swagger_auto_schema(
        tags=['Storage: Azure'],
        x_fern_sdk_group_name=['import_storage', 'azure'],
        x_fern_sdk_method_name='sync',
        x_fern_audiences=['public'],
        operation_summary='Sync import storage',
        operation_description='Sync tasks from an Azure import storage connection.',
        manual_parameters=[
            openapi.Parameter(
                name='id',
                type=openapi.TYPE_INTEGER,
                in_=openapi.IN_PATH,
                description='Storage ID',
            ),
        ],
        request_body=no_body,
    ),
)
class AzureBlobImportStorageSyncAPI(ImportStorageSyncAPI):
    serializer_class = AzureBlobImportStorageSerializer


@method_decorator(
    name='post',
    decorator=swagger_auto_schema(
        tags=['Storage: Azure'],
        x_fern_sdk_group_name=['export_storage', 'azure'],
        x_fern_sdk_method_name='sync',
        x_fern_audiences=['public'],
        operation_summary='Sync export storage',
        operation_description='Sync tasks from an Azure export storage connection.',
        request_body=no_body,
    ),
)
class AzureBlobExportStorageSyncAPI(ExportStorageSyncAPI):
    serializer_class = AzureBlobExportStorageSerializer


@method_decorator(
    name='post',
    decorator=swagger_auto_schema(
        tags=['Storage: Azure'],
        x_fern_sdk_group_name=['import_storage', 'azure'],
        x_fern_sdk_method_name='validate',
        x_fern_audiences=['public'],
        operation_summary='Validate import storage',
        operation_description='Validate a specific Azure import storage connection.',
        request_body=no_body,
    ),
)
class AzureBlobImportStorageValidateAPI(ImportStorageValidateAPI):
    serializer_class = AzureBlobImportStorageSerializer


@method_decorator(
    name='post',
    decorator=swagger_auto_schema(
        tags=['Storage: Azure'],
        x_fern_sdk_group_name=['export_storage', 'azure'],
        x_fern_sdk_method_name='validate',
        x_fern_audiences=['public'],
        operation_summary='Validate export storage',
        operation_description='Validate a specific Azure export storage connection.',
        request_body=no_body,
    ),
)
class AzureBlobExportStorageValidateAPI(ExportStorageValidateAPI):
    serializer_class = AzureBlobExportStorageSerializer


@method_decorator(
    name='get',
    decorator=swagger_auto_schema(
        tags=['Storage: Azure'],
        x_fern_sdk_group_name=['export_storage', 'azure'],
        x_fern_sdk_method_name='list',
        x_fern_audiences=['public'],
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
        request_body=no_body,
    ),
)
@method_decorator(
    name='post',
    decorator=swagger_auto_schema(
        tags=['Storage: Azure'],
        x_fern_sdk_group_name=['export_storage', 'azure'],
        x_fern_sdk_method_name='create',
        x_fern_audiences=['public'],
        operation_summary='Create export storage',
        operation_description='Create a new Azure export storage connection to store annotations.',
        request_body=_azure_blob_export_storage_schema,
    ),
)
class AzureBlobExportStorageListAPI(ExportStorageListAPI):
    queryset = AzureBlobExportStorage.objects.all()
    serializer_class = AzureBlobExportStorageSerializer


@method_decorator(
    name='get',
    decorator=swagger_auto_schema(
        tags=['Storage: Azure'],
        x_fern_sdk_group_name=['export_storage', 'azure'],
        x_fern_sdk_method_name='get',
        x_fern_audiences=['public'],
        operation_summary='Get export storage',
        operation_description='Get a specific Azure export storage connection.',
        request_body=no_body,
    ),
)
@method_decorator(
    name='patch',
    decorator=swagger_auto_schema(
        tags=['Storage: Azure'],
        x_fern_sdk_group_name=['export_storage', 'azure'],
        x_fern_sdk_method_name='update',
        x_fern_audiences=['public'],
        operation_summary='Update export storage',
        operation_description='Update a specific Azure export storage connection.',
        request_body=_azure_blob_export_storage_schema,
    ),
)
@method_decorator(
    name='delete',
    decorator=swagger_auto_schema(
        tags=['Storage: Azure'],
        x_fern_sdk_group_name=['export_storage', 'azure'],
        x_fern_sdk_method_name='delete',
        x_fern_audiences=['public'],
        operation_summary='Delete export storage',
        operation_description='Delete a specific Azure export storage connection.',
        request_body=no_body,
    ),
)
class AzureBlobExportStorageDetailAPI(ExportStorageDetailAPI):
    queryset = AzureBlobExportStorage.objects.all()
    serializer_class = AzureBlobExportStorageSerializer


class AzureBlobImportStorageFormLayoutAPI(ImportStorageFormLayoutAPI):
    pass


class AzureBlobExportStorageFormLayoutAPI(ExportStorageFormLayoutAPI):
    pass
