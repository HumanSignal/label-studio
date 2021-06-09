"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import pytest


@pytest.mark.django_db
def test_active_organization_filled(business_client):
    response = business_client.get('/api/users/')
    response_data = response.json()
    assert response_data[0]['active_organization'] == business_client.organization.id


@pytest.mark.django_db
def test_api_list_organizations(business_client):
    response = business_client.get('/api/organizations/')
    response_data = response.json()
    assert len(response_data) == 1
    assert response_data[0]['id'] == business_client.organization.id
