"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import inspect
import logging
import os
import time

from core.permissions import ViewClassPermission, all_permissions
from core.utils.io import read_yaml
from django.conf import settings
from drf_spectacular.utils import extend_schema
from io_storages.serializers import ExportStorageSerializer, ImportStorageSerializer
from projects.models import Project
from rest_framework import generics, status
from rest_framework.exceptions import NotFound, ValidationError
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response

logger = logging.getLogger(__name__)


class ImportStorageListAPI(generics.ListCreateAPIView):
    permission_required = ViewClassPermission(
        GET=all_permissions.storages_view,
        POST=all_permissions.storages_change,
    )
    parser_classes = (JSONParser, FormParser, MultiPartParser)

    serializer_class = ImportStorageSerializer

    def get_queryset(self):
        project_pk = self.request.query_params.get('project')
        if not project_pk:
            raise ValidationError('query parameter "project" is required')

        project = generics.get_object_or_404(Project, pk=project_pk)
        self.check_object_permissions(self.request, project)
        StorageClass = self.serializer_class.Meta.model
        storages = StorageClass.objects.filter(project_id=project.id)

        # check failed jobs and sync their statuses
        StorageClass.ensure_storage_statuses(storages)
        return storages


class ImportStorageDetailAPI(generics.RetrieveUpdateDestroyAPIView):
    """RUD storage by pk specified in URL"""

    permission_required = ViewClassPermission(
        GET=all_permissions.storages_view,
        PATCH=all_permissions.storages_change,
        PUT=all_permissions.storages_change,
        DELETE=all_permissions.storages_change,
    )
    parser_classes = (JSONParser, FormParser, MultiPartParser)
    serializer_class = ImportStorageSerializer

    @extend_schema(exclude=True)
    def put(self, request, *args, **kwargs):
        return super(ImportStorageDetailAPI, self).put(request, *args, **kwargs)


class ExportStorageListAPI(generics.ListCreateAPIView):

    permission_required = ViewClassPermission(
        GET=all_permissions.storages_view,
        POST=all_permissions.storages_change,
    )
    parser_classes = (JSONParser, FormParser, MultiPartParser)
    serializer_class = ExportStorageSerializer

    def get_queryset(self):
        project_pk = self.request.query_params.get('project')
        if not project_pk:
            raise ValidationError('query parameter "project" is required')

        project = generics.get_object_or_404(Project, pk=project_pk)
        self.check_object_permissions(self.request, project)
        StorageClass = self.serializer_class.Meta.model
        storages = StorageClass.objects.filter(project_id=project.id)

        # check failed jobs and sync their statuses
        StorageClass.ensure_storage_statuses(storages)
        return storages

    def perform_create(self, serializer):
        # double check: not export storages don't validate connection in serializer,
        # just make another explicit check here, note: in this create API we have credentials in request.data
        instance = serializer.Meta.model(**serializer.validated_data)
        try:
            instance.validate_connection()
        except Exception as exc:
            raise ValidationError(exc)

        storage = serializer.save()
        if settings.SYNC_ON_TARGET_STORAGE_CREATION:
            storage.sync()


class ExportStorageDetailAPI(generics.RetrieveUpdateDestroyAPIView):
    """RUD storage by pk specified in URL"""

    permission_required = ViewClassPermission(
        GET=all_permissions.storages_view,
        PATCH=all_permissions.storages_change,
        PUT=all_permissions.storages_change,
        DELETE=all_permissions.storages_change,
    )
    parser_classes = (JSONParser, FormParser, MultiPartParser)
    serializer_class = ExportStorageSerializer

    @extend_schema(exclude=True)
    def put(self, request, *args, **kwargs):
        return super(ExportStorageDetailAPI, self).put(request, *args, **kwargs)


class ImportStorageSyncAPI(generics.GenericAPIView):

    permission_required = ViewClassPermission(
        POST=all_permissions.storages_sync,
    )
    parser_classes = (JSONParser, FormParser, MultiPartParser)
    serializer_class = ImportStorageSerializer

    def get_queryset(self):
        ImportStorageClass = self.serializer_class.Meta.model
        return ImportStorageClass.objects.all()

    def post(self, request, *args, **kwargs):
        storage = self.get_object()
        # check connectivity & access, raise an exception if not satisfied
        if not storage.synchronizable:
            response_data = {'message': f'Storage {str(storage.id)} is not synchronizable'}
            return Response(status=status.HTTP_400_BAD_REQUEST, data=response_data)
        storage.validate_connection()
        storage.sync()
        storage.refresh_from_db()
        return Response(self.serializer_class(storage).data)


