"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import inspect
import logging
import os

from core.permissions import all_permissions
from core.utils.io import read_yaml
from django.conf import settings
from drf_yasg import openapi as openapi
from drf_yasg.utils import swagger_auto_schema
from io_storages.serializers import ExportStorageSerializer, ImportStorageSerializer
from projects.models import Project
from rest_framework import generics, status
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.settings import api_settings

from label_studio.core.utils.common import load_func

logger = logging.getLogger(__name__)

StoragePermission = load_func(settings.STORAGE_PERMISSION)


class ImportStorageListAPI(generics.ListCreateAPIView):
    permission_required = all_permissions.projects_change
    permission_classes = api_settings.DEFAULT_PERMISSION_CLASSES + [StoragePermission]
    parser_classes = (JSONParser, FormParser, MultiPartParser)

    serializer_class = ImportStorageSerializer

    def get_queryset(self):
        project_pk = self.request.query_params.get('project')
        project = generics.get_object_or_404(Project, pk=project_pk)
        self.check_object_permissions(self.request, project)
        StorageClass = self.serializer_class.Meta.model
        storages = StorageClass.objects.filter(project_id=project.id)

        # check failed jobs and sync their statuses
        StorageClass.ensure_storage_statuses(storages)
        return storages


class ImportStorageDetailAPI(generics.RetrieveUpdateDestroyAPIView):
    """RUD storage by pk specified in URL"""

    permission_required = all_permissions.projects_change
    permission_classes = api_settings.DEFAULT_PERMISSION_CLASSES + [StoragePermission]
    parser_classes = (JSONParser, FormParser, MultiPartParser)
    serializer_class = ImportStorageSerializer

    @swagger_auto_schema(auto_schema=None)
    def put(self, request, *args, **kwargs):
        return super(ImportStorageDetailAPI, self).put(request, *args, **kwargs)


class ExportStorageListAPI(generics.ListCreateAPIView):

    permission_required = all_permissions.projects_change
    permission_classes = api_settings.DEFAULT_PERMISSION_CLASSES + [StoragePermission]
    parser_classes = (JSONParser, FormParser, MultiPartParser)
    serializer_class = ExportStorageSerializer

    def get_queryset(self):
        project_pk = self.request.query_params.get('project')
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

    permission_required = all_permissions.projects_change
    permission_classes = api_settings.DEFAULT_PERMISSION_CLASSES + [StoragePermission]
    parser_classes = (JSONParser, FormParser, MultiPartParser)
    serializer_class = ExportStorageSerializer

    @swagger_auto_schema(auto_schema=None)
    def put(self, request, *args, **kwargs):
        return super(ExportStorageDetailAPI, self).put(request, *args, **kwargs)


class ImportStorageSyncAPI(generics.GenericAPIView):

    permission_required = all_permissions.projects_change
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

    permission_required = all_permissions.projects_change
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

    permission_required = all_permissions.projects_change
    parser_classes = (JSONParser, FormParser, MultiPartParser)

    def create(self, request, *args, **kwargs):
        storage_id = request.data.get('id')
        instance = None
        if storage_id:
            instance = generics.get_object_or_404(self.serializer_class.Meta.model.objects.all(), pk=storage_id)
            if not instance.has_permission(request.user):
                raise PermissionDenied()

        # combine instance fields with request.data
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        # if storage exists, we have to use instance from DB,
        # because instance from serializer won't have credentials, they were popped intentionally
        if instance:
            instance = serializer.update(instance, serializer.validated_data)
        else:
            instance = serializer.Meta.model(**serializer.validated_data)

        # double check: not all storages validate connection in serializer, just make another explicit check here
        try:
            instance.validate_connection()
        except Exception as exc:
            raise ValidationError(exc)
        return Response()


class StorageFormLayoutAPI(generics.RetrieveAPIView):

    permission_required = all_permissions.projects_change
    parser_classes = (JSONParser, FormParser, MultiPartParser)
    swagger_schema = None
    storage_type = None

    @swagger_auto_schema(auto_schema=None)
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
