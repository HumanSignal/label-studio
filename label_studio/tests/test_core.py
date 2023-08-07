"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
from typing import TYPE_CHECKING
import pytest
import types
from core.utils.common import int_from_request  # type: ignore[attr-defined]
from core.utils.params import bool_from_request
from core.utils.io import validate_upload_url
from core.utils.exceptions import InvalidUploadUrlError
from core.utils.exceptions import LabelStudioAPIException

from rest_framework.exceptions import ValidationError


@pytest.mark.parametrize('param, result', [
    ('True', True),
    ('Yes', True),
    ('1', True),
    ('False', False),
    ('no', False),
    ('0', False),
    ('test', None),
    (None, False)
])
@pytest.mark.django_db
def test_core_bool_from_request(param, result):  # type: ignore[no-untyped-def]
    params = {'test': param} if param is not None else {}

    # incorrect param should call exception
    if result is None:
        error = False
        try:
            bool_from_request(params, 'test', 0)  # type: ignore[no-untyped-call]
        except:
            error = True

        assert error

    # everything ok
    else:
        assert bool_from_request(params, 'test', 0) == result  # type: ignore[no-untyped-call]


@pytest.mark.parametrize('param, result', [
    ('', None),
    ('0', 0),
    ('1', 1),
    ('10', 10),
    ('test', None),
    (None, None)
])
@pytest.mark.django_db
def test_core_int_from_request(param, result):  # type: ignore[no-untyped-def]
    params = {'test': param}

    # incorrect param should call exception
    if result is None:
        error = False
        try:
            int_from_request(params, 'test', 0)  # type: ignore[no-untyped-call]
        except ValidationError:
            error = True

        assert error

    # everything ok
    else:
        assert int_from_request(params, 'test', 0) == result  # type: ignore[no-untyped-call]


@pytest.mark.django_db
def test_user_info(business_client):  # type: ignore[no-untyped-def]
    if TYPE_CHECKING:
        from server import _get_user_info, _create_user
    else:
        from label_studio.server import _get_user_info, _create_user

    user_data = _get_user_info(business_client.admin.email)  # type: ignore[no-untyped-call]
    assert 'token' in user_data

    user_data = _get_user_info(None)  # type: ignore[no-untyped-call]
    assert user_data is None

    class DummyArgs:
        username = 'tester@x.com'
        password = 'passwdx'
        user_token = 'token12345'

    args = DummyArgs()
    _create_user(args, {})  # type: ignore[no-untyped-call]
    user_data = _get_user_info('tester@x.com')  # type: ignore[no-untyped-call]
    assert user_data['token'] == 'token12345'

    args.user_token, args.username = '123', 'tester2@x.com'
    user = _create_user(args, {})  # type: ignore[no-untyped-call]
    assert user is not None


@pytest.mark.parametrize('command_line, result', [
    (['label-studio', 'user', '--username', 'test@test.com', '--password', '12345678'], None),
])
@pytest.mark.django_db
def test_main(mocker, command_line, result):  # type: ignore[no-untyped-def]
    from server import main

    mocker.patch(
        "sys.argv",
        command_line
    )
    output = main()  # type: ignore[no-untyped-call]

    assert output == result


def test_string_is_url():  # type: ignore[no-untyped-def]
    if TYPE_CHECKING:
        from core.utils.common import string_is_url
    else:
        from label_studio.core.utils.common import string_is_url

    assert string_is_url('http://test.com') is True  # type: ignore[no-untyped-call]
    assert string_is_url('https://test.com') is True  # type: ignore[no-untyped-call]
    assert string_is_url('xyz') is False  # type: ignore[no-untyped-call]


def test_get_client_ip():  # type: ignore[no-untyped-def]
    if TYPE_CHECKING:
        from core.utils.common import get_client_ip
    else:
        from label_studio.core.utils.common import get_client_ip

    ip = get_client_ip(types.SimpleNamespace(META={'HTTP_X_FORWARDED_FOR': '127.0.0.1'}))  # type: ignore[no-untyped-call]
    assert ip == '127.0.0.1'

    ip = get_client_ip(types.SimpleNamespace(META={'REMOTE_ADDR': '127.0.0.2'}))  # type: ignore[no-untyped-call]
    assert ip == '127.0.0.2'


def test_timestamp_now():  # type: ignore[no-untyped-def]
    if TYPE_CHECKING:
        from core.utils.common import timestamp_now
    else:
        from label_studio.core.utils.common import timestamp_now

    t = timestamp_now()  # type: ignore[no-untyped-call]
    assert t is not None


def test_start_browser():  # type: ignore[no-untyped-def]
    if TYPE_CHECKING:
        from core.utils.common import start_browser
    else:
        from label_studio.core.utils.common import start_browser

    assert start_browser('http://localhost:8080', True) is None  # type: ignore[no-untyped-call]
    assert start_browser('http://localhost:8080', False) is None  # type: ignore[no-untyped-call]

@pytest.mark.parametrize('url, block_local_urls, raises_exc', [
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
 ])
@pytest.mark.django_db
def test_core_validate_upload_url(url, block_local_urls, raises_exc):  # type: ignore[no-untyped-def]

    if raises_exc is None:
        assert validate_upload_url(url, block_local_urls=block_local_urls) is None  # type: ignore[no-untyped-call]
        return

    with pytest.raises(raises_exc) as e:
        validate_upload_url(url, block_local_urls=block_local_urls)  # type: ignore[no-untyped-call]
