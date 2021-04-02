"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import os
from rest_framework import serializers

from io_storages.base_models import ImportStorage, ExportStorage
from users.models import User
from tasks.serializers import AnnotationSerializer, TaskSerializer
from tasks.models import Task


class ImportStorageSerializer(serializers.ModelSerializer):
    type = serializers.ReadOnlyField(default=os.path.basename(os.path.dirname(__file__)))
    presign = serializers.BooleanField(required=False, default=True)

    class Meta:
        model = ImportStorage
        fields = '__all__'


class ExportStorageSerializer(serializers.ModelSerializer):
    type = serializers.ReadOnlyField(default=os.path.basename(os.path.dirname(__file__)))

    class Meta:
        model = ExportStorage
        fields = '__all__'


class StorageTaskSerializer(TaskSerializer):
    def __init__(self, *args, **kwargs):
        # task is nested into the annotation, we don't need annotations in the task again
        kwargs['context'] = {
            'include_annotations': False,
            'resolve_uri': False
        }
        super().__init__(*args, **kwargs)

    class Meta:
        model = Task
        fields = '__all__'


class StorageUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'first_name', 'last_name', 'email')


class StorageAnnotationSerializer(AnnotationSerializer):
    task = StorageTaskSerializer(read_only=True)
    completed_by = StorageUserSerializer(read_only=True)
