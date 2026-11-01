import pytest
from organizations.tests.factories import OrganizationFactory
from rest_framework import status
from rest_framework.test import APIClient
from session_policy.models import SessionTimeoutPolicy


@pytest.mark.django_db
def test_session_timeout_policy():
    organization = OrganizationFactory()

    client = APIClient()
    user = organization.created_by
    user.set_password('testpass123')
    user.save()

    # Login to create a session
    response = client.post('/user/login/', {'email': user.email, 'password': 'testpass123'})
    assert response.status_code == status.HTTP_302_FOUND

    # First API call should succeed
    response = client.get('/api/projects/')
    assert response.status_code == status.HTTP_200_OK

    # Get the session timeout policy and set it to 0 minutes
    # Object already exists after the first request since its an AutoOneToOneField
    timeout_policy = SessionTimeoutPolicy.objects.get(organization=organization)
    timeout_policy.max_session_age = 0
    timeout_policy.max_time_between_activity = 0
    timeout_policy.save()

    # Next API call should fail due to session timeout
    response = client.get('/api/projects/')
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
def test_session_policy_api():
    # Create organization and user
    organization = OrganizationFactory()
    client = APIClient()
    user = organization.created_by
    user.set_password('testpass123')
    user.save()

    # Login to create a session
    response = client.post('/user/login/', {'email': user.email, 'password': 'testpass123'})
    assert response.status_code == status.HTTP_302_FOUND

    # Get initial session policy
    response = client.get('/api/session-policy/')
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data['max_session_age'] == 8 * 24 * 60  # 8 days in minutes
    assert data['max_time_between_activity'] == 3 * 24 * 60  # 3 days in minutes

    # Update session policy
    new_policy = {
        'max_session_age': 60,  # 1 hour
        'max_time_between_activity': 30,  # 30 minutes
    }
    response = client.patch('/api/session-policy/', new_policy, format='json')
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data['max_session_age'] == new_policy['max_session_age']
    assert data['max_time_between_activity'] == new_policy['max_time_between_activity']

    # Get updated session policy
    response = client.get('/api/session-policy/')
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data['max_session_age'] == new_policy['max_session_age']
    assert data['max_time_between_activity'] == new_policy['max_time_between_activity']


@pytest.mark.django_db
def test_session_policy_permission_is_scoped_to_its_organization():
    policy = SessionTimeoutPolicy.objects.create(organization=OrganizationFactory())
    other_organization_user = OrganizationFactory().created_by

    assert policy.has_permission(policy.organization.created_by)
    assert not policy.has_permission(other_organization_user)
