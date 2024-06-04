import json

import pytest
import responses


@responses.activate
@pytest.mark.django_db
def test_contextlog(business_client, contextlog_test_config):
    responses.add(
        responses.POST,
        'https://tele.labelstud.io',
        json={'ok': 'true'},
        status=201,
    )
    r = business_client.get('/api/users/')

    responses.assert_call_count('https://tele.labelstud.io', 1)
    assert responses.calls
    assert r.status_code == 200
    assert 'env' not in json.loads(responses.calls[0].request.body)
