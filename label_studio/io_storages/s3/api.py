"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
from django.utils.decorators import method_decorator
from drf_yasg import openapi as openapi
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
from io_storages.s3.models import S3ExportStorage, S3ImportStorage
from io_storages.s3.serializers import S3ExportStorageSerializer, S3ImportStorageSerializer

from .openapi_schema import (
    _s3_export_storage_schema,
    _s3_export_storage_schema_with_id,
    _s3_import_storage_schema,
    _s3_import_storage_schema_with_id,
)


@method_decorator(
    name='get',
    decorator=swagger_auto_schema(
        tags=['Storage:S3'],
        x_fern_sdk_group_name=['import_storage', 's3'],
        x_fern_sdk_method_name='list',
        x_fern_audiences=['public'],
        operation_summary='List S3 import storage',
        operation_description='Get a list of all S3 import storage connections.',
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
        tags=['Storage:S3'],
        x_fern_sdk_group_name=['import_storage', 's3'],
        x_fern_sdk_method_name='create',
        x_fern_audiences=['public'],
        operation_summary='Create new S3 storage',
        operation_description='Create new S3 import storage',
        request_body=_s3_import_storage_schema,
    ),
)
class S3ImportStorageListAPI(ImportStorageListAPI):
    queryset = S3ImportStorage.objects.all()
    serializer_class = S3ImportStorageSerializer


@method_decorator(
    name='get',
    decorator=swagger_auto_schema(
        tags=['Storage:S3'],
        x_fern_sdk_group_name=['import_storage', 's3'],
        x_fern_sdk_method_name='get',
        x_fern_audiences=['public'],
        operation_summary='Get import storage',
        operation_description='Get a specific S3 import storage connection.',
        request_body=no_body,
    ),
)
@method_decorator(
    name='patch',
    decorator=swagger_auto_schema(
        tags=['Storage:S3'],
        x_fern_sdk_group_name=['import_storage', 's3'],
        x_fern_sdk_method_name='update',
        x_fern_audiences=['public'],
        operation_summary='Update import storage',
        operation_description='Update a specific S3 import storage connection.',
        request_body=_s3_import_storage_schema,
    ),
)
@method_decorator(
    name='delete',
    decorator=swagger_auto_schema(
        tags=['Storage:S3'],
        x_fern_sdk_group_name=['import_storage', 's3'],
        x_fern_sdk_method_name='delete',
        x_fern_audiences=['public'],
        operation_summary='Delete import storage',
        operation_description='Delete a specific S3 import storage connection.',
        request_body=no_body,
    ),
)
class S3ImportStorageDetailAPI(ImportStorageDetailAPI):
    queryset = S3ImportStorage.objects.all()
    serializer_class = S3ImportStorageSerializer


@method_decorator(
    name='post',
    decorator=swagger_auto_schema(
        tags=['Storage:S3'],
        x_fern_sdk_group_name=['import_storage', 's3'],
        x_fern_sdk_method_name='sync',
        x_fern_audiences=['public'],
        operation_summary='Sync import storage',
        operation_description='Sync tasks from an S3 import storage connection.',
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
class S3ImportStorageSyncAPI(ImportStorageSyncAPI):
    serializer_class = S3ImportStorageSerializer


@method_decorator(
    name='post',
    decorator=swagger_auto_schema(
        tags=['Storage:S3'],
        x_fern_sdk_group_name=['import_storage', 's3'],
        x_fern_sdk_method_name='validate',
        x_fern_audiences=['public'],
        operation_summary='Validate import storage',
        operation_description='Validate a specific S3 import storage connection.',
        request_body=_s3_import_storage_schema_with_id,
        responses={200: openapi.Response(description='Validation successful')},
    ),
)
class S3ImportStorageValidateAPI(ImportStorageValidateAPI):
    serializer_class = S3ImportStorageSerializer


@method_decorator(
    name='post',
    decorator=swagger_auto_schema(
        tags=['Storage:S3'],
        x_fern_sdk_group_name=['export_storage', 's3'],
        x_fern_sdk_method_name='validate',
        x_fern_audiences=['public'],
        operation_summary='Validate export storage',
        operation_description='Validate a specific S3 export storage connection.',
        request_body=_s3_export_storage_schema_with_id,
        responses={200: openapi.Response(description='Validation successful')},
    ),
)
class S3ExportStorageValidateAPI(ExportStorageValidateAPI):
    serializer_class = S3ExportStorageSerializer


@method_decorator(
    name='get',
    decorator=swagger_auto_schema(
        tags=['Storage:S3'],
        x_fern_sdk_group_name=['export_storage', 's3'],
        x_fern_sdk_method_name='list',
        x_fern_audiences=['public'],
        operation_summary='Get all export storage',
        operation_description='Get a list of all S3 export storage connections.',
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
        tags=['Storage:S3'],
        x_fern_sdk_group_name=['export_storage', 's3'],
        x_fern_sdk_method_name='create',
        x_fern_audiences=['public'],
        operation_summary='Create export storage',
        operation_description='Create a new S3 export storage connection to store annotations.',
        request_body=_s3_export_storage_schema,
    ),
)
class S3ExportStorageListAPI(ExportStorageListAPI):
    queryset = S3ExportStorage.objects.all()
    serializer_class = S3ExportStorageSerializer


@method_decorator(
    name='get',
    decorator=swagger_auto_schema(
        tags=['Storage:S3'],
        x_fern_sdk_group_name=['export_storage', 's3'],
        x_fern_sdk_method_name='get',
        x_fern_audiences=['public'],
        operation_summary='Get export storage',
        operation_description='Get a specific S3 export storage connection.',
        request_body=no_body,
    ),
)
@method_decorator(
    name='patch',
    decorator=swagger_auto_schema(
        tags=['Storage:S3'],
        x_fern_sdk_group_name=['export_storage', 's3'],
        x_fern_sdk_method_name='update',
        x_fern_audiences=['public'],
        operation_summary='Update export storage',
        operation_description='Update a specific S3 export storage connection.',
        request_body=_s3_export_storage_schema,
    ),
)
@method_decorator(
    name='delete',
    decorator=swagger_auto_schema(
        tags=['Storage:S3'],
        x_fern_sdk_group_name=['export_storage', 's3'],
        x_fern_sdk_method_name='delete',
        x_fern_audiences=['public'],
        operation_summary='Delete export storage',
        operation_description='Delete a specific S3 export storage connection.',
        request_body=no_body,
    ),
)
class S3ExportStorageDetailAPI(ExportStorageDetailAPI):
    queryset = S3ExportStorage.objects.all()
    serializer_class = S3ExportStorageSerializer


@method_decorator(
    name='post',
    decorator=swagger_auto_schema(
        tags=['Storage:S3'],
        x_fern_sdk_group_name=['export_storage', 's3'],
        x_fern_sdk_method_name='sync',
        x_fern_audiences=['public'],
        operation_summary='Sync export storage',
        operation_description='Sync tasks from an S3 export storage connection.',
        request_body=no_body,
    ),
)
class S3ExportStorageSyncAPI(ExportStorageSyncAPI):
    serializer_class = S3ExportStorageSerializer


class S3ImportStorageFormLayoutAPI(ImportStorageFormLayoutAPI):
    pass


class S3ExportStorageFormLayoutAPI(ExportStorageFormLayoutAPI):
    pass
