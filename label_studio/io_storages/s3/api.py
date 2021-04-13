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
        operation_summary='Get S3 import storage',
        operation_description='Retrieve storage details for configured source storage. Use the relevant endpoint for '
                              'the type of storage details you want to retrieve.')
    def get(self, request, *args, **kwargs):
        return super(S3ImportStorageListAPI, self).get(request, *args, **kwargs)

    @swagger_auto_schema(tags=['Storage'], operation_summary='Create S3 import storage',
                         operation_description='Create a cloud or database storage connection to use as a source for '
                                               'labeling tasks. Use the relevant endpoint for the type of storage you '
                                               'want to create.')
    def post(self, request, *args, **kwargs):
        return super(S3ImportStorageListAPI, self).post(request, *args, **kwargs)


class S3ImportStorageDetailAPI(ImportStorageDetailAPI):
    queryset = S3ImportStorage.objects.all()
    serializer_class = S3ImportStorageSerializer

    @swagger_auto_schema(tags=['Storage'], operation_summary='Get S3 storage')
    def get(self, request, *args, **kwargs):
        return super(S3ImportStorageDetailAPI, self).get(request, *args, **kwargs)

    @swagger_auto_schema(tags=['Storage'], operation_summary='Update S3 storage')
    def patch(self, request, *args, **kwargs):
        return super(S3ImportStorageDetailAPI, self).patch(request, *args, **kwargs)

    @swagger_auto_schema(tags=['Storage'], operation_summary='Delete S3 storage')
    def delete(self, request, *args, **kwargs):
        return super(S3ImportStorageDetailAPI, self).delete(request, *args, **kwargs)

    @swagger_auto_schema(auto_schema=None)
    def put(self, request, *args, **kwargs):
        return super(S3ImportStorageDetailAPI, self).put(request, *args, **kwargs)


class S3ImportStorageSyncAPI(ImportStorageSyncAPI):
    serializer_class = S3ImportStorageSerializer

    @swagger_auto_schema(tags=['Storage'], operation_summary='Sync with S3 import storage')
    def post(self, request, *args, **kwargs):
        return super(S3ImportStorageSyncAPI, self).post(request, *args, **kwargs)


class S3ImportStorageValidateAPI(ImportStorageValidateAPI):
    serializer_class = S3ImportStorageSerializer

    @swagger_auto_schema(tags=['Storage'], operation_summary='Validate S3 import storage')
    def post(self, request, *args, **kwargs):
        return super(S3ImportStorageValidateAPI, self).post(request, *args, **kwargs)


class S3ExportStorageValidateAPI(ExportStorageValidateAPI):
    serializer_class = S3ExportStorageSerializer

    @swagger_auto_schema(tags=['Storage'], operation_summary='Validate S3 export storage')
    def post(self, request, *args, **kwargs):
        return super(S3ExportStorageValidateAPI, self).post(request, *args, **kwargs)


class S3ExportStorageListAPI(ExportStorageListAPI):
    queryset = S3ExportStorage.objects.all()
    serializer_class = S3ExportStorageSerializer

    @swagger_auto_schema(tags=['Storage'], operation_summary='Get S3 export storage list',
                         operation_description='Retrieve storage details for configured target storage. Use the '
                                               'relevant endpoint for the type of storage you want to retrieve.')
    def get(self, request, *args, **kwargs):
        return super(S3ExportStorageListAPI, self).get(request, *args, **kwargs)

    @swagger_auto_schema(tags=['Storage'], operation_summary='Create S3 export storage',
                         operation_description='Create a cloud connection to store annotations. Use the relevant '
                                               'endpoint for the type of storage you want to create.')
    def post(self, request, *args, **kwargs):
        return super(S3ExportStorageListAPI, self).post(request, *args, **kwargs)


class S3ExportStorageDetailAPI(ExportStorageDetailAPI):
    queryset = S3ExportStorage.objects.all()
    serializer_class = S3ExportStorageSerializer

    @swagger_auto_schema(tags=['Storage'], operation_summary='Get S3 export storage')
    def get(self, request, *args, **kwargs):
        return super(S3ExportStorageDetailAPI, self).get(request, *args, **kwargs)

    @swagger_auto_schema(tags=['Storage'], operation_summary='Update S3 export storage')
    def patch(self, request, *args, **kwargs):
        return super(S3ExportStorageDetailAPI, self).patch(request, *args, **kwargs)

    @swagger_auto_schema(tags=['Storage'], operation_summary='Delete S3 export storage')
    def delete(self, request, *args, **kwargs):
        return super(S3ExportStorageDetailAPI, self).delete(request, *args, **kwargs)

    @swagger_auto_schema(auto_schema=None)
    def put(self, request, *args, **kwargs):
        return super(S3ExportStorageDetailAPI, self).put(request, *args, **kwargs)


class S3ImportStorageFormLayoutAPI(ImportStorageFormLayoutAPI):
    pass


class S3ExportStorageFormLayoutAPI(ExportStorageFormLayoutAPI):
    pass
