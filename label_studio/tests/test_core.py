"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import types

import pytest
from core.utils.common import int_from_request
from core.utils.exceptions import InvalidUploadUrlError, LabelStudioAPIException
from core.utils.io import validate_upload_url
from core.utils.params import bool_from_request
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
        ('http://0.0.0.0', True, InvalidUploadUrlError),
        ('http://0.0.0.0', False, None),
        ('https://0.0.0.0', True, InvalidUploadUrlError),
        ('https://0.0.0.0', False, None),
        # Non-http[s] schemes
        ('ftp://example.org', True, InvalidUploadUrlError),
        ('ftp://example.org', False, InvalidUploadUrlError),
        ('FILE:///etc/passwd', True, InvalidUploadUrlError),
        ('file:///etc/passwd', False, InvalidUploadUrlError),
        # Start and end of 127.0.0.0/8
        ('https://127.0.0.0', True, InvalidUploadUrlError),
        ('https://127.255.255.255', True, InvalidUploadUrlError),
        # Start and end of 10.0.0.0/8
        ('http://10.0.0.0', True, InvalidUploadUrlError),
        ('https://10.255.255.255', True, InvalidUploadUrlError),
        # Start and end of 172.16.0.0/12
        ('https://172.16.0.0', True, InvalidUploadUrlError),
        ('https://172.31.255.255', True, InvalidUploadUrlError),
        # Start and end of 192.168.0.0/16
        ('https://192.168.0.0', True, InvalidUploadUrlError),
        ('https://192.168.255.255', True, InvalidUploadUrlError),
        # Valid external IPs
        ('https://4.4.4.4', True, None),
        ('https://8.8.8.8', True, None),
        ('http://8.8.8.8', False, None),
        # Valid external websites
        ('https://example.org', True, None),
        ('http://example.org', False, None),
        # Space prepended to otherwise valid external IP
        (' http://8.8.8.8', False, InvalidUploadUrlError),
        # Host that doesn't resolve
        ('http://example', False, LabelStudioAPIException),
        ('http://example', True, LabelStudioAPIException),
        # localhost
        ('http://localhost', True, InvalidUploadUrlError),
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
