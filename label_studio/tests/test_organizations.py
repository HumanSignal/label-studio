"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license."""

import pytest
from organizations.models import Organization, OrganizationMember
from tasks.models import Task
from tests.utils import make_annotation
from users.models import User


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


@pytest.mark.django_db
def test_organization_member_retrieve_same_user(business_client, configured_project):
    user = business_client.user
    organization = business_client.organization
    task = Task.objects.filter(project=configured_project).first()
    make_annotation({'completed_by': user}, task_id=task.id)
    response = business_client.get(f'/api/organizations/{organization.id}/memberships/{user.id}/')
    response_data = response.json()
    assert response_data['user'] == user.id
    assert response_data['organization'] == organization.id
    assert response_data['annotations_count'] == 1
    assert response_data['contributed_projects_count'] == 1


@pytest.mark.django_db
def test_organization_member_retrieve_other_user_in_org(business_client):
    organization = business_client.organization
    other_user = User.objects.create(email='other_user@pytest.net')
    OrganizationMember.objects.create(user=other_user, organization=organization)
    response = business_client.get(f'/api/organizations/{organization.id}/memberships/{other_user.id}/')
    response_data = response.json()
    print(response_data)
    assert response_data['user'] == other_user.id
    assert response_data['organization'] == organization.id
    assert response_data['annotations_count'] == 0
    assert response_data['contributed_projects_count'] == 0


@pytest.mark.django_db
def test_organization_member_retrieve_not_active_org(business_client):
    user = business_client.user
    other_user = User.objects.create(email='other_user@pytest.net')
    other_organization = Organization.create_organization(created_by=other_user)
    OrganizationMember.objects.create(user=user, organization=other_organization)
    response = business_client.get(f'/api/organizations/{other_organization.id}/memberships/{user.id}/')
    assert response.status_code == 403
