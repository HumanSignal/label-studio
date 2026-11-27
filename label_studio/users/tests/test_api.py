from django.test import SimpleTestCase
from django.urls import path
from drf_spectacular.generators import SchemaGenerator
from organizations.tests.factories import OrganizationFactory
from rest_framework.test import APITestCase
from users.api import UserHotkeysAPI
from users.tests.factories import UserFactory


class UserHotkeysOpenAPITestCase(SimpleTestCase):
    def test_project_scope_error_responses_are_documented(self):
        """The public hotkeys operations document every expected project-scope error."""
        schema = SchemaGenerator(patterns=[path('api/current-user/hotkeys/', UserHotkeysAPI.as_view())]).get_schema(
            request=None, public=True
        )
        operations = schema['paths']['/api/current-user/hotkeys/']
        expected_responses = {'200', '400', '401', '403', '404', '500'}

        assert set(operations['get']['responses']) == expected_responses
        assert set(operations['patch']['responses']) == expected_responses


class TestUserUpdateUsernameReadOnly(APITestCase):
    def test_patch_username_is_rejected(self):
        """PATCH /api/users/<id>/ must not change username.

        Username is not unique. Enterprise SSO used to treat a matching username as a
        license superuser, so the field is read-only on user update.
        """
        user = UserFactory(username='member')
        organization = OrganizationFactory(created_by=user)
        user.active_organization = organization
        user.save(update_fields=['active_organization'])
        self.client.force_authenticate(user)

        response = self.client.patch(
            f'/api/users/{user.id}/', {'username': 'license-superuser@example.com'}, format='json'
        )

        assert response.status_code == 405
        user.refresh_from_db()
        assert user.username == 'member'
