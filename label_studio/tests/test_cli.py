"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import pytest

from server import _create_user
from label_studio.core.argparser import parse_input_args


@pytest.mark.django_db
def test_create_user():
    input_args = parse_input_args(['init', 'test', '--username', 'default@localhost', '--password', '12345678'])
    config = {}
    user = _create_user(input_args, config)
    assert user.active_organization is not None


