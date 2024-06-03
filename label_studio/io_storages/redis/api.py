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
    ImportStorageValidateAPI,
)
from io_storages.redis.models import RedisExportStorage, RedisImportStorage
from io_storages.redis.serializers import RedisExportStorageSerializer, RedisImportStorageSerializer

_redis_import_storage_schema = openapi.Schema(
    type=openapi.TYPE_OBJECT,
    properties={
        'project': openapi.Schema(type=openapi.TYPE_INTEGER, description='Project ID'),
        'path': openapi.Schema(type=openapi.TYPE_STRING, description='Storage prefix (optional)'),
        'host': openapi.Schema(type=openapi.TYPE_STRING, description='Server Host IP (optional)'),
        'port': openapi.Schema(type=openapi.TYPE_STRING, description='Server Port (optional)'),
        'password': openapi.Schema(type=openapi.TYPE_STRING, description='Server Password (optional)'),
        'regex_filter': openapi.Schema(
            type=openapi.TYPE_STRING, description='Cloud storage regex for filtering objects'
        ),
        'use_blob_urls': openapi.Schema(
            type=openapi.TYPE_BOOLEAN, description='Interpret objects as BLOBs and generate URLs'
        ),
    },
    required=[],
)

_redis_export_storage_schema = openapi.Schema(
    type=openapi.TYPE_OBJECT,
    properties={
        'project': openapi.Schema(type=openapi.TYPE_INTEGER, description='Project ID'),
        'path': openapi.Schema(type=openapi.TYPE_STRING, description='Storage prefix (optional)'),
        'host': openapi.Schema(type=openapi.TYPE_STRING, description='Server Host IP (optional)'),
        'port': openapi.Schema(type=openapi.TYPE_STRING, description='Server Port (optional)'),
        'password': openapi.Schema(type=openapi.TYPE_STRING, description='Server Password (optional)'),
        'db': openapi.Schema(type=openapi.TYPE_INTEGER, description='Database ID of database to use'),
    },
    required=[],
)


@method_decorator(
    name='get',
    decorator=swagger_auto_schema(
        tags=['Storage: Redis'],
        x_fern_sdk_group_name=['import_storage', 'redis'],
        x_fern_sdk_method_name='list',
        operation_summary='Get all import storage',
        operation_description='Get a list of all Redis import storage connections.',
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
        tags=['Storage: Redis'],
        x_fern_sdk_group_name=['import_storage', 'redis'],
        x_fern_sdk_method_name='create',
        operation_summary='Create import storage',
        operation_description='Create a new Redis import storage connection.',
        request_body=_redis_import_storage_schema,
    ),
)
class RedisImportStorageListAPI(ImportStorageListAPI):
    queryset = RedisImportStorage.objects.all()
    serializer_class = RedisImportStorageSerializer


@method_decorator(
    name='get',
    decorator=swagger_auto_schema(
        tags=['Storage: Redis'],
        x_fern_sdk_group_name=['import_storage', 'redis'],
        x_fern_sdk_method_name='get',
        operation_summary='Get import storage',
        operation_description='Get a specific Redis import storage connection.',
        request_body=no_body,
    ),
)
@method_decorator(
    name='patch',
    decorator=swagger_auto_schema(
        tags=['Storage: Redis'],
        x_fern_sdk_group_name=['import_storage', 'redis'],
        x_fern_sdk_method_name='update',
        operation_summary='Update import storage',
        operation_description='Update a specific Redis import storage connection.',
        request_body=_redis_import_storage_schema,
    ),
)
@method_decorator(
    name='delete',
    decorator=swagger_auto_schema(
        tags=['Storage: Redis'],
        x_fern_sdk_group_name=['import_storage', 'redis'],
        x_fern_sdk_method_name='delete',
        operation_summary='Delete import storage',
        operation_description='Delete a specific Redis import storage connection.',
        request_body=no_body,
    ),
)
class RedisImportStorageDetailAPI(ImportStorageDetailAPI):
    queryset = RedisImportStorage.objects.all()
    serializer_class = RedisImportStorageSerializer


