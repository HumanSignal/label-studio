"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import os

from botocore.exceptions import ClientError, ParamValidationError
from io_storages.aperturedb.models import ApertureDBExportStorage, ApertureDBImportStorage
from io_storages.serializers import ExportStorageSerializer, ImportStorageSerializer
from rest_framework import serializers
from rest_framework.exceptions import ValidationError


class ApertureDBImportStorageSerializer(ImportStorageSerializer):
    type = serializers.ReadOnlyField(default=os.path.basename(os.path.dirname(__file__)))

    class Meta:
        model = ApertureDBImportStorage
        fields = '__all__'

    def to_representation(self, instance):
        raise NotImplementedError

    def validate(self, data):
        raise NotImplementedError


class ApertureDBExportStorageSerializer(ExportStorageSerializer):
    type = serializers.ReadOnlyField(default=os.path.basename(os.path.dirname(__file__)))

    def to_representation(self, instance):
        raise NotImplementedError
    
    class Meta:
        model = ApertureDBExportStorage
        fields = '__all__'
