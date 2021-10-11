"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import os
from rest_framework import serializers
from rest_framework.exceptions import ValidationError
from io_storages.serializers import ImportStorageSerializer, ExportStorageSerializer
from io_storages.gcs.models import GCSImportStorage, GCSExportStorage


class GCSImportStorageSerializer(ImportStorageSerializer):
    type = serializers.ReadOnlyField(default=os.path.basename(os.path.dirname(__file__)))
    presign = serializers.BooleanField(required=False, default=True)

    class Meta:
        model = GCSImportStorage
        fields = '__all__'

    def to_representation(self, instance):
        result = super().to_representation(instance)
        result.pop('google_application_credentials')
        return result

    def validate(self, data):
        data = super(GCSImportStorageSerializer, self).validate(data)
        storage = self.instance
        if storage:
            for key, value in data.items():
                setattr(storage, key, value)
        else:
            storage = GCSImportStorage(**data)
        try:
            storage.validate_connection()
        except Exception as exc:
            raise ValidationError(exc)
        return data


class GCSExportStorageSerializer(ExportStorageSerializer):
    type = serializers.ReadOnlyField(default=os.path.basename(os.path.dirname(__file__)))

    def to_representation(self, instance):
        result = super().to_representation(instance)
        result.pop('google_application_credentials')
        return result

    class Meta:
        model = GCSExportStorage
        fields = '__all__'
