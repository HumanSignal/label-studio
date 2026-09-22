"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license."""

import socket
import threading
import types
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from unittest.mock import MagicMock, patch

import pytest
from core.utils.common import int_from_request
from core.utils.exceptions import LabelStudioAPIException, SsrfBlockedUrlError
from core.utils.io import SsrfSafeHTTPAdapter, ssrf_safe_request, ssrf_safe_session, validate_upload_url
from core.utils.params import bool_from_request
from django.test import override_settings
from rest_framework.exceptions import ValidationError


@pytest.mark.parametrize(
    'param, result',
    [
        ('True', True),
        ('Yes', True),
        ('1', True),
        ('False', False),
        ('no', False),
        ('0', False),
        ('test', None),
        (None, False),
    ],
)
@pytest.mark.django_db
def test_core_bool_from_request(param, result):
    params = {'test': param} if param is not None else {}

    # incorrect param should call exception
    if result is None:
        error = False
        try:
            bool_from_request(params, 'test', 0)
        except:  # noqa: E722
            error = True

        assert error

    # everything ok
    else:
        assert bool_from_request(params, 'test', 0) == result


@pytest.mark.parametrize('param, result', [('', None), ('0', 0), ('1', 1), ('10', 10), ('test', None), (None, None)])
@pytest.mark.django_db
def test_core_int_from_request(param, result):
    params = {'test': param}

    # incorrect param should call exception
    if result is None:
        error = False
        try:
            int_from_request(params, 'test', 0)
        except ValidationError:
            error = True

        assert error

    # everything ok
    else:
        assert int_from_request(params, 'test', 0) == result


@pytest.mark.django_db
def test_user_info(business_client):
    from label_studio.server import _create_user, _get_user_info

    user_data = _get_user_info(business_client.admin.email)
    assert 'token' in user_data

    user_data = _get_user_info(None)
    assert user_data is None

    class DummyArgs:
        username = 'tester@x.com'
        password = 'passwdx'
        user_token = 'token12345'

    args = DummyArgs()
    _create_user(args, {})
    user_data = _get_user_info('tester@x.com')
    assert user_data['token'] == 'token12345'

    args.user_token, args.username = '123', 'tester2@x.com'
    user = _create_user(args, {})
    assert user is not None


@pytest.mark.parametrize(
    'command_line, result',
    [
        (['label-studio', 'user', '--username', 'test@test.com', '--password', '12345678'], None),
    ],
)
@pytest.mark.django_db
def test_main(mocker, command_line, result):
    from server import main

    mocker.patch('sys.argv', command_line)
    output = main()

    assert output == result


def test_string_is_url():
    from label_studio.core.utils.common import string_is_url

    assert string_is_url('http://test.com') is True
    assert string_is_url('https://test.com') is True
    assert string_is_url('xyz') is False


def test_get_client_ip():
    from label_studio.core.utils.common import get_client_ip

    ip = get_client_ip(types.SimpleNamespace(META={'HTTP_X_FORWARDED_FOR': '127.0.0.1'}))
    assert ip == '127.0.0.1'

    ip = get_client_ip(types.SimpleNamespace(META={'REMOTE_ADDR': '127.0.0.2'}))
    assert ip == '127.0.0.2'


def test_timestamp_now():
    from label_studio.core.utils.common import timestamp_now

    t = timestamp_now()
    assert t is not None


def test_start_browser():
    from label_studio.core.utils.common import start_browser

    assert start_browser('http://localhost:8080', True) is None
    assert start_browser('http://localhost:8080', False) is None


@pytest.mark.parametrize(
    'url, block_local_urls, raises_exc',
    [
        ('http://0.0.0.0', True, SsrfBlockedUrlError),
        ('http://0.0.0.0', False, None),
        ('https://0.0.0.0', True, SsrfBlockedUrlError),
        ('https://0.0.0.0', False, None),
        # Non-http[s] schemes
        ('ftp://example.org', True, SsrfBlockedUrlError),
        ('ftp://example.org', False, SsrfBlockedUrlError),
        ('FILE:///etc/passwd', True, SsrfBlockedUrlError),
        ('file:///etc/passwd', False, SsrfBlockedUrlError),
        # Start and end of 127.0.0.0/8
        ('https://127.0.0.0', True, SsrfBlockedUrlError),
        ('https://127.255.255.255', True, SsrfBlockedUrlError),
        # Start and end of 10.0.0.0/8
        ('http://10.0.0.0', True, SsrfBlockedUrlError),
        ('https://10.255.255.255', True, SsrfBlockedUrlError),
        # Start and end of 172.16.0.0/12
        ('https://172.16.0.0', True, SsrfBlockedUrlError),
        ('https://172.31.255.255', True, SsrfBlockedUrlError),
        # Start and end of 192.168.0.0/16
        ('https://192.168.0.0', True, SsrfBlockedUrlError),
        ('https://192.168.255.255', True, SsrfBlockedUrlError),
        # Valid external IPs
        ('https://4.4.4.4', True, None),
        ('https://8.8.8.8', True, None),
        ('http://8.8.8.8', False, None),
        # Valid external websites
        ('https://example.org', True, None),
        ('http://example.org', False, None),
        # Space prepended to otherwise valid external IP
        (' http://8.8.8.8', False, SsrfBlockedUrlError),
        # Host that doesn't resolve
        ('http://example', False, LabelStudioAPIException),
        ('http://example', True, LabelStudioAPIException),
        # localhost
        ('http://localhost', True, SsrfBlockedUrlError),
        ('http://localhost', False, None),
    ],
)
@pytest.mark.django_db
def test_core_validate_upload_url(url, block_local_urls, raises_exc):
    if raises_exc is None:
        assert validate_upload_url(url, block_local_urls=block_local_urls) is None
        return

    with pytest.raises(raises_exc):
        validate_upload_url(url, block_local_urls=block_local_urls)


