"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import os

from rest_framework.exceptions import ValidationError
from rest_framework import serializers
from rest_framework.mixins import UpdateModelMixin
from botocore.exceptions import ParamValidationError, ClientError
from io_storages.serializers import ImportStorageSerializer, ExportStorageSerializer
from io_storages.oss.models import OSSImportStorage, OSSExportStorage


class OSSImportStorageSerializer(ImportStorageSerializer):
    type = serializers.ReadOnlyField(default=os.path.basename(os.path.dirname(__file__)))
    presign = serializers.BooleanField(required=False, default=True)

    class Meta:
        model = OSSImportStorage
        fields = '__all__'

    def to_representation(self, instance):
        result = super().to_representation(instance)
        result.pop('oss_access_key_id')
        result.pop('oss_secret_access_key')
        return result

    def validate(self, data):
        data = super(OSSImportStorageSerializer, self).validate(data)
        storage = self.instance
        if storage:
            for key, value in data.items():
                setattr(storage, key, value)
        else:
            storage = OSSImportStorage(**data)
            storage.inject_attr_from_settings()
        try:
            storage.validate_connection()
        except ParamValidationError:
            raise ValidationError('Wrong credentials for OSS {bucket_name}'.format(bucket_name=storage.bucket))
        except ClientError as e:
            if '403' == e.response.get('Error').get('Code'):
                raise ValidationError('Cannot connect to OSS {bucket_name} with specified OSS credentials'.format(
                    bucket_name=storage.bucket))
            if '404' in e.response.get('Error').get('Code'):
                raise ValidationError('Cannot find bucket {bucket_name} in OSS'.format(
                    bucket_name=storage.bucket))
        return data


class OSSExportStorageSerializer(ExportStorageSerializer):
    type = serializers.ReadOnlyField(default=os.path.basename(os.path.dirname(__file__)))

    def to_representation(self, instance):
        result = super().to_representation(instance)
        result.pop('oss_access_key_id')
        result.pop('oss_secret_access_key')
        return result
    
    def validate(self, data):
        data = super(OSSExportStorageSerializer, self).validate(data)
        if not data.get("prefix", "").endswith("/"):
            data["prefix"] = data["prefix"] + "/"

        storage = self.instance
        if storage:
            for key, value in data.items():
                setattr(storage, key, value)
        else:
            storage = OSSExportStorage(**data)
            storage.inject_attr_from_settings()
        try:
            storage.validate_connection()
        except ParamValidationError:
            raise ValidationError('Wrong credentials for OSS {bucket_name}'.format(bucket_name=storage.bucket))
        except ClientError as e:
            if '403' == e.response.get('Error').get('Code'):
                raise ValidationError('Cannot connect to OSS {bucket_name} with specified OSS credentials'.format(
                    bucket_name=storage.bucket))
            if '404' in e.response.get('Error').get('Code'):
                raise ValidationError('Cannot find bucket {bucket_name} in OSS'.format(
                    bucket_name=storage.bucket))
        return data

    class Meta:
        model = OSSExportStorage
        fields = '__all__'
