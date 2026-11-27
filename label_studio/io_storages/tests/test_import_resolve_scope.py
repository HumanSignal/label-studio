"""Import-storage resolution is scoped to the storage prefix or to what is referenced.

Storage matching is bucket-wide and buckets are commonly shared between projects
under per-project prefixes. A client-supplied `fileuri` that only names the bucket
must not be enough to read arbitrary keys from it: a key resolves only when it is
under the storage prefix, or when the task (task endpoint) or the project (project
endpoint) references that exact URI. JSON-task storages routinely point at media
outside their prefix, so referenced URIs keep working.
"""

import base64
from types import SimpleNamespace
from unittest.mock import patch

import pytest
from django.urls import reverse
from io_storages.functions import resolve_import_storage_for_request, uri_is_referenced
from io_storages.models import S3ImportStorage
from io_storages.proxy_api import ResolveStorageUriAPIMixin
from io_storages.utils import key_is_under_prefix
from projects.models import Project
from rest_framework.response import Response
from tasks.models import Task

pytestmark = pytest.mark.django_db

OWN = 's3://shared-bucket/team-a/images/1.jpg'
FOREIGN = 's3://shared-bucket/team-b/secret.json'
JSON_MODE_MEDIA = 's3://shared-bucket/media/2.jpg'


def _b64(uri):
    return base64.urlsafe_b64encode(uri.encode()).decode()


@pytest.fixture
def project(business_client, project_id):
    return Project.objects.get(pk=project_id)


@pytest.fixture
def storage(project):
    return S3ImportStorage.objects.create(project=project, bucket='shared-bucket', prefix='team-a', presign=True)


@pytest.fixture
def task(project):
    return Task.objects.create(project=project, data={'image': OWN, 'media': JSON_MODE_MEDIA})


def _task_resolve(client, task, uri):
    url = reverse('storages:task-storage-data-resolve', kwargs={'task_id': task.id})
    return client.get(url, {'fileuri': _b64(uri)})


def _project_resolve(client, project, uri):
    url = reverse('storages:project-storage-data-resolve', kwargs={'project_id': project.id})
    return client.get(url, {'fileuri': _b64(uri)})


def _signed(self, url):
    return 'https://signed.example/' + url.split('://', 1)[1]


class TestKeyIsUnderPrefix:
    def test_no_prefix_allows_everything(self):
        assert key_is_under_prefix('anything/at/all.jpg', None)
        assert key_is_under_prefix('anything/at/all.jpg', '')

    def test_directory_semantics_match_listing(self):
        assert key_is_under_prefix('team-a/x.jpg', 'team-a')
        assert key_is_under_prefix('team-a/x.jpg', 'team-a/')
        assert key_is_under_prefix('team-a/sub/x.jpg', 'team-a/sub')
        # a sibling prefix that merely starts the same is not inside
        assert not key_is_under_prefix('team-ab/x.jpg', 'team-a')
        assert not key_is_under_prefix('team-b/x.jpg', 'team-a')
        assert not key_is_under_prefix('team-a', 'team-a')

    def test_dot_segments_are_refused(self):
        assert not key_is_under_prefix('team-a/../team-b/secret.json', 'team-a')
        assert not key_is_under_prefix('team-a/./x.jpg', 'team-a')

    def test_control_characters_are_refused(self):
        # urlparse drops tabs/newlines, so these would be fetched as team-a/../team-b/secret.json
        assert not key_is_under_prefix('team-a/.\t./team-b/secret.json', 'team-a')
        assert not key_is_under_prefix('team-a/.\n./team-b/secret.json', 'team-a')
        assert not key_is_under_prefix('team-a/..\x00/team-b/secret.json', 'team-a')

    def test_missing_key_is_refused_when_prefix_set(self):
        assert not key_is_under_prefix(None, 'team-a')


class TestUriIsReferenced:
    def test_task_data_exact_and_embedded(self):
        task = SimpleNamespace(data={'a': OWN, 'html': f'<img src="{JSON_MODE_MEDIA}"/>', 'n': [1, {'x': None}]})
        assert uri_is_referenced(OWN, task)
        assert uri_is_referenced(JSON_MODE_MEDIA, task)
        assert not uri_is_referenced(FOREIGN, task)

    def test_strict_prefix_of_a_referenced_uri_is_not_referenced(self):
        task = SimpleNamespace(data={'a': 's3://shared-bucket/media/2.jpg.bak'})
        assert not uri_is_referenced('s3://shared-bucket/media/2.jpg', task)
        task = SimpleNamespace(data={'a': '<img src="s3://shared-bucket/media/2.jpg.bak">'})
        assert not uri_is_referenced('s3://shared-bucket/media/2.jpg', task)


