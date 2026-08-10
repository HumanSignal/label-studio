from django.test import SimpleTestCase
from django.urls import path
from drf_spectacular.generators import SchemaGenerator
from users.api import UserHotkeysAPI


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
