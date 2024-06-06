"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import logging

from core.permissions import all_permissions
from django.conf import settings
from django.utils.decorators import method_decorator
from drf_yasg import openapi
from drf_yasg.utils import swagger_auto_schema
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
    decorator=swagger_auto_schema(
        tags=['Storage'],
        x_fern_sdk_group_name='import_storage',
        x_fern_sdk_method_name='list_types',
        x_fern_audiences=['public'],
        operation_summary='List all import storages types',
        operation_description='Retrieve a list of the import storages types.',
        responses={
            200: openapi.Schema(
                title='ImportStorageTypes',
                description='List of import storage types',
                type=openapi.TYPE_ARRAY,
                items=openapi.Schema(
                    type=openapi.TYPE_OBJECT,
                    properties={
                        'name': openapi.Schema(type=openapi.TYPE_STRING),
                        'title': openapi.Schema(type=openapi.TYPE_STRING),
                    },
                ),
            )
        },
    ),
)
class AllImportStorageTypesAPI(APIView):
    permission_required = all_permissions.projects_change

    def get(self, request, **kwargs):
        return Response([{'name': s['name'], 'title': s['title']} for s in _common_storage_list])


@method_decorator(
    name='get',
    decorator=swagger_auto_schema(
        tags=['Storage'],
        x_fern_sdk_group_name='export_storage',
        x_fern_sdk_method_name='list_types',
        x_fern_audiences=['public'],
        operation_summary='List all export storages types',
        operation_description='Retrieve a list of the export storages types.',
        responses={
            200: openapi.Schema(
                title='ExportStorageTypes',
                description='List of export storage types',
                type=openapi.TYPE_ARRAY,
                items=openapi.Schema(
                    type=openapi.TYPE_OBJECT,
                    properties={
                        'name': openapi.Schema(type=openapi.TYPE_STRING),
                        'title': openapi.Schema(type=openapi.TYPE_STRING),
                    },
                ),
            )
        },
    ),
)
class AllExportStorageTypesAPI(APIView):
    permission_required = all_permissions.projects_change

    def get(self, request, **kwargs):
        return Response([{'name': s['name'], 'title': s['title']} for s in _common_storage_list])


@method_decorator(
    name='get',
    decorator=swagger_auto_schema(
        tags=['Storage'],
        x_fern_sdk_group_name='import_storage',
        x_fern_sdk_method_name='list',
        x_fern_audiences=['internal'],
        operation_summary='List all import storages from the project',
        operation_description='Retrieve a list of the import storages of all types with their IDs.',
        responses={200: 'List of ImportStorageSerializer'},
    ),
)
class AllImportStorageListAPI(generics.ListAPIView):
    parser_classes = (JSONParser, FormParser, MultiPartParser)
    permission_required = all_permissions.projects_change

    def _get_response(self, api, request, *args, **kwargs):
        try:
            view = api.as_view()
            response = view(request._request, *args, **kwargs)
            payload = response.data
            if not isinstance(payload, list):
                raise ValueError('Response is not list')
            return response.data
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
    decorator=swagger_auto_schema(
        tags=['Storage'],
        x_fern_sdk_group_name='export_storage',
        x_fern_sdk_method_name='list',
        x_fern_audiences=['internal'],
        operation_summary='List all export storages from the project',
        operation_description='Retrieve a list of the export storages of all types with their IDs.',
        responses={200: 'List of ExportStorageSerializer'},
    ),
)
class AllExportStorageListAPI(generics.ListAPIView):

    parser_classes = (JSONParser, FormParser, MultiPartParser)
    permission_required = all_permissions.projects_change

    def _get_response(self, api, request, *args, **kwargs):
        view = api.as_view()
        response = view(request._request, *args, **kwargs)
        return response.data

    def list(self, request, *args, **kwargs):
        list_responses = sum(
            [self._get_response(s['export_list_api'], request, *args, **kwargs) for s in _common_storage_list], []
        )
        return Response(list_responses)
