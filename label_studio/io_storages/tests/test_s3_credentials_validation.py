from types import SimpleNamespace
from unittest.mock import MagicMock, patch

import pytest
from botocore.exceptions import NoCredentialsError
from io_storages.functions import validate_storage_instance
from io_storages.s3.api import S3ExportStorageListAPI
from io_storages.s3.models import S3StorageMixin, clients_cache
from io_storages.s3.serializers import S3ExportStorageSerializer, S3ImportStorageSerializer
from io_storages.s3.utils import get_client_and_resource
from rest_framework.exceptions import ValidationError
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
        },
        context={'storage_instance': storage},
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
    serializer = serializer_class(
        data={**storage_payload(project), 'id': storage.id},
        context={'storage_instance': storage},
    )

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
        },
        context={'storage_instance': storage},
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


@pytest.mark.django_db
@pytest.mark.parametrize('serializer_class', STORAGE_SERIALIZERS)
def test_s3_validation_rejects_storage_id_without_permission_checked_context(business_client, serializer_class):
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
        assert not serializer.is_valid()

    assert serializer.errors['id'] == ['Invalid storage ID.']
    validate_connection.assert_not_called()


@pytest.mark.django_db
@pytest.mark.parametrize('serializer_class', STORAGE_SERIALIZERS)
def test_s3_credentials_reject_invalid_partial_patch_without_bucket(business_client, serializer_class):
    project = make_project({}, business_client.user, use_ml_backend=False)
    storage = serializer_class.Meta.model.objects.create(
        project=project,
        title='S3 source',
        bucket='pytest-s3-images',
        aws_access_key_id='stored-access-key',
        aws_secret_access_key='stored-secret-key',
    )
    serializer = serializer_class(
        storage,
        data={'aws_access_key_id': 'replacement-access-key', 'aws_secret_access_key': ''},
        partial=True,
    )

    with patch.object(S3StorageMixin, 'validate_connection', autospec=True) as validate_connection:
        assert not serializer.is_valid()

    assert serializer.errors['aws_secret_access_key'] == [
        'Access Key ID and Secret Access Key must be provided together.'
    ]
    validate_connection.assert_not_called()


@pytest.mark.django_db
@pytest.mark.parametrize('serializer_class', STORAGE_SERIALIZERS)
def test_s3_credentials_reject_token_only_patch_for_default_chain_storage(business_client, serializer_class):
    project = make_project({}, business_client.user, use_ml_backend=False)
    storage = serializer_class.Meta.model.objects.create(
        project=project,
        title='S3 source',
        bucket='pytest-s3-images',
    )
    serializer = serializer_class(
        storage,
        data={'aws_session_token': 'orphaned-session-token'},
        partial=True,
    )

    with patch.object(S3StorageMixin, 'validate_connection', autospec=True) as validate_connection:
        assert not serializer.is_valid()

    assert serializer.errors['aws_session_token'] == ['Session Token requires an Access Key ID and Secret Access Key.']
    validate_connection.assert_not_called()


@pytest.mark.django_db
@pytest.mark.parametrize('serializer_class', STORAGE_SERIALIZERS)
def test_s3_credentials_report_missing_default_chain(business_client, serializer_class):
    project = make_project({}, business_client.user, use_ml_backend=False)
    serializer = serializer_class(data=storage_payload(project, aws_access_key_id='', aws_secret_access_key=''))

    with patch.object(
        S3StorageMixin,
        'validate_connection',
        autospec=True,
        side_effect=NoCredentialsError(),
    ):
        assert not serializer.is_valid()

    assert serializer.errors['non_field_errors'] == ['Unable to resolve AWS credentials for this S3 connection.']


def test_s3_client_uses_default_chain_when_explicit_credentials_are_omitted():
    with (
        patch.dict('os.environ', {}, clear=True),
        patch('io_storages.s3.utils.boto3.Session') as session_class,
    ):
        get_client_and_resource()

    session_class.assert_called_once_with()


def test_s3_client_does_not_mix_explicit_credentials_with_ambient_session_token():
    with (
        patch.dict('os.environ', {'LABEL_STUDIO_AWS_SESSION_TOKEN': 'ambient-session-token'}, clear=True),
        patch('io_storages.s3.utils.boto3.Session') as session_class,
    ):
        get_client_and_resource(
            aws_access_key_id='access-key',
            aws_secret_access_key='secret-key',
        )

    session_class.assert_called_once_with(
        aws_access_key_id='access-key',
        aws_secret_access_key='secret-key',
        aws_session_token=None,
    )


@pytest.mark.parametrize('prefix', ['LABEL_STUDIO_', 'HEARTEX_'])
def test_s3_client_preserves_prefixed_credential_aliases(prefix):
    environment = {
        f'{prefix}AWS_ACCESS_KEY_ID': 'prefixed-access-key',
        f'{prefix}AWS_SECRET_ACCESS_KEY': 'prefixed-secret-key',
        f'{prefix}AWS_SESSION_TOKEN': 'prefixed-session-token',
    }
    with (
        patch.dict('os.environ', environment, clear=True),
        patch('io_storages.s3.utils.boto3.Session') as session_class,
    ):
        get_client_and_resource()

    session_class.assert_called_once_with(
        aws_access_key_id='prefixed-access-key',
        aws_secret_access_key='prefixed-secret-key',
        aws_session_token='prefixed-session-token',
    )


@pytest.mark.django_db
@pytest.mark.parametrize('serializer_class', STORAGE_SERIALIZERS)
def test_s3_validation_does_not_cache_candidate_credentials(business_client, serializer_class):
    project = make_project({}, business_client.user, use_ml_backend=False)
    request = SimpleNamespace(
        user=business_client.user,
        data=storage_payload(
            project,
            aws_access_key_id='candidate-access-key',
            aws_secret_access_key='candidate-secret-key',
        ),
    )
    clients_cache.clear()

    with patch(
        'io_storages.s3.models.get_client_and_resource',
        return_value=(MagicMock(), MagicMock()),
    ):
        candidate = validate_storage_instance(request, serializer_class)

    assert candidate._skip_client_cache
    assert clients_cache == {}


@pytest.mark.django_db
def test_failed_s3_export_creation_does_not_cache_candidate_credentials(business_client):
    project = make_project({}, business_client.user, use_ml_backend=False)
    serializer = S3ExportStorageSerializer(
        data=storage_payload(
            project,
            aws_access_key_id='candidate-access-key',
            aws_secret_access_key='candidate-secret-key',
        )
    )
    view = S3ExportStorageListAPI()
    view.request = SimpleNamespace(user=business_client.user)
    client = MagicMock()
    client.head_bucket.side_effect = [None, RuntimeError('connection failed')]
    clients_cache.clear()

    with patch(
        'io_storages.s3.models.get_client_and_resource',
        return_value=(client, MagicMock()),
    ):
        assert serializer.is_valid(), serializer.errors
        with pytest.raises(ValidationError):
            view.perform_create(serializer)

    assert clients_cache == {}
