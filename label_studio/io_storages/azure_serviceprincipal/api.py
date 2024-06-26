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
from io_storages.azure_serviceprincipal.models import (
    AzureServicePrincipalExportStorage,
    AzureServicePrincipalImportStorage,
)
from io_storages.azure_serviceprincipal.serializers import (
    AzureServicePrincipalExportStorageSerializer,
    AzureServicePrincipalImportStorageSerializer,
)

from .openapi_schema import (
    _azure_serviceprincipal_export_storage_schema,
    _azure_serviceprincipal_export_storage_schema_with_id,
    _azure_serviceprincipal_import_storage_schema,
    _azure_serviceprincipal_import_storage_schema_with_id,
)


@method_decorator(
    name='get',
    decorator=swagger_auto_schema(
        tags=['Storage: Azure SPI'],
        x_fern_sdk_group_name=['import_storage', 'azure_spi'],
        x_fern_sdk_method_name='list',
        x_fern_audiences=['public'],
        operation_summary='Get all import storage',
        operation_description='Get list of all Azure SPI import storage connections.',
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
        tags=['Storage: Azure SPI'],
        x_fern_sdk_group_name=['import_storage', 'azure_spi'],
        x_fern_sdk_method_name='create',
        x_fern_audiences=['public'],
        operation_summary='Create new storage',
        operation_description='Get new Azure SPI import storage',
        request_body=_azure_serviceprincipal_import_storage_schema,
    ),
)
class AzureServicePrincipalImportStorageListAPI(ImportStorageListAPI):
    queryset = AzureServicePrincipalImportStorage.objects.all()
    serializer_class = AzureServicePrincipalImportStorageSerializer


@method_decorator(
    name='get',
    decorator=swagger_auto_schema(
        tags=['Storage: Azure SPI'],
        x_fern_sdk_group_name=['import_storage', 'azure_spi'],
        x_fern_sdk_method_name='get',
        x_fern_audiences=['public'],
        operation_summary='Get import storage',
        operation_description='Get a specific Azure SPI import storage connection.',
        request_body=no_body,
    ),
)
@method_decorator(
    name='patch',
    decorator=swagger_auto_schema(
        tags=['Storage: Azure SPI'],
        x_fern_sdk_group_name=['import_storage', 'azure_spi'],
        x_fern_sdk_method_name='update',
        x_fern_audiences=['public'],
        operation_summary='Update import storage',
        operation_description='Update a specific Azure SPI import storage connection.',
        request_body=_azure_serviceprincipal_import_storage_schema,
    ),
)
@method_decorator(
    name='delete',
    decorator=swagger_auto_schema(
        tags=['Storage: Azure SPI'],
        x_fern_sdk_group_name=['import_storage', 'azure_spi'],
        x_fern_sdk_method_name='delete',
        x_fern_audiences=['public'],
        operation_summary='Delete import storage',
        operation_description='Delete a specific Azure SPI import storage connection.',
        request_body=no_body,
    ),
)
class AzureServicePrincipalImportStorageDetailAPI(ImportStorageDetailAPI):
    queryset = AzureServicePrincipalImportStorage.objects.all()
    serializer_class = AzureServicePrincipalImportStorageSerializer


