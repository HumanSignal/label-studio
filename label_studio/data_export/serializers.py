"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
from core.label_config import replace_task_data_undefined_with_config_field
from core.utils.common import load_func
from data_export.models import DataExport
from django.conf import settings
from label_studio_sdk._extensions.label_studio_tools.core.label_config import is_video_object_tracking
from label_studio_sdk._extensions.label_studio_tools.postprocessing.video import extract_key_frames
from ml.mixins import InteractiveMixin
from rest_flex_fields import FlexFieldsModelSerializer
from rest_framework import serializers
from tasks.models import Annotation, Task
from tasks.serializers import AnnotationDraftSerializer, PredictionSerializer
from users.models import User
from users.serializers import UserSimpleSerializer

from .models import ConvertedFormat, Export


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
        if (
            obj.result
            and self.context.get('interpolate_key_frames', False)
            and is_video_object_tracking(parsed_config=obj.project.get_parsed_config())
        ):
            return extract_key_frames(obj.result)
        return obj.result


class BaseExportDataSerializer(FlexFieldsModelSerializer):
    annotations = AnnotationSerializer(many=True, read_only=True)
    file_upload = serializers.ReadOnlyField(source='file_upload_name')
    drafts = serializers.PrimaryKeyRelatedField(many=True, read_only=True)
    predictions = serializers.PrimaryKeyRelatedField(many=True, read_only=True)

    # resolve $undefined$ key in task data, if any
    def to_representation(self, task):
        # avoid long project initializations
        project = getattr(self, '_project', None)
        if project is None:
            project = task.project
            setattr(self, '_project', project)

        data = task.data
        # add interpolate_key_frames param to annotations serializer
        if 'annotations' in self.fields:
            self.fields['annotations'].context['interpolate_key_frames'] = self.context.get(
                'interpolate_key_frames', False
            )
        replace_task_data_undefined_with_config_field(data, project)

        return super().to_representation(task)

    class Meta:
        model = Task
        exclude = ('overlap', 'is_labeled')
        expandable_fields = {
            'drafts': (AnnotationDraftSerializer, {'many': True}),
            'predictions': (PredictionSerializer, {'many': True}),
            'annotations': (AnnotationSerializer, {'many': True}),
        }


class ConvertedFormatSerializer(serializers.ModelSerializer):
    class Meta:
        model = ConvertedFormat
        fields = ['id', 'status', 'export_type', 'traceback']


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
            'converted_formats',
        ]
        fields = ['title'] + read_only

    created_by = UserSimpleSerializer(required=False)
    converted_formats = ConvertedFormatSerializer(many=True, required=False)


ONLY_OR_EXCLUDE_CHOICE = [
    2 * ['only'],
    2 * ['exclude'],
    2 * [None],
]


class TaskFilterOptionsSerializer(serializers.Serializer):
    view = serializers.IntegerField(
        required=False, help_text='Apply filters from the view ID (a tab from the Data Manager)'
    )
    skipped = serializers.ChoiceField(
        choices=ONLY_OR_EXCLUDE_CHOICE,
        allow_null=True,
        required=False,
        help_text='`only` - include all tasks with skipped annotations<br>'
        '`exclude` - exclude all tasks with skipped annotations',
    )
    finished = serializers.ChoiceField(
        choices=ONLY_OR_EXCLUDE_CHOICE,
        allow_null=True,
        required=False,
        help_text='`only` - include all finished tasks (is_labeled = true)<br>'
        '`exclude` - exclude all finished tasks',
    )
    annotated = serializers.ChoiceField(
        choices=ONLY_OR_EXCLUDE_CHOICE,
        allow_null=True,
        required=False,
        help_text='`only` - include all tasks with at least one not skipped annotation<br>'
        '`exclude` - exclude all tasks with at least one not skipped annotation',
    )
    only_with_annotations = serializers.BooleanField(default=False, required=False, help_text='')


class AnnotationFilterOptionsSerializer(serializers.Serializer):
    usual = serializers.BooleanField(
        allow_null=True, required=False, default=True, help_text='Include not skipped and not ground truth annotations'
    )
    ground_truth = serializers.BooleanField(
        allow_null=True, required=False, help_text='Include ground truth annotations'
    )
    skipped = serializers.BooleanField(allow_null=True, required=False, help_text='Include skipped annotations')


class SerializationOptionsSerializer(serializers.Serializer):
    class SerializationOption(serializers.Serializer):
        only_id = serializers.BooleanField(
            default=False, required=False, help_text='Include a full json body or IDs only'
        )

    drafts = SerializationOption(required=False, help_text='JSON dict with parameters')
    predictions = SerializationOption(required=False, help_text='JSON dict with parameters')
    include_annotation_history = serializers.BooleanField(
        default=False, help_text='Include annotation history', required=False
    )
    annotations__completed_by = SerializationOption(required=False, help_text='JSON dict with parameters')
    interpolate_key_frames = serializers.BooleanField(
        default=settings.INTERPOLATE_KEY_FRAMES, help_text='Interpolate video key frames', required=False
    )


class ExportConvertSerializer(serializers.Serializer):
    export_type = serializers.CharField(help_text='Export file format.')

    def validate_export_type(self, value):
        project = self.context.get('project')
        export_formats = [f['name'] for f in DataExport.get_export_formats(project)]
        if value not in export_formats:
            raise serializers.ValidationError(f'{value} is not supported export format')
        return value


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
    interpolate_key_frames = serializers.BooleanField(
        default=settings.INTERPOLATE_KEY_FRAMES, help_text='Interpolate video key frames.', required=False
    )
    download_resources = serializers.BooleanField(
        default=settings.CONVERTER_DOWNLOAD_RESOURCES, help_text='Download resources in converter.', required=False
    )
    # deprecated param to delete
    export_type = serializers.CharField(default='JSON', help_text='Export file format.', required=False)
    exportType = serializers.CharField(help_text='Export file format.', required=False)
    download_all_tasks = serializers.BooleanField(
        default=False, help_text='Download all tasks or only finished.', required=False
    )


class BaseExportDataSerializerForInteractive(InteractiveMixin, BaseExportDataSerializer):
    pass


ExportDataSerializer = load_func(settings.EXPORT_DATA_SERIALIZER)
