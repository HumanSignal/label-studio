"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import mock
import pytest
import json

from tests.utils import project_id


@pytest.mark.django_db
def test_custom_exception_handling(business_client, project_id):
    payload = dict(project=project_id, data={"test": 1})
    with mock.patch('data_manager.api.ViewAPI.create') as m:
        m.side_effect = Exception('Test')
        response = business_client.post(
            "/api/dm/views/",
            data=json.dumps(payload),
            content_type="application/json",
        )
        assert response.status_code == 500, response.content
        response_data = response.json()
        assert response_data['detail'] == 'Test'
        assert 'Exception: Test' in response_data['exc_info']
