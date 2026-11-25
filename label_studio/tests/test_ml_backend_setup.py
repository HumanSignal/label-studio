"""The ML backend /setup call carries no Label Studio credentials (FIT-3273).

Whoever can edit a project's ML backends picks the URL /setup goes to, so a token sent there would reach a server
of their choosing. It used to carry the legacy API token of the user who created the project.
"""

import pytest
from ml.api_connector import MLApi
from projects.models import Project

ML_URL = 'https://test.heartex.mlbackend.com:9090'


def _setup_payloads(ml_backend_mock):
    return [r.json() for r in ml_backend_mock.request_history if r.path.endswith('/setup')]


@pytest.mark.django_db
def test_setup_payload_has_no_access_token(business_client, ml_backend_1):
    project = Project.objects.create(
        title='ml setup', created_by=business_client.user, organization=business_client.organization
    )

    response = MLApi(url=ML_URL).setup(project, extra_params={'threshold': 0.5})

    assert not response.is_error
    [payload] = _setup_payloads(ml_backend_1)
    assert 'access_token' not in payload
    assert project.created_by.auth_token.key not in str(payload)
    assert payload['schema'] == project.label_config
    assert payload['extra_params'] == {'threshold': 0.5}
    assert payload['project'].startswith(f'{project.id}.')
    assert payload['hostname']


@pytest.mark.django_db
def test_connecting_a_backend_sends_no_access_token(business_client, ml_backend_1, mock_gethostbyname):
    project = Project.objects.create(
        title='ml setup', created_by=business_client.user, organization=business_client.organization
    )

    response = business_client.post('/api/ml/', data={'project': project.id, 'url': ML_URL})

    assert response.status_code == 201, response.content
    payloads = _setup_payloads(ml_backend_1)
    assert payloads
    for payload in payloads:
        assert 'access_token' not in payload
        assert project.created_by.auth_token.key not in str(payload)
