import json
from unittest.mock import patch

import pytest
from django.test import override_settings
from tests.utils import make_project


@pytest.mark.django_db
@override_settings(SSRF_PROTECTION_ENABLED=True)
def test_s3_import_storage_rejects_local_s3_endpoint(business_client):
    project = make_project({}, business_client.user, use_ml_backend=False)
    payload = {
        'project': project.id,
        'title': 'S3 source',
        'bucket': 'pytest-s3-images',
        's3_endpoint': 'http://127.0.0.1:9000',
    }

    with patch('io_storages.s3.models.S3StorageMixin.validate_connection') as mock_validate_connection:
        response = business_client.post('/api/storages/s3/', data=json.dumps(payload), content_type='application/json')

    assert response.status_code in (400, 403)
    mock_validate_connection.assert_not_called()
