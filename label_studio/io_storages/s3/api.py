"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
from drf_yasg.utils import swagger_auto_schema

from io_storages.s3.models import S3ImportStorage, S3ExportStorage
from io_storages.s3.serializers import S3ImportStorageSerializer, S3ExportStorageSerializer
from io_storages.api import (
    ImportStorageListAPI, ImportStorageDetailAPI, ImportStorageSyncAPI, ExportStorageListAPI, ExportStorageDetailAPI,
    ImportStorageValidateAPI, ExportStorageValidateAPI, ImportStorageFormLayoutAPI, ExportStorageFormLayoutAPI
)


class S3ImportStorageListAPI(ImportStorageListAPI):
    queryset = S3ImportStorage.objects.all()
    serializer_class = S3ImportStorageSerializer

    @swagger_auto_schema(
        tags=['Storage'],
        operation_summary='S3: Get import storage',
        operation_description='Retrieve storage details for all configured S3 source storage connections.')
    def get(self, request, *args, **kwargs):
        return super(S3ImportStorageListAPI, self).get(request, *args, **kwargs)

    @swagger_auto_schema(tags=['Storage'], operation_summary='S3: Create import storage',
                         operation_description='Create a new Amazon S3 import storage connection.')
    def post(self, request, *args, **kwargs):
        return super(S3ImportStorageListAPI, self).post(request, *args, **kwargs)


class S3ImportStorageDetailAPI(ImportStorageDetailAPI):
    queryset = S3ImportStorage.objects.all()
    serializer_class = S3ImportStorageSerializer

    @swagger_auto_schema(tags=['Storage'], operation_summary='S3: Get import storage',
                         operation_description='Get a specific Amazon S3 import storage connection.')
    def get(self, request, *args, **kwargs):
        return super(S3ImportStorageDetailAPI, self).get(request, *args, **kwargs)

    @swagger_auto_schema(tags=['Storage'], operation_summary='S3: Update import storage',
                         operation_description='Update a specific Amazon S3 import storage connection.')
    def patch(self, request, *args, **kwargs):
        return super(S3ImportStorageDetailAPI, self).patch(request, *args, **kwargs)

    @swagger_auto_schema(tags=['Storage'], operation_summary='S3: Delete import storage',
                         operation_description='Delete a specific Amazon S3 import storage connection.')
    def delete(self, request, *args, **kwargs):
        return super(S3ImportStorageDetailAPI, self).delete(request, *args, **kwargs)

    @swagger_auto_schema(auto_schema=None)
    def put(self, request, *args, **kwargs):
        return super(S3ImportStorageDetailAPI, self).put(request, *args, **kwargs)


class S3ImportStorageSyncAPI(ImportStorageSyncAPI):
    serializer_class = S3ImportStorageSerializer

    @swagger_auto_schema(tags=['Storage'], operation_summary='S3: Sync import storage',
                         operation_description='Sync tasks from an Amazon S3 import storage connection.')
    def post(self, request, *args, **kwargs):
        return super(S3ImportStorageSyncAPI, self).post(request, *args, **kwargs)


class S3ImportStorageValidateAPI(ImportStorageValidateAPI):
    serializer_class = S3ImportStorageSerializer

    @swagger_auto_schema(tags=['Storage'], operation_summary='S3: Validate import storage',
                         operation_description='Validate a specific Amazon S3 import storage connection.')
    def post(self, request, *args, **kwargs):
        return super(S3ImportStorageValidateAPI, self).post(request, *args, **kwargs)


class S3ExportStorageValidateAPI(ExportStorageValidateAPI):
    serializer_class = S3ExportStorageSerializer

    @swagger_auto_schema(tags=['Storage'], operation_summary='S3: Validate export storage',
                         operation_description='Validate a specific Amazon S3 export storage connection.')
    def post(self, request, *args, **kwargs):
        return super(S3ExportStorageValidateAPI, self).post(request, *args, **kwargs)


class S3ExportStorageListAPI(ExportStorageListAPI):
    queryset = S3ExportStorage.objects.all()
    serializer_class = S3ExportStorageSerializer

    @swagger_auto_schema(tags=['Storage'], operation_summary='S3: Get export storage',
                         operation_description='Get a list of all Amazon S3 export storage connections.')
    def get(self, request, *args, **kwargs):
        return super(S3ExportStorageListAPI, self).get(request, *args, **kwargs)

    @swagger_auto_schema(tags=['Storage'], operation_summary='S3: Create export storage',
                         operation_description='Create an Amazon S3 export storage connection to store annotations.')
    def post(self, request, *args, **kwargs):
        return super(S3ExportStorageListAPI, self).post(request, *args, **kwargs)


class S3ExportStorageDetailAPI(ExportStorageDetailAPI):
    queryset = S3ExportStorage.objects.all()
    serializer_class = S3ExportStorageSerializer

    @swagger_auto_schema(tags=['Storage'], operation_summary='S3: Get export storage',
                         operation_description='Get a specific Amazon S3 export storage connection.')
    def get(self, request, *args, **kwargs):
        return super(S3ExportStorageDetailAPI, self).get(request, *args, **kwargs)

    @swagger_auto_schema(tags=['Storage'], operation_summary='S3: Update export storage',
                         operation_description='Update a specific Amazon S3 export storage connection.')
    def patch(self, request, *args, **kwargs):
        return super(S3ExportStorageDetailAPI, self).patch(request, *args, **kwargs)

    @swagger_auto_schema(tags=['Storage'], operation_summary='S3: Delete export storage',
                         operation_description='Delete a specific Amazon S3 export storage connection.')
    def delete(self, request, *args, **kwargs):
        return super(S3ExportStorageDetailAPI, self).delete(request, *args, **kwargs)

    @swagger_auto_schema(auto_schema=None)
    def put(self, request, *args, **kwargs):
        return super(S3ExportStorageDetailAPI, self).put(request, *args, **kwargs)


class S3ImportStorageFormLayoutAPI(ImportStorageFormLayoutAPI):
    pass


class S3ExportStorageFormLayoutAPI(ExportStorageFormLayoutAPI):
    pass
