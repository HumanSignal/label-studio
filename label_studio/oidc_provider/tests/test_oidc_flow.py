"""
Server-side OIDC flow integration tests with mocked IdP HTTP endpoints.

Unlike the tests in test_integration.py that patch auth.authenticate entirely,
these tests exercise mozilla-django-oidc's own JWT verification pipeline:

  1. GET /oidc/authenticate/ runs for real — the library generates state + nonce
     and stores them in the session.
  2. Token endpoint (mocked): returns a properly RS256-signed ID token that
     contains the captured nonce.
  3. JWKS endpoint (mocked): returns the corresponding RSA public key so the
     library can cryptographically verify the JWT signature.
  4. Userinfo endpoint (mocked): returns the claims used for user lookup/creation.

All HTTP calls to the IdP are intercepted by requests-mock (already in the
project's test deps). No real network access is needed.
"""

import base64
import json
import time

import josepy
import pytest
from django.conf import settings as django_settings
from django.contrib.auth import get_user_model
from josepy.jwk import JWK
from josepy.jws import JWS
from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives.asymmetric import rsa
from organizations.models import Organization
from users.tests.factories import UserFactory

from .test_integration import _set_session

User = get_user_model()

KID = 'test-rsa-key-1'
CLIENT_ID = 'test-client-id'
ISSUER = 'https://idp.example.com'


# ── Key pair fixture ──────────────────────────────────────────────────────────

@pytest.fixture(scope='module')
def rsa_private_key():
    """RSA-2048 key pair for signing test ID tokens. Module-scoped — generated once."""
    return rsa.generate_private_key(
        public_exponent=65537, key_size=2048, backend=default_backend()
    )


# ── JWT / JWKS helpers ────────────────────────────────────────────────────────

def _b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b'=').decode()


def make_id_token(private_key, claims: dict) -> str:
    """Return a compact RS256-signed JWT containing *claims*."""
    priv_jwk = josepy.JWKRSA(key=private_key)
    payload = json.dumps(claims).encode()
    jws = JWS.sign(
        payload=payload,
        key=priv_jwk,
        alg=josepy.RS256,
        include_jwk=False,
        protect=frozenset(['alg', 'kid']),
        kid=KID,
    )
    compact = jws.to_compact()
    return compact.decode() if isinstance(compact, bytes) else compact


def make_jwks(private_key) -> dict:
    """Return a JWKS dict containing the public key for *private_key*."""
    pub = private_key.public_key().public_numbers()
    byte_len = lambda n: (n.bit_length() + 7) // 8
    return {
        'keys': [{
            'kty': 'RSA',
            'use': 'sig',
            'alg': 'RS256',
            'kid': KID,
            'n': _b64url(pub.n.to_bytes(byte_len(pub.n), 'big')),
            'e': _b64url(pub.e.to_bytes(byte_len(pub.e), 'big')),
        }]
    }


# ── Shared helpers ────────────────────────────────────────────────────────────

def _initiate_flow(client):
    """
    GET /oidc/authenticate/ and return (state, nonce, oidc_states).

    The library generates state + nonce, stores them in session['oidc_states'],
    and redirects to the IdP. We don't follow that external redirect — we just
    capture the session data for use in the callback.
    """
    response = client.get('/oidc/authenticate/')
    assert response.status_code == 302, response.content
    assert 'idp.example.com' in response['Location']

    oidc_states = client.session['oidc_states']
    state = next(iter(oidc_states))
    nonce = oidc_states[state]['nonce']
    return state, nonce, oidc_states


def _base_claims(nonce: str, email: str = 'flow-test@example.com') -> dict:
    now = int(time.time())
    return {
        'iss': ISSUER,
        'sub': f'oidc|{email}',
        'aud': CLIENT_ID,
        'iat': now,
        'exp': now + 3600,
        'nonce': nonce,
        'email': email,
        'email_verified': True,
        'given_name': 'Flow',
        'family_name': 'Test',
    }


def _mock_idp(requests_mock, private_key, id_token: str, userinfo: dict):
    """Register requests-mock handlers for all three IdP endpoints."""
    requests_mock.get(f'{ISSUER}/jwks', json=make_jwks(private_key))
    requests_mock.post(f'{ISSUER}/token', json={
        'access_token': 'test-access-token',
        'id_token': id_token,
        'token_type': 'Bearer',
        'expires_in': 3600,
    })
    requests_mock.get(f'{ISSUER}/userinfo', json=userinfo)


# ── Tests ─────────────────────────────────────────────────────────────────────

@pytest.mark.django_db
def test_happy_path_new_user(oidc_enabled, client, requests_mock, rsa_private_key):
    """Full OIDC flow: new user is created, JWT signature is verified for real."""
    owner = UserFactory()
    Organization.create_organization(created_by=owner, title='Test Org')

    state, nonce, oidc_states = _initiate_flow(client)

    email = 'new-oidc@example.com'
    claims = _base_claims(nonce, email)
    id_token = make_id_token(rsa_private_key, claims)
    _mock_idp(requests_mock, rsa_private_key, id_token, {**claims})

    _set_session(client, {'oidc_states': oidc_states})
    response = client.get('/oidc/callback/', {'code': 'auth-code', 'state': state})

    assert response.status_code == 302, response.content
    assert response['Location'] == '/'
    assert '_auth_user_id' in client.session

    user = User.objects.get(email=email)
    assert user.first_name == 'Flow'
    assert user.last_name == 'Test'
    assert user.active_organization is not None
    assert client.session.get('last_login') is not None


