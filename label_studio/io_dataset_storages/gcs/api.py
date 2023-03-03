"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
from django.utils.decorators import method_decorator
from drf_yasg.utils import swagger_auto_schema
from drf_yasg import openapi as openapi
from io_dataset_storages.gcs.models import GCSDatasetStorage
from io_dataset_storages.gcs.serializers import GCSDatasetStorageSerializer
from io_dataset_storages.api import (
    DatasetStorageListAPI,
    DatasetStorageDetailAPI,
    DatasetStorageSyncAPI,
    DatasetStorageValidateAPI,
    DatasetStorageFormLayoutAPI,
)


@method_decorator(
    name='get',
    decorator=swagger_auto_schema(
        tags=['Storage: GCS'],
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
    ),
)
@method_decorator(
    name='post',
    decorator=swagger_auto_schema(
        tags=['Storage: GCS'],
        operation_summary='Create import storage',
        operation_description='Create a new GCS import storage connection.',
    ),
)
class GCSDatasetStorageListAPI(DatasetStorageListAPI):
    queryset = GCSDatasetStorage.objects.all()
    serializer_class = GCSDatasetStorageSerializer


@method_decorator(
    name='get',
    decorator=swagger_auto_schema(
        tags=['Storage: GCS'],
        operation_summary='Get import storage',
        operation_description='Get a specific GCS import storage connection.',
    ),
)
@method_decorator(
    name='patch',
    decorator=swagger_auto_schema(
        tags=['Storage: GCS'],
        operation_summary='Update import storage',
        operation_description='Update a specific GCS import storage connection.',
    ),
)
@method_decorator(
    name='delete',
    decorator=swagger_auto_schema(
        tags=['Storage: GCS'],
        operation_summary='Delete import storage',
        operation_description='Delete a specific GCS import storage connection.',
    ),
)
class GCSDatasetStorageDetailAPI(DatasetStorageDetailAPI):
    queryset = GCSDatasetStorage.objects.all()
    serializer_class = GCSDatasetStorageSerializer


@method_decorator(
    name='post',
    decorator=swagger_auto_schema(
        tags=['Storage: GCS'],
        operation_summary='Sync import storage',
        operation_description='Sync tasks from an GCS import storage connection.',
    ),
)
class GCSDatasetStorageSyncAPI(DatasetStorageSyncAPI):
    serializer_class = GCSDatasetStorageSerializer


@method_decorator(
    name='post',
    decorator=swagger_auto_schema(
        tags=['Storage: GCS'],
        operation_summary='Validate import storage',
        operation_description='Validate a specific GCS import storage connection.',
    ),
)
class GCSDatasetStorageValidateAPI(DatasetStorageValidateAPI):
    serializer_class = GCSDatasetStorageSerializer


class GCSDatasetStorageFormLayoutAPI(DatasetStorageFormLayoutAPI):
    pass
