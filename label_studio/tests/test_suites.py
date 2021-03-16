"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import pytest
import os
import json

from .test_framework import (
    load_test_suite_from_dir, iter_test_suite_items, get_test_ids, make_request, compare_response,
    try_replace_placeholders)

from .utils import login


TEST_SUITES_DIR = os.path.join(os.path.dirname(__file__), 'test_suites')


@pytest.mark.parametrize('test_suite', load_test_suite_from_dir(TEST_SUITES_DIR), ids=get_test_ids)
@pytest.mark.django_db
def test_suites(client, test_suite, request):
    placeholders = {}
    login(client, email='test_suites_user@heartex.com', password='12345678')
    for url, params in iter_test_suite_items(test_suite):
        print(url)
        try:
            url = url.format(**placeholders)
            if 'data' in params:
                params['data'] = try_replace_placeholders(params['data'], placeholders)
            r = make_request(client, url, params)
        except Exception:
            print(url)
            raise
        assert r.status_code == params['status_code'], f'{request.node.name}: request to {url}: wrong status code'
        response = params.get('response')
        if response is not None:
            try:
                actual_response = r.json()
            except Exception:
                try:
                    actual_response = json.loads(r.content)
                except Exception as exc:
                    print(f"Can't get JSON response from {r.content}. Reason: {exc}")
                    raise
            try:
                is_equal, error_message, catched_placeholders = compare_response(actual_response, response)
                placeholders.update(catched_placeholders)
            except Exception:
                print(url)
                raise
            assert is_equal, f'{request.node.name}: request to {url}: wrong response {actual_response}. Reason:{error_message}'
