"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
from django.conf import settings
from rest_flex_fields import FlexFieldsModelSerializer
from rest_framework import serializers

from core.label_config import replace_task_data_undefined_with_config_field
from core.utils.common import load_func
from tasks.models import Annotation, Task
from tasks.serializers import AnnotationDraftSerializer, PredictionSerializer
from users.models import User
from users.serializers import UserSimpleSerializer

from .models import Export


class CompletedBySerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'email', 'first_name', 'last_name']


class AnnotationSerializer(FlexFieldsModelSerializer):
    completed_by = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = Annotation
        fields = '__all__'
        expandable_fields = {
          'completed_by': (CompletedBySerializer, )
        }


class BaseExportDataSerializer(FlexFieldsModelSerializer):
    annotations = AnnotationSerializer(many=True, read_only=True)
    file_upload = serializers.ReadOnlyField(source='file_upload_name')
    drafts = serializers.PrimaryKeyRelatedField(many=True, read_only=True)
    predictions = serializers.PrimaryKeyRelatedField(many=True, read_only=True)

    # resolve $undefined$ key in task data, if any
    def to_representation(self, task):
        project = task.project
        data = task.data

        replace_task_data_undefined_with_config_field(data, project)

        return super().to_representation(task)

    class Meta:
        model = Task
        exclude = ('overlap', 'is_labeled')
        expandable_fields = {
          'drafts': (AnnotationDraftSerializer, {'many': True}),
          'predictions': (PredictionSerializer, {'many': True}),
        }


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
        fields = ['title'] + read_only

    created_by = UserSimpleSerializer(required=False)


ONLY_OR_EXCLUDE_CHOICE = [
    2 * ['only'],
    2 * ['exclude'],
    2 * [None],
]


class TaskFilterOptionsSerializer(serializers.Serializer):
    view = serializers.IntegerField(required=False)
    skipped = serializers.ChoiceField(choices=ONLY_OR_EXCLUDE_CHOICE, allow_null=True, required=False)
    finished = serializers.ChoiceField(choices=ONLY_OR_EXCLUDE_CHOICE, allow_null=True, required=False)
    annotated = serializers.ChoiceField(choices=ONLY_OR_EXCLUDE_CHOICE, allow_null=True, required=False)
    only_with_annotations = serializers.BooleanField(default=False, required=False)


class AnnotationFilterOptionsSerializer(serializers.Serializer):
    usual = serializers.BooleanField(allow_null=True, required=False, default=True)
    ground_truth = serializers.BooleanField(allow_null=True, required=False)
    skipped = serializers.BooleanField(allow_null=True, required=False)


class SerializationOptionsSerializer(serializers.Serializer):
    drafts = serializers.JSONField(required=False)
    predictions = serializers.JSONField(required=False)
    annotations__completed_by = serializers.JSONField(required=False)


class ExportCreateSerializer(ExportSerializer):
    class Meta(ExportSerializer.Meta):
        fields = ExportSerializer.Meta.fields + [
            'task_filter_options',
            'annotation_filter_options',
            'serialization_options',
        ]

    task_filter_options = TaskFilterOptionsSerializer(required=False, default=None)
    annotation_filter_options = AnnotationFilterOptionsSerializer(required=False, default=None)
    serialization_options = SerializationOptionsSerializer(required=False, default=None)


ExportDataSerializer = load_func(settings.EXPORT_DATA_SERIALIZER)
