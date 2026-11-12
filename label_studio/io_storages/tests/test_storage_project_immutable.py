import json
from unittest.mock import patch

import pytest
from django.urls import reverse
from io_storages.azure_blob.models import AzureBlobExportStorage, AzureBlobImportStorage
from io_storages.gcs.models import GCSExportStorage, GCSImportStorage
from io_storages.redis.models import RedisExportStorage, RedisImportStorage
from io_storages.s3.models import S3ExportStorage, S3ImportStorage
from projects.tests.factories import ProjectFactory
from tests.utils import make_project

STORAGES = [
    pytest.param(S3ImportStorage, 'storage-s3', id='s3-import'),
    pytest.param(S3ExportStorage, 'export-storage-s3', id='s3-export'),
    pytest.param(GCSImportStorage, 'storage-gcs', id='gcs-import'),
    pytest.param(GCSExportStorage, 'export-storage-gcs', id='gcs-export'),
    pytest.param(AzureBlobImportStorage, 'storage-azure', id='azure-import'),
    pytest.param(AzureBlobExportStorage, 'export-storage-azure', id='azure-export'),
    pytest.param(RedisImportStorage, 'storage-redis', id='redis-import'),
    pytest.param(RedisExportStorage, 'export-storage-redis', id='redis-export'),
]


@pytest.fixture
def project(business_client):
    return make_project({}, business_client.user, use_ml_backend=False)


@pytest.fixture
def other_org_project():
    return ProjectFactory()


def _url(name, suffix, **kwargs):
    return reverse(f'storages:api:{name}-{suffix}', kwargs=kwargs)


def _send(client, method, url, payload):
    return getattr(client, method)(url, data=json.dumps(payload), content_type='application/json')


@pytest.fixture
def storage_factory(project):
    def make(model):
        return (
            model.objects.create(project=project, title='original', bucket='pytest-bucket')
            if hasattr(model, 'bucket')
            else model.objects.create(project=project, title='original')
        )

    return make


@pytest.mark.django_db
@pytest.mark.parametrize('model,name', STORAGES)
@pytest.mark.parametrize('method', ['patch', 'put'])
def test_update_cannot_move_storage_to_other_org_project(
    business_client, storage_factory, other_org_project, model, name, method
):
    storage = storage_factory(model)

    with patch.object(model, 'validate_connection', return_value=None):
        response = _send(
            business_client, method, _url(name, 'detail', pk=storage.id), {'project': other_org_project.id}
        )

    assert response.status_code in (400, 403), response.content
    storage.refresh_from_db()
    assert storage.project_id != other_org_project.id


@pytest.mark.django_db
@pytest.mark.parametrize('model,name', STORAGES)
def test_update_cannot_move_storage_within_organization(business_client, storage_factory, model, name):
    storage = storage_factory(model)
    sibling = make_project({}, business_client.user, use_ml_backend=False)

    with patch.object(model, 'validate_connection', return_value=None):
        response = _send(business_client, 'patch', _url(name, 'detail', pk=storage.id), {'project': sibling.id})

    assert response.status_code == 400, response.content
    storage.refresh_from_db()
    assert storage.project_id != sibling.id


@pytest.mark.django_db
@pytest.mark.parametrize('model,name', STORAGES)
def test_update_with_unchanged_project_still_works(business_client, project, storage_factory, model, name):
    storage = storage_factory(model)

    with patch.object(model, 'validate_connection', return_value=None):
        response = _send(
            business_client, 'patch', _url(name, 'detail', pk=storage.id), {'project': project.id, 'title': 'renamed'}
        )

    assert response.status_code == 200, response.content
    storage.refresh_from_db()
    assert storage.title == 'renamed'
    assert storage.project_id == project.id


@pytest.mark.django_db
@pytest.mark.parametrize('model,name', STORAGES)
def test_validate_with_id_cannot_move_storage(business_client, storage_factory, other_org_project, model, name):
    storage = storage_factory(model)

    with patch.object(model, 'validate_connection', return_value=None):
        response = _send(
            business_client,
            'post',
            _url(name, 'validate'),
            {'id': storage.id, 'project': other_org_project.id, 'bucket': 'pytest-bucket'},
        )

    assert response.status_code in (400, 403), response.content
    storage.refresh_from_db()
    assert storage.project_id != other_org_project.id


@pytest.mark.django_db
@pytest.mark.parametrize('model,name', STORAGES)
def test_validate_with_id_does_not_save_storage(business_client, project, storage_factory, model, name):
    storage = storage_factory(model)

    with patch.object(model, 'validate_connection', return_value=None):
        response = _send(
            business_client,
            'post',
            _url(name, 'validate'),
            {'id': storage.id, 'project': project.id, 'title': 'not saved', 'bucket': 'pytest-bucket'},
        )

    assert response.status_code == 200, response.content
    storage.refresh_from_db()
    assert storage.title == 'original'


@pytest.mark.django_db
@pytest.mark.parametrize('model,name', STORAGES)
def test_create_with_id_cannot_copy_storage_into_sibling_project(business_client, storage_factory, model, name):
    # `id` on create copies the stored credentials, so it must not carry them into another project,
    # even one in the same organization that the caller can manage.
    storage = storage_factory(model)
    sibling = make_project({}, business_client.user, use_ml_backend=False)

    with patch.object(model, 'validate_connection', return_value=None):
        response = _send(
            business_client,
            'post',
            _url(name, 'list'),
            {'id': storage.id, 'project': sibling.id, 'title': 'copy', 'bucket': 'pytest-bucket'},
        )

    assert response.status_code == 400, response.content
    assert not model.objects.filter(project=sibling).exists()


@pytest.mark.django_db
@pytest.mark.parametrize('model,name', STORAGES)
def test_create_with_id_in_same_project_still_works(business_client, project, storage_factory, model, name):
    storage = storage_factory(model)

    with patch.object(model, 'validate_connection', return_value=None):
        response = _send(
            business_client,
            'post',
            _url(name, 'list'),
            {'id': storage.id, 'project': project.id, 'title': 'copy', 'bucket': 'pytest-bucket'},
        )

    assert response.status_code == 201, response.content
    assert model.objects.filter(project=project, title='copy').exists()
    storage.refresh_from_db()
    assert storage.title == 'original'
