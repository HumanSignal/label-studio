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
from io_storages.gcs.models import GCSExportStorage, GCSImportStorage
from io_storages.gcs.serializers import GCSExportStorageSerializer, GCSImportStorageSerializer

from .openapi_schema import (
    _gcs_export_storage_schema,
    _gcs_export_storage_schema_with_id,
    _gcs_import_storage_schema,
    _gcs_import_storage_schema_with_id,
)


@method_decorator(
    name='get',
    decorator=swagger_auto_schema(
        tags=['Storage: GCS'],
        x_fern_sdk_group_name=['import_storage', 'gcs'],
        x_fern_sdk_method_name='list',
        x_fern_audiences=['public'],
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
        request_body=no_body,
    ),
)
@method_decorator(
    name='post',
    decorator=swagger_auto_schema(
        tags=['Storage: GCS'],
        x_fern_sdk_group_name=['import_storage', 'gcs'],
        x_fern_sdk_method_name='create',
        x_fern_audiences=['public'],
        operation_summary='Create import storage',
        operation_description='Create a new GCS import storage connection.',
        request_body=_gcs_import_storage_schema,
    ),
)
class GCSImportStorageListAPI(ImportStorageListAPI):
    queryset = GCSImportStorage.objects.all()
    serializer_class = GCSImportStorageSerializer


@method_decorator(
    name='get',
    decorator=swagger_auto_schema(
        tags=['Storage: GCS'],
        x_fern_sdk_group_name=['import_storage', 'gcs'],
        x_fern_sdk_method_name='get',
        x_fern_audiences=['public'],
        operation_summary='Get import storage',
        operation_description='Get a specific GCS import storage connection.',
        request_body=no_body,
    ),
)
@method_decorator(
    name='patch',
    decorator=swagger_auto_schema(
        tags=['Storage: GCS'],
        x_fern_sdk_group_name=['import_storage', 'gcs'],
        x_fern_sdk_method_name='update',
        x_fern_audiences=['public'],
        operation_summary='Update import storage',
        operation_description='Update a specific GCS import storage connection.',
        request_body=_gcs_import_storage_schema,
    ),
)
@method_decorator(
    name='delete',
    decorator=swagger_auto_schema(
        tags=['Storage: GCS'],
        x_fern_sdk_group_name=['import_storage', 'gcs'],
        x_fern_sdk_method_name='delete',
        x_fern_audiences=['public'],
        operation_summary='Delete import storage',
        operation_description='Delete a specific GCS import storage connection.',
        request_body=no_body,
    ),
)
class GCSImportStorageDetailAPI(ImportStorageDetailAPI):
    queryset = GCSImportStorage.objects.all()
    serializer_class = GCSImportStorageSerializer


@method_decorator(
    name='post',
    decorator=swagger_auto_schema(
        tags=['Storage: GCS'],
        x_fern_sdk_group_name=['import_storage', 'gcs'],
        x_fern_sdk_method_name='sync',
        x_fern_audiences=['public'],
        operation_summary='Sync import storage',
        operation_description='Sync tasks from an GCS import storage connection.',
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
class GCSImportStorageSyncAPI(ImportStorageSyncAPI):
    serializer_class = GCSImportStorageSerializer


@method_decorator(
    name='post',
    decorator=swagger_auto_schema(
        tags=['Storage: GCS'],
        x_fern_sdk_group_name=['export_storage', 'gcs'],
        x_fern_sdk_method_name='sync',
        x_fern_audiences=['public'],
        operation_summary='Sync export storage',
        operation_description='Sync tasks from an GCS export storage connection.',
        request_body=no_body,
    ),
)
class GCSExportStorageSyncAPI(ExportStorageSyncAPI):
    serializer_class = GCSExportStorageSerializer


@method_decorator(
    name='post',
    decorator=swagger_auto_schema(
        tags=['Storage: GCS'],
        x_fern_sdk_group_name=['import_storage', 'gcs'],
        x_fern_sdk_method_name='validate',
        x_fern_audiences=['public'],
        operation_summary='Validate import storage',
        operation_description='Validate a specific GCS import storage connection.',
        request_body=_gcs_import_storage_schema_with_id,
        # expecting empty response
        responses={200: openapi.Response(description='OK')},
    ),
)
class GCSImportStorageValidateAPI(ImportStorageValidateAPI):
    serializer_class = GCSImportStorageSerializer


@method_decorator(
    name='post',
    decorator=swagger_auto_schema(
        tags=['Storage: GCS'],
        x_fern_sdk_group_name=['export_storage', 'gcs'],
        x_fern_sdk_method_name='validate',
        x_fern_audiences=['public'],
        operation_summary='Validate export storage',
        operation_description='Validate a specific GCS export storage connection.',
        request_body=_gcs_export_storage_schema_with_id,
        # expecting empty response
        responses={200: openapi.Response(description='OK')},
    ),
)
class GCSExportStorageValidateAPI(ExportStorageValidateAPI):
    serializer_class = GCSExportStorageSerializer


@method_decorator(
    name='get',
    decorator=swagger_auto_schema(
        tags=['Storage: GCS'],
        x_fern_sdk_group_name=['export_storage', 'gcs'],
        x_fern_sdk_method_name='list',
        x_fern_audiences=['public'],
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
        request_body=no_body,
    ),
)
@method_decorator(
    name='post',
    decorator=swagger_auto_schema(
        tags=['Storage: GCS'],
        x_fern_sdk_group_name=['export_storage', 'gcs'],
        x_fern_sdk_method_name='create',
        x_fern_audiences=['public'],
        operation_summary='Create export storage',
        operation_description='Create a new GCS export storage connection to store annotations.',
        request_body=_gcs_export_storage_schema,
    ),
)
class GCSExportStorageListAPI(ExportStorageListAPI):
    queryset = GCSExportStorage.objects.all()
    serializer_class = GCSExportStorageSerializer


@method_decorator(
    name='get',
    decorator=swagger_auto_schema(
        tags=['Storage: GCS'],
        x_fern_sdk_group_name=['export_storage', 'gcs'],
        x_fern_sdk_method_name='get',
        x_fern_audiences=['public'],
        operation_summary='Get export storage',
        operation_description='Get a specific GCS export storage connection.',
        request_body=no_body,
    ),
)
@method_decorator(
    name='patch',
    decorator=swagger_auto_schema(
        tags=['Storage: GCS'],
        x_fern_sdk_group_name=['export_storage', 'gcs'],
        x_fern_sdk_method_name='update',
        x_fern_audiences=['public'],
        operation_summary='Update export storage',
        operation_description='Update a specific GCS export storage connection.',
        request_body=_gcs_export_storage_schema,
    ),
)
@method_decorator(
    name='delete',
    decorator=swagger_auto_schema(
        tags=['Storage: GCS'],
        x_fern_sdk_group_name=['export_storage', 'gcs'],
        x_fern_sdk_method_name='delete',
        x_fern_audiences=['public'],
        operation_summary='Delete export storage',
        operation_description='Delete a specific GCS export storage connection.',
        request_body=no_body,
    ),
)
class GCSExportStorageDetailAPI(ExportStorageDetailAPI):
    queryset = GCSExportStorage.objects.all()
    serializer_class = GCSExportStorageSerializer


class GCSImportStorageFormLayoutAPI(ImportStorageFormLayoutAPI):
    pass


class GCSExportStorageFormLayoutAPI(ExportStorageFormLayoutAPI):
    pass
