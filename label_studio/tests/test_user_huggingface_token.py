import json

import pytest

pytestmark = pytest.mark.django_db


def test_user_huggingface_token_settings_flow(business_client):
    response = business_client.get('/api/current-user/huggingface-token')
    assert response.status_code == 200
    assert response.json()['configured'] is False

    response = business_client.post(
        '/api/current-user/huggingface-token',
        data=json.dumps({'token': 'hf_test_token'}),
        content_type='application/json',
    )
    assert response.status_code == 200
    assert response.json()['configured'] is True

    business_client.user.refresh_from_db()
    assert business_client.user.huggingface_token == 'hf_test_token'

    response = business_client.delete('/api/current-user/huggingface-token')
    assert response.status_code == 200
    assert response.json()['configured'] is False

    business_client.user.refresh_from_db()
    assert business_client.user.huggingface_token is None
