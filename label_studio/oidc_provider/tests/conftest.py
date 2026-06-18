import sys

import pytest
from django.urls import clear_url_caches


FAKE_CLAIMS = {
    'sub': 'oidc|abc123',
    'email': 'test@example.com',
    'given_name': 'Test',
    'family_name': 'User',
    'email_verified': True,
}

ROOT_URL_MODULE = 'core.urls'


def _flush_urlconf():
    """Clear Django's resolver cache AND the Python module cache for the URL conf.

    clear_url_caches() alone only removes Django's URLResolver cache. The URL conf
    module itself stays in sys.modules with its already-evaluated urlpatterns list.
    Deleting it forces a full re-import on the next request, so the `if OIDC_ENABLED`
    branch in core/urls.py is re-evaluated against current settings.
    """
    clear_url_caches()
    if ROOT_URL_MODULE in sys.modules:
        del sys.modules[ROOT_URL_MODULE]


@pytest.fixture
def oidc_enabled(settings):
    settings.OIDC_ENABLED = True
    settings.SESSION_ENGINE = 'django.contrib.sessions.backends.db'
    settings.OIDC_RP_CLIENT_ID = 'test-client-id'
    settings.OIDC_RP_CLIENT_SECRET = 'test-client-secret'
    settings.OIDC_RP_SIGN_ALGO = 'RS256'
    settings.OIDC_RP_SCOPES = 'openid email profile'
    settings.OIDC_OP_DISCOVERY_ENDPOINT = 'https://idp.example.com/.well-known/openid-configuration'
    settings.OIDC_OP_AUTHORIZATION_ENDPOINT = 'https://idp.example.com/authorize'
    settings.OIDC_OP_TOKEN_ENDPOINT = 'https://idp.example.com/token'
    settings.OIDC_OP_USER_ENDPOINT = 'https://idp.example.com/userinfo'
    settings.OIDC_OP_JWKS_ENDPOINT = 'https://idp.example.com/jwks'
    settings.OIDC_VERIFY_SSL = False
    settings.OIDC_STORE_ID_TOKEN = False
    settings.OIDC_DISABLE_LOCAL_AUTH = False
    settings.OIDC_PROVIDER_NAME = 'SSO'
    settings.LOGIN_REDIRECT_URL = '/'
    settings.LOGIN_REDIRECT_URL_FAILURE = '/user/login/'
    settings.AUTHENTICATION_BACKENDS = [
        'oidc_provider.auth.LabelStudioOIDCBackend',
        'django.contrib.auth.backends.ModelBackend',
    ]
    # Force URL conf re-import now that OIDC_ENABLED=True, so our OIDC routes are registered.
    # Trigger ROOT_URLCONF signal (clears Django's resolver cache) then clear sys.modules entry.
    settings.ROOT_URLCONF = settings.ROOT_URLCONF
    _flush_urlconf()

    yield

    # On teardown, flush again so the restored settings take effect for subsequent tests.
    _flush_urlconf()


@pytest.fixture
def oidc_claims():
    return FAKE_CLAIMS.copy()
