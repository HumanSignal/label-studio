"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import pytest
import json

from tests.utils import project_id


@pytest.mark.django_db
def test_signup_setting(business_client, client, settings):
    settings.DISABLE_SIGNUP_WITHOUT_LINK = True
    response = client.get('/user/signup')
    assert response.status_code == 403

    response = business_client.get('/api/invite')

    invite_url = response.json()['invite_url']

    response = client.get(invite_url)
    assert response.status_code == 200


@pytest.mark.django_db
def test_reset_token(business_client, client, settings):
    settings.DISABLE_SIGNUP_WITHOUT_LINK = True

    # get invite_url link and check it works
    response = business_client.get('/api/invite')
    invite_url = response.json()['invite_url']
    response = client.get(invite_url)
    assert response.status_code == 200

    response = business_client.post('/api/invite/reset-token')
    new_invite_url = response.json()['invite_url']

    # after reset old link returns permission denied
    response = client.get(invite_url)
    assert response.status_code == 403
    
    # but new one works fine
    response = client.get(new_invite_url)
    assert response.status_code == 200
