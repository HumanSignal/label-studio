"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import os
import inspect
import json

from django.utils.decorators import method_decorator
from django.conf import settings
from drf_yasg.utils import swagger_auto_schema
from drf_yasg import openapi as openapi
from rest_framework.exceptions import NotFound
from core.utils.io import read_yaml
from rest_framework.response import Response

from io_storages.oss.models import OSSImportStorage, OSSExportStorage
from io_storages.oss.serializers import OSSImportStorageSerializer, OSSExportStorageSerializer
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
        tags=['Storage:OSS'],
        operation_summary='Get import storage',
        operation_description='Get a list of all OSS import storage connections.',
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
        tags=['Storage:OSS'], operation_summary='Create new storage', operation_description='Get new OSS import storage'
    ),
)
class OSSImportStorageListAPI(ImportStorageListAPI):
    queryset = OSSImportStorage.objects.all()
    serializer_class = OSSImportStorageSerializer
    
    def perform_create(self, serializer):
        if not serializer.validated_data.get("bucket"):
            serializer.validated_data["bucket"] = settings.MLFLOW_OSS_BUCKET_NAME
        if not serializer.validated_data.get("oss_endpoint"):
            serializer.validated_data["oss_endpoint"] = settings.MLFLOW_OSS_ENDPOINT_URL
        if not serializer.validated_data.get("oss_access_key_id"):
            serializer.validated_data["oss_access_key_id"] = settings.MLFLOW_OSS_KEY_ID
        if not serializer.validated_data.get("oss_secret_access_key"):
            serializer.validated_data["oss_secret_access_key"] = settings.MLFLOW_OSS_KEY_SECRET
        OSSImportStorage.objects.create(**serializer.validated_data)


@method_decorator(
    name='get',
    decorator=swagger_auto_schema(
        tags=['Storage:OSS'],
        operation_summary='Get import storage',
        operation_description='Get a specific OSS import storage connection.',
    ),
)
@method_decorator(
    name='patch',
    decorator=swagger_auto_schema(
        tags=['Storage:OSS'],
        operation_summary='Update import storage',
        operation_description='Update a specific OSS import storage connection.',
    ),
)
@method_decorator(
    name='delete',
    decorator=swagger_auto_schema(
        tags=['Storage:OSS'],
        operation_summary='Delete import storage',
        operation_description='Delete a specific OSS import storage connection.',
    ),
)
class OSSImportStorageDetailAPI(ImportStorageDetailAPI):
    queryset = OSSImportStorage.objects.all()
    serializer_class = OSSImportStorageSerializer


@method_decorator(
    name='post',
    decorator=swagger_auto_schema(
        tags=['Storage:OSS'],
        operation_summary='Sync import storage',
        operation_description='Sync tasks from an OSS import storage connection.',
    ),
)
class OSSImportStorageSyncAPI(ImportStorageSyncAPI):
    serializer_class = OSSImportStorageSerializer


@method_decorator(
    name='post',
    decorator=swagger_auto_schema(
        tags=['Storage:OSS'],
        operation_summary='Validate import storage',
        operation_description='Validate a specific OSS import storage connection.',
    ),
)
class OSSImportStorageValidateAPI(ImportStorageValidateAPI):
    serializer_class = OSSImportStorageSerializer


@method_decorator(
    name='post',
    decorator=swagger_auto_schema(
        tags=['Storage:OSS'],
        operation_summary='Validate export storage',
        operation_description='Validate a specific OSS export storage connection.',
    ),
)
class OSSExportStorageValidateAPI(ExportStorageValidateAPI):
    serializer_class = OSSExportStorageSerializer


@method_decorator(
    name='get',
    decorator=swagger_auto_schema(
        tags=['Storage:OSS'],
        operation_summary='Get all export storage',
        operation_description='Get a list of all OSS export storage connections.',
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
        tags=['Storage:OSS'],
        operation_summary='Create export storage',
        operation_description='Create a new OSS export storage connection to store annotations.',
    ),
)
class OSSExportStorageListAPI(ExportStorageListAPI):
    queryset = OSSExportStorage.objects.all()
    serializer_class = OSSExportStorageSerializer
    
    def perform_create(self, serializer):
        if not serializer.validated_data.get("bucket"):
            serializer.validated_data["bucket"] = settings.MLFLOW_OSS_BUCKET_NAME
        if not serializer.validated_data.get("oss_endpoint"):
            serializer.validated_data["oss_endpoint"] = settings.MLFLOW_OSS_ENDPOINT_URL
        if not serializer.validated_data.get("oss_access_key_id"):
            serializer.validated_data["oss_access_key_id"] = settings.MLFLOW_OSS_KEY_ID
        if not serializer.validated_data.get("oss_secret_access_key"):
            serializer.validated_data["oss_secret_access_key"] = settings.MLFLOW_OSS_KEY_SECRET
        OSSExportStorage.objects.create(**serializer.validated_data)


@method_decorator(
    name='get',
    decorator=swagger_auto_schema(
        tags=['Storage:OSS'],
        operation_summary='Get export storage',
        operation_description='Get a specific OSS export storage connection.',
    ),
)
@method_decorator(
    name='patch',
    decorator=swagger_auto_schema(
        tags=['Storage:OSS'],
        operation_summary='Update export storage',
        operation_description='Update a specific OSS export storage connection.',
    ),
)
@method_decorator(
    name='delete',
    decorator=swagger_auto_schema(
        tags=['Storage:OSS'],
        operation_summary='Delete export storage',
        operation_description='Delete a specific OSS export storage connection.',
    ),
)
class OSSExportStorageDetailAPI(ExportStorageDetailAPI):
    queryset = OSSExportStorage.objects.all()
    serializer_class = OSSExportStorageSerializer


@method_decorator(
    name='post',
    decorator=swagger_auto_schema(
        tags=['Storage:OSS'],
        operation_summary='Sync export storage',
        operation_description='Sync tasks from an OSS export storage connection.',
    ),
)
class OSSExportStorageSyncAPI(ExportStorageSyncAPI):
    serializer_class = OSSExportStorageSerializer


class OSSImportStorageFormLayoutAPI(ImportStorageFormLayoutAPI):
    
    @swagger_auto_schema(auto_schema=None)
    def get(self, request, *args, **kwargs):
        form_layout_file = os.path.join(os.path.dirname(inspect.getfile(self.__class__)), 'form_layout.yml')
        if not os.path.exists(form_layout_file):
            raise NotFound(f'"form_layout.yml" is not found for {self.__class__.__name__}')

        form_layout = read_yaml(form_layout_file)
        form_layout = self.post_process_form(form_layout)
        origin_data = json.dumps(form_layout[self.storage_type])
        # 从配置获取Bucket endpoint作为默认值
        origin_data = origin_data.replace("oss-bucket-name", settings.MLFLOW_OSS_BUCKET_NAME)
        origin_data = origin_data.replace("oss-endpoint-url", settings.MLFLOW_OSS_ENDPOINT_URL)    
        return Response(json.loads(origin_data))


class OSSExportStorageFormLayoutAPI(ExportStorageFormLayoutAPI):
    pass
