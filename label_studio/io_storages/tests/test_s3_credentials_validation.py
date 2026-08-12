from types import SimpleNamespace
from unittest.mock import patch

import pytest
from io_storages.functions import validate_storage_instance
from io_storages.s3.models import S3StorageMixin
from io_storages.s3.serializers import S3ExportStorageSerializer, S3ImportStorageSerializer
from tests.utils import make_project

STORAGE_SERIALIZERS = [S3ImportStorageSerializer, S3ExportStorageSerializer]


def storage_payload(project, **credentials):
    return {
        'project': project.id,
        'title': 'S3 source',
        'bucket': 'pytest-s3-images',
        **credentials,
    }


@pytest.mark.django_db
@pytest.mark.parametrize('serializer_class', STORAGE_SERIALIZERS)
def test_s3_credentials_allow_default_chain(business_client, serializer_class):
    project = make_project({}, business_client.user, use_ml_backend=False)
    serializer = serializer_class(data=storage_payload(project, aws_access_key_id='', aws_secret_access_key=''))

    with patch.object(S3StorageMixin, 'validate_connection', autospec=True) as validate_connection:
        assert serializer.is_valid(), serializer.errors

    validated_storage = validate_connection.call_args.args[0]
    assert validated_storage.aws_access_key_id == ''
    assert validated_storage.aws_secret_access_key == ''
    assert validated_storage.aws_session_token in (None, '')


@pytest.mark.django_db
@pytest.mark.parametrize('serializer_class', STORAGE_SERIALIZERS)
@pytest.mark.parametrize(
    'credentials, missing_field',
    [
        ({'aws_access_key_id': 'access-key'}, 'aws_secret_access_key'),
        ({'aws_secret_access_key': 'secret-key'}, 'aws_access_key_id'),
        ({'aws_access_key_id': 'access-key', 'aws_secret_access_key': ''}, 'aws_secret_access_key'),
        ({'aws_access_key_id': '', 'aws_secret_access_key': 'secret-key'}, 'aws_access_key_id'),
    ],
)
def test_s3_credentials_require_both_or_neither(business_client, serializer_class, credentials, missing_field):
    project = make_project({}, business_client.user, use_ml_backend=False)
    serializer = serializer_class(data=storage_payload(project, **credentials))

    with patch.object(S3StorageMixin, 'validate_connection', autospec=True) as validate_connection:
        assert not serializer.is_valid()

    assert serializer.errors[missing_field] == ['Access Key ID and Secret Access Key must be provided together.']
    validate_connection.assert_not_called()


@pytest.mark.django_db
@pytest.mark.parametrize('serializer_class', STORAGE_SERIALIZERS)
def test_s3_validation_uses_explicit_empty_credentials_when_clearing_existing_storage(
    business_client, serializer_class
):
    project = make_project({}, business_client.user, use_ml_backend=False)
    storage = serializer_class.Meta.model.objects.create(
        project=project,
        title='S3 source',
        bucket='pytest-s3-images',
        aws_access_key_id='stored-access-key',
        aws_secret_access_key='stored-secret-key',
        aws_session_token='stored-session-token',
    )
    serializer = serializer_class(
        data={
            **storage_payload(project, aws_access_key_id='', aws_secret_access_key=''),
            'id': storage.id,
        }
    )

    with patch.object(S3StorageMixin, 'validate_connection', autospec=True) as validate_connection:
        assert serializer.is_valid(), serializer.errors

    validated_storage = validate_connection.call_args.args[0]
    assert validated_storage.aws_access_key_id == ''
    assert validated_storage.aws_secret_access_key == ''
    assert validated_storage.aws_session_token == ''


@pytest.mark.django_db
@pytest.mark.parametrize('serializer_class', STORAGE_SERIALIZERS)
def test_s3_validation_reuses_stored_credentials_when_fields_are_unchanged(business_client, serializer_class):
    project = make_project({}, business_client.user, use_ml_backend=False)
    storage = serializer_class.Meta.model.objects.create(
        project=project,
        title='S3 source',
        bucket='pytest-s3-images',
        aws_access_key_id='stored-access-key',
        aws_secret_access_key='stored-secret-key',
        aws_session_token='stored-session-token',
    )
    serializer = serializer_class(data={**storage_payload(project), 'id': storage.id})

    with patch.object(S3StorageMixin, 'validate_connection', autospec=True) as validate_connection:
        assert serializer.is_valid(), serializer.errors

    validated_storage = validate_connection.call_args.args[0]
    assert validated_storage.aws_access_key_id == 'stored-access-key'
    assert validated_storage.aws_secret_access_key == 'stored-secret-key'
    assert validated_storage.aws_session_token == 'stored-session-token'