class ExportStorageSyncAPI(generics.GenericAPIView):

    permission_required = ViewClassPermission(
        POST=all_permissions.storages_sync,
    )
    parser_classes = (JSONParser, FormParser, MultiPartParser)
    serializer_class = ExportStorageSerializer

    def get_queryset(self):
        ExportStorageClass = self.serializer_class.Meta.model
        return ExportStorageClass.objects.all()

    def post(self, request, *args, **kwargs):
        storage = self.get_object()
        # check connectivity & access, raise an exception if not satisfied
        if not storage.synchronizable:
            response_data = {'message': f'Storage {str(storage.id)} is not synchronizable'}
            return Response(status=status.HTTP_400_BAD_REQUEST, data=response_data)
        storage.validate_connection()
        storage.sync()
        storage.refresh_from_db()
        return Response(self.serializer_class(storage).data)


class StorageValidateAPI(generics.CreateAPIView):

    permission_required = all_permissions.storages_change
    parser_classes = (JSONParser, FormParser, MultiPartParser)

    def create(self, request, *args, **kwargs):
        from .functions import validate_storage_instance

        validate_storage_instance(request, self.serializer_class)
        return Response()


@extend_schema(exclude=True)
class ImportStorageListFilesAPI(generics.CreateAPIView):

    permission_required = all_permissions.storages_change
    parser_classes = (JSONParser, FormParser, MultiPartParser)
    serializer_class = None  # Default serializer

    def __init__(self, serializer_class=None, *args, **kwargs):
        self.serializer_class = serializer_class
        super().__init__(*args, **kwargs)

    @extend_schema(exclude=True)
    def create(self, request, *args, **kwargs):
        from .functions import validate_storage_instance

        instance = validate_storage_instance(request, self.serializer_class)
        limit = int(request.data.get('limit', settings.DEFAULT_STORAGE_LIST_LIMIT))

        try:
            files = []
            start_time = time.time()
            timeout_seconds = 30

            for object in instance.iter_objects():
                files.append(instance.get_unified_metadata(object))

                # Check if we've reached the file limit
                if len(files) >= limit:
                    files.append({'key': None, 'last_modified': None, 'size': None})
                    break

                # Check if we've exceeded the timeout
                if time.time() - start_time > timeout_seconds:
                    files.append({'key': '... storage scan timeout reached ...', 'last_modified': None, 'size': None})
                    break

            return Response({'files': files})
        except Exception as exc:
            logger.exception('Error listing storage files: %s', exc)
            raise ValidationError('Failed to list storage files')


@extend_schema(exclude=True)
class StorageFormLayoutAPI(generics.RetrieveAPIView):

    permission_required = all_permissions.storages_change
    parser_classes = (JSONParser, FormParser, MultiPartParser)
    storage_type = None

    @extend_schema(exclude=True)
    def get(self, request, *args, **kwargs):
        form_layout_file = os.path.join(os.path.dirname(inspect.getfile(self.__class__)), 'form_layout.yml')
        if not os.path.exists(form_layout_file):
            raise NotFound(f'"form_layout.yml" is not found for {self.__class__.__name__}')

        form_layout = read_yaml(form_layout_file)
        form_layout = self.post_process_form(form_layout)
        return Response(form_layout[self.storage_type])

    def post_process_form(self, form_layout):
        return form_layout


class ImportStorageValidateAPI(StorageValidateAPI):
    serializer_class = ImportStorageSerializer


class ExportStorageValidateAPI(StorageValidateAPI):
    serializer_class = ExportStorageSerializer


class ImportStorageFormLayoutAPI(StorageFormLayoutAPI):
    storage_type = 'ImportStorage'


class ExportStorageFormLayoutAPI(StorageFormLayoutAPI):
    storage_type = 'ExportStorage'
