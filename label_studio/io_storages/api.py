"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license."""

import inspect
import logging
import os
import time

from core.permissions import ViewClassPermission, all_permissions
from core.utils.common import load_func
from core.utils.io import read_yaml
from django.conf import settings
from drf_spectacular.utils import extend_schema
from io_storages.serializers import ExportStorageSerializer, ImportStorageSerializer
from projects.action_permissions import ensure_project_manage
from projects.models import Project
from rest_framework import generics, status
from rest_framework.exceptions import NotFound, ValidationError
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response

logger = logging.getLogger(__name__)


def _project_from_identifier(project_id):
    """Resolve a project primary key from a storage payload.

    Responsibility: find the project a storage write names before serializer
    validation opens a connection.

    Boundary: a missing or non-numeric id returns None so the serializer can
    reject it. This does not check access.
    """
    if project_id in (None, ''):
        return None
    try:
        return Project.objects.filter(pk=project_id).first()
    except (TypeError, ValueError):
        return None


def _project_reassigned(data, current_project_id) -> bool:
    """Return whether the payload moves a row to a different project.

    Responsibility: detect a project change before validation or save.

    Boundary: an omitted project field is not a change. A different id, an
    empty value on a project-bound row, or a non-numeric id is a change.
    This does not persist the row.
    """
    if not hasattr(data, '__contains__') or 'project' not in data:
        return False
    raw = data.get('project')
    if raw in (None, ''):
        return current_project_id is not None
    try:
        submitted = int(raw)
    except (TypeError, ValueError):
        return True
    return submitted != current_project_id


class StorageObjectPermissionMixin:
    """Management gate for one storage row.

    Responsibility: load a storage only after the caller may manage its project.

    Boundary: a hidden project is ``NotFound``. A member who can annotate but
    not manage is ``PermissionDenied``. ``request.user.project`` is set only
    after the check succeeds, for the activity log. Does not call ``user.has_perm``.
    """

    def get_object(self):
        queryset = self.filter_queryset(self.get_queryset())
        lookup_url_kwarg = self.lookup_url_kwarg or self.lookup_field
        storage = generics.get_object_or_404(queryset, **{self.lookup_field: self.kwargs[lookup_url_kwarg]})
        ensure_project_manage(self.request.user, storage.project)
        self.request.user.project = storage.project
        return storage

    def update(self, request, *args, **kwargs):
        storage = self.get_object()
        if _project_reassigned(request.data, storage.project_id):
            raise ValidationError('The project cannot be changed.')
        return super().update(request, *args, **kwargs)


class StorageCreateMixin:
    def create(self, request, *args, **kwargs):
        # serializer validation copies credentials from the storage passed in `id`
        storage_id = request.data.get('id')
        if storage_id:
            storage = generics.get_object_or_404(self.serializer_class.Meta.model.objects.all(), pk=storage_id)
            ensure_project_manage(request.user, storage.project)
            request.user.project = storage.project
        project = _project_from_identifier(request.data.get('project'))
        if project is not None:
            ensure_project_manage(request.user, project)
            request.user.project = project
        return super().create(request, *args, **kwargs)


class ImportStorageListAPI(StorageCreateMixin, generics.ListCreateAPIView):
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
        ensure_project_manage(self.request.user, project)
        self.request.user.project = project
        StorageClass = self.serializer_class.Meta.model
        storages = StorageClass.objects.filter(project_id=project.id)

        # check failed jobs and sync their statuses
        StorageClass.ensure_storage_statuses(storages)
        return storages

    def perform_create(self, serializer):
        project = serializer.validated_data.get('project')
        if project is not None:
            ensure_project_manage(self.request.user, project)
            self.request.user.project = project
        super().perform_create(serializer)


class ImportStorageDetailAPI(StorageObjectPermissionMixin, generics.RetrieveUpdateDestroyAPIView):
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


class ExportStorageListAPI(StorageCreateMixin, generics.ListCreateAPIView):
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
        ensure_project_manage(self.request.user, project)
        self.request.user.project = project
        StorageClass = self.serializer_class.Meta.model
        storages = StorageClass.objects.filter(project_id=project.id)

        # check failed jobs and sync their statuses
        StorageClass.ensure_storage_statuses(storages)
        return storages

    def perform_create(self, serializer):
        project = serializer.validated_data.get('project')
        if project is not None:
            ensure_project_manage(self.request.user, project)
            self.request.user.project = project

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


class ExportStorageDetailAPI(StorageObjectPermissionMixin, generics.RetrieveUpdateDestroyAPIView):
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


class ImportStorageSyncAPI(StorageObjectPermissionMixin, generics.GenericAPIView):
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
        sync_guard = load_func(getattr(settings, 'IMPORT_STORAGE_SYNC_GUARD', None))
        if sync_guard:
            error = sync_guard(storage)
            if error:
                return Response(status=status.HTTP_409_CONFLICT, data={'message': error})
        storage.validate_connection()
        storage.sync()
        storage.refresh_from_db()
        return Response(self.serializer_class(storage).data)


class ExportStorageSyncAPI(StorageObjectPermissionMixin, generics.GenericAPIView):
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
