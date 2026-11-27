# ---

# test_name: test_docs

# strict: False

# marks:
#   - usefixtures:
#        - django_live_url

# stages:
#   - name: signup
#     request:
#       url: "{django_live_url}/user/signup"
#       data:
#         email: test_suites_user@heartex.com
#         password: qNpC-opxvYm.ttg4
#       method: POST
#     response:
#       status_code: 302
#   - name: get_docs
#     request:
#       url: "{django_live_url}/docs/api?format=openapi"
#       method: GET
#     response:
#       status_code: 200
#       verify_response_with:
#         function: tests.utils:verify_docs
import pytest
from organizations.tests.factories import OrganizationFactory
from rest_framework.test import APIClient
from tests.utils import verify_docs


@pytest.mark.django_db
def test_docs():
    organization = OrganizationFactory()
    user = organization.created_by
    client = APIClient()
    client.force_authenticate(user)

    response = client.get('/docs/api?format=openapi', follow=True)
    assert response.status_code == 200
    verify_docs(response)
