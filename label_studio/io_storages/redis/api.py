"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
from django.utils.decorators import method_decorator
from drf_yasg.utils import swagger_auto_schema
from io_storages.redis.models import RedisImportStorage, RedisExportStorage
from io_storages.redis.serializers import RedisImportStorageSerializer, RedisExportStorageSerializer
from io_storages.api import (
    ImportStorageListAPI, ImportStorageDetailAPI, ImportStorageSyncAPI, ExportStorageListAPI, ExportStorageDetailAPI,
    ImportStorageValidateAPI, ExportStorageValidateAPI, ImportStorageFormLayoutAPI, ExportStorageFormLayoutAPI
)


@method_decorator(name='get', decorator=swagger_auto_schema(
    tags=['Storage'],
    operation_summary='Redis: Get all import storage',
    operation_description='Get a list of all Redis import storage connections.'
))
@method_decorator(name='post', decorator=swagger_auto_schema(
    tags=['Storage'],
    operation_summary='Redis: Create import storage',
    operation_description='Create a new Redis import storage connection.'
))
class RedisImportStorageListAPI(ImportStorageListAPI):
    queryset = RedisImportStorage.objects.all()
    serializer_class = RedisImportStorageSerializer


@method_decorator(name='get', decorator=swagger_auto_schema(
    tags=['Storage'],
    operation_summary='Redis: Get import storage',
    operation_description='Get a specific Redis import storage connection.'
))
@method_decorator(name='patch', decorator=swagger_auto_schema(
    tags=['Storage'],
    operation_summary='Redis: Update import storage',
    operation_description='Update a specific Redis import storage connection.'
))
@method_decorator(name='delete', decorator=swagger_auto_schema(
    tags=['Storage'],
    operation_summary='Redis: Delete import storage',
    operation_description='Delete a specific Redis import storage connection.'
))
class RedisImportStorageDetailAPI(ImportStorageDetailAPI):
    queryset = RedisImportStorage.objects.all()
    serializer_class = RedisImportStorageSerializer


@method_decorator(name='post', decorator=swagger_auto_schema(
    tags=['Storage'],
    operation_summary='Redis: Sync import storage',
    operation_description='Sync tasks from a specific Redis import storage connection.'
))
class RedisImportStorageSyncAPI(ImportStorageSyncAPI):
    serializer_class = RedisImportStorageSerializer


@method_decorator(name='post', decorator=swagger_auto_schema(
    tags=['Storage'],
    operation_summary='Redis: Validate import storage',
    operation_description='Validate a specific Redis import storage connection.'
))
class RedisImportStorageValidateAPI(ImportStorageValidateAPI):
    serializer_class = RedisImportStorageSerializer


@method_decorator(name='post', decorator=swagger_auto_schema(
    tags=['Storage'],
    operation_summary='Redis: Validate export storage',
    operation_description='Validate a specific Redis export storage connection.'
))
class RedisExportStorageValidateAPI(ExportStorageValidateAPI):
    serializer_class = RedisExportStorageSerializer


@method_decorator(name='get', decorator=swagger_auto_schema(
    tags=['Storage'],
    operation_summary='Redis: Get all export storage',
    operation_description='Get a list of all Redis export storage connections.'
))
@method_decorator(name='post', decorator=swagger_auto_schema(
    tags=['Storage'],
    operation_summary='Redis: Create export storage',
    operation_description='Create a new Redis export storage connection to store annotations.'
))
class RedisExportStorageListAPI(ExportStorageListAPI):
    queryset = RedisExportStorage.objects.all()
    serializer_class = RedisExportStorageSerializer


@method_decorator(name='get', decorator=swagger_auto_schema(
    tags=['Storage'],
    operation_summary='Redis: Get export storage',
    operation_description='Get a specific Redis export storage connection.'
))
@method_decorator(name='patch', decorator=swagger_auto_schema(
    tags=['Storage'],
    operation_summary='Redis: Update export storage',
    operation_description='Update a specific Redis export storage connection.'
))
@method_decorator(name='delete', decorator=swagger_auto_schema(
    tags=['Storage'],
    operation_summary='Redis: Delete export storage',
    operation_description='Delete a specific Redis export storage connection.'
))
class RedisExportStorageDetailAPI(ExportStorageDetailAPI):
    queryset = RedisExportStorage.objects.all()
    serializer_class = RedisExportStorageSerializer


class RedisImportStorageFormLayoutAPI(ImportStorageFormLayoutAPI):
    pass


class RedisExportStorageFormLayoutAPI(ExportStorageFormLayoutAPI):
    pass
