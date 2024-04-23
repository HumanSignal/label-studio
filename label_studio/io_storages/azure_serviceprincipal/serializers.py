"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""

from io_storages.azure_serviceprincipal.models import AzureServicePrincipalImportStorage, AzureServicePrincipalExportStorage
from io_storages.serializers import ExportStorageSerializer, ImportStorageSerializer
from rest_framework import serializers
from rest_framework.exceptions import ValidationError


class AzureServicePrincipalImportStorageSerializer(ImportStorageSerializer):
    type = serializers.ReadOnlyField(default='azure_spi')
    presign = serializers.BooleanField(required=False, default=True)
    secure_fields = ['client_secret']

    class Meta:
        model = AzureServicePrincipalImportStorage
        fields = '__all__'

    def to_representation(self, instance):
        result = super().to_representation(instance)
        for attr in AzureServicePrincipalImportStorageSerializer.secure_fields:
            result.pop(attr)
        return result

    def validate(self, data):
        data = super(AzureServicePrincipalImportStorageSerializer, self).validate(data)
        storage = self.instance
        if storage:
            for key, value in data.items():
                setattr(storage, key, value)
        else:
            if 'id' in self.initial_data:
                storage_object = self.Meta.model.objects.get(id=self.initial_data['id'])
                for attr in AzureServicePrincipalImportStorageSerializer.secure_fields:
                    data[attr] = data.get(attr) or getattr(storage_object, attr)
            storage = self.Meta.model(**data)
        try:
            storage.validate_connection()
        except Exception as exc:
            raise ValidationError(exc)
        return data


class AzureServicePrincipalExportStorageSerializer(ExportStorageSerializer):
    type = serializers.ReadOnlyField(default='azure_spi')
    secure_fields = ['client_secret']

    def to_representation(self, instance):
        result = super().to_representation(instance)
        for secure_field in self.secure_fields:
            result.pop(secure_field)
        return result

    class Meta:
        model = AzureServicePrincipalExportStorage
        fields = '__all__'