@patch.object(S3ImportStorage, 'generate_http_url', _signed)
class TestTaskResolveScope:
    def test_key_under_prefix_resolves(self, business_client, storage, task):
        response = _task_resolve(business_client, task, OWN)
        assert response.status_code == 303
        assert response['Location'] == 'https://signed.example/shared-bucket/team-a/images/1.jpg'

    def test_key_outside_prefix_not_referenced_is_refused(self, business_client, storage, task):
        response = _task_resolve(business_client, task, FOREIGN)
        assert response.status_code == 404

    def test_dot_segment_escape_is_refused(self, business_client, storage, task):
        response = _task_resolve(business_client, task, 's3://shared-bucket/team-a/../team-b/secret.json')
        assert response.status_code == 404

    def test_control_character_dot_segment_escape_is_refused(self, business_client, storage, task):
        response = _task_resolve(business_client, task, 's3://shared-bucket/team-a/.\t./team-b/secret.json')
        assert response.status_code == 404

    def test_presigned_url_is_signed_by_the_authorized_storage(self, business_client, project, storage, task):
        # team-a is listed first and matches the bucket, but only team-b covers the key: team-b must sign
        team_b = S3ImportStorage.objects.create(project=project, bucket='shared-bucket', prefix='team-b', presign=True)
        signers = []

        def _record(self, url):
            signers.append(self.pk)
            return 'https://signed.example/x'

        with patch.object(S3ImportStorage, 'generate_http_url', _record):
            response = _task_resolve(business_client, task, FOREIGN)
        assert response.status_code == 303
        assert signers == [team_b.pk]

    def test_referenced_key_outside_prefix_resolves(self, business_client, storage, task):
        # JSON-task mode: tasks synced from team-a/*.json point at media elsewhere in the bucket
        response = _task_resolve(business_client, task, JSON_MODE_MEDIA)
        assert response.status_code == 303

    def test_hypertext_asset_outside_prefix_is_refused(self, business_client, project, storage):
        # Deliberate contract (PLT-1713): HyperText valueType="url" rewrites URIs found inside the
        # fetched HTML to this endpoint, but those URIs are not in task.data. Resolving them would
        # require trusting a client-supplied key, so assets must sit under the storage prefix.
        page = 's3://shared-bucket/team-a/pages/a.html'
        task = Task.objects.create(project=project, data={'html': page})
        assert _task_resolve(business_client, task, page).status_code == 303
        assert _task_resolve(business_client, task, 's3://shared-bucket/assets/logo.png').status_code == 404
        assert _task_resolve(business_client, task, 's3://shared-bucket/team-a/assets/logo.png').status_code == 303

    def test_hypertext_asset_in_inline_html_resolves(self, business_client, project, storage):
        # Supported path for assets outside the prefix: the HTML is stored in task data, so the
        # embedded asset URI is referenced by the task and still resolves.
        asset = 's3://shared-bucket/assets/logo.png'
        task = Task.objects.create(project=project, data={'html': f'<p>Page</p><img src="{asset}"/>'})
        assert _task_resolve(business_client, task, asset).status_code == 303

    def test_legacy_presign_route_is_scoped_too(self, business_client, storage, task):
        url = reverse('storages:task-storage-data-presign', kwargs={'task_id': task.id})
        assert business_client.get(url, {'fileuri': _b64(FOREIGN)}).status_code == 404

    def test_storage_without_prefix_keeps_bucket_wide_resolution(self, business_client, project, task):
        S3ImportStorage.objects.create(project=project, bucket='shared-bucket', prefix='', presign=True)
        assert _task_resolve(business_client, task, FOREIGN).status_code == 303

    def test_picks_the_storage_whose_prefix_covers_the_key(self, business_client, project, storage, task):
        team_b = S3ImportStorage.objects.create(
            project=project, bucket='shared-bucket', prefix='team-b', presign=False
        )
        with patch.object(ResolveStorageUriAPIMixin, 'proxy_data_from_storage', return_value=Response()) as proxy:
            _task_resolve(business_client, task, FOREIGN)
        proxy.assert_called_once()
        assert proxy.call_args.args[3] == team_b


class TestTaskResolveScopeProxyAndStreamer:
    def test_proxy_mode_refuses_key_outside_prefix(self, business_client, storage, task):
        storage.presign = False
        storage.save()
        with patch.object(ResolveStorageUriAPIMixin, 'proxy_data_from_storage', return_value=Response()) as proxy:
            response = _task_resolve(business_client, task, FOREIGN)
        assert response.status_code == 404
        proxy.assert_not_called()

    def test_streamer_delegation_refuses_key_outside_prefix(self, business_client, storage, task):
        storage.presign = False
        storage.save()
        request = SimpleNamespace(user=business_client.user, is_streamer_delegation=True, headers={})
        with patch('io_storages.proxy_api.get_streamer_storage_type', return_value='s3'):
            refused = ResolveStorageUriAPIMixin().resolve(request, _b64(FOREIGN), task)
            allowed = ResolveStorageUriAPIMixin().resolve(request, _b64(OWN), task)
        assert refused.status_code == 404
        assert allowed['X-Streamer-Action'] == 'delegate'


@patch.object(S3ImportStorage, 'generate_http_url', _signed)
class TestProjectResolveScope:
    def test_key_under_prefix_resolves(self, business_client, project, storage):
        assert _project_resolve(business_client, project, OWN).status_code == 303

    def test_key_outside_prefix_not_referenced_is_refused(self, business_client, project, storage, task):
        assert _project_resolve(business_client, project, FOREIGN).status_code == 404

    def test_key_referenced_by_a_project_task_resolves(self, business_client, project, storage, task):
        assert _project_resolve(business_client, project, JSON_MODE_MEDIA).status_code == 303

    def test_key_referenced_by_another_projects_task_is_refused(self, business_client, project, storage):
        other = Project.objects.create(title='other', organization=project.organization, created_by=project.created_by)
        Task.objects.create(project=other, data={'image': FOREIGN})
        assert _project_resolve(business_client, project, FOREIGN).status_code == 404

    def test_key_referenced_by_label_config_resolves(self, business_client, project, storage):
        uri = 's3://shared-bucket/configs/legend.png'
        project.label_config = f'<View><Image name="img" valueList="$imgs"/><Header value="{uri}"/></View>'
        Project.objects.filter(pk=project.pk).update(label_config=project.label_config)
        assert _project_resolve(business_client, project, uri).status_code == 303


def test_resolve_import_storage_for_request_returns_none_for_non_strings(project, storage, task):
    assert resolve_import_storage_for_request({'a': OWN}, task) is None
