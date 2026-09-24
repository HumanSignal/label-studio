import json

import pytest
from io_storages.s3.models import S3ExportStorage, S3ImportStorage
from io_storages.s3.serializers import S3ImportStorageSerializer
from tests.utils import make_project

SECRET_TOKEN = 'FQoGZXIvYXdzEJr__________TESTTOKEN'
REDACTED_FIELDS = ['aws_access_key_id', 'aws_secret_access_key', 'aws_session_token']

CREDENTIALS = {
    'bucket': 'pytest-s3-images',
    'aws_access_key_id': 'AKIAIOSFODNN7EXAMPLE',
    'aws_secret_access_key': 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
    'aws_session_token': SECRET_TOKEN,
    'aws_sse_kms_key_id': 'arn:aws:kms:us-east-1:123456789012:key/test',
}


@pytest.fixture
def project(business_client):
    return make_project({}, business_client.user, use_ml_backend=False)


@pytest.fixture
def import_storage(project):
    return S3ImportStorage.objects.create(project=project, title='S3 source', **CREDENTIALS)


@pytest.fixture
def export_storage(project):
    return S3ExportStorage.objects.create(project=project, title='S3 target', **CREDENTIALS)


@pytest.mark.django_db
def test_import_storage_responses_hide_credentials(business_client, project, import_storage):
    list_response = business_client.get(f'/api/storages/s3/?project={project.id}')
    assert list_response.status_code == 200
    (payload,) = list_response.json()

    detail_response = business_client.get(f'/api/storages/s3/{import_storage.id}')
    assert detail_response.status_code == 200

    for body in (payload, detail_response.json()):
        for field in REDACTED_FIELDS:
            assert field not in body
        # not a credential: an ARN that the storage settings UI still has to render
        assert body['aws_sse_kms_key_id'] == CREDENTIALS['aws_sse_kms_key_id']


@pytest.mark.django_db
def test_export_storage_responses_hide_credentials(business_client, project, export_storage):
    list_response = business_client.get(f'/api/storages/export/s3?project={project.id}')
    assert list_response.status_code == 200
    (payload,) = list_response.json()

    detail_response = business_client.get(f'/api/storages/export/s3/{export_storage.id}')
    assert detail_response.status_code == 200

    for body in (payload, detail_response.json()):
        for field in REDACTED_FIELDS:
            assert field not in body


@pytest.mark.django_db
def test_session_token_is_only_hidden_on_output(business_client, import_storage):
    """Redaction happens in to_representation; the stored token is untouched."""
    import_storage.refresh_from_db()
    assert import_storage.aws_session_token == SECRET_TOKEN


@pytest.mark.django_db
def test_patch_without_session_token_keeps_stored_value(business_client, import_storage):
    response = business_client.patch(
        f'/api/storages/s3/{import_storage.id}',
        data=json.dumps({'title': 'renamed'}),
        content_type='application/json',
    )
    assert response.status_code == 200, response.content
    assert 'aws_session_token' not in response.json()

    import_storage.refresh_from_db()
    assert import_storage.title == 'renamed'
    assert import_storage.aws_session_token == SECRET_TOKEN


@pytest.mark.django_db
def test_to_representation_tolerates_narrowed_fields(import_storage):
    """Subclasses may drop a secure field from Meta; popping it must not raise."""

    class NarrowedSerializer(S3ImportStorageSerializer):
        class Meta:
            model = S3ImportStorage
            exclude = ('aws_access_key_id',)

    data = NarrowedSerializer(import_storage).data

    for field in REDACTED_FIELDS:
        assert field not in data