@method_decorator(
    name='post',
    decorator=swagger_auto_schema(
        tags=['Storage: Azure SPI'],
        x_fern_sdk_group_name=['import_storage', 'azure_spi'],
        x_fern_sdk_method_name='sync',
        x_fern_audiences=['public'],
        operation_summary='Sync import storage',
        operation_description='Sync tasks from an Azure SPI import storage connection.',
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
class AzureServicePrincipalImportStorageSyncAPI(ImportStorageSyncAPI):
    serializer_class = AzureServicePrincipalImportStorageSerializer


@method_decorator(
    name='post',
    decorator=swagger_auto_schema(
        tags=['Storage: Azure SPI'],
        x_fern_sdk_group_name=['export_storage', 'azure_spi'],
        x_fern_sdk_method_name='sync',
        x_fern_audiences=['public'],
        operation_summary='Sync export storage',
        operation_description='Sync tasks from an Azure SPI export storage connection.',
        request_body=no_body,
    ),
)
class AzureServicePrincipalExportStorageSyncAPI(ExportStorageSyncAPI):
    serializer_class = AzureServicePrincipalExportStorageSerializer


@method_decorator(
    name='post',
    decorator=swagger_auto_schema(
        tags=['Storage: Azure SPI'],
        x_fern_sdk_group_name=['import_storage', 'azure_spi'],
        x_fern_sdk_method_name='validate',
        x_fern_audiences=['public'],
        operation_summary='Validate import storage',
        operation_description='Validate a specific Azure SPI import storage connection.',
        request_body=_azure_serviceprincipal_import_storage_schema_with_id,
        # expecting empty response
        responses={200: openapi.Response(description='OK')},
    ),
)
class AzureServicePrincipalImportStorageValidateAPI(ImportStorageValidateAPI):
    serializer_class = AzureServicePrincipalImportStorageSerializer


@method_decorator(
    name='post',
    decorator=swagger_auto_schema(
        tags=['Storage: Azure SPI'],
        x_fern_sdk_group_name=['export_storage', 'azure_spi'],
        x_fern_sdk_method_name='validate',
        x_fern_audiences=['public'],
        operation_summary='Validate export storage',
        operation_description='Validate a specific Azure SPI export storage connection.',
        request_body=_azure_serviceprincipal_export_storage_schema_with_id,
        # expecting empty response
        responses={200: openapi.Response(description='OK')},
    ),
)
class AzureServicePrincipalExportStorageValidateAPI(ExportStorageValidateAPI):
    serializer_class = AzureServicePrincipalExportStorageSerializer


@method_decorator(
    name='get',
    decorator=swagger_auto_schema(
        tags=['Storage: Azure SPI'],
        x_fern_sdk_group_name=['export_storage', 'azure_spi'],
        x_fern_sdk_method_name='list',
        x_fern_audiences=['public'],
        operation_summary='Get all export storage',
        operation_description='Get a list of all Azure SPI export storage connections.',
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
        tags=['Storage: Azure SPI'],
        x_fern_sdk_group_name=['export_storage', 'azure_spi'],
        x_fern_sdk_method_name='create',
        x_fern_audiences=['public'],
        operation_summary='Create export storage',
        operation_description='Create a new Azure SPI export storage connection to store annotations.',
        request_body=_azure_serviceprincipal_export_storage_schema,
    ),
)
class AzureServicePrincipalExportStorageListAPI(ExportStorageListAPI):
    queryset = AzureServicePrincipalExportStorage.objects.all()
    serializer_class = AzureServicePrincipalExportStorageSerializer


@method_decorator(
    name='get',
    decorator=swagger_auto_schema(
        tags=['Storage: Azure SPI'],
        x_fern_sdk_group_name=['export_storage', 'azure_spi'],
        x_fern_sdk_method_name='get',
        x_fern_audiences=['public'],
        operation_summary='Get export storage',
        operation_description='Get a specific Azure SPI export storage connection.',
        request_body=no_body,
    ),
)
@method_decorator(
    name='patch',
    decorator=swagger_auto_schema(
        tags=['Storage: Azure SPI'],
        x_fern_sdk_group_name=['export_storage', 'azure_spi'],
        x_fern_sdk_method_name='update',
        x_fern_audiences=['public'],
        operation_summary='Update export storage',
        operation_description='Update a specific Azure SPI export storage connection.',
        request_body=_azure_serviceprincipal_export_storage_schema,
    ),
)
@method_decorator(
    name='delete',
    decorator=swagger_auto_schema(
        tags=['Storage: Azure SPI'],
        x_fern_sdk_group_name=['export_storage', 'azure'],
        x_fern_sdk_method_name='delete',
        x_fern_audiences=['public'],
        operation_summary='Delete export storage',
        operation_description='Delete a specific Azure SPI export storage connection.',
        request_body=no_body,
    ),
)
class AzureServicePrincipalExportStorageDetailAPI(ExportStorageDetailAPI):
    queryset = AzureServicePrincipalExportStorage.objects.all()
    serializer_class = AzureServicePrincipalExportStorageSerializer


class AzureServicePrincipalImportStorageFormLayoutAPI(ImportStorageFormLayoutAPI):
    pass


class AzureServicePrincipalExportStorageFormLayoutAPI(ExportStorageFormLayoutAPI):
    pass
