"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import os
import json
import re

from urllib.parse import urlencode
from pathlib import Path
from django.core.files.uploadedfile import SimpleUploadedFile
from core.utils.io import read_yaml


def load_test_suite_from_file(test_suite_file):
    """Load test suites from file in YAML format:
    - test_1:
        - /first/step/url:
            method: GET
            query_string: {"a": "b"}
            data: {"json": "payload"}
            status_code: 200
            response: {"json": "response"}
        - /second/step/url:
    - test_2:
    """
    assert test_suite_file.endswith('.yml'), 'Test suite file should be in YAML format'
    if not os.path.exists(test_suite_file):
        # try to load from local test_suites directory
        test_suites_dir = os.path.join(os.path.dirname(__file__), 'test_suites')
        assert os.path.exists(test_suites_dir)
        return read_yaml(os.path.join(test_suites_dir, test_suite_file))
    else:
        return read_yaml(test_suite_file)


def load_test_suite_from_dir(test_suite_dir):
    test_suites = []
    for path in Path(test_suite_dir).rglob('*.yml'):
        file_test_suites = load_test_suite_from_file(str(path))
        for test in file_test_suites:
            test_name, test_value = list(test.items())[0]
            test_suites.append((
                # test suite filepath
                str(path),
                # test suite content
                {path.name + '::' + test_name: test_value}
            ))
    return test_suites


def get_test_ids(test_val):
    return list(test_val[1].keys())[0]


def iter_test_suite_items(current_test_suite):
    test_suite_filepath, test_suite_content = current_test_suite
    test_suite_steps = next(iter(test_suite_content.values()))
    for test in test_suite_steps:
        url, params = next(iter(test.items()))
        # if files are presented, prepare request for sending files
        if params.get('content_type') == 'multipart/form-data':
            data = {}
            for filekey, filepath in params['data'].items():
                abs_filepath = os.path.join(os.path.dirname(test_suite_filepath), filepath)
                file_content = open(abs_filepath, mode='rb').read()
                data[filekey] = SimpleUploadedFile(filepath, file_content)
            params['data'] = data
            params['follow'] = True
            params.pop('content_type')
        yield url, params


def make_request(client, url, params):
    method = params.pop('method')
    request_params = {
        key: value for key, value in params.items()
        if key not in ('response', 'status_code')
    }
    if params.get('content_type') == 'application/x-www-form-urlencoded':
        request_params['data'] = urlencode(request_params['data'])

    if method == 'GET':
        return client.get(url, **request_params)
    if method == 'POST':
        return client.post(url, **request_params)
    elif method == 'PATCH':
        return client.patch(url, **request_params)
    elif method == 'DELETE':
        return client.delete(url, **request_params)


def compare_response_values(client_value, expected_value):

    def _compare_by_test_object(c, e):
        if isinstance(c, (int, float)):
            lower_bound, upper_bound = e['interval']
            return lower_bound < c < upper_bound
        elif isinstance(c, str):
            return re.match(e['regexp'], c)
        elif isinstance(c, dict):
            return re.match(e['regexp'], json.dumps(c))

    if isinstance(expected_value, dict) and expected_value.get('__test_object'):
        return _compare_by_test_object(client_value, expected_value)
    elif isinstance(expected_value, list) and isinstance(client_value, list) and len(expected_value) == len(client_value):
        for exp_value, cli_value in zip(expected_value, client_value):
            if isinstance(exp_value, dict) and exp_value.get('__test_object'):
                if not _compare_by_test_object(cli_value, exp_value):
                    return False
            else:
                if isinstance(exp_value, dict) and isinstance(cli_value, dict):
                    # Non strict dict comparison: exp_value <= cli_value
                    for k in exp_value:
                        if cli_value.get(k) != exp_value[k]:
                            return False
                elif exp_value != cli_value:
                    return False
        return True
    else:
        if isinstance(client_value, dict) and isinstance(expected_value, dict):
            # For dict values in response, we assert only inclusions
            for key, value in expected_value.items():
                if key not in client_value:
                    raise KeyError(f'We expect response key {key} in {json.dumps(client_value, indent=2)}')
                if value != client_value[key]:
                    return False
            return True
        return client_value == expected_value


def _match_placeholders(value):
    m = re.match('{(.+)}', value)
    if m:
        return m.group(1).strip()


def _get_placeholder(value, client_value=None):
    if isinstance(value, str):
        return _match_placeholders(value), client_value
    elif isinstance(value, dict):
        # TODO: supports only 1 placeholder per dict
        for k, v in value.items():
            if isinstance(v, str):
                p = _match_placeholders(v)
                if p:
                    return p, client_value[k]
    return None, None


def try_replace_placeholders(params, placeholders):

    def _replace_in_str(value):
        placeholder, _ = _get_placeholder(value)
        if placeholder in placeholders:
            value = placeholders[placeholder]
        return value

    def _replace_in_dict_or_list(prms):
        if isinstance(prms, dict):
            out = {}
            for key, value in prms.items():
                if isinstance(value, str):
                    value = _replace_in_str(value)
                elif isinstance(value, (dict, list)):
                    value = try_replace_placeholders(value, placeholders)
                out[key] = value
        elif isinstance(prms, list):
            out = []
            for value in prms:
                if isinstance(value, str):
                    value = _replace_in_str(value)
                elif isinstance(value, (dict, list)):
                    value = try_replace_placeholders(value, placeholders)
                out.append(value)
        else:
            out = _replace_in_str(prms)
        return out

    if isinstance(params, dict):
        return _replace_in_dict_or_list(params)
    elif isinstance(params, list):
        return [_replace_in_dict_or_list(p) for p in params]
    else:
        return params


def compare_response(client_response, expected_response, strict=False):

    if strict:
        for client_key in client_response.keys():
            if client_key not in expected_response:
                return (
                    False,
                    'Client response contains value "{0}" which is not found in expected response'.format(client_key),
                    {})

    placeholders = {}

    def iter_responses():
        if isinstance(client_response, list) and isinstance(expected_response, list):
            if len(client_response) != len(expected_response):
                raise ValueError(f'Expected list response with exactly {len(expected_response)} items but found {len(client_response)}')
            for i, (client_value, expected_value) in enumerate(zip(client_response, expected_response)):
                yield str(i), client_value, expected_value
        elif isinstance(client_response, dict) and isinstance(expected_response, dict):
            for expected_key, expected_value in expected_response.items():
                if expected_key not in client_response:
                    raise KeyError('Expected response contains value "{0}" which is not found in client '
                                   'response'.format(expected_key))
                client_value = client_response[expected_key]
                yield expected_key, client_value, expected_value

    try:
        for key, client_value, expected_value in iter_responses():
            placeholder, placeholder_value = _get_placeholder(expected_value, client_value)
            if placeholder and placeholder not in placeholders:
                placeholders[placeholder] = placeholder_value
                continue

            if placeholder in placeholders:
                # use previously extracted placeholder value as expected, e.g. {project_id}
                expected_value = placeholders[placeholder]

            if isinstance(expected_value, str) and expected_value.startswith('__WHATEVER__'):
                continue

            # compare the actual output with that one written in test suite yaml file
            if not compare_response_values(client_value, expected_value):
                return (
                    False,
                    'Error on validating response for "{0}":\nExpected:\n{1}\nReceived:\n{2}'.format(key, expected_value, client_value),
                    {})
    except KeyError as exc:
        return False, str(exc), {}
    return True, '', placeholders
