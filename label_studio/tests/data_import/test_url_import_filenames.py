"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for
copyright information and LICENSE for a copy of the license.
"""

import json
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlencode, urlsplit

import pytest
from data_import.models import FileUpload
from data_import.uploader import load_tasks_for_async_import, load_tasks_for_async_import_streaming, tasks_from_url
from projects.models import ProjectImport
from rest_framework.exceptions import ValidationError
from tests.utils import make_project

pytestmark = pytest.mark.django_db

EXPECTED = [{'text': 'first'}, {'text': 'second'}]


@pytest.fixture
def text_project(business_client):
    return make_project(
        {'label_config': '<View><Text name="text" value="$text"/></View>'},
        business_client.user,
        use_ml_backend=False,
    )


@pytest.fixture
def file_server(settings):
    # Only this controlled loopback peer is used. Production address validation is unchanged.
    settings.SSRF_PROTECTION_ENABLED = False
    received = []

    class Handler(BaseHTTPRequestHandler):
        def do_GET(self):
            received.append(self.path)
            parsed = urlsplit(self.path)
            if parsed.path.startswith('/redirect/'):
                self.send_response(302)
                self.send_header('Location', self.path.removeprefix('/redirect'))
                self.end_headers()
                return
            content = (
                b'text\nfirst\nsecond\n'
                if parsed.path.endswith('.csv')
                else json.dumps([{'data': row} for row in EXPECTED]).encode()
            )
            self.send_response(200)
            self.send_header('Content-Type', 'application/octet-stream')
            self.send_header('Content-Length', str(len(content)))
            self.end_headers()
            self.wfile.write(content)

        def log_message(self, *args):
            pass

    server = ThreadingHTTPServer(('127.0.0.1', 0), Handler)
    thread = threading.Thread(target=lambda: server.serve_forever(poll_interval=0.01), daemon=True)
    thread.start()
    try:
        yield f'http://127.0.0.1:{server.server_port}', received
    finally:
        server.shutdown()
        server.server_close()
        thread.join()


def _assert_upload(project, file_ids, extension):
    assert len(file_ids) == 1
    uploaded = FileUpload.objects.get(pk=file_ids[0], project=project)
    assert uploaded.format == f'.{extension}'
    assert uploaded.file_name.endswith(f'.{extension}')
    assert 'token=' not in uploaded.file_name
    assert 'signature=' not in uploaded.file_name
    with uploaded.file.open('rb') as stored:
        expected = (
            b'text\nfirst\nsecond\n'
            if extension == 'csv'
            else json.dumps([{'data': row} for row in EXPECTED]).encode()
        )
        assert stored.read() == expected


@pytest.mark.parametrize('extension', ['json', 'csv'])
@pytest.mark.parametrize('redirect', [False, True])
@pytest.mark.parametrize('suffix', ['', '?token=example', '?signature=abc/def&expires=123#download'])
def test_url_import_uses_path_without_changing_request_query(text_project, file_server, extension, redirect, suffix):
    base_url, received = file_server
    path = f"{'/redirect' if redirect else ''}/tasks.{extension}{suffix}"
    keys, formats, tasks, ids, could_be_list = tasks_from_url(
        [], text_project, text_project.created_by, base_url + path, False
    )

    assert [task['data'] for task in tasks] == EXPECTED
    assert set(keys) == {'text'}
    assert formats == {f'.{extension}': 1}
    assert could_be_list == (extension == 'csv')
    assert received == [path.split('#')[0]] + (
        [path.removeprefix('/redirect').split('#')[0]] if redirect else []
    )
    _assert_upload(text_project, ids, extension)


@pytest.mark.parametrize('filename', ['training%20data.json', '%E8%AE%AD%E7%BB%83.json'])
@pytest.mark.parametrize('redirect', [False, True])
def test_encoded_path_names_select_parser_after_decoding(text_project, file_server, filename, redirect):
    base_url, _ = file_server
    path = f"{'/redirect' if redirect else ''}/{filename}?token=example"
    _, _, tasks, ids, _ = tasks_from_url([], text_project, text_project.created_by, base_url + path, False)
    assert [task['data'] for task in tasks] == EXPECTED
    _assert_upload(text_project, ids, 'json')


@pytest.mark.parametrize('extension', ['json', 'csv'])
def test_native_url_import_api_persists_all_rows(business_client, text_project, file_server, extension):
    base_url, received = file_server
    response = business_client.post(
        f'/api/projects/{text_project.id}/import',
        data=urlencode({'url': f'{base_url}/tasks.{extension}?token=example'}),
        content_type='application/x-www-form-urlencoded',
    )
    assert response.status_code == 201, response.content
    assert list(text_project.tasks.order_by('id').values_list('data', flat=True)) == EXPECTED
    assert received == [f'/tasks.{extension}?token=example']


@pytest.mark.parametrize('extension', ['json', 'csv'])
@pytest.mark.parametrize('streaming', [False, True])
def test_saved_project_import_url_uses_the_same_filename_rules(text_project, file_server, extension, streaming):
    base_url, _ = file_server
    project_import = ProjectImport.objects.create(
        project=text_project, url=f'{base_url}/tasks.{extension}?token=example'
    )
    if streaming:
        batches = list(load_tasks_for_async_import_streaming(project_import, text_project.created_by, batch_size=1))
        tasks = [task for batch, _, _, _ in batches for task in batch]
        ids = batches[0][1]
        assert [len(batch[0]) for batch in batches] == [1, 1]
    else:
        tasks, ids, _, _ = load_tasks_for_async_import(project_import, text_project.created_by)
    assert [task['data'] for task in tasks] == EXPECTED
    _assert_upload(text_project, ids, extension)


@pytest.mark.parametrize('redirect', [False, True])
def test_query_cannot_override_unsupported_path_extension(text_project, file_server, redirect):
    base_url, _ = file_server
    path = f"{'/redirect' if redirect else ''}/tasks.exe?filename=tasks.json"
    with pytest.raises(ValidationError, match='extension is not supported'):
        tasks_from_url([], text_project, text_project.created_by, base_url + path, False)
    assert text_project.file_uploads.count() == 0


def test_url_import_keeps_content_length_limit(text_project, file_server, settings):
    base_url, _ = file_server
    settings.TASKS_MAX_FILE_SIZE = 1
    with pytest.raises(ValidationError, match='Maximum total size'):
        tasks_from_url([], text_project, text_project.created_by, base_url + '/tasks.json?token=example', False)
    assert text_project.file_uploads.count() == 0


def test_protected_url_import_still_rejects_loopback_before_request(text_project, file_server, settings):
    base_url, received = file_server
    settings.SSRF_PROTECTION_ENABLED = True
    with pytest.raises(ValidationError):
        tasks_from_url([], text_project, text_project.created_by, base_url + '/tasks.json?token=example', False)
    assert received == []
    assert text_project.file_uploads.count() == 0
