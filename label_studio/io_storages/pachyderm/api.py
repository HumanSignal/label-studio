"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
from django.utils.decorators import method_decorator
from drf_yasg.utils import swagger_auto_schema
from drf_yasg import openapi as openapi
from io_storages.pachyderm.models import PachydermImportStorage, PachydermExportStorage
from io_storages.pachyderm.serializers import PachydermImportStorageSerializer, PachydermExportStorageSerializer
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
        tags=['Storage: Pachyderm'],
        operation_summary='Get all import storage',
        operation_description='Get a list of all local file import storage connections.',
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
        tags=['Storage: Pachyderm'],
        operation_summary='Create import storage',
        operation_description='Create a new local file import storage connection.',
    ),
)
class PachydermImportStorageListAPI(ImportStorageListAPI):
    queryset = PachydermImportStorage.objects.all()
    serializer_class = PachydermImportStorageSerializer


@method_decorator(
    name='get',
    decorator=swagger_auto_schema(
        tags=['Storage: Pachyderm'],
        operation_summary='Get import storage',
        operation_description='Get a specific local file import storage connection.',
    ),
)
@method_decorator(
    name='patch',
    decorator=swagger_auto_schema(
        tags=['Storage: Pachyderm'],
        operation_summary='Update import storage',
        operation_description='Update a specific local file import storage connection.',
    ),
)
@method_decorator(
    name='delete',
    decorator=swagger_auto_schema(
        tags=['Storage: Pachyderm'],
        operation_summary='Delete import storage',
        operation_description='Delete a specific local import storage connection.',
    ),
)
class PachydermImportStorageDetailAPI(ImportStorageDetailAPI):
    queryset = PachydermImportStorage.objects.all()
    serializer_class = PachydermImportStorageSerializer


@method_decorator(
    name='post',
    decorator=swagger_auto_schema(
        tags=['Storage: Pachyderm'],
        operation_summary='Sync import storage',
        operation_description='Sync tasks from a local file import storage connection.',
    ),
)
class PachydermImportStorageSyncAPI(ImportStorageSyncAPI):
    serializer_class = PachydermImportStorageSerializer


@method_decorator(
    name='post',
    decorator=swagger_auto_schema(
        tags=['Storage: Pachyderm'],
        operation_summary='Sync export storage',
        operation_description='Sync tasks from a local file export storage connection.',
    ),
)
class PachydermExportStorageSyncAPI(ExportStorageSyncAPI):
    serializer_class = PachydermExportStorageSerializer


@method_decorator(
    name='post',
    decorator=swagger_auto_schema(
        tags=['Storage: Pachyderm'],
        operation_summary='Validate import storage',
        operation_description='Validate a specific local file import storage connection.',
    ),
)
class PachydermImportStorageValidateAPI(ImportStorageValidateAPI):
    serializer_class = PachydermImportStorageSerializer


@method_decorator(
    name='post',
    decorator=swagger_auto_schema(
        tags=['Storage: Pachyderm'],
        operation_summary='Validate export storage',
        operation_description='Validate a specific local file export storage connection.',
    ),
)
class PachydermExportStorageValidateAPI(ExportStorageValidateAPI):
    serializer_class = PachydermExportStorageSerializer


@method_decorator(
    name='get',
    decorator=swagger_auto_schema(
        tags=['Storage: Pachyderm'],
        operation_summary='Get all export storage',
        operation_description='Get a list of all Local export storage connections.',
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
        tags=['Storage: Pachyderm'],
        operation_summary='Create export storage',
        operation_description='Create a new local file export storage connection to store annotations.',
    ),
)
class PachydermExportStorageListAPI(ExportStorageListAPI):
    queryset = PachydermExportStorage.objects.all()
    serializer_class = PachydermExportStorageSerializer


@method_decorator(
    name='get',
    decorator=swagger_auto_schema(
        tags=['Storage: Pachyderm'],
        operation_summary='Get export storage',
        operation_description='Get a specific local file export storage connection.',
    ),
)
@method_decorator(
    name='patch',
    decorator=swagger_auto_schema(
        tags=['Storage: Pachyderm'],
        operation_summary='Update export storage',
        operation_description='Update a specific local file export storage connection.',
    ),
)
@method_decorator(
    name='delete',
    decorator=swagger_auto_schema(
        tags=['Storage: Pachyderm'],
        operation_summary='Delete export storage',
        operation_description='Delete a specific local file export storage connection.',
    ),
)
class PachydermExportStorageDetailAPI(ExportStorageDetailAPI):
    queryset = PachydermExportStorage.objects.all()
    serializer_class = PachydermExportStorageSerializer


class PachydermImportStorageFormLayoutAPI(ImportStorageFormLayoutAPI):
    pass


class PachydermExportStorageFormLayoutAPI(ExportStorageFormLayoutAPI):
    pass
