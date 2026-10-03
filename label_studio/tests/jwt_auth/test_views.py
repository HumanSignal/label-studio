import warnings

import pytest
from jwt_auth.models import LSAPIToken
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.exceptions import TokenError
from tests.jwt_auth.utils import create_user_with_token_settings
from tests.utils import mock_feature_flag


@mock_feature_flag(flag_name='fflag__feature_develop__prompts__dia_1829_jwt_token_auth', value=True)
@pytest.mark.django_db
def test_list_tokens_does_not_use_naive_datetimes():
    user = create_user_with_token_settings(api_tokens_enabled=True, legacy_api_tokens_enabled=False)
    client = APIClient()
    client.force_authenticate(user)

    with warnings.catch_warnings(record=True) as caught:
        warnings.simplefilter('always')
        response = client.get('/api/token/')

    assert response.status_code == status.HTTP_200_OK
    assert not [warning for warning in caught if 'received a naive datetime' in str(warning.message)]


@mock_feature_flag(flag_name='fflag__feature_develop__prompts__dia_1829_jwt_token_auth', value=True)
@pytest.mark.django_db
def test_blacklist_view_returns_404_with_already_blacklisted_token(client):
    user = create_user_with_token_settings(api_tokens_enabled=True, legacy_api_tokens_enabled=False)
    client.force_login(user)

    token = LSAPIToken()
    token.blacklist()
    response = client.post('/api/token/blacklist/', data={'refresh': token.get_full_jwt()})

    assert response.status_code == status.HTTP_404_NOT_FOUND


@mock_feature_flag(flag_name='fflag__feature_develop__prompts__dia_1829_jwt_token_auth', value=True)
@pytest.mark.django_db
def test_blacklist_view_returns_204_with_valid_token(client):
    user = create_user_with_token_settings(api_tokens_enabled=True, legacy_api_tokens_enabled=False)
    client.force_login(user)

    token = LSAPIToken()
    response = client.post('/api/token/blacklist/', data={'refresh': token.get_full_jwt()})

    assert response.status_code == status.HTTP_204_NO_CONTENT
    with pytest.raises(TokenError):
        token.check_blacklist()


@mock_feature_flag(flag_name='fflag__feature_develop__prompts__dia_1829_jwt_token_auth', value=True)
@pytest.mark.django_db
def test_create_token_when_no_existing_token():
    user = create_user_with_token_settings(api_tokens_enabled=True, legacy_api_tokens_enabled=False)
    client = APIClient()
    refresh = LSAPIToken()
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')
    client.force_authenticate(user)

    response = client.post('/api/token/')

    assert response.status_code == status.HTTP_201_CREATED
    assert 'token' in response.data


@mock_feature_flag(flag_name='fflag__feature_develop__prompts__dia_1829_jwt_token_auth', value=True)
@pytest.mark.django_db
def test_create_token_when_existing_valid_token():
    user = create_user_with_token_settings(api_tokens_enabled=True, legacy_api_tokens_enabled=False)
    client = APIClient()
    refresh = LSAPIToken()
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')
    client.force_authenticate(user)

    # 1. Create first token
    response = client.post('/api/token/')
    assert response.status_code == status.HTTP_201_CREATED

    # 2. Try to create second token
    response = client.post('/api/token/')
    assert response.status_code == status.HTTP_409_CONFLICT
    assert 'detail' in response.data
    assert 'You already have a valid token' in response.data['detail']


@mock_feature_flag(flag_name='fflag__feature_develop__prompts__dia_1829_jwt_token_auth', value=True)
@pytest.mark.django_db
def test_create_token_after_blacklisting_previous():
    user = create_user_with_token_settings(api_tokens_enabled=True, legacy_api_tokens_enabled=False)
    client = APIClient()
    refresh = LSAPIToken()
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')
    client.force_authenticate(user)

    # 1. Create first token
    response = client.post('/api/token/')
    assert response.status_code == status.HTTP_201_CREATED

    # 2. Blacklist the token
    token = response.data['token']
    response = client.post('/api/token/blacklist/', data={'refresh': token})
    assert response.status_code == status.HTTP_204_NO_CONTENT

    # 3. Create new token
    response = client.post('/api/token/')
    assert response.status_code == status.HTTP_201_CREATED
    assert 'token' in response.data


@mock_feature_flag(flag_name='fflag__feature_develop__prompts__dia_1829_jwt_token_auth', value=True)
@pytest.mark.django_db
def test_rotate_token_success():
    user = create_user_with_token_settings(api_tokens_enabled=True, legacy_api_tokens_enabled=False)
    client = APIClient()
    refresh = LSAPIToken()
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')
    client.force_authenticate(user)

    # 1. Create first token
    response = client.post('/api/token/')
    assert response.status_code == status.HTTP_201_CREATED

    # 2. Rotate the token
    token = response.data['token']
    response2 = client.post('/api/token/rotate/', data={'refresh': token}, format='json')
    assert response2.status_code == status.HTTP_200_OK
    assert 'refresh' in response2.data

    # 3. The old refresh token should now be invalid
    response3 = client.post('/api/token/rotate/', data={'refresh': token}, format='json')
    assert response3.status_code == status.HTTP_400_BAD_REQUEST
    assert 'detail' in response3.data or 'non_field_errors' in response3.data

    # 4. The new refresh token should work for another rotation
    new_token = response2.data['refresh']
    response4 = client.post('/api/token/rotate/', data={'refresh': new_token}, format='json')
    assert response4.status_code == status.HTTP_200_OK
    assert 'refresh' in response4.data


@mock_feature_flag(flag_name='fflag__feature_develop__prompts__dia_1829_jwt_token_auth', value=True)
@pytest.mark.django_db
def test_rotate_token_requires_authentication():
    user = create_user_with_token_settings(api_tokens_enabled=True, legacy_api_tokens_enabled=False)
    refresh = LSAPIToken.for_user(user)
    refresh_token = refresh.get_full_jwt()

    client = APIClient()
    # No credentials set
    response = client.post('/api/token/rotate/', data={'refresh': refresh_token}, format='json')
    assert response.status_code in (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN)
