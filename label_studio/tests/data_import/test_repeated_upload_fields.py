import json

import pytest
from data_import.models import FileUpload
from data_import.uploader import check_extensions, check_request_files_size, create_file_uploads, load_tasks
from django.core.files.uploadedfile import SimpleUploadedFile
from django.utils.datastructures import MultiValueDict
from projects.tests.factories import ProjectFactory
from rest_framework.exceptions import ValidationError
from rest_framework.parsers import MultiPartParser
from rest_framework.request import Request
from rest_framework.test import APIRequestFactory
from tasks.models import Task

pytestmark = pytest.mark.django_db


def _upload(name, text):
    content = json.dumps([{'data': {'dialog': text}}]).encode()
    return SimpleUploadedFile(name, content, content_type='application/json')


def _files(layout):
    first = _upload('first.json', 'first')
    second = _upload('second.json', 'second')
    if layout == 'repeated':
        return MultiValueDict({'file': [first, second]})
    if layout == 'mixed':
        return MultiValueDict({'file': [first, second], 'other': [_upload('third.json', 'third')]})
    return {'first': first, 'second': second}


@pytest.mark.parametrize('layout', ['repeated', 'mixed', 'plain_mapping'])
@pytest.mark.parametrize('entry', ['sync_loader', 'file_uploads', 'api'])
def test_every_multipart_file_becomes_tasks(layout, entry, settings, tmp_path, setup_project_dialog):
    settings.MEDIA_ROOT = str(tmp_path)
    files = _files(layout)
    expected = ['first', 'second', 'third'] if layout == 'mixed' else ['first', 'second']
    # The test client accepts a list of files under one field, and its native
    # multipart parser creates the real MultiValueDict used by import endpoints.
    multipart = dict(files.lists()) if isinstance(files, MultiValueDict) else files
    if entry == 'api':
        response = setup_project_dialog.post(setup_project_dialog.urls.task_bulk, multipart)
        assert response.status_code == 201, response.content
        project = setup_project_dialog.project
        assert sorted(Task.objects.filter(project=project).values_list('data__dialog', flat=True)) == expected
        assert FileUpload.objects.filter(project=project).count() == len(expected)
        return

    project = ProjectFactory()
    if entry == 'sync_loader':
        raw_request = APIRequestFactory().post('/import', multipart, format='multipart')
        request = Request(raw_request, parsers=[MultiPartParser()])
        request.user = project.created_by
        tasks, upload_ids, _, _, _ = load_tasks(request, project)
    else:
        upload_ids, _ = create_file_uploads(project.created_by, project, files)
        tasks, _, _ = FileUpload.load_tasks_from_uploaded_files(project, upload_ids)
    assert sorted(task['data']['dialog'] for task in tasks) == expected
    assert len(upload_ids) == len(expected)
    assert {task['file_upload_id'] for task in tasks} == set(upload_ids)
    assert FileUpload.objects.filter(project=project).count() == len(expected)


@pytest.mark.parametrize('entry', ['validation', 'api'])
def test_total_size_includes_all_files_in_one_field(entry, settings, setup_project_dialog):
    files = _files('repeated')
    uploads = files.getlist('file')
    settings.TASKS_MAX_FILE_SIZE = sum(upload.size for upload in uploads)
    assert all(upload.size < settings.TASKS_MAX_FILE_SIZE for upload in uploads)
    if entry == 'validation':
        with pytest.raises(ValidationError, match='Maximum total size'):
            check_request_files_size(files)
    else:
        response = setup_project_dialog.post(setup_project_dialog.urls.task_bulk, {'file': uploads})
        assert response.status_code == 400, response.content
        assert Task.objects.filter(project=setup_project_dialog.project).count() == 0
        assert FileUpload.objects.filter(project=setup_project_dialog.project).count() == 0


@pytest.mark.parametrize('bad_position', [0, 1])
@pytest.mark.parametrize('entry', ['validation', 'file_uploads', 'api'])
def test_extension_validation_covers_every_repeated_file(
    bad_position, entry, settings, tmp_path, setup_project_dialog
):
    settings.MEDIA_ROOT = str(tmp_path)
    uploads = [_upload('first.json', 'first'), _upload('second.json', 'second')]
    uploads[bad_position] = _upload('blocked.bin', 'invalid extension')
    files = MultiValueDict({'file': uploads})
    if entry == 'validation':
        with pytest.raises(ValidationError, match='extension is not supported'):
            check_extensions(files)
    elif entry == 'file_uploads':
        project = ProjectFactory()
        with pytest.raises(ValidationError, match='extension is not supported'):
            create_file_uploads(project.created_by, project, files)
        assert FileUpload.objects.filter(project=project).count() == 0
    else:
        response = setup_project_dialog.post(setup_project_dialog.urls.task_bulk, {'file': uploads})
        assert response.status_code == 400, response.content
        assert Task.objects.filter(project=setup_project_dialog.project).count() == 0
        assert FileUpload.objects.filter(project=setup_project_dialog.project).count() == 0


def test_empty_multivalue_mapping_keeps_validation_behavior():
    files = MultiValueDict()
    assert check_extensions(files) is None
    assert check_request_files_size(files) is None
