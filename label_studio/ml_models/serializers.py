"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""

from ml_model_providers.models import ModelProviderConnection
from ml_models.models import ModelInterface, ModelRun, ThirdPartyModelVersion
from projects.models import Project
from rest_framework import serializers
from rest_framework.exceptions import ValidationError
from tasks.models import Task
from users.serializers import UserSimpleSerializer


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
        
class ModelInterfaceCreateSerializer(serializers.ModelSerializer):
    created_by = UserSimpleSerializer(default=CreatedByFromContext(), help_text='User who created Dataset')

    class Meta:
        model = ModelInterface
        fields = '__all__'
        read_only_fields = ['created_by', 'created_at', 'updated_at']

    def validate(self, data):
        print("xln-29")
        print(data)
        associated_projects = data.pop('associated_projects')
        print(data)
        if model_interface := self.instance:
            for key, value in data.items():
                setattr(model_interface, key, value)

        else:
            model_interface = self.Meta.model(**data)
        print("xln-38")
        if not associated_projects:
            ValidationError(f'Associated Projects list should not be empty')
        print("xln-41")
        # check if projects provided belong to this organization
        for project in associated_projects:
            print("xln-44")
            print(project.id)
            print("xln46")
            if not Project.objects.filter(pk=project.id,organization=model_interface.organization).exists():
                ValidationError(f'Project (id:{project.id}) provided does not belong to your organization')
            
            #todo add validation check for input_fields and output_classes for each project 
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
