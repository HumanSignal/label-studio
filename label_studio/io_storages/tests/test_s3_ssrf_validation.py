import json
import socket
from unittest.mock import patch

import pytest
from botocore.awsrequest import AWSHTTPConnectionPool
from botocore.exceptions import HTTPClientError
from core.utils.exceptions import SsrfBlockedUrlError
from django.test import override_settings
from io_storages.s3.utils import get_client_and_resource
from tests.utils import make_project

# Public IP literal: passes validate_ip() without a DNS lookup, so the "allowed" cases stay offline.
PUBLIC_S3_ENDPOINT = 'http://93.184.216.34:9000'
LOCAL_S3_ENDPOINT = 'http://127.0.0.1:9000'


@pytest.mark.django_db
@override_settings(SSRF_PROTECTION_ENABLED=True)
def test_s3_import_storage_rejects_local_s3_endpoint(business_client):
    project = make_project({}, business_client.user, use_ml_backend=False)
    payload = {
        'project': project.id,
        'title': 'S3 source',
        'bucket': 'pytest-s3-images',
        's3_endpoint': LOCAL_S3_ENDPOINT,
    }

    with patch('io_storages.s3.models.S3StorageMixin.validate_connection') as mock_validate_connection:
        response = business_client.post('/api/storages/s3/', data=json.dumps(payload), content_type='application/json')

    assert response.status_code in (400, 403)
    mock_validate_connection.assert_not_called()


@pytest.mark.django_db
@override_settings(SSRF_PROTECTION_ENABLED=True)
def test_s3_export_storage_rejects_local_s3_endpoint(business_client):
    project = make_project({}, business_client.user, use_ml_backend=False)
    payload = {
        'project': project.id,
        'title': 'S3 target',
        'bucket': 'pytest-s3-images',
        's3_endpoint': LOCAL_S3_ENDPOINT,
    }

    with patch('io_storages.s3.models.S3StorageMixin.validate_connection') as mock_validate_connection:
        response = business_client.post(
            '/api/storages/export/s3', data=json.dumps(payload), content_type='application/json'
        )

    assert response.status_code in (400, 403)
    mock_validate_connection.assert_not_called()


@pytest.mark.django_db
@override_settings(SSRF_PROTECTION_ENABLED=True)
@pytest.mark.parametrize('url', ['/api/storages/s3/validate', '/api/storages/export/s3/validate'])
def test_s3_storage_validate_rejects_local_s3_endpoint(business_client, url):
    project = make_project({}, business_client.user, use_ml_backend=False)
    payload = {
        'project': project.id,
        'title': 'S3 storage',
        'bucket': 'pytest-s3-images',
        's3_endpoint': LOCAL_S3_ENDPOINT,
    }

    with patch('io_storages.s3.models.S3StorageMixin.validate_connection') as mock_validate_connection:
        response = business_client.post(url, data=json.dumps(payload), content_type='application/json')

    assert response.status_code in (400, 403)
    mock_validate_connection.assert_not_called()


@pytest.mark.django_db
@override_settings(SSRF_PROTECTION_ENABLED=True, SYNC_ON_TARGET_STORAGE_CREATION=False)
@pytest.mark.parametrize('url', ['/api/storages/s3/', '/api/storages/export/s3'])
def test_s3_storages_accept_public_s3_endpoint(business_client, url):
    project = make_project({}, business_client.user, use_ml_backend=False)
    payload = {
        'project': project.id,
        'title': 'S3 storage',
        'bucket': 'pytest-s3-images',
        's3_endpoint': PUBLIC_S3_ENDPOINT,
    }

    with patch('io_storages.s3.models.S3StorageMixin.validate_connection'):
        response = business_client.post(url, data=json.dumps(payload), content_type='application/json')

    assert response.status_code == 201, response.content


@pytest.fixture
def boto_env(monkeypatch):
    # One attempt, no proxy: the guard is skipped for proxied connections and retries only add backoff sleeps.
    monkeypatch.setenv('AWS_MAX_ATTEMPTS', '1')
    for name in ('HTTP_PROXY', 'http_proxy', 'HTTPS_PROXY', 'https_proxy', 'S3_ENDPOINT'):
        monkeypatch.delenv(name, raising=False)


def _make_s3_client_and_resource(s3_endpoint):
    return get_client_and_resource('key-id', 'secret', None, 'us-east-1', s3_endpoint)


@override_settings(SSRF_PROTECTION_ENABLED=True)
def test_s3_client_blocks_endpoint_rebound_to_local_address_at_connect_time(boto_env):
    rebound_addr_info = [(socket.AF_INET, socket.SOCK_STREAM, 6, '', ('127.0.0.1', 9000))]

    # validation sees a public IP, the connection-time lookup gets the rebound local one
    with patch('core.utils.io.socket.gethostbyname', return_value='93.184.216.34'):
        client, resource = _make_s3_client_and_resource('http://rebind.example.com:9000')

    for s3_client in (client, resource.meta.client):
        with (
            patch('core.utils.io.socket.getaddrinfo', return_value=rebound_addr_info),
            patch('core.utils.io.urllib3_connection.create_connection') as mock_create_connection,
        ):
            with pytest.raises(HTTPClientError) as exc_info:
                s3_client.head_bucket(Bucket='pytest-s3-images')

        assert isinstance(exc_info.value.kwargs['error'], SsrfBlockedUrlError)
        mock_create_connection.assert_not_called()


@override_settings(SSRF_PROTECTION_ENABLED=True)
def test_s3_client_revalidates_stored_local_endpoint(boto_env):
    # a storage saved before the serializer check existed is rejected when its client is built
    with pytest.raises(SsrfBlockedUrlError):
        _make_s3_client_and_resource(LOCAL_S3_ENDPOINT)


@override_settings(SSRF_PROTECTION_ENABLED=True)
def test_s3_client_trusts_operator_s3_endpoint_env(boto_env, monkeypatch):
    monkeypatch.setenv('S3_ENDPOINT', LOCAL_S3_ENDPOINT)

    client, resource = _make_s3_client_and_resource(None)

    assert client.meta.endpoint_url == LOCAL_S3_ENDPOINT
    for s3_client in (client, resource.meta.client):
        assert s3_client._endpoint.http_session._manager.pool_classes_by_scheme['http'] is AWSHTTPConnectionPool


@override_settings(SSRF_PROTECTION_ENABLED=False)
def test_s3_client_allows_local_endpoint_when_ssrf_protection_disabled(boto_env):
    client, resource = _make_s3_client_and_resource(LOCAL_S3_ENDPOINT)

    for s3_client in (client, resource.meta.client):
        assert s3_client._endpoint.http_session._manager.pool_classes_by_scheme['http'] is AWSHTTPConnectionPool
