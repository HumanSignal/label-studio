import json

import pytest
from data_import.models import FileUpload
from data_import.uploader import load_tasks_for_async_import_streaming
from django.core.files.base import ContentFile
from projects.models import ProjectImport
from projects.tests.factories import ProjectFactory
from rest_framework.exceptions import ValidationError

pytestmark = pytest.mark.django_db


def _prefix(size):
    return (b' \t\r\n' * (size // 4 + 1))[:size]


def _upload(project, raw, name='tasks.json'):
    return FileUpload.objects.create(user=project.created_by, project=project, file=ContentFile(raw, name=name))


@pytest.mark.parametrize('prefix_size', [0, 4095, 4096, 4097, 16389])
@pytest.mark.parametrize('container', ['array', 'object'])
def test_streaming_reader_accepts_leading_json_whitespace(prefix_size, container, settings, tmp_path):
    settings.MEDIA_ROOT = str(tmp_path)
    project = ProjectFactory()
    expected = [{'data': {'text': 'first', 'number': 1.25}}]
    if container == 'array':
        expected += [{'data': {'text': f'row-{index}', 'number': index}} for index in range(4)]
    payload = expected if container == 'array' else expected[0]
    raw = _prefix(prefix_size) + json.dumps(payload).encode()
    upload = _upload(project, raw)

    batches = list(upload.read_tasks_list_from_json_streaming(batch_size=2))

    assert [task for batch in batches for task in batch] == expected
    assert [len(batch) for batch in batches] == ([2, 2, 1] if container == 'array' else [1])
    # Use a fresh model instance for the existing non-streaming reader.
    assert FileUpload.objects.get(pk=upload.pk).read_tasks_list_from_json() == expected
    with upload.file.open('rb') as handle:
        assert handle.read() == raw


@pytest.mark.parametrize('prefix_size', [4096, 8193, 65536])
@pytest.mark.parametrize('entry', ['file_loader', 'async_loader'])
def test_streaming_loaders_preserve_batches_and_upload_metadata(prefix_size, entry, settings, tmp_path):
    settings.MEDIA_ROOT = str(tmp_path)
    project = ProjectFactory()
    data = [{'text': f'row-{index}'} for index in range(7)]
    first = _upload(project, _prefix(prefix_size) + json.dumps(data[:6]).encode(), 'array.json')
    second = _upload(project, _prefix(prefix_size) + json.dumps(data[6]).encode(), 'object.json')
    ids = [first.id, second.id]
    if entry == 'file_loader':
        batches = list(FileUpload.load_tasks_from_uploaded_files_streaming(project, file_upload_ids=ids, batch_size=3))
        for _, formats, columns in batches:
            assert formats['.json'] in (1, 2)
            assert set(columns) == {'text'}
    else:
        project_import = ProjectImport.objects.create(project=project, file_upload_ids=ids)
        batches = list(load_tasks_for_async_import_streaming(project_import, project.created_by, batch_size=3))
        for _, upload_ids, formats, columns in batches:
            assert upload_ids == ids
            assert formats['.json'] in (1, 2)
            assert set(columns) == {'text'}

    assert [len(batch[0]) for batch in batches] == [3, 3, 1]
    tasks = [task for batch in batches for task in batch[0]]
    assert [task['data'] for task in tasks] == data
    assert [task['file_upload_id'] for task in tasks] == [first.id] * 6 + [second.id]


@pytest.mark.parametrize(
    'raw', [b'', b' ' * 8192, b'\v[{"text":"invalid whitespace"}]', b' ' * 8192 + b'null', b'not json']
)
def test_empty_and_unsupported_json_still_raise(raw, settings, tmp_path):
    settings.MEDIA_ROOT = str(tmp_path)
    upload = _upload(ProjectFactory(), raw)
    with pytest.raises(ValidationError, match='Unsupported or invalid JSON structure'):
        list(upload.read_tasks_list_from_json_streaming())
