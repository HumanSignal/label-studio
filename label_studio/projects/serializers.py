"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
from core.label_config import generate_sample_task_without_check
from drf_dynamic_fields import DynamicFieldsMixin
from rest_framework import serializers
from rest_framework.serializers import SerializerMethodField
from users.serializers import UserSimpleSerializer

from projects.models import Project, ProjectOnboarding, ProjectSummary


class CreatedByFromContext:
    requires_context = True

    def __call__(self, serializer_field):
        return serializer_field.context.get('created_by')


class ProjectSerializer(DynamicFieldsMixin, serializers.ModelSerializer):
    """ Serializer get numbers from project queryset annotation,
        make sure, that you use correct one(Project.objects.with_counts())
    """

    task_number = serializers.IntegerField(default=None, read_only=True,
                                        help_text='Total task number in project')
    total_annotations_number = serializers.IntegerField(default=None, read_only=True,
                                                    help_text='Total annotations number in project including '
                                                              'skipped_annotations_number and ground_truth_number.')
    total_predictions_number = serializers.IntegerField(default=None, read_only=True,
                                                    help_text='Total predictions number in project including '
                                                              'skipped_annotations_number and ground_truth_numberuseful_annotation_number.')
    useful_annotation_number = serializers.IntegerField(default=None, read_only=True,
                                                     help_text='Useful annotation number in project not including '
                                                               'skipped_annotations_number and ground_truth_number. '
                                                               'Total annotations = annotation_number + '
                                                               'skipped_annotations_number + ground_truth_number')
    ground_truth_number = serializers.IntegerField(default=None, read_only=True,
                                            help_text='Honeypot annotation number in project')
    skipped_annotations_number = serializers.IntegerField(default=None, read_only=True,
                                                      help_text='Skipped by collaborators annotation number in project')
    created_by = UserSimpleSerializer(default=CreatedByFromContext())

    parsed_label_config = SerializerMethodField(default=None, read_only=True,
                                                help_text='JSON-formatted labeling configuration')
    start_training_on_annotation_update = SerializerMethodField(default=None, read_only=False,
                                                                help_text='Start model training after any annotations are submitted or updated')
    config_has_control_tags = SerializerMethodField(default=None, read_only=True,
                                                    help_text='Flag to detect is project ready for labeling')

    @staticmethod
    def get_config_has_control_tags(project):
        return len(project.get_control_tags_from_config()) > 0

    @staticmethod
    def get_parsed_label_config(project):
        return project.get_parsed_config()

    def get_start_training_on_annotation_update(self, instance):
        # FIXME: remake this logic with start_training_on_annotation_update
        return True if instance.min_annotations_to_start_training else False

    def to_internal_value(self, data):
        # FIXME: remake this logic with start_training_on_annotation_update
        initial_data = data
        data = super().to_internal_value(data)
        if 'start_training_on_annotation_update' in initial_data:
            data['min_annotations_to_start_training'] = int(initial_data['start_training_on_annotation_update'])
        return data

    class Meta:
        model = Project
        extra_kwargs = {'memberships': {'required': False}, 'title': {'required': False}, 'created_by': {'required': False}}
        fields = ['id', 'title', 'description', 'label_config', 'expert_instruction', 'show_instruction', 'show_skip_button',
                  'enable_empty_annotation', 'show_annotation_history', 'organization', 'color',
                  'maximum_annotations', 'is_published', 'model_version', 'is_draft', 'created_by', 'created_at',
                  'min_annotations_to_start_training', 'start_training_on_annotation_update',
                  'show_collab_predictions', 'num_tasks_with_annotations',
                  'task_number', 'useful_annotation_number', 'ground_truth_number', 'skipped_annotations_number',
                  'total_annotations_number', 'total_predictions_number', 'sampling', 'show_ground_truth_first',
                  'show_overlap_first', 'overlap_cohort_percentage', 'task_data_login', 'task_data_password',
                  'control_weights', 'parsed_label_config', 'evaluate_predictions_automatically',
                  'config_has_control_tags']

    def validate_label_config(self, value):
        if self.instance is None:
            # No project created yet
            Project.validate_label_config(value)
        else:
            # Existing project is updated
            self.instance.validate_config(value)
        return value


class ProjectOnboardingSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProjectOnboarding
        fields = '__all__'


class ProjectLabelConfigSerializer(serializers.Serializer):
    label_config = serializers.CharField()

    def validate_label_config(self, config):
        Project.validate_label_config(config)
        return config


class ProjectSummarySerializer(serializers.ModelSerializer):

    class Meta:
        model = ProjectSummary
        fields = '__all__'
