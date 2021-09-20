"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
from django.db import models
from django.db.models import fields
from core.label_config import replace_task_data_undefined_with_config_field
from django.conf import settings
from rest_framework import serializers
from tasks.models import Annotation, Task
from tasks.serializers import PredictionSerializer
from users.models import User
from .models import Export


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

        return super().to_representation(task)

    class Meta:
        model = Task
        exclude = ('overlap', 'is_labeled')


class ExportSerializer(serializers.ModelSerializer):
    class Meta:
        model = Export
        read_only = [
            'id',
            'created_by',
            'created_at',
            'finished_at',
            'status',
            'md5',
            'counters',
        ]
        fields = read_only + [
            'only_finished',
            'task_ids',
        ]

        def validate_task_ids(self, value):
            if not value:
                return []
            if not isinstance(value, list):
                raise serializers.ValidationError('Task_ids has to be list')
            if not all((isinstance(id_, int) for id_ in value)):
                raise serializers.ValidationError('Task_ids has to be list of numbers')
            return value
