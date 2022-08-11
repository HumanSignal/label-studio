"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import logging

from django.conf import settings
from rest_framework import generics
from rest_framework.views import APIView
from core.permissions import all_permissions
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response

from label_studio.core.utils.common import load_func
from .localfiles.api import LocalFilesImportStorageListAPI, LocalFilesExportStorageListAPI

logger = logging.getLogger(__name__)
# TODO: replace hardcoded apps lists with search over included storage apps


get_storage_list = load_func(settings.GET_STORAGE_LIST)


def _get_common_storage_list():
    storage_list = get_storage_list()
    if settings.ENABLE_LOCAL_FILES_STORAGE:
        storage_list += [{
            'name': 'localfiles',
            'title': 'Local files',
            'import_list_api': LocalFilesImportStorageListAPI,
            'export_list_api': LocalFilesExportStorageListAPI
        }]

    return storage_list


_common_storage_list = _get_common_storage_list()


class AllImportStorageTypesAPI(APIView):
    permission_required = all_permissions.projects_change
    swagger_schema = None

    def get(self, request, **kwargs):
        return Response([{'name': s['name'], 'title': s['title']} for s in _common_storage_list])


class AllExportStorageTypesAPI(APIView):
    permission_required = all_permissions.projects_change
    swagger_schema = None

    def get(self, request, **kwargs):
        return Response([{'name': s['name'], 'title': s['title']} for s in _common_storage_list])


class AllImportStorageListAPI(generics.ListAPIView):

    parser_classes = (JSONParser, FormParser, MultiPartParser)
    permission_required = all_permissions.projects_change
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
        list_responses = sum([
            self._get_response(s['import_list_api'], request, *args, **kwargs) for s in _common_storage_list], [])
        return Response(list_responses)


class AllExportStorageListAPI(generics.ListAPIView):

    parser_classes = (JSONParser, FormParser, MultiPartParser)
    permission_required = all_permissions.projects_change
    swagger_schema = None

    def _get_response(self, api, request, *args, **kwargs):
        view = api.as_view()
        response = view(request._request, *args, **kwargs)
        return response.data

    def list(self, request, *args, **kwargs):
        list_responses = sum([
            self._get_response(s['export_list_api'], request, *args, **kwargs) for s in _common_storage_list], [])
        return Response(list_responses)
