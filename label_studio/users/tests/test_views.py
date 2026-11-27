from datetime import timedelta

from django.conf import settings
from django.test import TestCase, override_settings
from django.utils import timezone
from organizations.models import Organization
from organizations.tests.factories import OrganizationFactory
from users.models import User
from users.tests.factories import UserFactory


@override_settings(ORG_INVITE_EXPIRATION_DAYS=30)
class TestUserSignupInviteExpiration(TestCase):
    """FIT-2685: an expired organization invite token must not allow signup."""

    @classmethod
    def setUpTestData(cls):
        cls.organization = OrganizationFactory()
        assert Organization.objects.first() == cls.organization

    def _signup(self, token):
        return self.client.post(
            f'/user/signup/?token={token}',
            {'email': 'invitee@example.com', 'password': 'StrongPassw0rd!', 'allow_newsletters': False},
        )

    def _expire_token(self):
        self.organization.token_expires_at = timezone.now() - timedelta(days=1)
        self.organization.save(update_fields=['token_expires_at'])

    @override_settings(DISABLE_SIGNUP_WITHOUT_LINK=True)
    def test_valid_token_allows_signup_when_link_required(self):
        response = self._signup(self.organization.token)

        assert response.status_code == 302
        assert User.objects.filter(email='invitee@example.com').exists()

    @override_settings(DISABLE_SIGNUP_WITHOUT_LINK=True)
    def test_expired_token_is_rejected_when_link_required(self):
        self._expire_token()

        response = self._signup(self.organization.token)

        assert response.status_code == 403
        assert not User.objects.filter(email='invitee@example.com').exists()

    @override_settings(DISABLE_SIGNUP_WITHOUT_LINK=False)
    def test_expired_token_is_rejected_when_link_optional(self):
        self._expire_token()

        response = self._signup(self.organization.token)

        assert response.status_code == 403
        assert not User.objects.filter(email='invitee@example.com').exists()


@override_settings(LOGOUT_REDIRECT_URL=None, HOSTNAME='')
class TestLogoutCsrf(TestCase):
    """Logout must need a POST with a CSRF token, so a third-party page cannot log users out."""

    @classmethod
    def setUpTestData(cls):
        cls.user = UserFactory(active_organization=OrganizationFactory())
        # The factory sets the password after the last save
        cls.user.save()

    def setUp(self):
        response = self.client.post('/user/login/', {'email': self.user.email, 'password': 'testpassword'})
        assert response.status_code == 302
        assert self._is_logged_in()

    def _is_logged_in(self):
        return self.client.get('/api/current-user/whoami').status_code == 200

    def _csrf_token(self):
        return self.client.cookies[settings.CSRF_COOKIE_NAME].value

    def test_get_renders_confirmation_and_keeps_session(self):
        response = self.client.get('/logout')

        assert response.status_code == 200
        assert b'id="logout-confirm"' in response.content
        assert b'csrfmiddlewaretoken' in response.content
        assert self._is_logged_in()

    def test_post_without_csrf_token_is_rejected(self):
        self.client.get('/logout')
        assert settings.CSRF_COOKIE_NAME in self.client.cookies

        response = self.client.post('/logout')

        assert response.status_code == 403
        assert self._is_logged_in()

    def test_post_with_csrf_token_logs_out(self):
        self.client.get('/logout')

        response = self.client.post('/logout', {'csrfmiddlewaretoken': self._csrf_token()})

        assert response.status_code == 302
        assert response['Location'] == '/'
        assert not self._is_logged_in()

    @override_settings(LOGOUT_REDIRECT_URL='https://example.com/bye')
    def test_post_redirects_to_logout_redirect_url(self):
        self.client.get('/logout')

        response = self.client.post('/logout', HTTP_X_CSRFTOKEN=self._csrf_token())

        assert response.status_code == 302
        assert response['Location'] == 'https://example.com/bye'
        assert not self._is_logged_in()

    @override_settings(HOSTNAME='http://testserver')
    def test_post_redirects_to_hostname(self):
        self.client.get('/logout')

        response = self.client.post('/logout', HTTP_X_CSRFTOKEN=self._csrf_token())

        assert response.status_code == 302
        assert response['Location'] == 'http://testserver/'
        assert not self._is_logged_in()

    def test_anonymous_get_redirects_without_login_loop(self):
        self.client.logout()

        response = self.client.get('/logout')

        assert response.status_code == 302
        assert response['Location'] == '/'

    def test_other_methods_are_not_allowed(self):
        self.client.get('/logout')

        response = self.client.put('/logout', HTTP_X_CSRFTOKEN=self._csrf_token())

        assert response.status_code == 405
        assert self._is_logged_in()
