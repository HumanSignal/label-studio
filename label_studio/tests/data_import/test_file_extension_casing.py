"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for
copyright information and LICENSE for a copy of the license.
"""

import json

import pytest
from data_import.models import FileUpload
from data_import.uploader import check_extensions, create_file_upload
from django.conf import settings
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient
from tests.utils import make_project

TEXT_CONFIG = (
    '<View><Text name="text" value="$text"/>'
    '<Choices name="label" toName="text"><Choice value="positive"/></Choices></View>'
)


@pytest.fixture
def text_project(business_client):
    return make_project({'label_config': TEXT_CONFIG}, business_client.user, use_ml_backend=False)


def _contents(extension):
    expected = [{'data': {'text': 'first'}}, {'data': {'text': 'second'}}]
    if extension == 'json':
        return json.dumps(expected).encode(), expected
    if extension == 'csv':
        return b'text\nfirst\nsecond\n', expected
    if extension == 'tsv':
        return b'text\tvalue\nfirst\t1\nsecond\t2\n', [
            {'data': {'text': 'first', 'value': 1}},
            {'data': {'text': 'second', 'value': 2}},
        ]
    if extension == 'txt':
        return b'first\nsecond\n', [
            {'data': {settings.DATA_UNDEFINED_NAME: 'first'}},
            {'data': {settings.DATA_UNDEFINED_NAME: 'second'}},
        ]
    body = '<p>Training &amp; labels</p>'
    return body.encode(), [{'data': {settings.DATA_UNDEFINED_NAME: body}}]


def _filename(extension, casing):
    suffix = extension
    if casing == 'upper':
        suffix = extension.upper()
    elif casing == 'mixed':
        suffix = ''.join(char.upper() if index % 2 == 0 else char for index, char in enumerate(extension))
    return f'Training.Data.{suffix}'


@pytest.mark.django_db
@pytest.mark.parametrize('extension', ['json', 'csv', 'tsv', 'txt', 'html', 'htm', 'xml'])
@pytest.mark.parametrize('casing', ['lower', 'upper', 'mixed'])
def test_file_format_case_selects_same_native_parser(text_project, extension, casing):
    content, expected = _contents(extension)
    filename = _filename(extension, casing)
    uploaded = SimpleUploadedFile(filename, content)
    check_extensions({'file': uploaded})
    file_upload = create_file_upload(text_project.created_by, text_project, uploaded)

    assert file_upload.format == f'.{extension}'
    assert file_upload.format_could_be_tasks_list == (extension in {'csv', 'tsv', 'txt'})
    assert file_upload.read_tasks() == expected
    batches = list(file_upload.read_tasks_streaming(batch_size=1))
    assert [task for batch in batches for task in batch] == expected
    tasks, formats, _ = FileUpload.load_tasks_from_uploaded_files(
        text_project, file_upload_ids=[file_upload.id], formats=[f'.{extension}']
    )
    assert tasks == [dict(task, file_upload_id=file_upload.id) for task in expected]
    assert formats == {f'.{extension}': 1}
    assert file_upload.file_name.endswith(filename)
    with file_upload.file.open('rb') as stored:
        assert stored.read() == content


@pytest.mark.django_db
@pytest.mark.parametrize('extension', ['json', 'csv', 'tsv'])
@pytest.mark.parametrize('casing', ['upper', 'mixed'])
def test_native_import_api_persists_rows_for_supported_extension_casing(text_project, extension, casing):
    content, expected = _contents(extension)
    client = APIClient()
    client.force_authenticate(text_project.created_by)

    response = client.post(
        f'/api/projects/{text_project.id}/import',
        {'file': SimpleUploadedFile(_filename(extension, casing), content)},
        format='multipart',
    )

    assert response.status_code == 201, response.content
    assert list(text_project.tasks.order_by('id').values_list('data', flat=True)) == [
        task['data'] for task in expected
    ]
    assert text_project.file_uploads.count() == 1


@pytest.mark.django_db
@pytest.mark.parametrize('extension', ['txt', 'html'])
def test_explicit_file_as_asset_keeps_original_url_and_bytes(text_project, extension):
    content, _ = _contents(extension)
    filename = _filename(extension, 'upper')
    file_upload = create_file_upload(
        text_project.created_by, text_project, SimpleUploadedFile(filename, content)
    )

    expected = [{'data': {settings.DATA_UNDEFINED_NAME: file_upload.url}}]
    assert file_upload.read_tasks(file_as_tasks_list=False) == expected
    assert list(file_upload.read_tasks_streaming(file_as_tasks_list=False)) == [expected]
    assert file_upload.file_name.endswith(filename)
