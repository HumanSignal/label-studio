"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import os

from core.utils.exceptions import extract_message
from django.core.exceptions import ValidationError as DjangoValidationError  # type: ignore[import]
from io_storages.localfiles.models import (
    LocalFilesExportStorage,
    LocalFilesImportStorage,
    normalize_storage_path,
)
from io_storages.serializers import ExportStorageSerializer, ImportStorageSerializer
from rest_framework import serializers  # type: ignore[import]
from rest_framework.exceptions import ValidationError as DRFValidationError  # type: ignore[import]


def _stringify_detail(detail):
    """Convert DRF/Django validation detail into plain strings for the UI."""
    if isinstance(detail, dict):
        return {key: _stringify_detail(value) for key, value in detail.items()}
    if isinstance(detail, (list, tuple)):
        return [_stringify_detail(item) for item in detail]
    return str(detail)


class LocalFilesImportStorageSerializer(ImportStorageSerializer):
    type = serializers.ReadOnlyField(default=os.path.basename(os.path.dirname(__file__)))

    class Meta:
        model = LocalFilesImportStorage
        fields = '__all__'

    def validate(self, data):
        # Validate local file path
        data = super(LocalFilesImportStorageSerializer, self).validate(data)
        if 'path' in data:
            data['path'] = normalize_storage_path(data['path'])
        storage = LocalFilesImportStorage(**data)
        try:
            storage.validate_connection()
        except (DjangoValidationError, DRFValidationError) as exc:
            detail = getattr(exc, 'detail', getattr(exc, 'messages', str(exc)))
            raise DRFValidationError(_stringify_detail(detail))
        except Exception as exc:
            raise DRFValidationError(extract_message(exc))
        return data


class LocalFilesExportStorageSerializer(ExportStorageSerializer):
    type = serializers.ReadOnlyField(default=os.path.basename(os.path.dirname(__file__)))

    class Meta:
        model = LocalFilesExportStorage
        fields = '__all__'

    def validate(self, data):
        # Validate local file path
        data = super(LocalFilesExportStorageSerializer, self).validate(data)
        if 'path' in data:
            data['path'] = normalize_storage_path(data['path'])
        storage = LocalFilesExportStorage(**data)
        try:
            storage.validate_connection()
        except (DjangoValidationError, DRFValidationError) as exc:
            detail = getattr(exc, 'detail', getattr(exc, 'messages', str(exc)))
            raise DRFValidationError(_stringify_detail(detail))
        except Exception as exc:
            raise DRFValidationError(extract_message(exc))
        return data
