"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import logging
import os

from botocore.exceptions import ClientError, ParamValidationError
from botocore.handlers import validate_bucket_name
from io_storages.b2.models import B2ExportStorage, B2ImportStorage
from io_storages.serializers import ExportStorageSerializer, ImportStorageSerializer
from rest_framework import serializers
from rest_framework.exceptions import ValidationError

logger = logging.getLogger(__name__)


class B2StorageSerializerMixin:
    """
    Mixin for B2 storage serializers.
    
    Handles secure field filtering and connection validation.
    """
    
    # These fields contain sensitive data and should not be returned in API responses
    secure_fields = ['b2_access_key_id', 'b2_secret_access_key']

    def to_representation(self, instance):
        """
        Remove secure fields from API response.
        
        This ensures that B2 credentials are never exposed through the API.
        """
        result = super().to_representation(instance)
        for attr in self.secure_fields:
            result.pop(attr, None)
        return result

    def validate_bucket(self, value):
        """
        Validate B2 bucket name.
        
        B2 bucket names follow similar rules to AWS S3.
        """
        if not value:
            return value
        try:
            validate_bucket_name({'Bucket': value})
        except ParamValidationError as exc:
            raise ValidationError(exc.kwargs['report']) from exc
        return value

    def validate(self, data):
        """
        Validate the entire storage configuration.
        
        This performs a test connection to B2 to ensure credentials and
        configuration are correct before saving.
        """
        data = super().validate(data)
        if not data.get('bucket', None):
            return data

        # Get or create storage instance for validation
        storage = self.instance
        if storage:
            # Update existing storage with new data
            for key, value in data.items():
                setattr(storage, key, value)
        else:
            # Create new storage instance
            if 'id' in self.initial_data:
                storage_object = self.Meta.model.objects.get(id=self.initial_data['id'])
                for attr in self.secure_fields:
                    data[attr] = data.get(attr) or getattr(storage_object, attr)
            storage = self.Meta.model(**data)
        
        # Validate connection to B2
        try:
            storage.validate_connection()
        except ParamValidationError:
            raise ValidationError(
                f'Wrong credentials for B2 bucket {storage.bucket}. '
                'Please check your B2 Application Key ID and Application Key.'
            )
        except ClientError as e:
            error_code = e.response.get('Error', {}).get('Code')
            http_status = e.response.get('ResponseMetadata', {}).get('HTTPStatusCode')
            
            # Handle authentication errors
            if error_code in ['SignatureDoesNotMatch', '403'] or http_status == 403:
                raise ValidationError(
                    f'Cannot connect to B2 bucket {storage.bucket} with specified credentials. '
                    'Please verify your B2 Application Key ID and Application Key are correct.'
                )
            
            # Handle bucket not found errors
            if error_code in ['NoSuchBucket', '404'] or http_status == 404:
                raise ValidationError(
                    f'Cannot find bucket {storage.bucket} in B2. '
                    'Please verify the bucket name is correct and that you have access to it.'
                )
            
            # Handle endpoint errors
            if 'Could not connect to the endpoint URL' in str(e):
                raise ValidationError(
                    f'Cannot connect to B2 endpoint. '
                    'Please verify your B2 endpoint URL is correct (e.g., https://s3.us-west-004.backblazeb2.com).'
                )
            
            # Generic error
            raise ValidationError(f'Error connecting to B2: {str(e)}')
            
        except TypeError as e:
            logger.info(f'It seems B2 access keys are incorrect: {e}', exc_info=True)
            raise ValidationError(
                'It seems B2 access keys are incorrect. '
                'Please check your B2 Application Key ID and Application Key.'
            )
        except KeyError:
            raise ValidationError(
                f'{storage.url_scheme}://{storage.bucket}/{storage.prefix} not found. '
                'Please verify the bucket and prefix are correct.'
            )
        
        return data


class B2ImportStorageSerializer(B2StorageSerializerMixin, ImportStorageSerializer):
    """Serializer for B2 Import Storage."""
    
    type = serializers.ReadOnlyField(default=os.path.basename(os.path.dirname(__file__)))
    presign = serializers.BooleanField(required=False, default=True)

    class Meta:
        model = B2ImportStorage
        fields = '__all__'


class B2ExportStorageSerializer(B2StorageSerializerMixin, ExportStorageSerializer):
    """Serializer for B2 Export Storage."""
    
    type = serializers.ReadOnlyField(default=os.path.basename(os.path.dirname(__file__)))

    class Meta:
        model = B2ExportStorage
        fields = '__all__'

