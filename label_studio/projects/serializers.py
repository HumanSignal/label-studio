"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
from core.label_config import generate_sample_task_without_check
from django.db.models import Q
from drf_dynamic_fields import DynamicFieldsMixin
from rest_framework import serializers
from rest_framework.serializers import SerializerMethodField
from tasks.models import (Prediction, Q_finished_annotations, Task,
                          Annotation)
from users.serializers import UserSimpleSerializer

from projects.models import (Project, ProjectOnboarding, ProjectSummary,
                             ProjectTemplate)


class CreatedByFromContext:
    requires_context = True

    def __call__(self, serializer_field):
        return serializer_field.context.get('created_by')


class ProjectSerializer(DynamicFieldsMixin, serializers.ModelSerializer):
    task_number = SerializerMethodField(default=None, read_only=True,
                                        help_text='Total task number in project')
    total_annotations_number = SerializerMethodField(default=None, read_only=True,
                                                    help_text='Total annotations number in project including '
                                                              'skipped_annotations_number and ground_truth_number.')
    total_predictions_number = SerializerMethodField(default=None, read_only=True,
                                                    help_text='Total predictions number in project including '
                                                              'skipped_annotations_number and ground_truth_number.')
    useful_annotation_number = SerializerMethodField(default=None, read_only=True,
                                                     help_text='Useful annotation number in project not including '
                                                               'skipped_annotations_number and ground_truth_number. '
                                                               'Total annotations = annotation_number + '
                                                               'skipped_annotations_number + ground_truth_number')
    ground_truth_number = SerializerMethodField(default=None, read_only=True,
                                            help_text='Honeypot annotation number in project')
    skipped_annotations_number = SerializerMethodField(default=None, read_only=True,
                                                      help_text='Skipped by collaborators annotation number in project')
    created_by = UserSimpleSerializer(default=CreatedByFromContext())

    parsed_label_config = SerializerMethodField(default=None, read_only=True,
                                                help_text='JSON-formatted labeling configuration')

    @staticmethod
    def get_task_number(project):
        return Task.objects.filter(project=project).count()

    @staticmethod
    def get_total_annotations_number(project):
        return Annotation.objects.filter(task__project=project, was_cancelled=False).count()

    @staticmethod
    def get_total_predictions_number(project):
        return Prediction.objects.filter(task__project=project).count()

    @staticmethod
    def get_useful_annotation_number(project):
        return Annotation.objects.filter(Q(task__project=project, ground_truth=False) & Q_finished_annotations).count()

    @staticmethod
    def get_ground_truth_number(project):
        return Annotation.objects.filter(task__project=project, ground_truth=True).count()

    @staticmethod
    def get_skipped_annotations_number(project):
        return Annotation.objects.filter(task__project=project, was_cancelled=True).count()

    @staticmethod
    def get_parsed_label_config(project):
        return project.get_parsed_config()

    class Meta:
        model = Project
        extra_kwargs = {'memberships': {'required': False}, 'title': {'required': False}, 'created_by': {'required': False}}
        fields = ['id', 'title', 'description', 'label_config', 'expert_instruction', 'show_instruction', 'show_skip_button',
                  'enable_empty_annotation', 'show_annotation_history', 'organization', 'color',
                  'maximum_annotations', 'is_published', 'model_version', 'is_draft', 'created_by', 'created_at',
                  'min_annotations_to_start_training', 'show_collab_predictions', 'num_tasks_with_annotations',
                  'task_number', 'useful_annotation_number', 'ground_truth_number', 'skipped_annotations_number',
                  'total_annotations_number', 'total_predictions_number', 'sampling', 'show_ground_truth_first',
                  'show_overlap_first', 'overlap_cohort_percentage', 'task_data_login', 'task_data_password',
                  'control_weights', 'parsed_label_config']

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


class ProjectTemplateSerializer(serializers.ModelSerializer):

    class Meta:
        model = ProjectTemplate
        exclude = ('id', 'created_at', 'updated_at', 'created_by', 'organization')


class CreateProjectTemplateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating new ProjectTemplate
    """
    class Meta:
        model = ProjectTemplate
        fields = '__all__'

    def create(self, validated_data):
        user = self.context['user']
        validated_data['created_by_id'] = user.id
        project = self.context.get('project')
        if project:
            # if template is created from project, get all settings from project
            validated_data['is_private'] = project.is_private
            validated_data['project_settings'] = ProjectSerializer(project).data
            validated_data['organization_id'] = project.organization.id

            sample_task = generate_sample_task_without_check(project.label_config, mode='editor_preview',
                                                             secure_mode=project.secure_mode)
            validated_data['input_example'] = 'Generated example'
            validated_data['input_example_json'] = sample_task
            validated_data['task_data'] = [sample_task]
        else:
            # current organization should be included in the context
            validated_data['organization_id'] = self.context['organization'].id

        return super(CreateProjectTemplateSerializer, self).create(validated_data)


class ProjectTemplateCreateSerializer(serializers.Serializer):
    """
    Unlike it's weird name, this serializer handles Project creation from ProjectTemplate
    """
    title = serializers.CharField(max_length=2000)
    template_pk = serializers.IntegerField()
    include_example_data = serializers.BooleanField()
    membership_id = serializers.CharField(required=False)

    def to_representation(self, instance):
        project = ProjectSerializer(instance)
        return project.data

    def validate(self, data):
        try:
            data['template'] = ProjectTemplate.objects.get(pk=data['template_pk'])
        except ProjectTemplate.DoesNotExist:
            raise serializers.ValidationError('template with id %d does not exist' % data['template_pk'])

        return data

    def create(self, validated_data):
        template = validated_data['template']
        return template.create_project(**validated_data)


class ProjectSummarySerializer(serializers.ModelSerializer):

    class Meta:
        model = ProjectSummary
        fields = '__all__'
