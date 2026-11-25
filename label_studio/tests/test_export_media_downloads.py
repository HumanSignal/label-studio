"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for
copyright information and LICENSE for a copy of the license.
"""

import json
import threading
import zipfile
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

import data_export.mixins
import data_export.models
import pytest
from data_export.functions import get_export_hostname
from data_export.models import ConvertedFormat, DataExport, Export
from django.core.files.base import ContentFile
from django.test import RequestFactory
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import AccessToken
from tests.utils import make_project
from users.models import User

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


def _images(archive_file):
    with archive_file, zipfile.ZipFile(archive_file) as archive:
        return [archive.read(name) for name in archive.namelist() if name.startswith('images/') and name[-1] != '/']


def _exported_images(project, tasks, hostname, user=None):
    out, _, _ = DataExport.generate_export_file(
        project, tasks, 'COCO_WITH_IMAGES', True, {}, hostname=hostname, user=user
    )
    return _images(out)


@pytest.fixture
def member(business_client):
    # Exports and the org owner are different people: media must be fetched as the person who exports
    user = User.objects.create_user(email='member@pytest.net', password='pytest')
    business_client.organization.add_user(user)
    user.active_organization = business_client.organization
    user.save()
    return user


@pytest.mark.django_db
def test_export_does_not_download_media_from_internal_addresses(business_client, media_server, settings):
    settings.SSRF_PROTECTION_ENABLED = True
    project = make_project({'label_config': IMAGE_CONFIG}, business_client.user, use_ml_backend=False)

    images = _exported_images(project, [_task(1, f'{media_server}/secret.png')], hostname='https://ls.example.com/')

    assert images == []
    assert _MediaHandler.requests_seen == []


@pytest.mark.django_db
@pytest.mark.parametrize('ssrf_protection', [True, False])
@pytest.mark.parametrize('subpath', ['', '/ls'])
@pytest.mark.parametrize(
    'path',
    [
        '/data/upload/1/image.png',
        '/storage-data/uploaded/?filepath=upload/1/image.png',
        '/tasks/1/presign/?fileuri=czM6Ly9idWNrZXQvaW1hZ2UucG5n',
    ],
)
def test_export_downloads_media_from_its_own_host(
    business_client, member, media_server, settings, ssrf_protection, subpath, path
):
    # Self-hosted Label Studio often lives on a private address: its own URLs stay reachable
    settings.SSRF_PROTECTION_ENABLED = ssrf_protection
    project = make_project({'label_config': IMAGE_CONFIG}, business_client.user, use_ml_backend=False)

    images = _exported_images(
        project, [_task(1, f'{media_server}{subpath}{path}')], hostname=f'{media_server}{subpath}/', user=member
    )

    assert images == [b'internal bytes']
    [(seen_path, authorization)] = _MediaHandler.requests_seen
    assert seen_path == subpath + path
    # A short-lived access token for the person who exports, never the owner's long-lived API token
    scheme, token = authorization.split(' ')
    assert scheme == 'Bearer'
    assert AccessToken(token)['user_id'] == str(member.id)


@pytest.mark.django_db
@pytest.mark.parametrize('ssrf_protection', [True, False])
@pytest.mark.parametrize(
    'path',
    [
        '/api/current-user/token',
        '/api/projects/',
        '/data/upload/../api/current-user/token',
        '/data/upload/%2e%2e/%2e%2e/api/current-user/token',
        '/data/upload%2f..%2f..%2fapi/current-user/token',
        '/tasks/1/../../api/current-user/token',
        '/data/local-files/?d=image.png',
    ],
)
def test_export_does_not_fetch_other_paths_from_its_own_host(
    business_client, member, media_server, settings, ssrf_protection, path
):
    settings.SSRF_PROTECTION_ENABLED = ssrf_protection
    project = make_project({'label_config': IMAGE_CONFIG}, business_client.user, use_ml_backend=False)

    images = _exported_images(project, [_task(1, f'{media_server}{path}')], hostname=f'{media_server}/', user=member)

    assert images == []
    assert _MediaHandler.requests_seen == []


@pytest.mark.django_db
def test_export_media_uses_legacy_token_only_where_jwt_is_not_accepted(
    business_client, member, media_server, settings
):
    settings.SSRF_PROTECTION_ENABLED = True
    project = make_project({'label_config': IMAGE_CONFIG}, business_client.user, use_ml_backend=False)
    jwt_settings = member.active_organization.jwt
    jwt_settings.api_tokens_enabled = False
    jwt_settings.legacy_api_tokens_enabled = True
    jwt_settings.save()

    images = _exported_images(
        project, [_task(1, f'{media_server}/data/upload/1/image.png')], hostname=f'{media_server}/', user=member
    )

    assert images == [b'internal bytes']
    assert _MediaHandler.requests_seen == [('/data/upload/1/image.png', f'Token {member.auth_token.key}')]


@pytest.mark.django_db
@pytest.mark.parametrize('ssrf_protection', [True, False])
def test_export_without_a_user_does_not_fetch_from_its_own_host(
    business_client, media_server, settings, ssrf_protection
):
    settings.SSRF_PROTECTION_ENABLED = ssrf_protection
    project = make_project({'label_config': IMAGE_CONFIG}, business_client.user, use_ml_backend=False)

    images = _exported_images(
        project, [_task(1, f'{media_server}/data/upload/1/image.png')], hostname=f'{media_server}/'
    )

    assert images == []
    assert _MediaHandler.requests_seen == []


@pytest.fixture
def converter_kwargs(monkeypatch):
    seen = []
    for module in (data_export.models, data_export.mixins):
        original = module.Converter

        def spy(*args, _original=original, **kwargs):
            seen.append(kwargs)
            return _original(*args, **kwargs)

        monkeypatch.setattr(module, 'Converter', spy)
    return seen


@pytest.mark.django_db
def test_converter_is_never_given_a_user_token(business_client, member, media_server, settings, converter_kwargs):
    project = make_project({'label_config': IMAGE_CONFIG}, business_client.user, use_ml_backend=False)
    owner = project.organization.created_by
    tasks = [_task(1, f'{media_server}/data/upload/1/image.png')]

    _exported_images(project, tasks, hostname=f'{media_server}/', user=member)
    export = Export.objects.create(project=project, status=Export.Status.COMPLETED)
    export.file.save(f'{project.id}/snapshot.json', ContentFile(json.dumps(tasks).encode()))
    export.convert_file('COCO_WITH_IMAGES', download_resources=True, hostname=f'{media_server}/', user=member).close()

    assert len(converter_kwargs) == 2
    for kwargs in converter_kwargs:
        assert kwargs['access_token'] not in {owner.auth_token.key, member.auth_token.key}
        assert kwargs['http_session'] is not None


@pytest.mark.django_db
def test_snapshot_conversion_fetches_media_as_the_user_who_converts(business_client, member, media_server, settings):
    settings.HOSTNAME = media_server
    settings.DOMAIN_FROM_REQUEST = False
    project = make_project({'label_config': IMAGE_CONFIG}, business_client.user, use_ml_backend=False)
    export = Export.objects.create(project=project, status=Export.Status.COMPLETED, created_by=business_client.user)
    tasks = [_task(1, f'{media_server}/data/upload/1/image.png')]
    export.file.save(f'{project.id}/snapshot.json', ContentFile(json.dumps(tasks).encode()))
    client = APIClient()
    client.force_authenticate(member)

    response = client.post(
        f'/api/projects/{project.id}/exports/{export.id}/convert',
        {'export_type': 'COCO_WITH_IMAGES', 'download_resources': True},
        format='json',
    )

    assert response.status_code == 200, response.content
    converted = ConvertedFormat.objects.get(id=response.json()['converted_format'])
    assert converted.created_by == member
    assert converted.status == ConvertedFormat.Status.COMPLETED, converted.traceback
    assert _images(converted.file.open('rb')) == [b'internal bytes']
    [(_, authorization)] = _MediaHandler.requests_seen
    assert AccessToken(authorization.split(' ')[1])['user_id'] == str(member.id)


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
