"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import os

from io_storages.aperturedb.models import ApertureDBExportStorage, ApertureDBImportStorage, ApertureDBStorageMixin
from io_storages.serializers import ExportStorageSerializer, ImportStorageSerializer
from rest_framework import serializers
from rest_framework.exceptions import ValidationError

class ApertureDBImportStorageSerializer(ImportStorageSerializer):
    type = serializers.ReadOnlyField(default=os.path.basename(os.path.dirname(__file__)))

    class Meta:
        model = ApertureDBImportStorage
        fields = '__all__'

    def to_representation(self, instance):
        result = super().to_representation(instance)
        for attr in ApertureDBStorageMixin.secure_fields:
            result.pop(attr)
        return result

    def validate(self, data):
        data = super(ApertureDBImportStorageSerializer, self).validate(data)
        storage = self.instance
        if storage:
            for key, value in data.items():
                setattr(storage, key, value)
        else:
            if 'id' in self.initial_data:
                storage_object = self.Meta.model.objects.get(id=self.initial_data['id'])
                for attr in ApertureDBStorageMixin.secure_fields:
                    data[attr] = data.get(attr) or getattr(storage_object, attr)
            storage = self.Meta.model(**data)
        try:
            storage.validate_connection()
        except Exception as exc:
            raise ValidationError(exc)
        return data


class ApertureDBExportStorageSerializer(ExportStorageSerializer):
    type = serializers.ReadOnlyField(default=os.path.basename(os.path.dirname(__file__)))
    
    class Meta:
        model = ApertureDBExportStorage
        fields = '__all__'

    def to_representation(self, instance):
        result = super().to_representation(instance)
        for attr in ApertureDBStorageMixin.secure_fields:
            result.pop(attr)
        return result

    def validate(self, data):
        data = super(ApertureDBExportStorageSerializer, self).validate(data)
        storage = self.instance
        if storage:
            for key, value in data.items():
                setattr(storage, key, value)
        else:
            if 'id' in self.initial_data:
                storage_object = self.Meta.model.objects.get(id=self.initial_data['id'])
                for attr in ApertureDBStorageMixin.secure_fields:
                    data[attr] = data.get(attr) or getattr(storage_object, attr)
            storage = self.Meta.model(**data)
        try:
            storage.validate_connection()
        except Exception as exc:
            raise ValidationError(exc)
        return data
