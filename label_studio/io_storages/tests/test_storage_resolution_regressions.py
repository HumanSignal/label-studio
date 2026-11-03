import base64
import io
import json
from types import SimpleNamespace
from unittest.mock import patch

import pytest
from botocore.response import StreamingBody
from django.urls import reverse
from io_storages.functions import get_storage_by_url
from io_storages.localfiles.models import LocalFilesExportStorage, LocalFilesImportStorage
from io_storages.proxy_api import ProjectResolveStorageUri, TaskResolveStorageUri
from io_storages.s3.models import S3ExportStorage, S3ImportStorage
from projects.tests.access_setup import make_access_world
from rest_framework.test import APIClient, APIRequestFactory, force_authenticate
from tasks.tests.factories import TaskFactory


@pytest.mark.django_db
@pytest.mark.parametrize(
    ('model', 'route'),
    [
        (LocalFilesImportStorage, 'storage-localfiles-validate'),
        (LocalFilesImportStorage, 'storage-localfiles-list-files'),
        (LocalFilesExportStorage, 'export-storage-localfiles-validate'),
    ],
)
def test_existing_local_storage_can_validate_its_own_directory(settings, tmp_path, model, route):
    world = make_access_world()
    settings.LOCAL_FILES_DOCUMENT_ROOT = str(tmp_path)
    settings.LOCAL_FILES_SERVING_ENABLED = True
    dataset = tmp_path / 'dataset'
    dataset.mkdir()
    (dataset / 'sample.txt').write_text('sample')
    storage = model.objects.create(project=world.project_1, path=str(dataset))
    client = APIClient()
    client.force_authenticate(world.creator)

    response = client.post(
        reverse(f'storages:api:{route}'),
        {'id': storage.id, 'project': world.project_1.id, 'path': str(dataset)},
        format='json',
    )

    assert response.status_code == 200, response.content
    if route.endswith('list-files'):
        assert [item['key'] for item in response.data['files']] == [str(dataset / 'sample.txt')]
    assert model.objects.filter(project=world.project_1).count() == 1


@pytest.mark.django_db
@pytest.mark.parametrize('invalid_change', ['missing-directory', 'overlap', 'project', 'member'])
def test_existing_local_storage_validation_keeps_connection_and_access_checks(settings, tmp_path, invalid_change):
    world = make_access_world()
    settings.LOCAL_FILES_DOCUMENT_ROOT = str(tmp_path)
    settings.LOCAL_FILES_SERVING_ENABLED = True
    dataset = tmp_path / 'dataset'
    dataset.mkdir()
    other = tmp_path / 'other'
    other.mkdir()
    storage = LocalFilesImportStorage.objects.create(project=world.project_1, path=str(dataset))
    LocalFilesExportStorage.objects.create(project=world.project_2, path=str(other))
    payload = {'id': storage.id, 'project': world.project_1.id, 'path': str(dataset)}
    if invalid_change == 'missing-directory':
        payload['path'] = str(tmp_path / 'missing')
    elif invalid_change == 'overlap':
        payload['path'] = str(other)
    elif invalid_change == 'project':
        payload['project'] = world.project_2.id
    client = APIClient()
    client.force_authenticate(world.member_a if invalid_change == 'member' else world.owner)

    response = client.post(reverse('storages:api:storage-localfiles-validate'), payload, format='json')

    assert response.status_code == (403 if invalid_change == 'member' else 400), response.content
    storage.refresh_from_db()
    assert storage.project_id == world.project_1.id
    assert storage.path == str(dataset)


