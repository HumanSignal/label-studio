"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
from django.conf import settings
from rest_framework import serializers

from tasks.models import Task, Annotation
from tasks.serializers import PredictionSerializer
from users.models import User


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'email', 'first_name', 'last_name']


class AnnotationSerializer(serializers.ModelSerializer):
    completed_by = UserSerializer(read_only=True)

    class Meta:
        model = Annotation
        fields = '__all__'


class ExportDataSerializer(serializers.ModelSerializer):
    annotations = AnnotationSerializer(many=True, read_only=True)
    predictions = PredictionSerializer(many=True, read_only=True)
    file_upload = serializers.ReadOnlyField(source='file_upload_name')

    # resolve $undefined$ key in task data, if any
    def to_representation(self, task):
        project = task.project
        data = task.data
        data_types_keys = project.data_types.keys()

        if settings.DATA_UNDEFINED_NAME in data and data_types_keys:
            key = list(data_types_keys)[0]
            data[key] = data[settings.DATA_UNDEFINED_NAME]
            del data[settings.DATA_UNDEFINED_NAME]

        return super().to_representation(task)

    class Meta:
        model = Task
        exclude = ('overlap', 'is_labeled')
