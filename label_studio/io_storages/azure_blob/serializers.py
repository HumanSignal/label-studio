"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import os

from rest_framework import serializers
from rest_framework.exceptions import ValidationError
from io_storages.serializers import ImportStorageSerializer, ExportStorageSerializer
from io_storages.azure_blob.models import AzureBlobImportStorage, AzureBlobExportStorage


class AzureBlobImportStorageSerializer(ImportStorageSerializer):
    type = serializers.ReadOnlyField(default='azure')

    class Meta:
        model = AzureBlobImportStorage
        fields = '__all__'

    def validate(self, data):
        data = super(AzureBlobImportStorageSerializer, self).validate(data)
        storage = AzureBlobImportStorage(**data)
        try:
            storage.validate_connection()
        except Exception as exc:
            raise ValidationError(exc)
        return data


class AzureBlobExportStorageSerializer(ExportStorageSerializer):
    type = serializers.ReadOnlyField(default='azure')

    class Meta:
        model = AzureBlobExportStorage
        fields = '__all__'