@pytest.mark.django_db
@pytest.mark.parametrize(
    ('model', 'route'),
    [(S3ImportStorage, 'storage-s3-validate'), (S3ExportStorage, 'export-storage-s3-validate')],
)
@pytest.mark.parametrize('credential_input', ['omitted', 'blank', 'replacement'])
def test_existing_cloud_validation_preserves_redacted_credentials(model, route, credential_input):
    world = make_access_world()
    storage = model.objects.create(
        project=world.project_1,
        bucket='shared-bucket',
        aws_access_key_id='stored-access-key',
        aws_secret_access_key='stored-secret',
        aws_session_token='stored-session-token',
    )
    payload = {'id': storage.id, 'project': world.project_1.id, 'bucket': 'shared-bucket'}
    if credential_input != 'omitted':
        payload.update(aws_access_key_id='', aws_secret_access_key='', aws_session_token='')
    if credential_input == 'replacement':
        payload['aws_access_key_id'] = 'replacement-access-key'
    client = APIClient()
    client.force_authenticate(world.creator)
    cloud_client = SimpleNamespace(head_bucket=lambda **kwargs: {})

    with patch.object(model, 'get_client', return_value=cloud_client):
        response = client.post(reverse(f'storages:api:{route}'), payload, format='json')

    assert response.status_code == 200, response.content
    storage.refresh_from_db()
    assert storage.aws_secret_access_key == 'stored-secret'
    assert storage.aws_session_token == 'stored-session-token'
    assert storage.aws_access_key_id == (
        'replacement-access-key' if credential_input == 'replacement' else 'stored-access-key'
    )


@pytest.mark.django_db
@pytest.mark.parametrize('target', ['project', 'task'])
@pytest.mark.parametrize('delivery', ['presign', 'proxy', 'delegate'])
def test_resolver_uses_matching_prefix_connection(target, delivery):
    world = make_access_world()
    presign = delivery == 'presign'
    S3ImportStorage.objects.create(project=world.project_1, bucket='shared-bucket', prefix='a/', presign=presign)
    matching = S3ImportStorage.objects.create(
        project=world.project_1, bucket='shared-bucket', prefix='b/', presign=presign, presign_ttl=7
    )
    if target == 'project':
        view = ProjectResolveStorageUri.as_view()
        kwargs = {'project_id': world.project_1.id}
    else:
        task = TaskFactory(project=world.project_1)
        view = TaskResolveStorageUri.as_view()
        kwargs = {'task_id': task.id}
    fileuri = base64.urlsafe_b64encode(b's3://shared-bucket/b/image.png').decode()
    request = APIRequestFactory().get('/resolve', {'fileuri': fileuri})
    request.is_streamer_delegation = delivery == 'delegate'
    force_authenticate(request, world.member_a)

    # Only cloud signing and reads are replaced; selection and authorization
    # use the real database rows and resolver views.
    def cloud_stream(storage, uri, range_header=None):
        data = f'storage-{storage.id}'.encode()
        return StreamingBody(io.BytesIO(data), len(data)), 'image/png', {'StatusCode': 200, 'ContentLength': len(data)}

    with (
        patch.object(
            S3ImportStorage,
            'generate_http_url',
            autospec=True,
            side_effect=lambda storage, uri: f'https://signed.example/storage-{storage.id}',
        ),
        patch.object(S3ImportStorage, 'get_bytes_stream', autospec=True, side_effect=cloud_stream),
    ):
        response = view(request, **kwargs)

    if presign:
        assert response.status_code == 303
        assert response.url == f'https://signed.example/storage-{matching.id}'
        assert response['Cache-Control'] == 'no-store, max-age=420'
    elif delivery == 'delegate':
        assert response.status_code == 200
        assert response['X-Streamer-Action'] == 'delegate'
        assert json.loads(response.content)['storage_id'] == matching.id
    else:
        assert response.status_code == 200
        assert b''.join(response.streaming_content) == f'storage-{matching.id}'.encode()


