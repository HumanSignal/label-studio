"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import pytest
import json

from tests.utils import project_id


@pytest.mark.django_db
def test_signup_setting(business_client, client, settings):
    settings.DISABLE_SIGNUP_WITHOUT_LINK = True
    response = client.post('/user/signup', data={'email': 'test_user@example.com', 'password': 'test_password'})
    assert response.status_code == 403

    response = business_client.get('/api/invite')

    invite_url = response.json()['invite_url']

    response = client.post(invite_url, data={'email': 'test_user@example.com', 'password': 'test_password'})
    assert response.status_code == 302


@pytest.mark.django_db
def test_reset_token(business_client, client, settings):
    settings.DISABLE_SIGNUP_WITHOUT_LINK = True

    # get invite_url link and check it works
    response = business_client.get('/api/invite')
    invite_url = response.json()['invite_url']
    response = client.post(invite_url, data={'email': 'test_user@example.com', 'password': 'test_password'})
    assert response.status_code == 302

    response = business_client.post('/api/invite/reset-token')
    new_invite_url = response.json()['invite_url']

    # after reset old link returns permission denied
    client.logout()
    response = client.post(invite_url, data={'email': 'test_user1@example.com', 'password': 'test_password'})
    assert response.status_code == 403, response.content
    
    # but new one works fine
    response = client.post(new_invite_url, data={'email': 'test_user2@example.com', 'password': 'test_password'})
    assert response.status_code == 302