@pytest.mark.django_db
def test_happy_path_existing_user(oidc_enabled, client, requests_mock, rsa_private_key):
    """Existing local user with matching email is logged in — no duplicate row created."""
    owner = UserFactory()
    org = Organization.create_organization(created_by=owner, title='Test Org')
    existing = UserFactory(email='existing@example.com', active_organization=org)

    state, nonce, oidc_states = _initiate_flow(client)

    claims = _base_claims(nonce, 'existing@example.com')
    id_token = make_id_token(rsa_private_key, claims)
    _mock_idp(requests_mock, rsa_private_key, id_token, {**claims})

    _set_session(client, {'oidc_states': oidc_states})
    client.get('/oidc/callback/', {'code': 'auth-code', 'state': state})

    assert User.objects.filter(email='existing@example.com').count() == 1
    assert str(existing.pk) == client.session.get('_auth_user_id')


@pytest.mark.django_db
def test_tampered_jwt_payload_is_rejected(oidc_enabled, client, requests_mock, rsa_private_key):
    """
    A JWT whose payload has been modified after signing must fail signature
    verification. The user must NOT be logged in.
    """
    state, nonce, oidc_states = _initiate_flow(client)

    claims = _base_claims(nonce)
    id_token = make_id_token(rsa_private_key, claims)

    # Replace the payload segment with different claims (signature no longer valid)
    header_b64, _, sig_b64 = id_token.split('.')
    tampered_claims = {**claims, 'email': 'attacker@evil.com', 'sub': 'oidc|attacker'}
    tampered_payload = _b64url(json.dumps(tampered_claims).encode())
    tampered_token = f'{header_b64}.{tampered_payload}.{sig_b64}'

    requests_mock.get(f'{ISSUER}/jwks', json=make_jwks(rsa_private_key))
    requests_mock.post(f'{ISSUER}/token', json={
        'access_token': 'test-access-token',
        'id_token': tampered_token,
        'token_type': 'Bearer',
        'expires_in': 3600,
    })

    _set_session(client, {'oidc_states': oidc_states})
    response = client.get('/oidc/callback/', {'code': 'auth-code', 'state': state})

    assert '_auth_user_id' not in client.session
    assert User.objects.filter(email='attacker@evil.com').count() == 0


@pytest.mark.django_db
def test_wrong_nonce_in_jwt_is_rejected(oidc_enabled, client, requests_mock, rsa_private_key):
    """JWT with a nonce that does not match the session nonce must be rejected."""
    state, nonce, oidc_states = _initiate_flow(client)

    claims = {**_base_claims(nonce), 'nonce': 'completely-wrong-nonce'}
    id_token = make_id_token(rsa_private_key, claims)
    _mock_idp(requests_mock, rsa_private_key, id_token, claims)

    _set_session(client, {'oidc_states': oidc_states})
    response = client.get('/oidc/callback/', {'code': 'auth-code', 'state': state})

    assert '_auth_user_id' not in client.session


@pytest.mark.django_db
def test_unverified_email_in_userinfo_is_rejected(oidc_enabled, client, requests_mock, rsa_private_key):
    """
    Userinfo with email_verified=false must be rejected by our verify_claims override.
    Note: exp/aud validation is not performed by mozilla-django-oidc — verify_claims
    receives the userinfo endpoint response, not the raw ID token payload.
    """
    state, nonce, oidc_states = _initiate_flow(client)

    claims = _base_claims(nonce)
    id_token = make_id_token(rsa_private_key, claims)

    # Userinfo says email is not verified
    unverified_userinfo = {**claims, 'email_verified': False}
    _mock_idp(requests_mock, rsa_private_key, id_token, unverified_userinfo)

    _set_session(client, {'oidc_states': oidc_states})
    response = client.get('/oidc/callback/', {'code': 'auth-code', 'state': state})

    assert '_auth_user_id' not in client.session


@pytest.mark.django_db
def test_missing_email_in_userinfo_is_rejected(oidc_enabled, client, requests_mock, rsa_private_key):
    """Userinfo without an email address must be rejected (library's base verify_claims)."""
    state, nonce, oidc_states = _initiate_flow(client)

    claims = _base_claims(nonce)
    id_token = make_id_token(rsa_private_key, claims)

    # Userinfo omits email entirely
    no_email_userinfo = {k: v for k, v in claims.items() if k != 'email'}
    _mock_idp(requests_mock, rsa_private_key, id_token, no_email_userinfo)

    _set_session(client, {'oidc_states': oidc_states})
    response = client.get('/oidc/callback/', {'code': 'auth-code', 'state': state})

    assert '_auth_user_id' not in client.session


@pytest.mark.django_db
def test_wrong_signing_key_is_rejected(oidc_enabled, client, requests_mock, rsa_private_key):
    """
    JWT signed with a different private key than what the JWKS advertises must
    fail signature verification.
    """
    state, nonce, oidc_states = _initiate_flow(client)

    # Sign with a completely different key
    impostor_key = rsa.generate_private_key(65537, 2048, default_backend())
    claims = _base_claims(nonce)
    id_token = make_id_token(impostor_key, claims)

    # JWKS still advertises the original public key
    requests_mock.get(f'{ISSUER}/jwks', json=make_jwks(rsa_private_key))
    requests_mock.post(f'{ISSUER}/token', json={
        'access_token': 'test-access-token',
        'id_token': id_token,
        'token_type': 'Bearer',
        'expires_in': 3600,
    })

    _set_session(client, {'oidc_states': oidc_states})
    response = client.get('/oidc/callback/', {'code': 'auth-code', 'state': state})

    assert '_auth_user_id' not in client.session
