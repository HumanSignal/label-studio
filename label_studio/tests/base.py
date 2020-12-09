# python
import os
import yaml
import io
import re
import json

from types import SimpleNamespace
from label_studio.project import Project
from label_studio.utils.io import read_yaml


def goc_project():
    """monkeypatch for get_or_create_project"""
    project_name = 'my_project'
    user = 'admin'
    input_args_dict = {
        'root_dir': os.path.join(os.path.dirname(__file__), '../../')
    }
    input_args = SimpleNamespace(**input_args_dict)
    project = Project.get_or_create(project_name, input_args, context={
            'multi_session': False
    })
    return project


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
    test_suites_dir = os.path.join(os.path.dirname(__file__), 'test_suites')
    assert os.path.exists(test_suites_dir)
    return read_yaml(os.path.join(test_suites_dir, test_suite_file))


def get_test_ids(test_val):
    return list(test_val.keys())[0]


def test_suite_items(current_test_suite):
    test_suite_steps = next(iter(current_test_suite.values()))
    for test in test_suite_steps:
        url, params = next(iter(test.items()))
        # if files are presented, prepare request for sending files
        if params.get('content_type') == 'multipart/form-data':
            data = {}
            for filekey, filepath in params['data'].items():
                abs_filepath = os.path.join(os.path.dirname(__file__), 'test_suites', filepath)
                file_content = open(abs_filepath, mode='rb').read()
                data[filekey] = (io.BytesIO(file_content), filepath)
            params['data'] = data
            params['follow_redirects'] = True
        yield url, params


def make_request(client, url, params):
    method = params.pop('method')
    request_params = {
        key: value for key, value in params.items()
        if key not in ('response', 'status_code')
    }

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
                if exp_value != cli_value:
                    return False
        return True
    else:
        return client_value == expected_value


def compare_response(client_response, expected_response):

    for client_key in client_response.keys():
        if client_key not in expected_response:
            return False, 'Client response contains value "{0}" which is not found in expected response'.format(client_key)  # noqa

    for expected_key, expected_value in expected_response.items():
        if expected_key not in client_response:
            return False, 'Expected response contains value "{0}" which is not found in client response'.format(expected_key)  # noqa
        client_value = client_response[expected_key]
        if not compare_response_values(client_value, expected_value):
            return False, 'Error on validating response for "{0}":\nExpected:\n{1}\nReceived:\n{2}'.format(
                expected_key, expected_value, client_value)
    return True, ''
