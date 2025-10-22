"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import logging

from core.permissions import all_permissions
from django.conf import settings
from django.utils.decorators import method_decorator
from drf_spectacular.utils import OpenApiResponse, extend_schema
from rest_framework import generics
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from label_studio.core.utils.common import load_func

from .localfiles.api import LocalFilesExportStorageListAPI, LocalFilesImportStorageListAPI

logger = logging.getLogger(__name__)
# TODO: replace hardcoded apps lists with search over included storage apps


get_storage_list = load_func(settings.GET_STORAGE_LIST)


def _get_common_storage_list():
    storage_list = get_storage_list()
    if settings.ENABLE_LOCAL_FILES_STORAGE:
        storage_list += [
            {
                'name': 'localfiles',
                'title': 'Local files',
                'import_list_api': LocalFilesImportStorageListAPI,
                'export_list_api': LocalFilesExportStorageListAPI,
            }
        ]

    return storage_list


_common_storage_list = _get_common_storage_list()


@method_decorator(
    name='get',
    decorator=extend_schema(
        tags=['Storage'],
        summary='List all import storages types',
        description='Retrieve a list of the import storages types.',
        responses={
            200: OpenApiResponse(
                response={
                    'type': 'array',
                    'items': {
                        'type': 'object',
                        'properties': {
                            'name': {'type': 'string'},
                            'title': {'type': 'string'},
                        },
                    },
                },
                description='List of import storage types',
            ),
        },
        extensions={
            'x-fern-sdk-group-name': ['import_storage'],
            'x-fern-sdk-method-name': 'list_types',
            'x-fern-audiences': ['public'],
        },
    ),
)
class AllImportStorageTypesAPI(APIView):
    permission_required = all_permissions.storages_view

    def get(self, request, **kwargs):
        return Response([{'name': s['name'], 'title': s['title']} for s in _common_storage_list])


@method_decorator(
    name='get',
    decorator=extend_schema(
        tags=['Storage'],
        summary='List all export storages types',
        description='Retrieve a list of the export storages types.',
        responses={
            200: OpenApiResponse(
                response={
                    'type': 'array',
                    'items': {
                        'type': 'object',
                        'properties': {
                            'name': {'type': 'string'},
                            'title': {'type': 'string'},
                        },
                    },
                },
                description='List of export storage types',
            ),
        },
        extensions={
            'x-fern-sdk-group-name': ['export_storage'],
            'x-fern-sdk-method-name': 'list_types',
            'x-fern-audiences': ['public'],
        },
    ),
)
class AllExportStorageTypesAPI(APIView):
    permission_required = all_permissions.storages_view

    def get(self, request, **kwargs):
        return Response([{'name': s['name'], 'title': s['title']} for s in _common_storage_list])


@method_decorator(
    name='get',
    decorator=extend_schema(
        tags=['Storage'],
        summary='List all import storages from the project',
        description='Retrieve a list of the import storages of all types with their IDs.',
        responses={200: 'List of ImportStorageSerializer'},
        extensions={
            'x-fern-sdk-group-name': ['import_storage'],
            'x-fern-sdk-method-name': 'list',
            'x-fern-audiences': ['internal'],
        },
    ),
)
class AllImportStorageListAPI(generics.ListAPIView):
    parser_classes = (JSONParser, FormParser, MultiPartParser)
    permission_required = all_permissions.storages_view

    def _get_response(self, api, request, *args, **kwargs):
        try:
            view = api.as_view()
            response = view(request._request, *args, **kwargs)
            payload = response.data
            if not isinstance(payload, list):
                raise ValueError(f'Response is not list: {payload}')
            return payload
        except Exception:
            logger.error(f"Can't process {api.__class__.__name__}", exc_info=True)
            return []

    def list(self, request, *args, **kwargs):
        list_responses = sum(
            [self._get_response(s['import_list_api'], request, *args, **kwargs) for s in _common_storage_list], []
        )
        return Response(list_responses)


@method_decorator(
    name='get',
    decorator=extend_schema(
        tags=['Storage'],
        summary='List all export storages from the project',
        description='Retrieve a list of the export storages of all types with their IDs.',
        responses={200: 'List of ExportStorageSerializer'},
        extensions={
            'x-fern-sdk-group-name': ['export_storage'],
            'x-fern-sdk-method-name': 'list',
            'x-fern-audiences': ['internal'],
        },
    ),
)
class AllExportStorageListAPI(generics.ListAPIView):

    parser_classes = (JSONParser, FormParser, MultiPartParser)
    permission_required = all_permissions.storages_view

    def _get_response(self, api, request, *args, **kwargs):
        try:
            view = api.as_view()
            response = view(request._request, *args, **kwargs)
            payload = response.data
            if not isinstance(payload, list):
                raise ValueError(f'Response is not list: {payload}')
            return payload
        except Exception:
            logger.error(f"Can't process {api.__class__.__name__}", exc_info=True)
            return []

    def list(self, request, *args, **kwargs):
        list_responses = sum(
            [self._get_response(s['export_list_api'], request, *args, **kwargs) for s in _common_storage_list], []
        )
        return Response(list_responses)
