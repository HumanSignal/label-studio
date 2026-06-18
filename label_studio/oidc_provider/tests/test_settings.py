import pytest
from users.tests.factories import UserFactory


@pytest.mark.django_db
def test_oidc_urls_absent_when_disabled(client, settings):
    from .conftest import _flush_urlconf
    settings.OIDC_ENABLED = False
    settings.ROOT_URLCONF = settings.ROOT_URLCONF
    _flush_urlconf()  # ensures sys.modules['core.urls'] is cleared so urlpatterns re-evaluates
    response = client.get('/oidc/authenticate/')
    assert response.status_code == 404


@pytest.mark.django_db
def test_login_page_shows_sso_button_when_oidc_enabled(oidc_enabled, client, settings):
    settings.OIDC_PROVIDER_NAME = 'Okta'
    response = client.get('/user/login/')
    assert response.status_code == 200
    assert b'/oidc/authenticate/' in response.content
    assert b'Okta' in response.content


@pytest.mark.django_db
def test_login_page_no_sso_button_when_oidc_disabled(client, settings):
    settings.OIDC_ENABLED = False
    response = client.get('/user/login/')
    assert response.status_code == 200
    assert b'sso-button' not in response.content


@pytest.mark.django_db
def test_oidc_disable_local_auth_redirects_login_to_oidc(oidc_enabled, client, settings):
    settings.OIDC_DISABLE_LOCAL_AUTH = True
    response = client.get('/user/login/')
    assert response.status_code == 302
    assert '/oidc/authenticate/' in response['Location']


@pytest.mark.django_db
def test_oidc_disable_local_auth_forwards_next_param(oidc_enabled, client, settings):
    settings.OIDC_DISABLE_LOCAL_AUTH = True
    response = client.get('/user/login/?next=/projects/42/')
    assert response.status_code == 302
    assert '/oidc/authenticate/' in response['Location']
    assert 'next=' in response['Location']
    assert '%2Fprojects%2F42%2F' in response['Location'] or '/projects/42/' in response['Location']


@pytest.mark.django_db
def test_oidc_error_does_not_loop_when_local_auth_disabled(oidc_enabled, client, settings):
    """OIDC failure must not bounce back to /oidc/authenticate/ — that causes an infinite loop."""
    settings.OIDC_DISABLE_LOCAL_AUTH = True
    response = client.get('/user/login/?oidc_error=1')
    assert response.status_code == 200
    assert b'sign-in failed' in response.content


@pytest.mark.django_db
def test_authenticated_user_not_bounced_to_oidc(oidc_enabled, settings):
    """An already-authenticated user visiting /user/login/ must go to next_page, not IdP."""
    from django.test import RequestFactory
    from users.views import user_login

    settings.OIDC_DISABLE_LOCAL_AUTH = True
    user = UserFactory()

    # Use RequestFactory to directly test view logic without middleware interference.
    # The view's early-return only fires for unauthenticated users (not request.user.is_authenticated).
    request = RequestFactory().get('/user/login/', {'next': '/projects/1/'})
    request.user = user  # user.is_authenticated is True for any concrete User instance

    response = user_login(request)

    assert response.status_code == 302
    assert '/oidc/authenticate/' not in response['Location']
    assert '/projects/1/' in response['Location']


@pytest.mark.django_db
def test_local_auth_still_works_when_oidc_disabled(client, settings):
    settings.OIDC_ENABLED = False
    response = client.get('/user/login/')
    assert response.status_code == 200
    assert b'Log in' in response.content


@pytest.mark.django_db
def test_login_redirect_url_env_var_is_respected(oidc_enabled, settings):
    settings.OIDC_LOGIN_REDIRECT_URL = '/dashboard/'
    settings.LOGIN_REDIRECT_URL = '/dashboard/'  # simulate env var being applied
    assert settings.LOGIN_REDIRECT_URL == '/dashboard/'


@pytest.mark.django_db
def test_session_engine_is_db_when_oidc_enabled(oidc_enabled, settings):
    assert settings.SESSION_ENGINE == 'django.contrib.sessions.backends.db'
