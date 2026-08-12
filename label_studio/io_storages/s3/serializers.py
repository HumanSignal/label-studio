"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license."""

import logging
import os

from botocore.exceptions import ClientError, ParamValidationError
from botocore.handlers import validate_bucket_name
from core.utils.io import validate_url_for_ssrf
from django.conf import settings
from io_storages.s3.models import S3ExportStorage, S3ImportStorage
from io_storages.serializers import ExportStorageSerializer, ImportStorageSerializer, StorageTypeField
from rest_framework import serializers
from rest_framework.exceptions import ValidationError

logger = logging.getLogger(__name__)


class S3StorageSerializerMixin:
    credential_fields = ['aws_access_key_id', 'aws_secret_access_key']
    secure_fields = [*credential_fields, 'aws_session_token']
    credential_pair_error = 'Access Key ID and Secret Access Key must be provided together.'

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
        supplied_credential_fields = {field for field in self.credential_fields if field in self.initial_data}
        if supplied_credential_fields and supplied_credential_fields != set(self.credential_fields):
            missing_field = next(field for field in self.credential_fields if field not in supplied_credential_fields)
            raise ValidationError({missing_field: self.credential_pair_error})

        if supplied_credential_fields and 'aws_session_token' not in data:
            data['aws_session_token'] = ''

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
                    if attr not in data:
                        data[attr] = getattr(storage_object, attr)
            storage = self.Meta.model(**data)

        if bool(storage.aws_access_key_id) != bool(storage.aws_secret_access_key):
            missing_field = 'aws_secret_access_key' if storage.aws_access_key_id else 'aws_access_key_id'
            raise ValidationError({missing_field: self.credential_pair_error})
        if storage.aws_session_token and not storage.aws_access_key_id:
            raise ValidationError(
                {'aws_session_token': 'Session Token requires an Access Key ID and Secret Access Key.'}
            )

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

    def update(self, instance, validated_data):
        if self.instance is None:
            # Validation endpoints call update directly; connection checks must not persist candidate values.
            for attr, value in validated_data.items():
                setattr(instance, attr, value)
            return instance
        return super().update(instance, validated_data)


class S3ImportStorageSerializer(S3StorageSerializerMixin, ImportStorageSerializer):
    type = StorageTypeField(default=os.path.basename(os.path.dirname(__file__)))
    presign = serializers.BooleanField(required=False, default=True)

    def validate_s3_endpoint(self, value):
        if value and settings.SSRF_PROTECTION_ENABLED:
            validate_url_for_ssrf(value, block_local_urls=True)
        return value

    class Meta:
        model = S3ImportStorage
        fields = '__all__'


class S3ExportStorageSerializer(S3StorageSerializerMixin, ExportStorageSerializer):
    type = StorageTypeField(default=os.path.basename(os.path.dirname(__file__)))

    class Meta:
        model = S3ExportStorage
        fields = '__all__'
