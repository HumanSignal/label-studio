"""Validation tests for LocalFiles storage constraints."""

import pytest  # type: ignore[import]
from django.core.exceptions import ValidationError  # type: ignore[import]
from io_storages.localfiles.models import LocalFilesImportStorage
from projects.models import Project


@pytest.mark.django_db
def test_validate_connection_rejects_document_root_path(settings, tmp_path, project_id):
    """Ensure validate_connection fails when the storage path equals LOCAL_FILES_DOCUMENT_ROOT.

    This test validates step by step:
    - Creating a temporary document root and configuring Label Studio to use it
    - Initializing LocalFilesImportStorage with a path that matches the document root exactly
    - Calling validate_connection to trigger the new guard clause
    - Verifying that a ValidationError is raised with a helpful explanation so the user knows to pick a subfolder
    """

    settings.LOCAL_FILES_DOCUMENT_ROOT = str(tmp_path)
    settings.LOCAL_FILES_SERVING_ENABLED = True

    project = Project.objects.get(pk=project_id)
    storage = LocalFilesImportStorage(project=project, path=str(tmp_path))

    with pytest.raises(ValidationError) as exc_info:
        storage.validate_connection()

    error_message = str(exc_info.value)
    assert 'cannot be the same as LOCAL_FILES_DOCUMENT_ROOT' in error_message


@pytest.mark.django_db
def test_validate_connection_requires_subdirectory(settings, tmp_path, project_id):
    """Ensure validate_connection demands that storage.path stays inside LOCAL_FILES_DOCUMENT_ROOT.

    Steps validated:
    - Configure a document root and create a second folder outside of it
    - Assign the outside folder to LocalFilesImportStorage.path
    - Expect validate_connection to raise ValidationError
    - Confirm the error text mentions the subdirectory requirement so users understand the fix
    """

    document_root = tmp_path / 'root'
    document_root.mkdir()
    outside_dir = tmp_path / 'outside'
    outside_dir.mkdir()

    settings.LOCAL_FILES_DOCUMENT_ROOT = str(document_root)
    settings.LOCAL_FILES_SERVING_ENABLED = True

    project = Project.objects.get(pk=project_id)
    storage = LocalFilesImportStorage(project=project, path=str(outside_dir))

    with pytest.raises(ValidationError) as exc_info:
        storage.validate_connection()

    error_message = str(exc_info.value)
    assert 'must be a subdirectory of LOCAL_FILES_DOCUMENT_ROOT' in error_message
