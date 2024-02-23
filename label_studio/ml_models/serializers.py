"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""

from ml_model_providers.models import ModelProviderConnection
from ml_models.models import ModelInterface, ModelRun, ThirdPartyModelVersion
from projects.models import Project
from rest_framework import serializers
from rest_framework.exceptions import ValidationError
from tasks.models import Task
from users.serializers import UserSimpleSerializer
from core.label_config import get_all_labels


class CreatedByFromContext:
    requires_context = True

    def __call__(self, serializer_field):
        return serializer_field.context.get('created_by')

class ModelInterfaceSerializer(serializers.ModelSerializer):
    created_by = UserSimpleSerializer(default=CreatedByFromContext(), help_text='User who created Dataset')
 
    class Meta:
        model = ModelInterface
        fields = '__all__'
        read_only_fields = ['created_by', 'created_at', 'updated_at']

    def check_output_classes(self, project, provided_output_classes):
        labels, _ = get_all_labels(project.label_config)
        project_output_classes =  sorted(list(set([label for label_list in labels.values() for label in label_list])))
        print(project_output_classes)
        print(provided_output_classes)
        if project_output_classes != provided_output_classes:
            raise ValidationError(f'output_classes not compatible with Project (id:{project.pk})')
        

    def check_input_fields(self, project, provided_input_fields):
        parsed_config = project.get_parsed_config()
        project_input_fields = set()
        for tag in parsed_config:
            for input in parsed_config[tag]['inputs']:
                if input.get('type',None) and input.get('value', None):
                    project_input_fields.add(input.get('value'))
        
        project_input_fields = sorted(list(project_input_fields))
        print(project_input_fields, provided_input_fields)
        if project_input_fields != provided_input_fields:
            raise ValidationError(f'input_fields do not match inputs in Project (id:{project.pk})')
        
    def validate(self, data):        
        model_obj = getattr(self, 'instance', None)
        if model_obj:
            if 'input_fields' in data:
                provided_input_fields = sorted(data['input_fields'])
        
            if 'output_classes' in data:
                provided_output_classes = sorted(data['output_classes'])
                print("here")
                print(provided_output_classes)
            model_obj_associated_projects = model_obj.associated_projects.all()

            if "associated_projects" in data:
                for associated_proj in data['associated_projects']:
                    projects = Project.objects.filter(pk=associated_proj.id,organization=data["organization"])
                    if not projects.exists():
                        ValidationError(f'Project (id:{associated_proj.id}) provided does not belong to your organization')
                    if 'input_fields' not in data:
                        provided_input_fields=sorted(model_obj.input_fields)
                    if 'output_classes' not in data:
                        provided_output_classes=sorted(model_obj.output_classes)
                    self.check_input_fields(project=projects[0], provided_input_fields=provided_input_fields)
                    self.check_output_classes(project=projects[0], provided_output_classes=provided_output_classes)
            
            else:
                if 'input_fields' in data:
                    for associated_proj in model_obj_associated_projects:
                        self.check_input_fields(project=associated_proj, provided_input_fields=provided_input_fields)
                if 'output_classes' in data:
                    for associated_proj in model_obj_associated_projects:
                        self.check_output_classes(project=associated_proj, provided_output_classes=provided_output_classes)
            return data
        
class ModelInterfaceCreateSerializer(ModelInterfaceSerializer):
    created_by = UserSimpleSerializer(default=CreatedByFromContext(), help_text='User who created Dataset')

    class Meta:
        model = ModelInterface
        fields = '__all__'
        read_only_fields = ['created_by', 'created_at', 'updated_at']

    def validate(self, data):
        associated_projects = data.pop('associated_projects')
        if model_interface := self.instance:
            for key, value in data.items():
                setattr(model_interface, key, value)

        else:
            model_interface = self.Meta.model(**data)
        if not associated_projects:
            ValidationError(f'Associated Projects list should not be empty')
        # check if projects provided belong to this organization
        for project in associated_projects:
            proj = Project.objects.filter(pk=project.id,organization=model_interface.organization)
            if not proj.exists():
                ValidationError(f'Project (id:{project.id}) provided does not belong to your organization')
            self.check_output_classes(project=proj[0], provided_output_classes=model_interface.output_classes)
            self.check_input_fields(project=proj[0], provided_input_fields=model_interface.input_fields)
               
            
        return data


class ThirdPartyModelVersionSerializer(serializers.ModelSerializer):
    created_by = UserSimpleSerializer(default=CreatedByFromContext(), help_text='User who created Dataset')


    class Meta:
        model = ThirdPartyModelVersion
        fields = '__all__'
        read_only_fields = ['created_by', 'created_at', 'updated_at']

    def validate(self, data):
        if third_party_model_version := self.instance:
            for key, value in data.items():
                setattr(third_party_model_version, key, value)

        else:
            third_party_model_version = self.Meta.model(**data)

        # Check if a version of this model exists with same name already
        existing_versions_with_title = self.Meta.model.objects.filter(
            title=third_party_model_version.title, parent_model=third_party_model_version.parent_model
        ).exclude(id=third_party_model_version.id)

        if len(existing_versions_with_title) > 0:
            raise ValidationError('A version with this name already exists.')

        # Check if we have a valid API key / connection for this provider
        model_provider_connections = ModelProviderConnection.objects.filter(
            provider=third_party_model_version.provider
        )
        if not model_provider_connections:
            raise ValidationError(
                f'A valid API key for provider {third_party_model_version.provider} has not been setup yet.'
            )

        return data


class ModelRunSerializer(serializers.ModelSerializer):
    @property
    def org(self):
        return self.context.get('org')

    class Meta:
        model = ModelRun
        fields = '__all__'
        read_only_fields = ['created_by', 'created_at', 'triggered_at', 'completed_at', 'status']

    def validate(self, data):
        
        if model_run := self.instance:
            for key, value in data.items():
                setattr(model_run, key, value)
        else:
            model_run = self.Meta.model(**data)

        if not Project.objects.filter(id=model_run.project.pk, organization=model_run.organization).exists():
            ValidationError(f'User does not have access to Project = {data["project"]}')

        if not ThirdPartyModelVersion.objects.filter(
            pk=model_run.model_version.pk, organization=model_run.organization
        ).exists():
            ValidationError(f'User does not have access to ModelVersion = {data["model_version"]}')

        # todo: we may need to update this check to specifically check for project subset conditions
        if len(Task.objects.filter(project=data['project'])) == 0:
            ValidationError('Project does not have any tasks')

        return data
