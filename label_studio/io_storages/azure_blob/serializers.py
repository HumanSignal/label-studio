"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""

from io_storages.azure_blob.models import AzureBlobExportStorage, AzureBlobImportStorage
from io_storages.serializers import ExportStorageSerializer, ImportStorageSerializer
from rest_framework import serializers
from rest_framework.exceptions import ValidationError


class AzureBlobImportStorageSerializer(ImportStorageSerializer):
    type = serializers.ReadOnlyField(default='azure')
    presign = serializers.BooleanField(required=False, default=True)

    class Meta:
        model = AzureBlobImportStorage
        fields = '__all__'

    def to_representation(self, instance):
        result = super().to_representation(instance)
        result.pop('account_name')
        result.pop('account_key')
        return result

    def validate(self, data):
        data = super(AzureBlobImportStorageSerializer, self).validate(data)
        storage = self.Meta.model(**data)
        try:
            storage.validate_connection()
        except Exception as exc:
            raise ValidationError(exc)
        return data


class AzureBlobExportStorageSerializer(ExportStorageSerializer):
    type = serializers.ReadOnlyField(default='azure')

    def to_representation(self, instance):
        result = super().to_representation(instance)
        result.pop('account_name')
        result.pop('account_key')
        return result

    class Meta:
        model = AzureBlobExportStorage
        fields = '__all__'
