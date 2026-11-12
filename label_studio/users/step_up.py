"""Step-up authentication for actions that turn a browser session into a credential or a privilege.

A cookie session alone does not show that the person at the keyboard asked for the action: a
script running in the page sends the same cookie. So a request on a cookie session to one of these
endpoints must come within ``STEP_UP_MAX_AGE_SECONDS`` of a fresh proof of identity recorded in the
session, either a sign-in (password, SSO, LDAP) or a password confirmation at
``POST /api/current-user/step-up``. Otherwise it gets a 403 ``step_up_required`` whose
``display_context.step_up`` tells the client how to prove identity:

* ``password``: confirm the password at ``POST /api/current-user/step-up``, then retry the request;
* ``reauthenticate``: sign in again at ``reauthenticate_url`` (SSO users, who have no password to confirm).
  An SSO sign-in counts only when the login view verified that the IdP checked credentials again
  (``mark_federated_login``); for SAML that is a ForceAuthn response to this session's request.

Requests authenticated with an API token are not affected: the caller already holds a credential.

Covered endpoints call ``require_step_up(request)``. The guard test
``lse_tests/test_step_up_coverage.py`` fails on a view that mints an API token without it.
"""

import time

from core.utils.common import load_func
from django.conf import settings
from django.urls import reverse
from rest_framework import serializers, status
from rest_framework.authentication import SessionAuthentication
from rest_framework.exceptions import APIException

SESSION_KEY = 'step_up_verified_at'

METHOD_PASSWORD = 'password'
METHOD_REAUTHENTICATE = 'reauthenticate'


class StepUpRequired(APIException):
    status_code = status.HTTP_403_FORBIDDEN
    default_detail = 'Confirm your identity to continue.'
    default_code = 'step_up_required'

    def __init__(self, method, reauthenticate_url):
        super().__init__()
        # custom_exception_handler forwards display_context to the response body
        self.display_context = {'step_up': {'method': method, 'reauthenticate_url': reauthenticate_url}}


def is_cookie_session(request):
    """True when DRF authenticated the request from the Django session cookie, not from a token."""
    # JWTAuthenticationMiddleware sets request.user, which SessionAuthentication then reports as its own
    if getattr(getattr(request, '_request', request), 'is_jwt', False):
        return False
    return isinstance(getattr(request, 'successful_authenticator', None), SessionAuthentication)


def record_step_up(request):
    request.session[SESSION_KEY] = int(time.time())


def mark_federated_login(request):
    """Call before ``login()`` for a sign-in that an identity provider vouched for (SSO).

    The IdP may reuse its own session, so the sign-in only counts as a step-up when the login view
    has verified that the user re-entered credentials there, and then calls ``record_step_up``.
    """
    request.step_up_federated_login = True


def record_step_up_on_login(sender, request, user, **kwargs):
    """``user_logged_in`` receiver: a sign-in with credentials is a fresh proof of identity."""
    if request is None or not hasattr(request, 'session'):
        return
    if getattr(request, 'step_up_federated_login', False):
        return
    record_step_up(request)


def is_recently_verified(request):
    verified_at = request.session.get(SESSION_KEY)
    if not isinstance(verified_at, int):
        return False
    return 0 <= time.time() - verified_at <= settings.STEP_UP_MAX_AGE_SECONDS


def step_up_method(user):
    """How ``user`` proves identity. Overridden by ``STEP_UP_METHOD``."""
    return METHOD_PASSWORD if user.has_usable_password() else METHOD_REAUTHENTICATE


def check_password(user, password):
    """Whether ``password`` is ``user``'s password. Overridden by ``STEP_UP_CHECK_PASSWORD``."""
    return bool(password) and user.check_password(password)


def reauthenticate_url(request):
    """Where the browser signs in again. Overridden by ``STEP_UP_REAUTHENTICATE_URL``."""
    return reverse('user-reauthenticate')


def _challenge(request):
    method = load_func(settings.STEP_UP_METHOD)(request.user)
    return StepUpRequired(method, load_func(settings.STEP_UP_REAUTHENTICATE_URL)(request))


def require_step_up(request):
    """Raise ``StepUpRequired`` unless the request is token-authenticated or the session was recently verified."""
    if is_cookie_session(request) and not is_recently_verified(request):
        raise _challenge(request)


def verify_password(request, password):
    """Record a step-up for the session after checking the caller's password."""
    if not is_cookie_session(request):
        raise serializers.ValidationError('Step-up applies to browser sessions; API token requests are not challenged')
    challenge = _challenge(request)
    if challenge.display_context['step_up']['method'] != METHOD_PASSWORD:
        raise challenge
    if not load_func(settings.STEP_UP_CHECK_PASSWORD)(request.user, password):
        raise serializers.ValidationError({'current_password': 'Incorrect password'})
    record_step_up(request)
