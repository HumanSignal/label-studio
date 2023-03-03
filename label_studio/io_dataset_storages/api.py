"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import logging
import inspect
import os

from rest_framework import generics
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.exceptions import NotFound, PermissionDenied
from drf_yasg import openapi as openapi
from django.conf import settings
from drf_yasg.utils import swagger_auto_schema

from core.permissions import all_permissions
from core.utils.io import read_yaml
from io_dataset_storages.serializers import DatasetStorageSerializer
from projects.models import Project

logger = logging.getLogger(__name__)


class DatasetStorageListAPI(generics.ListCreateAPIView):
    parser_classes = (JSONParser, FormParser, MultiPartParser)
    permission_required = all_permissions.projects_change
    serializer_class = DatasetStorageSerializer

    def get_queryset(self):
        project_pk = self.request.query_params.get('project')
        project = generics.get_object_or_404(Project, pk=project_pk)
        self.check_object_permissions(self.request, project)
        DatasetStorageClass = self.serializer_class.Meta.model
        return DatasetStorageClass.objects.filter(project_id=project.id)


class DatasetStorageDetailAPI(generics.RetrieveUpdateDestroyAPIView):
    """RUD storage by pk specified in URL"""

    parser_classes = (JSONParser, FormParser, MultiPartParser)
    serializer_class = DatasetStorageSerializer
    permission_required = all_permissions.projects_change

    @swagger_auto_schema(auto_schema=None)
    def put(self, request, *args, **kwargs):
        return super(DatasetStorageDetailAPI, self).put(request, *args, **kwargs)


class DatasetStorageSyncAPI(generics.GenericAPIView):

    parser_classes = (JSONParser, FormParser, MultiPartParser)
    permission_required = all_permissions.projects_change
    serializer_class = DatasetStorageSerializer

    def get_queryset(self):
        DatasetStorageClass = self.serializer_class.Meta.model
        return DatasetStorageClass.objects.all()

    def post(self, request, *args, **kwargs):
        storage = self.get_object()
        # check connectivity & access, raise an exception if not satisfied
        storage.validate_connection()
        storage.sync()
        storage.refresh_from_db()
        return Response(self.serializer_class(storage).data)


class StorageValidateAPI(generics.CreateAPIView):
    parser_classes = (JSONParser, FormParser, MultiPartParser)
    permission_required = all_permissions.projects_change

    def create(self, request, *args, **kwargs):
        instance = None
        storage_id = request.data.get('id')
        if storage_id:
            instance = generics.get_object_or_404(self.serializer_class.Meta.model.objects.all(), pk=storage_id)
            if not instance.has_permission(request.user):
                raise PermissionDenied()
        serializer = self.get_serializer(instance=instance, data=request.data)
        serializer.is_valid(raise_exception=True)
        return Response()


class StorageFormLayoutAPI(generics.RetrieveAPIView):

    parser_classes = (JSONParser, FormParser, MultiPartParser)
    permission_required = all_permissions.projects_change
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


class DatasetStorageValidateAPI(StorageValidateAPI):
    serializer_class = DatasetStorageSerializer


class DatasetStorageFormLayoutAPI(StorageFormLayoutAPI):
    storage_type = 'DatasetStorage'
