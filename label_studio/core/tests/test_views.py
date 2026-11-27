import json
import re
import time

from django.conf import settings
from django.test import TestCase
from jwt_auth.models import LSAPIToken
from organizations.tests.factories import OrganizationFactory
from rest_framework.authtoken.models import Token
from tests.utils import mock_feature_flag


def _extract_pre_json(content: bytes) -> dict:
    text = content.decode('utf-8')
    match = re.search(r'^<pre>([\s\S]*)</pre>$', text.strip())
    assert match is not None, f'Expected <pre>...</pre>, got: {text[:200]}'
    return json.loads(match.group(1))


class TestFeatureFlagsView(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.org = OrganizationFactory()
        cls.org.jwt.api_tokens_enabled = True
        cls.org.jwt.legacy_api_tokens_enabled = True
        cls.org.jwt.save()
        cls.user = cls.org.created_by
        cls.token, _ = Token.objects.get_or_create(user=cls.user)

    def test_unauthenticated_non_html_accept_returns_403(self):
        response = self.client.get('/feature-flags/', HTTP_ACCEPT='*/*')
        assert response.status_code == 403

    def test_session_authenticated_user_returns_200_pre_json(self):
        self.client.force_login(self.user)
        session = self.client.session
        session['last_login'] = time.time()
        session.save()
        self.client.cookies[settings.SESSION_COOKIE_NAME] = session.session_key

        response = self.client.get('/feature-flags/', HTTP_ACCEPT='text/html, application/json')
        assert response.status_code == 200
        payload = _extract_pre_json(response.content)
        assert '$system' in payload
        assert 'FEATURE_FLAGS_DEFAULT_VALUE' in payload['$system']

    @mock_feature_flag(flag_name='fflag__feature_develop__prompts__dia_1829_jwt_token_auth', value=True)
    def test_jwt_bearer_token_returns_200(self):
        refresh = LSAPIToken.for_user(self.user)

        response = self.client.get(
            '/feature-flags/',
            HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}',
            HTTP_ACCEPT='*/*',
        )
        assert response.status_code == 200
        payload = _extract_pre_json(response.content)
        assert '$system' in payload

    def test_legacy_drf_token_header_returns_200(self):
        response = self.client.get(
            '/feature-flags/',
            HTTP_AUTHORIZATION=f'Token {self.token.key}',
            HTTP_ACCEPT='*/*',
        )
        assert response.status_code == 200
        assert response.wsgi_request.user == self.user
        payload = _extract_pre_json(response.content)
        assert '$system' in payload

    def test_x_api_key_legacy_token_returns_200(self):
        response = self.client.get(
            '/feature-flags/',
            HTTP_X_API_KEY=self.token.key,
            HTTP_ACCEPT='application/json',
        )
        assert response.status_code == 200
        payload = _extract_pre_json(response.content)
        assert '$system' in payload

    def test_invalid_or_malformed_legacy_token_returns_403_not_500(self):
        for bad_header in ('Token invalid-token-value', 'Token', 'Token part1 part2'):
            response = self.client.get(
                '/feature-flags/',
                HTTP_AUTHORIZATION=bad_header,
                HTTP_ACCEPT='*/*',
            )
            assert response.status_code == 403

    @mock_feature_flag(flag_name='fflag__feature_develop__prompts__dia_1829_jwt_token_auth', value=True)
    def test_disabled_legacy_api_tokens_returns_403_not_500(self):
        disabled_org = OrganizationFactory()
        assert disabled_org.jwt.legacy_api_tokens_enabled is False
        disabled_token, _ = Token.objects.get_or_create(user=disabled_org.created_by)

        response = self.client.get(
            '/feature-flags/',
            HTTP_AUTHORIZATION=f'Token {disabled_token.key}',
            HTTP_ACCEPT='*/*',
        )
        assert response.status_code == 403
