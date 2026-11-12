import json
from urllib.parse import urlencode

import pytest
from data_import.models import FileUpload
from data_import.uploader import (
    load_tasks,
    load_tasks_for_async_import,
    load_tasks_for_async_import_streaming,
    str_to_json,
)
from projects.models import ProjectImport
from projects.tests.factories import ProjectFactory
from rest_framework.parsers import FormParser
from rest_framework.request import Request
from rest_framework.test import APIRequestFactory


@pytest.mark.parametrize(
    'value',
    [
        {'text': "don't replace apostrophes"},
        {"author's name": 'Ada'},
        {'text': '\'quoted\' and "double quoted" with \\slashes'},
        [{'text': "l'été"}, {'text': "用户's text"}],
        {'text': 'ordinary', 'metadata': {'count': 3, 'active': True, 'score': 0.25}},
        [],
    ],
)
def test_valid_json_is_parsed_without_rewriting_string_contents(value):
    encoded = json.dumps(value, ensure_ascii=False)
    assert str_to_json(encoded) == value


@pytest.mark.parametrize(
    ('encoded', 'expected'),
    [
        ("[{'text': 'legacy'}]", [{'text': 'legacy'}]),
        ("{'text': 'legacy'}", {'text': 'legacy'}),
        ('null', None),
        ('https://example.com/tasks.json', None),
        ('{"text":', None),
    ],
)
def test_legacy_single_quotes_and_non_json_inputs(encoded, expected):
    assert str_to_json(encoded) == expected


@pytest.mark.django_db
@pytest.mark.parametrize('mode', ['sync', 'async', 'streaming'])
@pytest.mark.parametrize('apostrophes', [False, True])
def test_inline_json_import_preserves_tasks_and_uploaded_bytes(mode, apostrophes, settings, tmp_path):
    settings.MEDIA_ROOT = str(tmp_path)
    project = ProjectFactory(label_config='<View><Text name="text" value="$text"/></View>')
    texts = ["don't", "l'été", '\'quoted\' and "double quoted"'] if apostrophes else ['one', 'two', 'three']
    key = "author's note" if apostrophes else 'note'
    expected = [{'text': text, key: index} for index, text in enumerate(texts)]
    encoded = json.dumps([{'data': data} for data in expected], ensure_ascii=False)

    if mode == 'sync':
        raw_request = APIRequestFactory().post(
            '/import',
            data=urlencode({'url': encoded}),
            content_type='application/x-www-form-urlencoded',
        )
        request = Request(raw_request, parsers=[FormParser()])
        request.user = project.created_by
        tasks, upload_ids, _, formats, data_keys = load_tasks(request, project)
    else:
        project_import = ProjectImport.objects.create(project=project, url=encoded)
        if mode == 'async':
            tasks, upload_ids, formats, data_keys = load_tasks_for_async_import(project_import, project.created_by)
        else:
            batches = list(load_tasks_for_async_import_streaming(project_import, project.created_by, batch_size=2))
            assert [len(batch[0]) for batch in batches] == [2, 1]
            tasks = [task for batch in batches for task in batch[0]]
            _, upload_ids, formats, data_keys = batches[-1]
            assert all(batch[1] == upload_ids for batch in batches)

    assert [task['data'] for task in tasks] == expected
    assert len(upload_ids) == 1
    assert {task['file_upload_id'] for task in tasks} == set(upload_ids)
    assert formats == {'.json': 1}
    assert set(data_keys) == {'text', key}
    upload = FileUpload.objects.get(pk=upload_ids[0], project=project)
    with upload.file.open('rb') as file:
        assert file.read() == encoded.encode()
    assert FileUpload.objects.filter(project=project).count() == 1
