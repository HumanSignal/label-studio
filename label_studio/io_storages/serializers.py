"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license."""

import os

from django.conf import settings
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import extend_schema_field, extend_schema_serializer
from io_storages.base_models import ExportStorage, ImportStorage
from rest_framework import serializers
from tasks.models import Task
from tasks.serializers import AnnotationSerializer, TaskSerializer
from users.models import User
from users.serializers import BaseUserSerializer

from label_studio.core.utils.common import load_func

# Server-managed sync metadata. Exclude from OpenAPI *request* schemas only —
# do not put these on concrete Meta.read_only_fields (runtime still accepts them today).
STORAGE_SYNC_SCHEMA_EXCLUDE_FIELDS = (
    'last_sync',
    'last_sync_count',
    'last_sync_job',
    'status',
    'traceback',
    'meta',
)


def _storage_serializer_base_name(serializer_class) -> str:
    name = serializer_class.__name__
    if name.endswith('Serializer'):
        return name[: -len('Serializer')]
    return name


def build_storage_write_serializer(serializer_class):
    """OpenAPI-only create/update request serializer (no runtime Meta changes)."""

    @extend_schema_serializer(exclude_fields=list(STORAGE_SYNC_SCHEMA_EXCLUDE_FIELDS))
    class _StorageWriteSerializer(serializer_class):
        class Meta(serializer_class.Meta):
            pass

    base = _storage_serializer_base_name(serializer_class)
    _StorageWriteSerializer.__name__ = f'{base}WriteSerializer'
    _StorageWriteSerializer.__qualname__ = _StorageWriteSerializer.__name__
    _StorageWriteSerializer.__module__ = serializer_class.__module__
    return _StorageWriteSerializer


def build_storage_validate_serializer(serializer_class):
    """OpenAPI-only validate request serializer with optional connection `id`."""

    @extend_schema_serializer(exclude_fields=list(STORAGE_SYNC_SCHEMA_EXCLUDE_FIELDS))
    class _StorageValidateSerializer(serializer_class):
        id = serializers.IntegerField(
            required=False,
            help_text='Storage ID. If set, storage with specified ID will be updated',
        )

        class Meta(serializer_class.Meta):
            pass

    base = _storage_serializer_base_name(serializer_class)
    _StorageValidateSerializer.__name__ = f'{base}ValidateSerializer'
    _StorageValidateSerializer.__qualname__ = _StorageValidateSerializer.__name__
    _StorageValidateSerializer.__module__ = serializer_class.__module__
    return _StorageValidateSerializer


@extend_schema_field(OpenApiTypes.STR)
class StorageTypeField(serializers.ReadOnlyField):
    pass


class ImportStorageSerializer(serializers.ModelSerializer):
    type = StorageTypeField(default=os.path.basename(os.path.dirname(__file__)))
    synchronizable = serializers.BooleanField(required=False, default=True)

    def validate(self, data):
        data = super(ImportStorageSerializer, self).validate(data)
        if settings.IMPORT_STORAGE_SERIALIZER_VALIDATE:
            validate_func = load_func(settings.IMPORT_STORAGE_SERIALIZER_VALIDATE)
            data = validate_func(self, data)
        return data

    class Meta:
        model = ImportStorage
        fields = '__all__'


class ExportStorageSerializer(serializers.ModelSerializer):
    type = StorageTypeField(default=os.path.basename(os.path.dirname(__file__)))
    synchronizable = serializers.BooleanField(required=False, default=True)

    class Meta:
        model = ExportStorage
        fields = '__all__'


class StorageTaskSerializer(TaskSerializer):
    def __init__(self, *args, **kwargs):
        # task is nested into the annotation, we don't need annotations in the task again
        kwargs['context'] = {'resolve_uri': False}
        super().__init__(*args, **kwargs)

    class Meta:
        model = Task
        fields = '__all__'


class StorageCompletedBySerializer(BaseUserSerializer):
    class Meta:
        model = User
        fields = ('id', 'first_name', 'last_name', 'email')


class StorageAnnotationSerializer(AnnotationSerializer):
    task = StorageTaskSerializer(read_only=True, omit=['annotations'])
    completed_by = StorageCompletedBySerializer(read_only=True)
