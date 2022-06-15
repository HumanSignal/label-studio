"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import os
from rest_framework import serializers
from rest_framework.exceptions import ValidationError
from io_storages.serializers import ImportStorageSerializer, ExportStorageSerializer
from io_storages.pachyderm.models import PachydermImportStorage, PachydermExportStorage


class PachydermImportStorageSerializer(ImportStorageSerializer):
    type = serializers.ReadOnlyField(default=os.path.basename(os.path.dirname(__file__)))

    class Meta:
        model = PachydermImportStorage
        fields = '__all__'

    def validate(self, data):
        # Validate pachyderm resource exists
        data = super(PachydermImportStorageSerializer, self).validate(data)
        storage = PachydermImportStorage(**data)
        try:
            storage.validate_connection()
        except Exception as exc:
            raise ValidationError(exc)
        return data


class PachydermExportStorageSerializer(ExportStorageSerializer):
    type = serializers.ReadOnlyField(default=os.path.basename(os.path.dirname(__file__)))

    class Meta:
        model = PachydermExportStorage
        fields = '__all__'

    def validate(self, data):
        # Validate pachyderm resource exists
        data = super(PachydermExportStorageSerializer, self).validate(data)
        storage = PachydermExportStorage(**data)
        try:
            storage.validate_connection()
        except Exception as exc:
            raise ValidationError(exc)
        return data
