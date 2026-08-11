from unittest.mock import patch

import pytest
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
    )
    serializer = serializer_class(data={**storage_payload(project), 'id': storage.id})

    with patch.object(S3StorageMixin, 'validate_connection', autospec=True) as validate_connection:
        assert serializer.is_valid(), serializer.errors

    validated_storage = validate_connection.call_args.args[0]
    assert validated_storage.aws_access_key_id == 'stored-access-key'
    assert validated_storage.aws_secret_access_key == 'stored-secret-key'
