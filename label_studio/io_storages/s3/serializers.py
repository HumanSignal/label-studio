"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license."""  # noqa: E501
import os

from botocore.exceptions import ClientError, ParamValidationError
from io_storages.s3.models import S3ExportStorage, S3ImportStorage
from io_storages.serializers import ExportStorageSerializer, ImportStorageSerializer
from rest_framework import serializers
from rest_framework.exceptions import ValidationError
from rest_framework.mixins import UpdateModelMixin


class S3ImportStorageSerializer(ImportStorageSerializer):
    type = serializers.ReadOnlyField(default=os.path.basename(os.path.dirname(__file__)))
    presign = serializers.BooleanField(required=False, default=True)

    class Meta:
        model = S3ImportStorage
        fields = "__all__"

    def to_representation(self, instance):
        result = super().to_representation(instance)
        result.pop("aws_access_key_id")
        result.pop("aws_secret_access_key")
        return result

    def validate(self, data):
        data = super().validate(data)
        if not data.get("bucket", None):
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
            raise ValidationError(f"Wrong credentials for S3 {storage.bucket}")
        except ClientError as e:
            if "403" == e.response.get("Error").get("Code"):
                raise ValidationError(
                    "Cannot connect to S3 {bucket_name} with specified AWS credentials".format(
                        bucket_name=storage.bucket
                    )
                )
            if "404" in e.response.get("Error").get("Code"):
                raise ValidationError(f"Cannot find bucket {storage.bucket} in S3")
        return data


class S3ExportStorageSerializer(ExportStorageSerializer):
    type = serializers.ReadOnlyField(default=os.path.basename(os.path.dirname(__file__)))

    def to_representation(self, instance):
        result = super().to_representation(instance)
        result.pop("aws_access_key_id")
        result.pop("aws_secret_access_key")
        return result

    class Meta:
        model = S3ExportStorage
        fields = "__all__"
