"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for
copyright information and LICENSE for a copy of the license.
"""

import re
from functools import cached_property
from typing import TYPE_CHECKING, Optional
from urllib.parse import unquote, urlparse

import requests
from core.feature_flags import flag_set
from core.utils.io import ssrf_safe_session
from django.conf import settings
from requests.adapters import HTTPAdapter
from rest_framework_simplejwt.tokens import AccessToken

if TYPE_CHECKING:
    from users.models import User

# The converter refuses to fetch Label Studio media without a token. It gets this placeholder instead of a real
# one: ExportMediaAdapter authenticates the requests it lets through.
CONVERTER_ACCESS_TOKEN = 'export-media'

# Label Studio paths that serve task media, relative to the hostname
EXPORT_MEDIA_PATH_RE = re.compile(r'^/(data/upload/|storage-data/uploaded/$|tasks/\d+/presign/$)')


def get_export_hostname(request) -> Optional[str]:
    """Label Studio base URL for the export converter, which fetches media stored in Label Studio there.

    Returns None when there is no trustworthy value: the converter then skips media it would have to fetch
    from Label Studio.
    """
    # With DOMAIN_FROM_REQUEST HOSTNAME is only a subpath
    if settings.HOSTNAME and not settings.DOMAIN_FROM_REQUEST:
        return settings.HOSTNAME
    # A Host header is attacker-controlled unless ALLOWED_HOSTS or the DOMAIN_FROM_REQUEST proxy pins it
    if settings.DOMAIN_FROM_REQUEST or '*' not in settings.ALLOWED_HOSTS:
        return request.build_absolute_uri('/')
    return None


class ExportMediaAdapter(HTTPAdapter):
    """Sends the export converter's requests to Label Studio itself, authenticated as ``user``.

    Task data can point at any Label Studio URL and the response ends up in the export archive, so only
    media paths are fetched, and only as the user who exports: they get no file they couldn't open themselves.
    The credentials are made here for each request, so the converter never holds them.
    """

    def __init__(self, hostname, user, **kwargs):
        super().__init__(**kwargs)
        self.base_path = urlparse(hostname).path.rstrip('/')
        self.user = user

    def is_media_path(self, path) -> bool:
        path = unquote(path)
        # Proxies resolve dot segments, so /data/upload/../api/... would reach the API
        if '\\' in path or any(segment in ('.', '..') for segment in path.split('/')):
            return False
        if not path.startswith(self.base_path + '/'):
            return False
        return bool(EXPORT_MEDIA_PATH_RE.match(path[len(self.base_path) :]))

    @cached_property
    def accepts_jwt(self) -> bool:
        # Same checks as JWTAuthenticationMiddleware: the legacy token is used only where a JWT is not accepted
        org = self.user.active_organization
        jwt_auth = flag_set('fflag__feature_develop__prompts__dia_1829_jwt_token_auth', user=self.user)
        return jwt_auth and org is not None and org.jwt.api_tokens_enabled

    def authorization(self) -> str:
        if self.accepts_jwt:
            # Minted per request: a short-lived token outlives no download, however long the export runs
            return f'Bearer {AccessToken.for_user(self.user)}'
        return f'Token {self.user.auth_token.key}'

    def send(self, request, *args, **kwargs):
        if self.user is None:
            raise requests.exceptions.InvalidURL(f'Export has no user to fetch Label Studio media as: {request.url}')
        if not self.is_media_path(urlparse(request.url).path):
            raise requests.exceptions.InvalidURL(f'Export does not fetch non-media Label Studio URL: {request.url}')
        request.headers['Authorization'] = self.authorization()
        return super().send(request, *args, **kwargs)


def converter_http_session(hostname: Optional[str], user: Optional['User']) -> requests.Session:
    """HTTP session for the export converter's media downloads.

    Task data can point media at any URL, and the fetched bytes end up in the export archive. Requests to
    Label Studio itself (``hostname``) are limited to media paths and authenticated as ``user``, the user who
    exports; without one, none are sent.
    """
    if settings.SSRF_PROTECTION_ENABLED:
        session = ssrf_safe_session()
    else:
        session = requests.Session()
    if hostname:
        parsed = urlparse(hostname)
        # Label Studio's own host may resolve to a private address on self-hosted installs;
        # the trailing slash keeps app.example.com.evil.com from matching the prefix
        session.mount(f'{parsed.scheme}://{parsed.netloc}/', ExportMediaAdapter(hostname, user))
    return session
