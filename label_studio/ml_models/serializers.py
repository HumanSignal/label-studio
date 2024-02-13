"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""

from ml_model_providers.models import ModelProviderConnection
from ml_models.models import ModelInterface, ThirdPartyModelVersion
from rest_framework import serializers
from rest_framework.exceptions import ValidationError
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


class ThirdPartyModelVersionSerializer(serializers.ModelSerializer):
    created_by = UserSimpleSerializer(default=CreatedByFromContext(), help_text='User who created Dataset')

    class Meta:
        model = ThirdPartyModelVersion
        fields = '__all__'
        read_only_fields = ['created_by', 'created_at', 'updated_at']

    def validate(self, data):
        third_party_model_version = self.instance
        if third_party_model_version:
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
        model_provider_connections = ModelProviderConnection.objects.filter(provider=third_party_model_version.provider)
        if not model_provider_connections:
            raise ValidationError(f"A valid API key for provider {third_party_model_version.provider} has not been setup yet.")

        return data