def test_core_validate_upload_url_calls_validate_url_for_ssrf():
    with patch('core.utils.io.validate_url_for_ssrf') as mock_validate:
        validate_upload_url('https://example.org', block_local_urls=False)

    mock_validate.assert_called_once_with('https://example.org', block_local_urls=False)


def test_ssrf_safe_request_validates_and_forwards_request():
    fake_response = MagicMock()

    with (
        patch('core.utils.io.validate_url_for_ssrf') as mock_validate_url,
        patch('core.utils.io.requests.Session.request', return_value=fake_response) as mock_request,
    ):
        response = ssrf_safe_request(
            'POST',
            'https://example.org/webhook',
            block_local_urls=True,
            json={'action': 'PROJECT_UPDATED'},
            timeout=1.0,
        )

    assert response is fake_response
    mock_validate_url.assert_called_once_with('https://example.org/webhook', block_local_urls=True)
    mock_request.assert_called_once_with(
        'POST',
        'https://example.org/webhook',
        json={'action': 'PROJECT_UPDATED'},
        timeout=1.0,
    )


def test_ssrf_safe_session_mounts_the_guarded_adapter():
    session = ssrf_safe_session()

    assert isinstance(session.get_adapter('http://example.org'), SsrfSafeHTTPAdapter)
    assert isinstance(session.get_adapter('https://example.org'), SsrfSafeHTTPAdapter)


class _SsrfTestHandler(BaseHTTPRequestHandler):
    protocol_version = 'HTTP/1.1'

    def do_GET(self):
        if self.path == '/redirect-to-banned':
            self.send_response(302)
            self.send_header('Location', f'http://{_BANNED_IP}/ok')
            self.send_header('Content-Length', '0')
            self.end_headers()
            return

        body = b'{"ok": true}'
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, *args):
        pass


# Loopback must stay reachable here, so ban a subnet the test server never uses.
_BANNED_IP = '10.11.12.13'
_ssrf_test_subnets = override_settings(USE_DEFAULT_BANNED_SUBNETS=False, USER_ADDITIONAL_BANNED_SUBNETS=['10.0.0.0/8'])


@pytest.fixture
def ssrf_test_server():
    server = ThreadingHTTPServer(('127.0.0.1', 0), _SsrfTestHandler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    yield f'http://127.0.0.1:{server.server_address[1]}'
    server.shutdown()
    server.server_close()


@_ssrf_test_subnets
def test_ssrf_safe_request_allows_permitted_host(ssrf_test_server):
    response = ssrf_safe_request('GET', f'{ssrf_test_server}/ok', block_local_urls=True)

    assert response.status_code == 200
    assert response.json() == {'ok': True}


@_ssrf_test_subnets
def test_ssrf_safe_request_blocks_redirect_to_banned_address(ssrf_test_server):
    with pytest.raises(SsrfBlockedUrlError):
        ssrf_safe_request('GET', f'{ssrf_test_server}/redirect-to-banned', block_local_urls=True, timeout=1)


@_ssrf_test_subnets
def test_ssrf_safe_request_blocks_dns_rebinding(ssrf_test_server):
    rebound = [(socket.AF_INET, socket.SOCK_STREAM, 6, '', (_BANNED_IP, 80))]

    with patch('core.utils.io.socket.getaddrinfo', return_value=rebound):
        with pytest.raises(SsrfBlockedUrlError):
            ssrf_safe_request('GET', f'{ssrf_test_server}/ok', block_local_urls=True, timeout=1)


@_ssrf_test_subnets
def test_ssrf_safe_request_blocks_when_any_record_is_banned(ssrf_test_server):
    port = int(ssrf_test_server.rsplit(':', 1)[1])
    records = [
        (socket.AF_INET, socket.SOCK_STREAM, 6, '', ('127.0.0.1', port)),
        (socket.AF_INET, socket.SOCK_STREAM, 6, '', (_BANNED_IP, port)),
    ]

    with patch('core.utils.io.socket.getaddrinfo', return_value=records):
        with pytest.raises(SsrfBlockedUrlError):
            ssrf_safe_request('GET', f'{ssrf_test_server}/ok', block_local_urls=True, timeout=1)


def test_ssrf_safe_session_blocks_banned_address_without_streaming():
    with ssrf_safe_session() as session:
        with pytest.raises(SsrfBlockedUrlError):
            session.get(f'http://{_BANNED_IP}/ok', stream=False, timeout=1)