@pytest.mark.django_db
@pytest.mark.parametrize('serializer_class', STORAGE_SERIALIZERS)
def test_s3_validation_clears_stored_session_token_when_credentials_change(business_client, serializer_class):
    project = make_project({}, business_client.user, use_ml_backend=False)
    storage = serializer_class.Meta.model.objects.create(
        project=project,
        title='S3 source',
        bucket='pytest-s3-images',
        aws_access_key_id='stored-access-key',
        aws_secret_access_key='stored-secret-key',
        aws_session_token='stored-session-token',
    )
    serializer = serializer_class(
        data={
            **storage_payload(
                project,
                aws_access_key_id='replacement-access-key',
                aws_secret_access_key='replacement-secret-key',
            ),
            'id': storage.id,
        }
    )

    with patch.object(S3StorageMixin, 'validate_connection', autospec=True) as validate_connection:
        assert serializer.is_valid(), serializer.errors

    validated_storage = validate_connection.call_args.args[0]
    assert validated_storage.aws_access_key_id == 'replacement-access-key'
    assert validated_storage.aws_secret_access_key == 'replacement-secret-key'
    assert validated_storage.aws_session_token == ''


@pytest.mark.django_db
@pytest.mark.parametrize('serializer_class', STORAGE_SERIALIZERS)
def test_s3_credentials_reject_session_token_without_key_pair(business_client, serializer_class):
    project = make_project({}, business_client.user, use_ml_backend=False)
    serializer = serializer_class(
        data=storage_payload(
            project,
            aws_access_key_id='',
            aws_secret_access_key='',
            aws_session_token='orphaned-session-token',
        )
    )

    with patch.object(S3StorageMixin, 'validate_connection', autospec=True) as validate_connection:
        assert not serializer.is_valid()

    assert serializer.errors['aws_session_token'] == ['Session Token requires an Access Key ID and Secret Access Key.']
    validate_connection.assert_not_called()


@pytest.mark.django_db
@pytest.mark.parametrize('serializer_class', STORAGE_SERIALIZERS)
def test_s3_serializer_redacts_all_credentials(business_client, serializer_class):
    project = make_project({}, business_client.user, use_ml_backend=False)
    storage = serializer_class.Meta.model.objects.create(
        project=project,
        title='S3 source',
        bucket='pytest-s3-images',
        aws_access_key_id='stored-access-key',
        aws_secret_access_key='stored-secret-key',
        aws_session_token='stored-session-token',
    )

    representation = serializer_class(storage).data

    assert 'aws_access_key_id' not in representation
    assert 'aws_secret_access_key' not in representation
    assert 'aws_session_token' not in representation


@pytest.mark.django_db
@pytest.mark.parametrize('serializer_class', STORAGE_SERIALIZERS)
def test_s3_connection_validation_does_not_persist_candidate_credentials(business_client, serializer_class):
    project = make_project({}, business_client.user, use_ml_backend=False)
    storage = serializer_class.Meta.model.objects.create(
        project=project,
        title='S3 source',
        bucket='pytest-s3-images',
        aws_access_key_id='stored-access-key',
        aws_secret_access_key='stored-secret-key',
        aws_session_token='stored-session-token',
    )
    request = SimpleNamespace(
        user=business_client.user,
        data={
            **storage_payload(project, aws_access_key_id='', aws_secret_access_key='', aws_session_token=''),
            'id': storage.id,
        },
    )

    with patch.object(S3StorageMixin, 'validate_connection', autospec=True):
        candidate = validate_storage_instance(request, serializer_class)

    assert candidate.aws_access_key_id == ''
    assert candidate.aws_secret_access_key == ''
    assert candidate.aws_session_token == ''
    storage.refresh_from_db()
    assert storage.aws_access_key_id == 'stored-access-key'
    assert storage.aws_secret_access_key == 'stored-secret-key'
    assert storage.aws_session_token == 'stored-session-token'


@pytest.mark.django_db
@pytest.mark.parametrize('serializer_class', STORAGE_SERIALIZERS)
def test_s3_storage_update_persists_cleared_credentials(business_client, serializer_class):
    project = make_project({}, business_client.user, use_ml_backend=False)
    storage = serializer_class.Meta.model.objects.create(
        project=project,
        title='S3 source',
        bucket='pytest-s3-images',
        aws_access_key_id='stored-access-key',
        aws_secret_access_key='stored-secret-key',
        aws_session_token='stored-session-token',
    )
    serializer = serializer_class(
        storage,
        data=storage_payload(
            project,
            aws_access_key_id='',
            aws_secret_access_key='',
            aws_session_token='',
        ),
        partial=True,
    )

    with patch.object(S3StorageMixin, 'validate_connection', autospec=True):
        assert serializer.is_valid(), serializer.errors
        serializer.save()

    storage.refresh_from_db()
    assert storage.aws_access_key_id == ''
    assert storage.aws_secret_access_key == ''
    assert storage.aws_session_token == ''