@method_decorator(
    name='post',
    decorator=swagger_auto_schema(
        tags=['Storage: Redis'],
        x_fern_sdk_group_name=['import_storage', 'redis'],
        x_fern_sdk_method_name='sync',
        operation_summary='Sync import storage',
        operation_description='Sync tasks from a specific Redis import storage connection.',
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
class RedisImportStorageSyncAPI(ExportStorageSyncAPI):
    serializer_class = RedisImportStorageSerializer


@method_decorator(
    name='post',
    decorator=swagger_auto_schema(
        tags=['Storage: Redis'],
        x_fern_sdk_group_name=['export_storage', 'redis'],
        x_fern_sdk_method_name='sync',
        operation_summary='Sync export storage',
        operation_description='Sync tasks from a specific Redis export storage connection.',
        request_body=no_body,
    ),
)
class RedisExportStorageSyncAPI(ExportStorageSyncAPI):
    serializer_class = RedisExportStorageSerializer


@method_decorator(
    name='post',
    decorator=swagger_auto_schema(
        tags=['Storage: Redis'],
        x_fern_sdk_group_name=['import_storage', 'redis'],
        x_fern_sdk_method_name='validate',
        operation_summary='Validate import storage',
        operation_description='Validate a specific Redis import storage connection.',
        request_body=no_body,
    ),
)
class RedisImportStorageValidateAPI(ImportStorageValidateAPI):
    serializer_class = RedisImportStorageSerializer


@method_decorator(
    name='post',
    decorator=swagger_auto_schema(
        tags=['Storage: Redis'],
        x_fern_sdk_group_name=['export_storage', 'redis'],
        x_fern_sdk_method_name='validate',
        operation_summary='Validate export storage',
        operation_description='Validate a specific Redis export storage connection.',
        request_body=no_body,
    ),
)
class RedisExportStorageValidateAPI(ExportStorageValidateAPI):
    serializer_class = RedisExportStorageSerializer


@method_decorator(
    name='get',
    decorator=swagger_auto_schema(
        tags=['Storage: Redis'],
        x_fern_sdk_group_name=['export_storage', 'redis'],
        x_fern_sdk_method_name='list',
        operation_summary='Get all export storage',
        operation_description='Get a list of all Redis export storage connections.',
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
        tags=['Storage: Redis'],
        x_fern_sdk_group_name=['export_storage', 'redis'],
        x_fern_sdk_method_name='create',
        operation_summary='Create export storage',
        operation_description='Create a new Redis export storage connection to store annotations.',
        request_body=_redis_export_storage_schema,
    ),
)
class RedisExportStorageListAPI(ExportStorageListAPI):
    queryset = RedisExportStorage.objects.all()
    serializer_class = RedisExportStorageSerializer


@method_decorator(
    name='get',
    decorator=swagger_auto_schema(
        tags=['Storage: Redis'],
        x_fern_sdk_group_name=['export_storage', 'redis'],
        x_fern_sdk_method_name='get',
        operation_summary='Get export storage',
        operation_description='Get a specific Redis export storage connection.',
        request_body=no_body,
    ),
)
@method_decorator(
    name='patch',
    decorator=swagger_auto_schema(
        tags=['Storage: Redis'],
        x_fern_sdk_group_name=['export_storage', 'redis'],
        x_fern_sdk_method_name='update',
        operation_summary='Update export storage',
        operation_description='Update a specific Redis export storage connection.',
        request_body=_redis_export_storage_schema,
    ),
)
@method_decorator(
    name='delete',
    decorator=swagger_auto_schema(
        tags=['Storage: Redis'],
        x_fern_sdk_group_name=['export_storage', 'redis'],
        x_fern_sdk_method_name='delete',
        operation_summary='Delete export storage',
        operation_description='Delete a specific Redis export storage connection.',
        request_body=no_body,
    ),
)
class RedisExportStorageDetailAPI(ExportStorageDetailAPI):
    queryset = RedisExportStorage.objects.all()
    serializer_class = RedisExportStorageSerializer


class RedisImportStorageFormLayoutAPI(ImportStorageFormLayoutAPI):
    pass


class RedisExportStorageFormLayoutAPI(ExportStorageFormLayoutAPI):
    pass
