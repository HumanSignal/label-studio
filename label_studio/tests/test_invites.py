"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import pytest
import json

from .utils import project_id


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

@pytest.mark.django_db
def test_reset_token_not_valid(business_client, client, settings):
    settings.DISABLE_SIGNUP_WITHOUT_LINK = False

    # disallow if token and does not match
    response = client.post('/user/signup/?token=54321abce',
            data={'email': 'test_user1@example.com', 'password': 'test_password'}
    )
    assert response.status_code == 403, response.content

@pytest.mark.django_db
def test_token_get_not_post_shows_form(business_client, client, settings):
    settings.DISABLE_SIGNUP_WITHOUT_LINK = True

    # cant bypass post
    response = business_client.get('/api/invite')
    invite_url = response.json()['invite_url']
    response = client.get(f'{invite_url}&email=test_user@example.com&password=test_password')
    assert response.status_code == 200, response.content
    assert str(response.content).find('Create Account') != -1
