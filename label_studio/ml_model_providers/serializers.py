"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""

from ml_model_providers.models import ModelProviderConnection
from rest_framework import serializers
from users.serializers import UserSimpleSerializer


class CreatedByFromContext:
    requires_context = True

    def __call__(self, serializer_field):
        return serializer_field.context.get('created_by')


class ModelProviderConnectionSerializer(serializers.ModelSerializer):
    created_by = UserSimpleSerializer(default=CreatedByFromContext(), help_text='User who created Dataset')
    secure_fields = ['api_key']

    class Meta:
        model = ModelProviderConnection
        fields = '__all__'
        read_only_fields = ['created_by', 'created_at', 'updated_at']

    def to_representation(self, instance):
        result = super().to_representation(instance)
        for attr in self.secure_fields:
            result.pop(attr)
        return result

