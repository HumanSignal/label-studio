"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
from django.utils.decorators import method_decorator
from drf_yasg import openapi as openapi
from drf_yasg.utils import swagger_auto_schema
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
from io_storages.aperturedb.models import ApertureDBExportStorage, ApertureDBImportStorage
from io_storages.aperturedb.serializers import ApertureDBExportStorageSerializer, ApertureDBImportStorageSerializer


@method_decorator(
    name='get',
    decorator=swagger_auto_schema(
        tags=['Storage:ApertureDB'],
        operation_summary='Get import storage',
        operation_description='Get a list of all ApertureDB import storage connections.',
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
@method_decorator(name='post',
                  decorator=swagger_auto_schema(
                      tags=['Storage:ApertureDB'],
                      operation_summary='Create new storage',
                      operation_description='Get new ApertureDB import storage'),)
class ApertureDBImportStorageListAPI(ImportStorageListAPI):
    queryset = ApertureDBImportStorage.objects.all()
    serializer_class = ApertureDBImportStorageSerializer


@method_decorator(
    name='get',
    decorator=swagger_auto_schema(
        tags=['Storage:ApertureDB'],
        operation_summary='Get import storage',
        operation_description='Get a specific ApertureDB import storage connection.',
    ),
)
@method_decorator(
    name='patch',
    decorator=swagger_auto_schema(
        tags=['Storage:ApertureDB'],
        operation_summary='Update import storage',
        operation_description='Update a specific ApertureDB import storage connection.',
    ),
)
@method_decorator(
    name='delete',
    decorator=swagger_auto_schema(
        tags=['Storage:ApertureDB'],
        operation_summary='Delete import storage',
        operation_description='Delete a specific ApertureDB import storage connection.',
    ),
)
class ApertureDBImportStorageDetailAPI(ImportStorageDetailAPI):
    queryset = ApertureDBImportStorage.objects.all()
    serializer_class = ApertureDBImportStorageSerializer


@method_decorator(
    name='post',
    decorator=swagger_auto_schema(
        tags=['Storage:ApertureDB'],
        operation_summary='Sync import storage',
        operation_description='Sync tasks from an ApertureDB import storage connection.',
    ),
)
class ApertureDBImportStorageSyncAPI(ImportStorageSyncAPI):
    serializer_class = ApertureDBImportStorageSerializer


@method_decorator(
    name='post',
    decorator=swagger_auto_schema(
        tags=['Storage:ApertureDB'],
        operation_summary='Validate import storage',
        operation_description='Validate a specific ApertureDB import storage connection.',
    ),
)
class ApertureDBImportStorageValidateAPI(ImportStorageValidateAPI):
    serializer_class = ApertureDBImportStorageSerializer


@method_decorator(
    name='post',
    decorator=swagger_auto_schema(
        tags=['Storage:ApertureDB'],
        operation_summary='Validate export storage',
        operation_description='Validate a specific ApertureDB export storage connection.',
    ),
)
class ApertureDBExportStorageValidateAPI(ExportStorageValidateAPI):
    serializer_class = ApertureDBExportStorageSerializer


@method_decorator(
    name='get',
    decorator=swagger_auto_schema(
        tags=['Storage:ApertureDB'],
        operation_summary='Get all export storage',
        operation_description='Get a list of all ApertureDB export storage connections.',
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
        tags=['Storage:ApertureDB'],
        operation_summary='Create export storage',
        operation_description='Create a new ApertureDB export storage connection to store annotations.',
    ),
)
class ApertureDBExportStorageListAPI(ExportStorageListAPI):
    queryset = ApertureDBExportStorage.objects.all()
    serializer_class = ApertureDBExportStorageSerializer


@method_decorator(
    name='get',
    decorator=swagger_auto_schema(
        tags=['Storage:ApertureDB'],
        operation_summary='Get export storage',
        operation_description='Get a specific ApertureDB export storage connection.',
    ),
)
@method_decorator(
    name='patch',
    decorator=swagger_auto_schema(
        tags=['Storage:ApertureDB'],
        operation_summary='Update export storage',
        operation_description='Update a specific ApertureDB export storage connection.',
    ),
)
@method_decorator(
    name='delete',
    decorator=swagger_auto_schema(
        tags=['Storage:ApertureDB'],
        operation_summary='Delete export storage',
        operation_description='Delete a specific ApertureDB export storage connection.',
    ),
)
class ApertureDBExportStorageDetailAPI(ExportStorageDetailAPI):
    queryset = ApertureDBExportStorage.objects.all()
    serializer_class = ApertureDBExportStorageSerializer


@method_decorator(
    name='post',
    decorator=swagger_auto_schema(
        tags=['Storage:ApertureDB'],
        operation_summary='Sync export storage',
        operation_description='Sync tasks from an ApertureDB export storage connection.',
    ),
)
class ApertureDBExportStorageSyncAPI(ExportStorageSyncAPI):
    serializer_class = ApertureDBExportStorageSerializer


class ApertureDBImportStorageFormLayoutAPI(ImportStorageFormLayoutAPI):
    pass


class ApertureDBExportStorageFormLayoutAPI(ExportStorageFormLayoutAPI):
    pass
