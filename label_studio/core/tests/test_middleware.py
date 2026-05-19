import jwt
import pytest
from core.middleware import NoindexUrlMiddleware, XApiKeySupportMiddleware, authorization_header_from_x_api_key
from django.http import HttpResponse
from django.test import RequestFactory

_VALID_JWT = jwt.encode({'token_type': 'access'}, 'secret', algorithm='HS256')


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


@pytest.mark.parametrize(
    'api_key, expected',
    [
        ('legacy-api-key', 'Token legacy-api-key'),
        (_VALID_JWT, f'Bearer {_VALID_JWT}'),
        ('aaa.bbb.ccc', 'Token aaa.bbb.ccc'),
    ],
)
def test_authorization_header_from_x_api_key(api_key, expected):
    assert authorization_header_from_x_api_key(api_key) == expected


def test_x_api_key_middleware_maps_jwt_to_bearer_authorization():
    request = RequestFactory().get('/api/projects/')
    request.META['HTTP_X_API_KEY'] = _VALID_JWT

    XApiKeySupportMiddleware(lambda request: HttpResponse())(request)

    assert request.META['HTTP_AUTHORIZATION'] == f'Bearer {_VALID_JWT}'
    assert 'HTTP_X_API_KEY' not in request.META


def test_x_api_key_middleware_maps_legacy_key_to_token_authorization():
    request = RequestFactory().get('/api/projects/')
    request.META['HTTP_X_API_KEY'] = 'legacy-api-key'

    XApiKeySupportMiddleware(lambda request: HttpResponse())(request)

    assert request.META['HTTP_AUTHORIZATION'] == 'Token legacy-api-key'
    assert 'HTTP_X_API_KEY' not in request.META
