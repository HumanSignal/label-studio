import pytest
from core.middleware import NoindexUrlMiddleware
from django.http import HttpResponse
from django.test import RequestFactory


class TestNoindexUrlMiddleware:
    @pytest.mark.parametrize(
        'path',
        [
            '/api/invite',
            '/api/invite/',
            '/api/invite/reset-token',
            '/api/invite/reset-token/',
            '/user/email-verification',
            '/user/email-verification/',
            '/user/login',
            '/user/login/',
            '/user/signup',
            '/user/signup/',
            '/password-reset',
            '/password-reset/',
            '/password-reset/done',
            '/password-reset/done/',
            '/password-reset/user-id/token',
            '/password-reset/user-id/token/',
            '/password-set/user-id/token',
            '/password-set/user-id/token/',
            '/password-reset/complete',
            '/password-reset/complete/',
            '/saml/saml-token/acs',
            '/saml/saml-token/acs/',
            '/saml/saml-token/welcome',
            '/saml/saml-token/welcome/',
            '/saml/saml-token/denied',
            '/saml/saml-token/denied/',
            '/saml/saml-token/login',
            '/saml/saml-token/login/',
            '/saml/saml-token/logout',
            '/saml/saml-token/logout/',
            '/saml/saml-token/xml',
            '/saml/saml-token/xml/',
        ],
    )
    def test_adds_noindex_header_to_configured_urls(self, path):
        request = RequestFactory().get(path)
        middleware = NoindexUrlMiddleware(lambda request: HttpResponse())

        response = middleware(request)

        assert response['X-Robots-Tag'] == 'noindex, nofollow'

    @pytest.mark.parametrize(
        'path',
        [
            '/api/current-user/whoami',
            '/api/invite/other',
            '/user/account',
            '/password-reset/user-id',
            '/password-set/user-id',
            '/saml/sso-domain',
            '/saml/settings',
            '/saml/saml-token/unknown',
            '/api/saml/settings',
        ],
    )
    def test_does_not_add_noindex_header_to_unconfigured_urls(self, path):
        request = RequestFactory().get(path)
        middleware = NoindexUrlMiddleware(lambda request: HttpResponse())

        response = middleware(request)

        assert 'X-Robots-Tag' not in response

    def test_preserves_existing_robots_directives(self):
        request = RequestFactory().get('/user/signup')
        middleware = NoindexUrlMiddleware(lambda request: HttpResponse(headers={'X-Robots-Tag': 'nosnippet'}))

        response = middleware(request)

        assert response['X-Robots-Tag'] == 'nosnippet, noindex, nofollow'
