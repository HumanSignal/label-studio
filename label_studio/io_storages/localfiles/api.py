"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
from django.utils.decorators import method_decorator
from drf_yasg.utils import swagger_auto_schema
from io_storages.localfiles.models import LocalFilesImportStorage, LocalFilesExportStorage
from io_storages.localfiles.serializers import LocalFilesImportStorageSerializer, LocalFilesExportStorageSerializer
from io_storages.api import (
    ImportStorageListAPI, ImportStorageDetailAPI, ImportStorageSyncAPI, ExportStorageListAPI, ExportStorageDetailAPI,
    ImportStorageValidateAPI, ExportStorageValidateAPI, ImportStorageFormLayoutAPI, ExportStorageFormLayoutAPI
)


@method_decorator(name='get', decorator=swagger_auto_schema(
    tags=['Storage'],
    operation_summary='Local: Get all import storage',
    operation_description='Get a list of all local file import storage connections.'
))
@method_decorator(name='post', decorator=swagger_auto_schema(
    tags=['Storage'],
    operation_summary='Local: Create import storage',
    operation_description='Create a new local file import storage connection.'
))
class LocalFilesImportStorageListAPI(ImportStorageListAPI):
    queryset = LocalFilesImportStorage.objects.all()
    serializer_class = LocalFilesImportStorageSerializer


@method_decorator(name='get', decorator=swagger_auto_schema(
    tags=['Storage'],
    operation_summary='Local: Get import storage',
    operation_description='Get a specific local file import storage connection.'
))
@method_decorator(name='patch', decorator=swagger_auto_schema(
    tags=['Storage'],
    operation_summary='Local: Update import storage',
    operation_description='Update a specific local file import storage connection.'
))
@method_decorator(name='delete', decorator=swagger_auto_schema(
    tags=['Storage'],
    operation_summary='Local: Delete import storage',
    operation_description='Delete a specific local import storage connection.'
))
class LocalFilesImportStorageDetailAPI(ImportStorageDetailAPI):
    queryset = LocalFilesImportStorage.objects.all()
    serializer_class = LocalFilesImportStorageSerializer


@method_decorator(name='post', decorator=swagger_auto_schema(
    tags=['Storage'],
    operation_summary='Local: Sync import storage',
    operation_description='Sync tasks from a local file import storage connection.'
))
class LocalFilesImportStorageSyncAPI(ImportStorageSyncAPI):
    serializer_class = LocalFilesImportStorageSerializer


@method_decorator(name='post', decorator=swagger_auto_schema(
    tags=['Storage'],
    operation_summary='Local: Validate import storage',
    operation_description='Validate a specific local file import storage connection.'
))
class LocalFilesImportStorageValidateAPI(ImportStorageValidateAPI):
    serializer_class = LocalFilesImportStorageSerializer


@method_decorator(name='post', decorator=swagger_auto_schema(
    tags=['Storage'],
    operation_summary='Local: Validate export storage',
    operation_description='Validate a specific local file export storage connection.'
))
class LocalFilesExportStorageValidateAPI(ExportStorageValidateAPI):
    serializer_class = LocalFilesExportStorageSerializer


@method_decorator(name='get', decorator=swagger_auto_schema(
    tags=['Storage'],
    operation_summary='Local: Get all export storage',
    operation_description='Get a list of all Local export storage connections.'
))
@method_decorator(name='post', decorator=swagger_auto_schema(
    tags=['Storage'],
    operation_summary='Local: Create export storage',
    operation_description='Create a new local file export storage connection to store annotations.'
))
class LocalFilesExportStorageListAPI(ExportStorageListAPI):
    queryset = LocalFilesExportStorage.objects.all()
    serializer_class = LocalFilesExportStorageSerializer


@method_decorator(name='get', decorator=swagger_auto_schema(
    tags=['Storage'],
    operation_summary='Local: Get export storage',
    operation_description='Get a specific local file export storage connection.'
))
@method_decorator(name='patch', decorator=swagger_auto_schema(
    tags=['Storage'],
    operation_summary='Local: Update export storage',
    operation_description='Update a specific local file export storage connection.'
))
@method_decorator(name='delete', decorator=swagger_auto_schema(
    tags=['Storage'],
    operation_summary='Local: Delete export storage',
    operation_description='Delete a specific local file export storage connection.'
))
class LocalFilesExportStorageDetailAPI(ExportStorageDetailAPI):
    queryset = LocalFilesExportStorage.objects.all()
    serializer_class = LocalFilesExportStorageSerializer


class LocalFilesImportStorageFormLayoutAPI(ImportStorageFormLayoutAPI):
    pass


class LocalFilesExportStorageFormLayoutAPI(ExportStorageFormLayoutAPI):
    pass
