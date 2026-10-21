"""Export snapshot / converted format files are removed from storage when their rows are deleted."""

import logging
import os
from unittest import mock

import pytest
from data_export.models import ConvertedFormat, DataExport, Export
from django.core.files.base import ContentFile
from django.core.files.storage import FileSystemStorage
from django.db import transaction
from projects.tests.factories import ProjectFactory
from rest_framework.test import APIClient

pytestmark = pytest.mark.django_db


@pytest.fixture
def media_root(settings, tmp_path):
    settings.MEDIA_ROOT = str(tmp_path / 'media')
    return tmp_path / 'media'


def _create_export_with_files(project):
    export = Export.objects.create(project=project, status=Export.Status.COMPLETED)
    export.file.save(f'{project.id}/snapshot.json', ContentFile(b'[]'))
    converted = ConvertedFormat.objects.create(
        project=project, export=export, export_type='CSV', status=ConvertedFormat.Status.COMPLETED
    )
    converted.file.save(f'{project.id}/snapshot.csv', ContentFile(b'id\n'))
    return export, converted


def _delete_export_via_api(project, export):
    client = APIClient()
    client.force_authenticate(user=project.created_by)
    return client.delete(f'/api/projects/{project.id}/exports/{export.id}')


def test_delete_api_removes_snapshot_and_converted_files(media_root):
    project = ProjectFactory()
    export, converted = _create_export_with_files(project)
    snapshot_path, converted_path = export.file.path, converted.file.path
    assert os.path.isfile(snapshot_path) and os.path.isfile(converted_path)

    response = _delete_export_via_api(project, export)

    assert response.status_code == 204
    assert not Export.objects.filter(id=export.id).exists()
    assert not ConvertedFormat.objects.filter(id=converted.id).exists()
    assert not os.path.exists(snapshot_path)
    assert not os.path.exists(converted_path)


def test_delete_api_succeeds_when_files_are_already_missing(media_root):
    project = ProjectFactory()
    export, converted = _create_export_with_files(project)
    os.remove(export.file.path)
    os.remove(converted.file.path)

    response = _delete_export_via_api(project, export)

    assert response.status_code == 204
    assert not Export.objects.filter(id=export.id).exists()
    assert not ConvertedFormat.objects.filter(id=converted.id).exists()
    assert not os.path.exists(export.file.path)


def test_delete_api_returns_500_and_keeps_rows_when_storage_delete_fails(media_root):
    project = ProjectFactory()
    export, converted = _create_export_with_files(project)
    snapshot_name, converted_name = export.file.name, converted.file.name

    with mock.patch.object(FileSystemStorage, 'delete', side_effect=PermissionError('access denied')):
        response = _delete_export_via_api(project, export)

    assert response.status_code == 500
    assert 'could not delete' in response.json()['detail'].lower()
    # DB and storage stay consistent: rows are kept and still point at their files
    export.refresh_from_db()
    converted.refresh_from_db()
    assert export.file.name == snapshot_name
    assert converted.file.name == converted_name
    assert os.path.isfile(export.file.path)
    assert os.path.isfile(converted.file.path)


def test_project_delete_removes_export_files_on_commit(media_root, django_capture_on_commit_callbacks):
    project = ProjectFactory()
    export, converted = _create_export_with_files(project)
    snapshot_path, converted_path = export.file.path, converted.file.path

    with django_capture_on_commit_callbacks(execute=True):
        project.delete()

    assert not os.path.exists(snapshot_path)
    assert not os.path.exists(converted_path)


def test_export_files_are_kept_when_delete_is_rolled_back(media_root, django_capture_on_commit_callbacks):
    project = ProjectFactory()
    export, converted = _create_export_with_files(project)
    export_id, snapshot_path, converted_path = export.id, export.file.path, converted.file.path

    with django_capture_on_commit_callbacks(execute=True):
        with pytest.raises(RuntimeError), transaction.atomic():
            export.delete()
            raise RuntimeError('rollback')

    assert Export.objects.filter(id=export_id).exists()
    assert os.path.isfile(snapshot_path)
    assert os.path.isfile(converted_path)


def test_cascade_cleanup_logs_storage_errors_instead_of_raising(
    media_root, django_capture_on_commit_callbacks, caplog
):
    project = ProjectFactory()
    export, _ = _create_export_with_files(project)

    with mock.patch.object(FileSystemStorage, 'delete', side_effect=PermissionError('access denied')):
        with caplog.at_level(logging.WARNING, logger='data_export.models'):
            with django_capture_on_commit_callbacks(execute=True):
                project.delete()

    assert not Export.objects.filter(id=export.id).exists()
    assert export.file.name in caplog.text


def test_generate_export_file_does_not_leave_files_in_export_dir(settings, tmp_path):
    settings.EXPORT_DIR = str(tmp_path / 'export')
    os.makedirs(settings.EXPORT_DIR)
    project = ProjectFactory()

    export_file, _, _ = DataExport.generate_export_file(project, [], 'JSON', False, {})
    export_file.close()

    assert os.listdir(settings.EXPORT_DIR) == []
