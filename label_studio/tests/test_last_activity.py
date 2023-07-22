"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import pytest
from datetime import datetime
from time import sleep

@pytest.mark.django_db
def test_last_activity_update(business_client):
    business_client.post('/projects/')
    response = business_client.get('/api/users/')
    response_data = response.json()
    before_timestamp = response_data[0]['last_activity']
    
    business_client.post('/projects/')
    response = business_client.get('/api/users/')
    response_data = response.json()
    after_timestamp = response_data[0]['last_activity']
    
    assert datetime.fromisoformat(after_timestamp) > datetime.fromisoformat(before_timestamp)

