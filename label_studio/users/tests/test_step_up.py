"""Step-up authentication: a cookie session needs a fresh proof of identity to obtain a credential."""

import time

import pytest
from django.conf import settings
from django.contrib.sessions.backends.signed_cookies import SessionStore
from django.test import Client
from organizations.tests.factories import OrganizationFactory
from rest_framework.authtoken.models import Token
from users.step_up import SESSION_KEY
from users.tests.factories import UserFactory

PASSWORD = 'step-up-password'

GATED_REQUESTS = [
    ('get', '/api/current-user/token', None),
    ('post', '/api/current-user/reset-token/', {}),
    ('post', '/api/jwt/settings', {'api_tokens_enabled': True, 'legacy_api_tokens_enabled': True}),
    ('post', '/api/token/', {}),
]


@pytest.fixture
def owner():
    user = UserFactory()
    user.set_password(PASSWORD)
    user.save()
    organization = OrganizationFactory(created_by=user)
    user.active_organization = organization
    user.save(update_fields=['active_organization'])
    return user


def _session(user, verified_seconds_ago=None):
    client = Client()
    client.force_login(user)
    session = client.session
    # Set by users.functions.login on a real sign-in; SessionTimeoutMiddleware signs out sessions without it
    session['last_login'] = time.time()
    if verified_seconds_ago is not None:
        session[SESSION_KEY] = int(time.time()) - verified_seconds_ago
    session.save()
    client.cookies[settings.SESSION_COOKIE_NAME] = session.session_key
    return client


def _send(client, method, url, data, **headers):
    if data is None:
        return getattr(client, method)(url, **headers)
    return getattr(client, method)(url, data, content_type='application/json', **headers)


@pytest.mark.django_db
@pytest.mark.parametrize('method,url,data', GATED_REQUESTS)
def test_stale_session_gets_a_password_challenge(owner, method, url, data):
    response = _send(_session(owner, verified_seconds_ago=3600), method, url, data)

    assert response.status_code == 403
    body = response.json()
    assert body['detail'] == 'Confirm your identity to continue.'
    assert body['display_context']['step_up'] == {
        'method': 'password',
        'reauthenticate_url': '/user/reauthenticate/',
    }


@pytest.mark.django_db
@pytest.mark.parametrize('method,url,data', GATED_REQUESTS)
def test_recent_sign_in_unlocks_the_action(owner, method, url, data):
    response = _send(_session(owner), method, url, data)

    assert response.status_code in (200, 201), response.content


@pytest.mark.django_db
def test_password_confirmation_unlocks_the_session(owner):
    client = _session(owner, verified_seconds_ago=3600)

    wrong = client.post('/api/current-user/step-up', {'current_password': 'nope'}, content_type='application/json')
    assert wrong.status_code == 400
    assert client.get('/api/current-user/token').status_code == 403

    right = client.post('/api/current-user/step-up', {'current_password': PASSWORD}, content_type='application/json')
    assert right.status_code == 204
    response = client.get('/api/current-user/token')
    assert response.status_code == 200
    assert response.json()['token'] == Token.objects.get(user=owner).key


@pytest.mark.django_db
def test_token_authenticated_requests_are_not_challenged(owner):
    jwt = owner.active_organization.jwt
    jwt.legacy_api_tokens_enabled = True
    jwt.save()
    client = Client()
    auth = {'HTTP_AUTHORIZATION': f'Token {Token.objects.get(user=owner).key}'}

    assert client.get('/api/current-user/token', **auth).status_code == 200
    response = client.post(
        '/api/jwt/settings',
        {'api_tokens_enabled': True, 'legacy_api_tokens_enabled': True},
        content_type='application/json',
        **auth,
    )
    assert response.status_code == 200


@pytest.mark.django_db
def test_token_clients_cannot_open_a_step_up_window(owner):
    jwt = owner.active_organization.jwt
    jwt.legacy_api_tokens_enabled = True
    jwt.save()
    response = Client().post(
        '/api/current-user/step-up',
        {'current_password': PASSWORD},
        content_type='application/json',
        HTTP_AUTHORIZATION=f'Token {Token.objects.get(user=owner).key}',
    )

    assert response.status_code == 400
    cookie = response.cookies.get(settings.SESSION_COOKIE_NAME)
    assert cookie is None or SESSION_KEY not in SessionStore(session_key=cookie.value).load()


@pytest.mark.django_db
def test_user_without_password_must_sign_in_again(owner):
    owner.set_unusable_password()
    owner.save()
    client = _session(owner, verified_seconds_ago=3600)

    response = client.get('/api/current-user/token')
    assert response.status_code == 403
    assert response.json()['display_context']['step_up']['method'] == 'reauthenticate'

    confirm = client.post('/api/current-user/step-up', {'current_password': ''}, content_type='application/json')
    assert confirm.status_code == 403


@pytest.mark.django_db
@pytest.mark.parametrize(
    'next_url,expected',
    [
        ('/projects/?page=2', '/user/login/?next=/projects/%3Fpage%3D2'),
        ('https://evil.example/', '/user/login/?next=/'),
    ],
)
def test_reauthenticate_signs_out_and_keeps_a_safe_next(owner, next_url, expected):
    client = _session(owner)

    response = client.get('/user/reauthenticate/', {'next': next_url})

    assert response.status_code == 302
    assert response['Location'] == expected
    assert client.get('/api/current-user/whoami').status_code == 401


@pytest.mark.django_db
def test_account_page_does_not_render_the_api_token(owner):
    response = _session(owner).get('/user/account/')

    assert response.status_code == 200
    assert Token.objects.get(user=owner).key not in response.content.decode()
