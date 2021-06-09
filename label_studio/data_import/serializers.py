"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
from rest_framework import serializers

from tasks.models import Task
from tasks.serializers import (
    TaskSerializer, AnnotationSerializer, PredictionSerializer, TaskSerializerBulk)
from .models import FileUpload


class ImportApiSerializer(TaskSerializer):
    """ Tasks serializer for Import API (TaskBulkCreateAPI)
    """
    annotations = AnnotationSerializer(many=True, default=[])
    predictions = PredictionSerializer(many=True, default=[])

    class Meta:
        model = Task
        list_serializer_class = TaskSerializerBulk
        exclude = ('is_labeled', 'project')


class FileUploadSerializer(serializers.ModelSerializer):
    file = serializers.FileField(use_url=False)

    class Meta:
        model = FileUpload
        fields = ['id', 'file']

