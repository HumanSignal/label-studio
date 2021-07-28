"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import copy
from rest_framework import serializers

from tasks.models import Task, Annotation
from tasks.serializers import PredictionSerializer
from users.models import User
from core.label_config import replace_task_data_undefined_with_config_field


class CompletedBySerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'email', 'first_name', 'last_name']


class AnnotationSerializer(serializers.ModelSerializer):
    completed_by = CompletedBySerializer(read_only=True)

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

        replace_task_data_undefined_with_config_field(data, project)

        # resolve uri for storage (s3/gcs/etc)
        if self.context.get('resolve_uri', False):
            task.data['$resolved$'] = copy.copy(task.resolve_uri(task.data, proxy=self.context.get('proxy', False)))

        return super().to_representation(task)

    class Meta:
        model = Task
        exclude = ('overlap', 'is_labeled')
