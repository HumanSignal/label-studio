import json

import pytest
from tests.utils import make_project


@pytest.mark.django_db
def test_gcs_storage_credentials_validation(business_client):
    project = make_project({}, business_client.user, use_ml_backend=False)

    data = {
        'project': project.id,
        'title': 'Test',
        'bucket': 'Test',
        'prefix': 'Test',
        'regex_filter': '',
        'use_blob_urls': False,
        'presign': True,
        'presign_ttl': '15',
        'google_project_id': '',
        'google_application_credentials': 'Test',
    }

    # upload tasks with annotations
    r = business_client.post(
        f'/api/storages/gcs?project={project.id}', data=json.dumps(data), content_type='application/json'
    )
    assert r.status_code == 400
    assert (
        'Google Application Credentials must be valid JSON string.'
        in r.json()['validation_errors']['non_field_errors'][0]
    )
