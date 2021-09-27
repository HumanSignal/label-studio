"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import os

from rest_framework.exceptions import ValidationError
from rest_framework import serializers
from rest_framework.mixins import UpdateModelMixin
from botocore.exceptions import ParamValidationError, ClientError
from io_storages.serializers import ImportStorageSerializer, ExportStorageSerializer
from io_storages.s3.models import S3ImportStorage, S3ExportStorage


class S3ImportStorageSerializer(ImportStorageSerializer):
    type = serializers.ReadOnlyField(default=os.path.basename(os.path.dirname(__file__)))
    presign = serializers.BooleanField(required=False, default=True)

    class Meta:
        model = S3ImportStorage
        fields = '__all__'

    def to_representation(self, instance):
        result = super().to_representation(instance)
        result.pop('aws_access_key_id')
        result.pop('aws_secret_access_key')
        return result

    def validate(self, data):
        data = super(S3ImportStorageSerializer, self).validate(data)
        if not data.get('bucket', None):
            return data

        storage = self.instance
        if storage:
            for key, value in data.items():
                setattr(storage, key, value)
        else:
            storage = S3ImportStorage(**data)
        try:
            storage.validate_connection()
        except ParamValidationError:
            raise ValidationError('Wrong credentials for S3 {bucket_name}'.format(bucket_name=storage.bucket))
        except ClientError as e:
            if '403' == e.response.get('Error').get('Code'):
                raise ValidationError('Cannot connect to S3 {bucket_name} with specified AWS credentials'.format(
                    bucket_name=storage.bucket))
            if '404' in e.response.get('Error').get('Code'):
                raise ValidationError('Cannot find bucket {bucket_name} in S3'.format(
                    bucket_name=storage.bucket))
        return data


class S3ExportStorageSerializer(ExportStorageSerializer):
    type = serializers.ReadOnlyField(default=os.path.basename(os.path.dirname(__file__)))

    def to_representation(self, instance):
        result = super().to_representation(instance)
        result.pop('aws_access_key_id')
        result.pop('aws_secret_access_key')
        return result

    class Meta:
        model = S3ExportStorage
        fields = '__all__'
