import pytest
from jwt_auth.models import LSAPIToken
from organizations.functions import create_organization
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient
from users.models import User

from ..utils import mock_feature_flag
from .utils import create_user_with_token_settings


@mock_feature_flag(flag_name='fflag__feature_develop__prompts__dia_1829_jwt_token_auth', value=True)
@pytest.mark.django_db
def test_request_without_auth_header_returns_401():
    client = APIClient()
    response = client.get('/api/projects/')
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


@mock_feature_flag(flag_name='fflag__feature_develop__prompts__dia_1829_jwt_token_auth', value=True)
@pytest.mark.django_db
def test_request_with_invalid_token_returns_401():
    client = APIClient()
    client.credentials(HTTP_AUTHORIZATION='Bearer invalid.token.here')
    response = client.get('/api/projects/')
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


@mock_feature_flag(flag_name='fflag__feature_develop__prompts__dia_1829_jwt_token_auth', value=True)
@pytest.mark.django_db
def test_request_with_valid_token_returns_authenticated_user():
    user = create_user_with_token_settings(api_tokens_enabled=True, legacy_api_tokens_enabled=False)
    refresh = LSAPIToken.for_user(user)
    client = APIClient()
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')

    response = client.get('/api/projects/')

    assert response.status_code == status.HTTP_200_OK
    assert response.wsgi_request.user == user


@mock_feature_flag(flag_name='fflag__feature_develop__prompts__dia_1829_jwt_token_auth', value=True)
@pytest.mark.django_db
def test_x_api_key_with_jwt_access_token_returns_authenticated_user():
    user = create_user_with_token_settings(api_tokens_enabled=True, legacy_api_tokens_enabled=False)
    refresh = LSAPIToken.for_user(user)
    client = APIClient()
    client.credentials(HTTP_X_API_KEY=str(refresh.access_token))

    response = client.get('/api/projects/')

    assert response.status_code == status.HTTP_200_OK
    assert response.wsgi_request.user == user


@mock_feature_flag(flag_name='fflag__feature_develop__prompts__dia_1829_jwt_token_auth', value=True)
@pytest.mark.django_db
def test_jwt_token_auth_disabled_user_cannot_use_jwt_token():
    user = create_user_with_token_settings(api_tokens_enabled=False, legacy_api_tokens_enabled=True)
    refresh = LSAPIToken.for_user(user)
    client = APIClient()
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')

    response = client.get('/api/projects/')
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


@mock_feature_flag(flag_name='fflag__feature_develop__prompts__dia_1829_jwt_token_auth', value=True)
@pytest.mark.django_db
def test_user_with_both_auth_enabled_can_use_both_methods():
    user = create_user_with_token_settings(api_tokens_enabled=True, legacy_api_tokens_enabled=True)
    client = APIClient()

    # JWT token auth
    refresh = LSAPIToken.for_user(user)
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')

    response = client.get('/api/projects/')

    assert response.status_code == status.HTTP_200_OK
    assert response.wsgi_request.user == user

    # Legacy token auth
    token, _ = Token.objects.get_or_create(user=user)
    client.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')

    response = client.get('/api/projects/')

    assert response.status_code == status.HTTP_200_OK
    assert response.wsgi_request.user == user


@mock_feature_flag(flag_name='fflag__feature_develop__prompts__dia_1829_jwt_token_auth', value=True)
@pytest.mark.django_db
def test_user_with_no_auth_enabled_cannot_use_either_method():
    user = create_user_with_token_settings(api_tokens_enabled=False, legacy_api_tokens_enabled=False)
    client = APIClient()

    # JWT token auth
    refresh = LSAPIToken.for_user(user)
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')

    response = client.get('/api/projects/')

    assert response.status_code == status.HTTP_401_UNAUTHORIZED

    # Legacy token auth
    token, _ = Token.objects.get_or_create(user=user)
    client.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')

    response = client.get('/api/projects/')

    assert response.status_code == status.HTTP_401_UNAUTHORIZED


@mock_feature_flag(flag_name='fflag__feature_develop__prompts__dia_1829_jwt_token_auth', value=True)
@pytest.mark.django_db
def test_jwt_token_invalid_after_user_deleted():
    user = create_user_with_token_settings(api_tokens_enabled=True, legacy_api_tokens_enabled=False)
    refresh = LSAPIToken.for_user(user)
    client = APIClient()
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')
    # Verify token works before deleting user
    response = client.get('/api/projects/')
    assert response.status_code == status.HTTP_200_OK
    assert response.wsgi_request.user == user

    user.delete()

    response = client.get('/api/projects/')
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


@mock_feature_flag(flag_name='fflag__feature_develop__prompts__dia_1829_jwt_token_auth', value=True)
@pytest.mark.django_db
def test_jwt_token_returns_401_when_user_has_no_active_organization():
    # A deleted service account keeps a valid access token but loses its active organization
    # (soft-deleting the membership sets active_organization to None). Using the token must
    # return 401, not raise on the missing organization and surface a 500.
    user = create_user_with_token_settings(api_tokens_enabled=True, legacy_api_tokens_enabled=False)
    refresh = LSAPIToken.for_user(user)
    client = APIClient()
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')
    # Token works while the user still has an active organization
    assert client.get('/api/projects/').status_code == status.HTTP_200_OK

    user.active_organization = None
    user.save(update_fields=['active_organization'])

    response = client.get('/api/projects/')
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


@mock_feature_flag(flag_name='fflag__feature_develop__prompts__dia_1829_jwt_token_auth', value=True)
@pytest.mark.django_db
def test_user_with_default_auth_settings_can_use_jwt_but_not_legacy_token():
    # Create user and org with default settings from create_organization
    user = User.objects.create(email='default_auth_settings@example.com')
    org = create_organization(title='Default Settings Org', created_by=user)
    user.active_organization = org
    user.save()

    # JWT token auth should work (enabled by default)
    refresh = LSAPIToken.for_user(user)
    client = APIClient()
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')

    response = client.get('/api/projects/')
    assert response.status_code == status.HTTP_200_OK
    assert response.wsgi_request.user == user

    # Legacy token auth should not work (disabled by default)
    token, _ = Token.objects.get_or_create(user=user)
    client.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')

    response = client.get('/api/projects/')
    assert response.status_code == status.HTTP_401_UNAUTHORIZED
