from unittest.mock import patch

import pytest
from django.conf import settings as django_settings
from django.contrib.auth import get_user_model
from organizations.models import Organization
from users.tests.factories import UserFactory

User = get_user_model()

# The callback view reads session['oidc_states'][state] = {'nonce': ..., 'code_verifier': ...}
FAKE_STATE = 'test-state-abc123'
FAKE_SESSION_STATES = {FAKE_STATE: {'nonce': 'fake-nonce', 'code_verifier': None}}


def _set_session(client, data):
    """Write data into the test client's session and propagate the session cookie."""
    session = client.session
    for key, value in data.items():
        session[key] = value
    session.save()
    # Explicitly update the session cookie so the next request picks up the saved data.
    # Required for DB-backed sessions where the cookie holds only the session key.
    client.cookies[django_settings.SESSION_COOKIE_NAME] = session.session_key


@pytest.mark.django_db
def test_authenticate_endpoint_redirects_to_idp(oidc_enabled, client):
    """GET /oidc/authenticate/ should redirect to the IdP authorization endpoint."""
    response = client.get('/oidc/authenticate/')
    assert response.status_code == 302
    assert 'idp.example.com' in response['Location']


@pytest.mark.django_db
def test_callback_creates_user_and_logs_in(oidc_enabled, client, oidc_claims):
    """
    Simulate the callback: the state is in the session, auth.authenticate returns a user.
    The user should be created (by the backend) and logged in.
    """
    owner = UserFactory()
    Organization.create_organization(created_by=owner, title='Test Org')
    user = UserFactory(email='test@example.com')

    _set_session(client, {'oidc_states': FAKE_SESSION_STATES})

    # auth.authenticate normally stamps user.backend; replicate that for the mock
    user.backend = 'oidc_provider.auth.LabelStudioOIDCBackend'
    with patch('django.contrib.auth.authenticate', return_value=user):
        response = client.get('/oidc/callback/', {'code': 'test-code', 'state': FAKE_STATE})

    assert response.status_code == 302
    assert response['Location'] == '/'
    assert '_auth_user_id' in client.session


@pytest.mark.django_db
def test_callback_logs_in_existing_user(oidc_enabled, client, oidc_claims):
    """An existing local user should be logged in without creating a duplicate row."""
    owner = UserFactory()
    org = Organization.create_organization(created_by=owner, title='Existing Org')
    existing = UserFactory(email='test@example.com', active_organization=org)

    _set_session(client, {'oidc_states': FAKE_SESSION_STATES})

    existing.backend = 'oidc_provider.auth.LabelStudioOIDCBackend'
    with patch('django.contrib.auth.authenticate', return_value=existing):
        response = client.get('/oidc/callback/', {'code': 'test-code', 'state': FAKE_STATE})

    assert response.status_code == 302
    assert User.objects.filter(email='test@example.com').count() == 1
    assert str(existing.pk) == client.session.get('_auth_user_id')


@pytest.mark.django_db
def test_callback_with_invalid_state_fails(oidc_enabled, client):
    """A callback with a mismatched state should not log the user in."""
    _set_session(client, {'oidc_states': FAKE_SESSION_STATES})
    response = client.get('/oidc/callback/', {'code': 'test-code', 'state': 'wrong-state'})
    assert '_auth_user_id' not in client.session


@pytest.mark.django_db
def test_callback_with_no_session_state_fails(oidc_enabled, client):
    """A callback with no oidc_states in session should fail gracefully."""
    response = client.get('/oidc/callback/', {'code': 'test-code', 'state': FAKE_STATE})
    assert '_auth_user_id' not in client.session
