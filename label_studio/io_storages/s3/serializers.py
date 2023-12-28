"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import os

from botocore.exceptions import ClientError, ParamValidationError
from io_storages.s3.models import S3ExportStorage, S3ImportStorage
from io_storages.serializers import ExportStorageSerializer, ImportStorageSerializer
from rest_framework import serializers
from rest_framework.exceptions import ValidationError


class S3ImportStorageSerializer(ImportStorageSerializer):
    type = serializers.ReadOnlyField(default=os.path.basename(os.path.dirname(__file__)))
    presign = serializers.BooleanField(required=False, default=True)
    secure_fields = ['aws_access_key_id', 'aws_secret_access_key']

    class Meta:
        model = S3ImportStorage
        fields = '__all__'

    def to_representation(self, instance):
        result = super().to_representation(instance)
        for attr in S3ImportStorageSerializer.secure_fields:
            result.pop(attr)
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
            if 'id' in self.initial_data:
                storage_object = self.Meta.model.objects.get(id=self.initial_data['id'])
                for attr in S3ImportStorageSerializer.secure_fields:
                    data[attr] = data.get(attr) or getattr(storage_object, attr)
            storage = self.Meta.model(**data)
        try:
            storage.validate_connection()
        except ParamValidationError:
            raise ValidationError('Wrong credentials for S3 {bucket_name}'.format(bucket_name=storage.bucket))
        except ClientError as e:
            if (
                e.response.get('Error').get('Code') in ['SignatureDoesNotMatch', '403']
                or e.response.get('ResponseMetadata').get('HTTPStatusCode') == 403
            ):
                raise ValidationError(
                    'Cannot connect to S3 {bucket_name} with specified AWS credentials'.format(
                        bucket_name=storage.bucket
                    )
                )
            if (
                e.response.get('Error').get('Code') in ['NoSuchBucket', '404']
                or e.response.get('ResponseMetadata').get('HTTPStatusCode') == 404
            ):
                raise ValidationError('Cannot find bucket {bucket_name} in S3'.format(bucket_name=storage.bucket))
        except TypeError as e:
            raise ValidationError(f'It seems access keys are incorrect: {e}')
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
