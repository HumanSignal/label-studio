import json
from unittest.mock import patch

import pytest
from django.test import override_settings
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
