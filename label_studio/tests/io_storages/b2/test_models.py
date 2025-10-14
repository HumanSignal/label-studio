import json
from unittest.mock import MagicMock, patch

import pytest
from django.test import override_settings
from io_storages.b2.models import B2ExportStorage, B2ImportStorage
from tasks.models import Annotation
from tests.utils import make_project, make_task


@pytest.mark.django_db
def test_b2_import_storage_creation(business_client):
    """Test creating B2 import storage with valid credentials"""
    project = make_project({}, business_client.user, use_ml_backend=False)

    data = {
        'project': project.id,
        'title': 'Test B2 Import',
        'bucket': 'test-bucket',
        'prefix': 'test-prefix/',
        'regex_filter': '',
        'use_blob_urls': True,
        'presign': True,
        'presign_ttl': 15,
        'b2_access_key_id': 'test_key_id',
        'b2_secret_access_key': 'test_secret',
        'b2_endpoint_url': 'https://s3.us-west-004.backblazeb2.com',
        'region_name': 'us-west-004',
    }

    with patch('io_storages.b2.models.B2ImportStorage.validate_connection'):
        r = business_client.post(
            f'/api/storages/b2?project={project.id}', data=json.dumps(data), content_type='application/json'
        )
        assert r.status_code == 201
        assert r.json()['bucket'] == 'test-bucket'
        assert r.json()['b2_endpoint_url'] == 'https://s3.us-west-004.backblazeb2.com'


@pytest.mark.django_db
def test_b2_export_storage_creation(business_client):
    """Test creating B2 export storage with valid credentials"""
    project = make_project({}, business_client.user, use_ml_backend=False)

    data = {
        'project': project.id,
        'title': 'Test B2 Export',
        'bucket': 'test-bucket',
        'prefix': 'exports/',
        'b2_access_key_id': 'test_key_id',
        'b2_secret_access_key': 'test_secret',
        'b2_endpoint_url': 'https://s3.us-west-004.backblazeb2.com',
        'region_name': 'us-west-004',
        'can_delete_objects': False,
    }

    with patch('io_storages.b2.models.B2ExportStorage.validate_connection'):
        r = business_client.post(
            f'/api/storages/export/b2?project={project.id}', data=json.dumps(data), content_type='application/json'
        )
        assert r.status_code == 201
        assert r.json()['bucket'] == 'test-bucket'
        assert r.json()['prefix'] == 'exports/'


@pytest.mark.django_db
def test_b2_storage_missing_credentials(business_client):
    """Test that B2 storage creation fails without credentials"""
    project = make_project({}, business_client.user, use_ml_backend=False)

    data = {
        'project': project.id,
        'title': 'Test B2',
        'bucket': 'test-bucket',
        'b2_endpoint_url': 'https://s3.us-west-004.backblazeb2.com',
        # Missing b2_access_key_id and b2_secret_access_key
    }

    r = business_client.post(
        f'/api/storages/b2?project={project.id}', data=json.dumps(data), content_type='application/json'
    )
    assert r.status_code == 400


@pytest.mark.django_db
def test_b2_storage_invalid_endpoint(business_client):
    """Test that B2 storage creation fails with invalid endpoint"""
    project = make_project({}, business_client.user, use_ml_backend=False)

    data = {
        'project': project.id,
        'title': 'Test B2',
        'bucket': 'test-bucket',
        'b2_access_key_id': 'test_key_id',
        'b2_secret_access_key': 'test_secret',
        'b2_endpoint_url': 'invalid-url',  # Invalid URL
    }

    r = business_client.post(
        f'/api/storages/b2?project={project.id}', data=json.dumps(data), content_type='application/json'
    )
    assert r.status_code == 400


@pytest.mark.django_db
def test_b2_export_annotation_signal():
    """Test that annotations are exported to B2 storage on save"""
    from io_storages.b2.models import B2ExportStorageLink

    # Create project and export storage
    project = make_project({}, None, use_ml_backend=False)
    export_storage = B2ExportStorage.objects.create(
        project=project,
        title='Test Export',
        bucket='test-bucket',
        b2_access_key_id='test_key',
        b2_secret_access_key='test_secret',
        b2_endpoint_url='https://s3.us-west-004.backblazeb2.com',
    )

    # Create task
    task = make_task({'data': {}}, project)

    # Mock the save_annotation method
    with patch.object(B2ExportStorage, 'save_annotation') as mock_save:
        # Create annotation
        annotation = Annotation.objects.create(task=task, project=project, result=[])

        # Verify save_annotation was called
        mock_save.assert_called_once()

        # Verify export link was created
        link = B2ExportStorageLink.objects.filter(annotation=annotation, storage=export_storage).first()
        assert link is not None


@pytest.mark.django_db
def test_b2_import_storage_get_data():
    """Test B2 import storage get_data method"""
    project = make_project({}, None, use_ml_backend=False)
    import_storage = B2ImportStorage.objects.create(
        project=project,
        title='Test Import',
        bucket='test-bucket',
        b2_access_key_id='test_key',
        b2_secret_access_key='test_secret',
        b2_endpoint_url='https://s3.us-west-004.backblazeb2.com',
    )

    # Mock boto3 client
    mock_client = MagicMock()
    mock_client.get_object.return_value = {'Body': MagicMock(read=lambda: b'{"test": "data"}')}

    with patch.object(import_storage, 'get_client_and_bucket', return_value=(mock_client, None)):
        data = import_storage.get_data('test-key')
        assert data == b'{"test": "data"}'
        mock_client.get_object.assert_called_once()