@pytest.mark.django_db
@pytest.mark.parametrize('own_collection', [True, False])
def test_prefix_mismatch_falls_back_only_to_own_collection_export(own_collection):
    world = make_access_world()
    S3ImportStorage.objects.create(project=world.project_1, bucket='shared-bucket', prefix='imports/')
    S3ExportStorage.objects.create(project=world.project_1, bucket='shared-bucket', prefix='exports/')
    collection_project = world.project_1 if own_collection else world.project_2
    uri = (
        f's3://shared-bucket/exports/collection/org-{world.organization.id}/'
        f'project-{collection_project.id}/submissions/image.png'
    )
    client = APIClient()
    client.force_authenticate(world.member_a)
    with patch.object(S3ExportStorage, 'generate_http_url', return_value='https://signed.example/export.png'):
        response = client.get(
            reverse('storages:project-storage-data-resolve', kwargs={'project_id': world.project_1.id}),
            {'fileuri': base64.urlsafe_b64encode(uri.encode()).decode()},
        )

    if own_collection:
        assert response.status_code == 303
        assert response.url == 'https://signed.example/export.png'
    else:
        assert response.status_code == 404


@pytest.mark.django_db
@pytest.mark.parametrize(
    ('collection_scope', 'expected_status'),
    [('own', 303), ('other-project', 404), ('other-organization', 404), ('outside-prefix', 404), ('unsafe', 400)],
)
def test_export_resolver_uses_matching_prefix_within_own_collection(collection_scope, expected_status):
    world = make_access_world()
    S3ExportStorage.objects.create(project=world.project_1, bucket='shared-bucket', prefix='old/')
    matching = S3ExportStorage.objects.create(project=world.project_1, bucket='shared-bucket', prefix='new/')
    project_id = world.project_2.id if collection_scope == 'other-project' else world.project_1.id
    organization_id = (
        world.outsider_organization.id if collection_scope == 'other-organization' else world.organization.id
    )
    prefix = 'unconfigured/' if collection_scope == 'outside-prefix' else 'new/'
    filename = '../image.png' if collection_scope == 'unsafe' else 'image.png'
    uri = f's3://shared-bucket/{prefix}collection/org-{organization_id}/project-{project_id}/submissions/{filename}'
    client = APIClient()
    client.force_authenticate(world.member_a)
    with patch.object(
        S3ExportStorage,
        'generate_http_url',
        autospec=True,
        side_effect=lambda storage, uri: f'https://signed.example/storage-{storage.id}',
    ):
        response = client.get(
            reverse('storages:project-storage-data-resolve', kwargs={'project_id': world.project_1.id}),
            {'fileuri': base64.urlsafe_b64encode(uri.encode()).decode()},
        )

    assert response.status_code == expected_status
    if expected_status == 303:
        assert response.url == f'https://signed.example/storage-{matching.id}'


@pytest.mark.django_db
@pytest.mark.parametrize(
    ('uri', 'expected_status'),
    [
        ('s3://shared-bucket/c/image.png', 404),
        ('s3://other-bucket/b/image.png', 404),
        ('s3://shared-bucket/../secret', 400),
        ('s3://shared-bucket//etc/passwd', 400),
    ],
)
def test_multiple_storage_lookup_keeps_key_and_project_boundaries(uri, expected_status):
    world = make_access_world()
    for prefix in ('a/', 'b/'):
        S3ImportStorage.objects.create(project=world.project_1, bucket='shared-bucket', prefix=prefix)
    S3ImportStorage.objects.create(project=world.project_2, bucket='shared-bucket', prefix='c/')
    client = APIClient()
    client.force_authenticate(world.member_a)
    with patch.object(S3ImportStorage, 'generate_http_url', return_value='https://signed.example/image.png'):
        response = client.get(
            reverse('storages:project-storage-data-resolve', kwargs={'project_id': world.project_1.id}),
            {'fileuri': base64.urlsafe_b64encode(uri.encode()).decode()},
        )

    assert response.status_code == expected_status


@pytest.mark.parametrize(
    'url',
    [
        's3://shared-bucket/b/image.png',
        ['s3://shared-bucket/b/image.png'],
        {'image': 's3://shared-bucket/b/image.png'},
    ],
)
def test_general_storage_lookup_keeps_first_compatible_connection(url):
    first = S3ImportStorage(bucket='shared-bucket', prefix='a/')
    second = S3ImportStorage(bucket='shared-bucket', prefix='b/')

    assert get_storage_by_url(url, [first, second]) is first
