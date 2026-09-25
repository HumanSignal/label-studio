"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for
copyright information and LICENSE for a copy of the license.
"""

import threading
import zipfile
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

import pytest
from data_export.functions import get_export_hostname
from data_export.models import DataExport
from django.test import RequestFactory
from tests.utils import make_project

IMAGE_CONFIG = (
    '<View><Image name="image" value="$image"/>'
    '<RectangleLabels name="label" toName="image"><Label value="cat"/></RectangleLabels></View>'
)


class _MediaHandler(BaseHTTPRequestHandler):
    protocol_version = 'HTTP/1.1'
    requests_seen = []

    def do_GET(self):
        self.requests_seen.append((self.path, self.headers.get('Authorization')))
        body = b'internal bytes'
        self.send_response(200)
        self.send_header('Content-Type', 'image/png')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, *args):
        pass


@pytest.fixture
def media_server():
    _MediaHandler.requests_seen = []
    server = ThreadingHTTPServer(('127.0.0.1', 0), _MediaHandler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    yield f'http://127.0.0.1:{server.server_address[1]}'
    server.shutdown()
    server.server_close()


def _task(task_id, image):
    return {
        'id': task_id,
        'data': {'image': image},
        'annotations': [
            {
                'id': task_id,
                'result': [
                    {
                        'id': f'r{task_id}',
                        'type': 'rectanglelabels',
                        'from_name': 'label',
                        'to_name': 'image',
                        'original_width': 100,
                        'original_height': 100,
                        'value': {'x': 1, 'y': 1, 'width': 5, 'height': 5, 'rotation': 0, 'rectanglelabels': ['cat']},
                    }
                ],
            }
        ],
    }


def _exported_images(project, tasks, hostname):
    out, _, _ = DataExport.generate_export_file(project, tasks, 'COCO_WITH_IMAGES', True, {}, hostname=hostname)
    with out, zipfile.ZipFile(out) as archive:
        return [archive.read(name) for name in archive.namelist() if name.startswith('images/') and name[-1] != '/']


@pytest.mark.django_db
def test_export_does_not_download_media_from_internal_addresses(business_client, media_server, settings):
    settings.SSRF_PROTECTION_ENABLED = True
    project = make_project({'label_config': IMAGE_CONFIG}, business_client.user, use_ml_backend=False)

    images = _exported_images(project, [_task(1, f'{media_server}/secret.png')], hostname='https://ls.example.com/')

    assert images == []
    assert _MediaHandler.requests_seen == []


@pytest.mark.django_db
def test_export_downloads_media_from_its_own_host(business_client, media_server, settings):
    # Self-hosted Label Studio often lives on a private address: its own URLs stay reachable
    settings.SSRF_PROTECTION_ENABLED = True
    project = make_project({'label_config': IMAGE_CONFIG}, business_client.user, use_ml_backend=False)
    token = project.organization.created_by.auth_token.key

    images = _exported_images(project, [_task(1, f'{media_server}/image.png')], hostname=f'{media_server}/')

    assert images == [b'internal bytes']
    assert _MediaHandler.requests_seen == [('/image.png', f'Token {token}')]


@pytest.mark.parametrize(
    ('hostname', 'domain_from_request', 'allowed_hosts', 'expected'),
    [
        ('https://ls.example.com', False, ['*'], 'https://ls.example.com'),
        # The Host header is whatever the client sent
        ('', False, ['*'], None),
        # Django has already rejected any Host outside ALLOWED_HOSTS
        ('', False, ['evil.com'], 'http://evil.com/'),
        # HOSTNAME is only a subpath in this mode, the domain comes from the proxy
        ('/ls', True, ['*'], 'http://evil.com/'),
    ],
)
def test_get_export_hostname(settings, hostname, domain_from_request, allowed_hosts, expected):
    settings.HOSTNAME = hostname
    settings.DOMAIN_FROM_REQUEST = domain_from_request
    settings.ALLOWED_HOSTS = allowed_hosts
    settings.FORCE_SCRIPT_NAME = None
    request = RequestFactory().get('/api/projects/1/export', HTTP_HOST='evil.com')

    assert get_export_hostname(request) == expected
