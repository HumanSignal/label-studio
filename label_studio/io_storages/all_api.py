"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import logging

from rest_framework import generics
from rest_framework.views import APIView
from core.permissions import BaseRulesPermission
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response

from .s3.api import S3ImportStorageListAPI, S3ExportStorageListAPI
from .gcs.api import GCSImportStorageListAPI, GCSExportStorageListAPI
from .azure_blob.api import AzureBlobImportStorageListAPI, AzureBlobExportStorageListAPI
from .redis.api import RedisImportStorageListAPI, RedisExportStorageListAPI
from .localfiles.api import LocalFilesImportStorageListAPI

logger = logging.getLogger(__name__)
# TODO: replace hardcoded apps lists with search over included storage apps


class StorageAPIBasePermission(BaseRulesPermission):
    perm = 'projects.change_project'


class AllImportStorageTypesAPI(APIView):
    permission_classes = (StorageAPIBasePermission,)
    swagger_schema = None

    def get(self, request, **kwargs):
        return Response([
            {'name': 's3', 'title': 'AWS S3'},
            {'name': 'gcs', 'title': 'Google Cloud Storage'},
            {'name': 'azure', 'title': 'Microsoft Azure'},
            {'name': 'redis', 'title': 'Redis'},
            {'name': 'localfiles', 'title': 'Local files'},
        ])


class AllExportStorageTypesAPI(APIView):
    permission_classes = (StorageAPIBasePermission,)
    swagger_schema = None

    def get(self, request, **kwargs):
        return Response([
            {'name': 's3', 'title': 'AWS S3'},
            {'name': 'gcs', 'title': 'Google Cloud Storage'},
            {'name': 'azure', 'title': 'Microsoft Azure'},
            {'name': 'redis', 'title': 'Redis'},
        ])


class AllImportStorageListAPI(generics.ListAPIView):

    parser_classes = (JSONParser, FormParser, MultiPartParser)
    permission_classes = (StorageAPIBasePermission,)
    swagger_schema = None

    def _get_response(self, api, request, *args, **kwargs):
        try:
            view = api.as_view()
            response = view(request._request, *args, **kwargs)
            payload = response.data
            if not isinstance(payload, list):
                raise ValueError(f'Response is not list')
            return response.data
        except Exception as exc:
            logger.error(f"Can't process {api.__class__.__name__}. Reason: {exc}", exc_info=True)
            return []

    def list(self, request, *args, **kwargs):
        return Response(data=sum([
            self._get_response(S3ImportStorageListAPI, request, *args, **kwargs),
            self._get_response(GCSImportStorageListAPI, request, *args, **kwargs),
            self._get_response(AzureBlobImportStorageListAPI, request, *args, **kwargs),
            self._get_response(RedisImportStorageListAPI, request, *args, **kwargs),
            self._get_response(LocalFilesImportStorageListAPI, request, *args, **kwargs),
        ], []))


class AllExportStorageListAPI(generics.ListAPIView):

    parser_classes = (JSONParser, FormParser, MultiPartParser)
    permission_classes = (StorageAPIBasePermission,)
    swagger_schema = None

    def _get_response(self, api, request, *args, **kwargs):
        view = api.as_view()
        response = view(request._request, *args, **kwargs)
        return response.data

    def list(self, request, *args, **kwargs):
        return Response(data=sum([
            self._get_response(S3ExportStorageListAPI, request, *args, **kwargs),
            self._get_response(GCSExportStorageListAPI, request, *args, **kwargs),
            self._get_response(AzureBlobExportStorageListAPI, request, *args, **kwargs),
            self._get_response(RedisExportStorageListAPI, request, *args, **kwargs)
        ], []))
