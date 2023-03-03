"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import os
from rest_framework import serializers
from rest_framework.exceptions import ValidationError
from io_dataset_storages.serializers import DatasetStorageSerializer
from io_dataset_storages.gcs.models import GCSDatasetStorage


class GCSDatasetStorageSerializer(DatasetStorageSerializer):
    type = serializers.ReadOnlyField(default=os.path.basename(os.path.dirname(__file__)))
    presign = serializers.BooleanField(required=False, default=True)

    class Meta:
        model = GCSDatasetStorage
        fields = '__all__'

    def to_representation(self, instance):
        result = super().to_representation(instance)
        result.pop('google_application_credentials')
        return result

    def validate(self, data):
        data = super(GCSDatasetStorageSerializer, self).validate(data)
        storage = self.instance
        if storage:
            for key, value in data.items():
                setattr(storage, key, value)
        else:
            storage = GCSDatasetStorage(**data)
        try:
            storage.validate_connection()
        except Exception as exc:
            raise ValidationError(exc)
        return data
