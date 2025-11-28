"""Unit tests for LocalFiles serializers and helpers."""

from unittest import mock

import pytest
from django.core.exceptions import ValidationError as DjangoValidationError  # type: ignore[import]
from io_storages.localfiles.serializers import (
    LocalFilesExportStorageSerializer,
    LocalFilesImportStorageSerializer,
    _stringify_detail,
)
from projects.models import Project
from rest_framework.exceptions import ValidationError as DRFValidationError  # type: ignore[import]


def test_stringify_detail_handles_nested_structures():
    """Ensure _stringify_detail flattens nested dict/list/tuple structures."""
    detail = {'path': ['bad', {'nested': ('inner', 'values')}]}
    assert _stringify_detail(detail) == {'path': ['bad', {'nested': ['inner', 'values']}]}


@pytest.mark.django_db
def test_import_serializer_stringifies_validation_detail(settings, tmp_path, project_id):
    """LocalFilesImportStorageSerializer should normalize paths and stringify validation errors."""
    document_root = tmp_path / 'root'
    document_root.mkdir()
    settings.LOCAL_FILES_DOCUMENT_ROOT = str(document_root)
    settings.LOCAL_FILES_SERVING_ENABLED = True

    project = Project.objects.get(pk=project_id)

    nested_detail = ['bad', {'nested': ('inner',)}]
    with mock.patch(
        'io_storages.localfiles.models.LocalFilesImportStorage.validate_connection',
        side_effect=DjangoValidationError(nested_detail),
    ) as mocked_validate:
        serializer = LocalFilesImportStorageSerializer()

        with pytest.raises(DRFValidationError) as excinfo:
            serializer.validate({'project': project, 'path': f'{document_root}//'})

    assert _stringify_detail(excinfo.value.detail) == ['bad', "('inner',)"]
    # Path is normalized before validate_connection is called
    assert mocked_validate.call_count == 1


@pytest.mark.django_db
def test_export_serializer_wraps_generic_exception(settings, tmp_path, project_id):
    """LocalFilesExportStorageSerializer should wrap unexpected exceptions with DRFValidationError."""
    document_root = tmp_path / 'root'
    document_root.mkdir()
    settings.LOCAL_FILES_DOCUMENT_ROOT = str(document_root)
    settings.LOCAL_FILES_SERVING_ENABLED = True

    project = Project.objects.get(pk=project_id)

    with mock.patch(
        'io_storages.localfiles.models.LocalFilesExportStorage.validate_connection',
        side_effect=RuntimeError('unexpected boom'),
    ):
        serializer = LocalFilesExportStorageSerializer()

        with pytest.raises(DRFValidationError) as excinfo:
            serializer.validate({'project': project, 'path': f'{document_root}//subdir//'})

    # DRF wraps scalar strings in a list for consistency
    assert _stringify_detail(excinfo.value.detail) == ['unexpected boom']
