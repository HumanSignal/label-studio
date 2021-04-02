"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import pytest
from core.utils.common import bool_from_request, int_from_request


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
def test_core_bool_from_request(param, result):
    params = {'test': param} if param is not None else {}

    # incorrect param should call exception
    if result is None:
        error = False
        try:
            bool_from_request(params, 'test', 0)
        except:
            error = True

        assert error

    # everything ok
    else:
        assert bool_from_request(params, 'test', 0) == result


@pytest.mark.parametrize('param, result', [
    ('', None),
    ('0', 0),
    ('1', 1),
    ('10', 10),
    ('test', None),
    (None, None)
])
@pytest.mark.django_db
def test_core_int_from_request(param, result):
    params = {'test': param}

    # incorrect param should call exception
    if result is None:
        error = False
        try:
            int_from_request(params, 'test', 0)
        except ValueError:
            error = True

        assert error

    # everything ok
    else:
        assert int_from_request(params, 'test', 0) == result
