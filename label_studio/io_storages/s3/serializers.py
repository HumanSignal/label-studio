"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license."""

import logging
import os

from botocore.exceptions import ClientError, ParamValidationError
from botocore.handlers import validate_bucket_name
from io_storages.s3.models import S3ExportStorage, S3ImportStorage
from io_storages.serializers import ExportStorageSerializer, ImportStorageSerializer
from rest_framework import serializers
from rest_framework.exceptions import ValidationError

logger = logging.getLogger(__name__)


class S3StorageSerializerMixin:
    secure_fields = ['aws_access_key_id', 'aws_secret_access_key']

    def to_representation(self, instance):
        result = super().to_representation(instance)
        for attr in self.secure_fields:
            result.pop(attr)
        return result

    def validate_bucket(self, value):
        if not value:
            return value
        try:
            validate_bucket_name({'Bucket': value})
        except ParamValidationError as exc:
            raise ValidationError(exc.kwargs['report']) from exc
        return value

    def validate(self, data):
        data = super().validate(data)
        if not data.get('bucket', None):
            return data

        storage = self.instance
        if storage:
            for key, value in data.items():
                setattr(storage, key, value)
        else:
            if 'id' in self.initial_data:
                storage_object = self.Meta.model.objects.get(id=self.initial_data['id'])
                for attr in self.secure_fields:
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
            logger.info(f'It seems access keys are incorrect: {e}', exc_info=True)
            raise ValidationError('It seems access keys are incorrect')
        except KeyError:
            raise ValidationError(f'{storage.url_scheme}://{storage.bucket}/{storage.prefix} not found.')
        return data


class S3ImportStorageSerializer(S3StorageSerializerMixin, ImportStorageSerializer):
    type = serializers.ReadOnlyField(default=os.path.basename(os.path.dirname(__file__)))
    presign = serializers.BooleanField(required=False, default=True)

    class Meta:
        model = S3ImportStorage
        fields = '__all__'


class S3ExportStorageSerializer(S3StorageSerializerMixin, ExportStorageSerializer):
    type = serializers.ReadOnlyField(default=os.path.basename(os.path.dirname(__file__)))

    class Meta:
        model = S3ExportStorage
        fields = '__all__'
