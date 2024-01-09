"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import os

from io_storages.redis.models import RedisExportStorage, RedisImportStorage
from io_storages.serializers import ExportStorageSerializer, ImportStorageSerializer
from rest_framework import serializers
from rest_framework.exceptions import ValidationError


class RedisImportStorageSerializer(ImportStorageSerializer):
    type = serializers.ReadOnlyField(default=os.path.basename(os.path.dirname(__file__)))

    class Meta:
        model = RedisImportStorage
        fields = '__all__'

    def to_representation(self, instance):
        result = super().to_representation(instance)
        result.pop('password')
        return result

    def validate(self, data):
        data = super(RedisImportStorageSerializer, self).validate(data)

        storage = RedisImportStorage(**data)
        try:
            storage.validate_connection()
        except:  # noqa: E722
            raise ValidationError("Can't connect to Redis server.")
        return data


class RedisExportStorageSerializer(ExportStorageSerializer):
    type = serializers.ReadOnlyField(default=os.path.basename(os.path.dirname(__file__)))

    def to_representation(self, instance):
        result = super().to_representation(instance)
        result.pop('password')
        return result

    class Meta:
        model = RedisExportStorage
        fields = '__all__'
