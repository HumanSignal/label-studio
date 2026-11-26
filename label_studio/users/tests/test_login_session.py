"""Signing in must leave ``session['last_login']`` set, or the session timeout logs the user straight out."""

import time

import pytest
from core.middleware import InactivitySessionTimeoutMiddleWare
from django.contrib.auth import SESSION_KEY
from django.contrib.sessions.backends.signed_cookies import SessionStore
from django.http import HttpResponse
from django.test import RequestFactory
from users.functions import login
from users.tests.factories import UserFactory


def _request_signed_in_as(user):
    request = RequestFactory().get('/')
    request.session = SessionStore()
    login(request, user, backend='django.contrib.auth.backends.ModelBackend')
    return request


@pytest.mark.django_db
def test_login_stamps_last_login_on_a_fresh_session():
    request = RequestFactory().get('/')
    request.session = SessionStore()

    login(request, UserFactory(), backend='django.contrib.auth.backends.ModelBackend')

    assert time.time() - request.session['last_login'] < 60


@pytest.mark.django_db
def test_login_stamps_last_login_when_another_user_is_still_signed_in():
    """Django flushes a session that belongs to another user, which erases anything set before it."""
    request = _request_signed_in_as(UserFactory())
    request.session['last_login'] = 0

    login(request, UserFactory(), backend='django.contrib.auth.backends.ModelBackend')

    assert time.time() - request.session['last_login'] < 60


@pytest.mark.django_db
def test_session_timeout_keeps_a_user_who_signed_in_over_another_users_session():
    request = _request_signed_in_as(UserFactory())
    user = UserFactory()
    login(request, user, backend='django.contrib.auth.backends.ModelBackend')
    request.user = user

    InactivitySessionTimeoutMiddleWare(lambda r: HttpResponse()).process_request(request)

    assert request.session.get(SESSION_KEY) == str(user.pk)
