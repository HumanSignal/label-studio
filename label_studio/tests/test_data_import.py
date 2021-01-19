import pytest

from .base import load_test_suite_from_file, test_suite_items, get_test_ids, make_request, compare_response


@pytest.mark.parametrize('test_suite', load_test_suite_from_file('data_import.yml'), ids=get_test_ids)
def test_import(client, test_suite):
    for url, params in test_suite_items(test_suite):
        r = make_request(client, url, params)
        assert r.status_code == params['status_code']
        is_equal, error_message = compare_response(r.json, params['response'])
        assert is_equal, error_message
