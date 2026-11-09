import base64
import json
import time
import uuid

import pytest
from jwt_auth.models import LSAPIToken
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken, OutstandingToken
from tests.jwt_auth.utils import create_user_with_token_settings
from tests.utils import mock_feature_flag
from users.models import User


@mock_feature_flag(flag_name='fflag__feature_develop__prompts__dia_1829_jwt_token_auth', value=True)
@pytest.mark.django_db
def test_blacklist_view_returns_404_with_already_blacklisted_token():
    user = create_user_with_token_settings(api_tokens_enabled=True, legacy_api_tokens_enabled=False)
    client = APIClient()
    client.force_authenticate(user)

    token = LSAPIToken.for_user(user)
    token.blacklist()
    response = client.post('/api/token/blacklist/', data={'refresh': token.get_full_jwt()}, format='json')

    assert response.status_code == status.HTTP_404_NOT_FOUND


@mock_feature_flag(flag_name='fflag__feature_develop__prompts__dia_1829_jwt_token_auth', value=True)
@pytest.mark.django_db
def test_blacklist_view_returns_204_with_valid_token():
    user = create_user_with_token_settings(api_tokens_enabled=True, legacy_api_tokens_enabled=False)
    client = APIClient()
    client.force_authenticate(user)

    token = LSAPIToken.for_user(user)
    response = client.post('/api/token/blacklist/', data={'refresh': token.get_full_jwt()}, format='json')

    assert response.status_code == status.HTTP_204_NO_CONTENT
    with pytest.raises(TokenError):
        token.check_blacklist()


@mock_feature_flag(flag_name='fflag__feature_develop__prompts__dia_1829_jwt_token_auth', value=True)
@pytest.mark.django_db
def test_blacklist_view_accepts_truncated_token_of_current_user():
    user = create_user_with_token_settings(api_tokens_enabled=True, legacy_api_tokens_enabled=False)
    client = APIClient()
    client.force_authenticate(user)

    token = LSAPIToken.for_user(user)
    # The UI only has the truncated (header.payload) token from the token list
    response = client.post('/api/token/blacklist/', data={'refresh': str(token)}, format='json')

    assert response.status_code == status.HTTP_204_NO_CONTENT
    with pytest.raises(TokenError):
        token.check_blacklist()


@mock_feature_flag(flag_name='fflag__feature_develop__prompts__dia_1829_jwt_token_auth', value=True)
@pytest.mark.django_db
def test_blacklist_view_requires_authentication():
    user = create_user_with_token_settings(api_tokens_enabled=True, legacy_api_tokens_enabled=False)
    token = LSAPIToken.for_user(user)

    response = APIClient().post('/api/token/blacklist/', data={'refresh': token.get_full_jwt()}, format='json')

    assert response.status_code in (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN)
    token.check_blacklist()


@mock_feature_flag(flag_name='fflag__feature_develop__prompts__dia_1829_jwt_token_auth', value=True)
@pytest.mark.django_db
def test_blacklist_view_rejects_token_of_another_user():
    user = create_user_with_token_settings(api_tokens_enabled=True, legacy_api_tokens_enabled=False)
    other_user = User.objects.create(email='other_token_owner@example.com')
    client = APIClient()
    client.force_authenticate(user)

    other_token = LSAPIToken.for_user(other_user)
    response = client.post('/api/token/blacklist/', data={'refresh': other_token.get_full_jwt()}, format='json')

    assert response.status_code == status.HTTP_404_NOT_FOUND
    other_token.check_blacklist()


@mock_feature_flag(flag_name='fflag__feature_develop__prompts__dia_1829_jwt_token_auth', value=True)
@pytest.mark.django_db
def test_blacklist_view_rejects_forged_unsigned_token():
    user = create_user_with_token_settings(api_tokens_enabled=True, legacy_api_tokens_enabled=False)
    victim = User.objects.create(email='forged_token_victim@example.com')
    client = APIClient()
    client.force_authenticate(user)

    def b64(data: dict) -> str:
        return base64.urlsafe_b64encode(json.dumps(data).encode()).rstrip(b'=').decode()

    jti = uuid.uuid4().hex
    payload = {'token_type': 'refresh', 'exp': int(time.time()) + 3600, 'jti': jti, 'user_id': victim.id}
    forged = f'{b64({"alg": "HS256", "typ": "JWT"})}.{b64(payload)}'

    response = client.post('/api/token/blacklist/', data={'refresh': forged}, format='json')

    assert response.status_code == status.HTTP_404_NOT_FOUND
    assert not OutstandingToken.objects.filter(jti=jti).exists()
    assert not BlacklistedToken.objects.filter(token__jti=jti).exists()


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
