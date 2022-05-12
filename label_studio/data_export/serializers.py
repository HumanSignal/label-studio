"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
from django.conf import settings
from label_studio_tools.core.label_config import is_video_object_tracking
from rest_flex_fields import FlexFieldsModelSerializer
from rest_framework import serializers

from core.label_config import replace_task_data_undefined_with_config_field
from core.utils.common import load_func
from ml.mixins import InteractiveMixin
from tasks.models import Annotation, Task
from tasks.serializers import AnnotationDraftSerializer, PredictionSerializer
from users.models import User
from users.serializers import UserSimpleSerializer
from label_studio_tools.postprocessing.video import extract_key_frames

from .models import Export


class CompletedBySerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'email', 'first_name', 'last_name']


class AnnotationSerializer(FlexFieldsModelSerializer):
    completed_by = serializers.PrimaryKeyRelatedField(read_only=True)
    result = serializers.SerializerMethodField()

    class Meta:
        model = Annotation
        fields = '__all__'
        expandable_fields = {'completed_by': (CompletedBySerializer,)}

    def get_result(self, obj):
        # run frames extraction on param, result and result type
        if obj.result and self.context.get('interpolate_key_frames', False) and \
                is_video_object_tracking(parsed_config=obj.task.project.get_parsed_config()):
            return extract_key_frames(obj.result)
        return obj.result


class BaseExportDataSerializer(FlexFieldsModelSerializer):
    annotations = AnnotationSerializer(many=True, read_only=True)
    file_upload = serializers.ReadOnlyField(source='file_upload_name')
    drafts = serializers.PrimaryKeyRelatedField(many=True, read_only=True)
    predictions = serializers.PrimaryKeyRelatedField(many=True, read_only=True)

    # resolve $undefined$ key in task data, if any
    def to_representation(self, task):
        project = task.project
        data = task.data
        # add interpolate_key_frames param to annotations serializer
        if 'annotations' in self.fields:
            self.fields['annotations'].context['interpolate_key_frames'] = self.context.get('interpolate_key_frames', False)
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
    class SerializationOption(serializers.Serializer):
        only_id = serializers.BooleanField(default=False, required=False)

    drafts = SerializationOption(required=False)
    predictions = SerializationOption(required=False)
    annotations__completed_by = SerializationOption(required=False)
    interpolate_key_frames = serializers.BooleanField(default=settings.INTERPOLATE_KEY_FRAMES,
                                                      help_text='Interpolate video key frames.',
                                                      required=False)


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


class ExportParamSerializer(serializers.Serializer):
    interpolate_key_frames = serializers.BooleanField(default=settings.INTERPOLATE_KEY_FRAMES,
                                                      help_text='Interpolate video key frames.',
                                                      required=False)
    download_resources = serializers.BooleanField(default=settings.CONVERTER_DOWNLOAD_RESOURCES,
                                                  help_text='Download resources in converter.',
                                                  required=False)
    # deprecated param to delete
    export_type = serializers.CharField(default='JSON',
                                        help_text='Export file format.',
                                        required=False)
    exportType = serializers.CharField(help_text='Export file format.',
                                        required=False)
    download_all_tasks = serializers.BooleanField(default=False,
                                                  help_text='Download all tasks or only finished.',
                                                  required=False)


class BaseExportDataSerializerForInteractive(InteractiveMixin, BaseExportDataSerializer):
    pass


ExportDataSerializer = load_func(settings.EXPORT_DATA_SERIALIZER)
