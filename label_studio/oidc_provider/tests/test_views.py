import time
from unittest.mock import patch

import pytest
from django.test import RequestFactory
from organizations.models import Organization
from users.tests.factories import UserFactory

from oidc_provider.views import LabelStudioOIDCCallbackView


@pytest.mark.django_db
def test_login_success_sets_last_login_in_session(oidc_enabled, client):
    user = UserFactory()
    client.force_login(user)
    request = RequestFactory().get('/oidc/callback/')
    request.session = client.session
    request.user = user

    view = LabelStudioOIDCCallbackView()
    view.request = request
    view.user = user  # set by dispatch in normal flow

    before = time.time()
    with patch('mozilla_django_oidc.views.OIDCAuthenticationCallbackView.login_success', return_value=None):
        view.login_success()
    after = time.time()

    assert 'last_login' in request.session
    assert before <= request.session['last_login'] <= after


@pytest.mark.django_db
def test_login_success_assigns_org_when_missing(oidc_enabled, client):
    owner = UserFactory()
    org = Organization.create_organization(created_by=owner, title='Test Org')
    user = UserFactory(active_organization=None)
    client.force_login(user)

    request = RequestFactory().get('/oidc/callback/')
    request.session = client.session
    request.user = user

    view = LabelStudioOIDCCallbackView()
    view.request = request
    view.user = user

    with patch('mozilla_django_oidc.views.OIDCAuthenticationCallbackView.login_success', return_value=None):
        view.login_success()

    user.refresh_from_db()
    assert user.active_organization == org


@pytest.mark.django_db
def test_login_failure_redirects_to_login_with_error_param(oidc_enabled, client, settings):
    settings.LOGIN_URL = '/user/login/'
    request = RequestFactory().get('/oidc/callback/')
    request.session = client.session

    view = LabelStudioOIDCCallbackView()
    view.request = request
    response = view.login_failure()

    assert response.status_code == 302
    assert response['Location'] == '/user/login/?oidc_error=1'
