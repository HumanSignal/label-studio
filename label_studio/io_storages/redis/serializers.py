"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license."""

import os

from core.utils.exceptions import SsrfBlockedUrlError
from io_storages.redis.models import RedisExportStorage, RedisImportStorage
from io_storages.serializers import (
    ExportStorageSerializer,
    ImportStorageSerializer,
    StorageTypeField,
    get_stored_storage,
    reset_secrets_on_endpoint_change,
)
from rest_framework.exceptions import ValidationError


def _require_password_on_endpoint_change(serializer, data):
    # the stored password must not be sent to a new host or port
    reset_secrets_on_endpoint_change(
        get_stored_storage(serializer),
        data,
        endpoint_fields=['host', 'port'],
        secret_fields=['password'],
        required_secret_fields=['password'],
    )


class RedisImportStorageSerializer(ImportStorageSerializer):
    type = StorageTypeField(default=os.path.basename(os.path.dirname(__file__)))

    class Meta:
        model = RedisImportStorage
        fields = '__all__'

    def to_representation(self, instance):
        result = super().to_representation(instance)
        result.pop('password')
        return result

    def validate(self, data):
        data = super(RedisImportStorageSerializer, self).validate(data)
        _require_password_on_endpoint_change(self, data)

        storage = RedisImportStorage(**data)
        try:
            storage.validate_connection()
        except SsrfBlockedUrlError:
            raise
        except:  # noqa: E722
            raise ValidationError("Can't connect to Redis server.")
        return data


class RedisExportStorageSerializer(ExportStorageSerializer):
    type = StorageTypeField(default=os.path.basename(os.path.dirname(__file__)))

    def to_representation(self, instance):
        result = super().to_representation(instance)
        result.pop('password')
        return result

    class Meta:
        model = RedisExportStorage
        fields = '__all__'

    def validate(self, data):
        data = super().validate(data)
        _require_password_on_endpoint_change(self, data)
        return data
