"""A stored Redis password must not follow the storage to a new host or port (FIT-3295)."""

import json
from unittest.mock import patch

import pytest
from django.test import override_settings
from fakeredis import FakeRedis
from io_storages.redis.models import RedisExportStorage, RedisImportStorage, RedisStorageMixin
from tests.utils import make_project

STORED_HOST = '93.184.216.34'
OTHER_HOST = '93.184.216.35'
STORED_PASSWORD = 'stored-secret'

KINDS = [
    pytest.param(RedisImportStorage, '/api/storages/redis', id='import'),
    pytest.param(RedisExportStorage, '/api/storages/export/redis', id='export'),
]


@pytest.fixture
def storage_factory(business_client):
    project = make_project({}, business_client.user, use_ml_backend=False)

    def create(model, password=STORED_PASSWORD):
        return model.objects.create(
            project=project, title='Redis', host=STORED_HOST, port='6379', password=password, db=1
        )

    return create


def _request(business_client, method, url, payload):
    with patch.object(RedisStorageMixin, 'get_redis_connection', return_value=FakeRedis()) as mock_connect:
        response = getattr(business_client, method)(url, data=json.dumps(payload), content_type='application/json')
    sent_passwords = [call.kwargs['redis_config'].get('password') for call in mock_connect.call_args_list]
    return response, sent_passwords


pytestmark = [pytest.mark.django_db, pytest.mark.usefixtures('storage_factory')]


@override_settings(SSRF_PROTECTION_ENABLED=False)
@pytest.mark.parametrize('model, base_url', KINDS)
@pytest.mark.parametrize('change', [{'host': OTHER_HOST}, {'port': '6380'}], ids=['host', 'port'])
def test_patch_endpoint_change_without_password_is_rejected(business_client, storage_factory, model, base_url, change):
    storage = storage_factory(model)

    response, sent_passwords = _request(business_client, 'patch', f'{base_url}/{storage.id}', change)

    assert response.status_code == 400, response.content
    assert 'password' in response.json()['validation_errors']
    assert STORED_PASSWORD not in sent_passwords
    storage.refresh_from_db()
    assert (storage.host, storage.port, storage.password) == (STORED_HOST, '6379', STORED_PASSWORD)


@override_settings(SSRF_PROTECTION_ENABLED=False)
@pytest.mark.parametrize('model, base_url', KINDS)
def test_validate_endpoint_change_without_password_is_rejected(business_client, storage_factory, model, base_url):
    storage = storage_factory(model)
    payload = {'id': storage.id, 'project': storage.project_id, 'host': OTHER_HOST, 'port': '6379'}

    response, sent_passwords = _request(business_client, 'post', f'{base_url}/validate', payload)

    assert response.status_code == 400, response.content
    assert STORED_PASSWORD not in sent_passwords
    storage.refresh_from_db()
    assert (storage.host, storage.password) == (STORED_HOST, STORED_PASSWORD)


@override_settings(SSRF_PROTECTION_ENABLED=False)
@pytest.mark.parametrize('model, base_url', KINDS)
def test_patch_endpoint_change_with_new_password_is_accepted(business_client, storage_factory, model, base_url):
    storage = storage_factory(model)

    response, sent_passwords = _request(
        business_client, 'patch', f'{base_url}/{storage.id}', {'host': OTHER_HOST, 'password': 'new-secret'}
    )

    assert response.status_code == 200, response.content
    assert STORED_PASSWORD not in sent_passwords
    storage.refresh_from_db()
    assert (storage.host, storage.password) == (OTHER_HOST, 'new-secret')


@override_settings(SSRF_PROTECTION_ENABLED=False)
@pytest.mark.parametrize('model, base_url', KINDS)
def test_patch_without_endpoint_change_keeps_password(business_client, storage_factory, model, base_url):
    storage = storage_factory(model)

    # resending the unchanged host and port, as the storage form does, is not a change
    response, _ = _request(
        business_client, 'patch', f'{base_url}/{storage.id}', {'title': 'Renamed', 'host': STORED_HOST, 'port': '6379'}
    )

    assert response.status_code == 200, response.content
    storage.refresh_from_db()
    assert (storage.title, storage.password) == ('Renamed', STORED_PASSWORD)


@override_settings(SSRF_PROTECTION_ENABLED=False)
@pytest.mark.parametrize('model, base_url', KINDS)
def test_patch_endpoint_change_without_stored_password_is_accepted(business_client, storage_factory, model, base_url):
    storage = storage_factory(model, password='')

    response, _ = _request(business_client, 'patch', f'{base_url}/{storage.id}', {'host': OTHER_HOST})

    assert response.status_code == 200, response.content
    storage.refresh_from_db()
    assert storage.host == OTHER_HOST
