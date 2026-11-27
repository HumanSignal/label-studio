import json
import socket
from unittest.mock import patch

import pytest
from django.test import override_settings
from fakeredis import FakeRedis
from io_storages.redis.models import RedisStorageMixin
from tests.utils import make_project

# Public IP literal: passes validate_ip() without a DNS lookup, so the "allowed" cases stay offline.
PUBLIC_IP = '93.184.216.34'
PRIVATE_IP = '10.0.0.5'

STORAGE_URLS = [
    '/api/storages/redis/',
    '/api/storages/redis/validate',
    '/api/storages/export/redis',
    '/api/storages/export/redis/validate',
]


def _addrinfo(ip):
    return [(socket.AF_INET, socket.SOCK_STREAM, 6, '', (ip, 6379))]


def _post_storage(business_client, url, **fields):
    project = make_project({}, business_client.user, use_ml_backend=False)
    payload = {'project': project.id, 'title': 'Redis storage', **fields}
    with patch.object(RedisStorageMixin, 'get_redis_connection', return_value=FakeRedis()) as mock_connect:
        response = business_client.post(url, data=json.dumps(payload), content_type='application/json')
    return response, mock_connect


@pytest.mark.django_db
@override_settings(SSRF_PROTECTION_ENABLED=True)
@pytest.mark.parametrize('url', STORAGE_URLS)
def test_redis_storage_rejects_local_host(business_client, url):
    response, mock_connect = _post_storage(business_client, url, host='127.0.0.1', port='6379')

    assert response.status_code in (400, 403), response.content
    mock_connect.assert_not_called()


@pytest.mark.django_db
@override_settings(SSRF_PROTECTION_ENABLED=True)
@pytest.mark.parametrize('url', STORAGE_URLS)
def test_redis_storage_rejects_empty_host(business_client, url):
    # redis-py falls back to localhost when host is not set
    response, mock_connect = _post_storage(business_client, url)

    assert response.status_code in (400, 403), response.content
    mock_connect.assert_not_called()


@pytest.mark.django_db
@override_settings(SSRF_PROTECTION_ENABLED=True)
def test_redis_storage_rejects_hostname_resolving_to_private_ip(business_client):
    with patch('core.utils.io.socket.getaddrinfo', return_value=_addrinfo(PRIVATE_IP)):
        response, mock_connect = _post_storage(business_client, '/api/storages/redis/', host='redis.internal')

    assert response.status_code in (400, 403), response.content
    mock_connect.assert_not_called()


@pytest.mark.django_db
@override_settings(SSRF_PROTECTION_ENABLED=True)
def test_redis_storage_rejects_hostname_with_mixed_records(business_client):
    # A rebinding host can return a public and a private record; any banned record rejects the host.
    with patch('core.utils.io.socket.getaddrinfo', return_value=_addrinfo(PUBLIC_IP) + _addrinfo(PRIVATE_IP)):
        response, mock_connect = _post_storage(business_client, '/api/storages/redis/', host='redis.example')

    assert response.status_code in (400, 403), response.content
    mock_connect.assert_not_called()


@pytest.mark.django_db
@override_settings(SSRF_PROTECTION_ENABLED=True, SYNC_ON_TARGET_STORAGE_CREATION=False)
@pytest.mark.parametrize('url', ['/api/storages/redis/', '/api/storages/export/redis'])
def test_redis_storage_accepts_public_ip(business_client, url):
    response, mock_connect = _post_storage(business_client, url, host=PUBLIC_IP, port='6379')

    assert response.status_code == 201, response.content
    assert mock_connect.call_args.kwargs['redis_config']['host'] == PUBLIC_IP


@pytest.mark.django_db
@override_settings(SSRF_PROTECTION_ENABLED=True, SYNC_ON_TARGET_STORAGE_CREATION=False)
def test_redis_storage_connects_to_resolved_ip(business_client):
    with patch('core.utils.io.socket.getaddrinfo', return_value=_addrinfo(PUBLIC_IP)):
        response, mock_connect = _post_storage(business_client, '/api/storages/redis/', host='redis.example')

    assert response.status_code == 201, response.content
    # The connection is pinned to the checked address, not re-resolved by the client.
    assert mock_connect.call_args.kwargs['redis_config']['host'] == PUBLIC_IP


@pytest.mark.django_db
@override_settings(SSRF_PROTECTION_ENABLED=False)
def test_redis_storage_allows_local_host_when_protection_disabled(business_client):
    with patch('core.utils.io.socket.getaddrinfo') as mock_getaddrinfo:
        response, mock_connect = _post_storage(business_client, '/api/storages/redis/', host='127.0.0.1')

    assert response.status_code == 201, response.content
    assert mock_connect.call_args.kwargs['redis_config']['host'] == '127.0.0.1'
    mock_getaddrinfo.assert_not_called()
