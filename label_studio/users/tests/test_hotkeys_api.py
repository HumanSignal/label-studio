import json
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse
from projects.models import ProjectHotkeyPreference, ProjectMember
from projects.tests.factories import ProjectFactory
from rest_framework import status
from rest_framework.test import APIClient
from users.tests.factories import UserFactory

User = get_user_model()


class UserHotkeysAPITestCase(TestCase):
    """Tests for the UserHotkeysAPI"""

    def setUp(self):
        self.client = APIClient()
        # Create a test user
        self.user = User.objects.create_user(username='testuser', email='test@example.com', password='password123')
        # Set initial hotkeys
        self.user.custom_hotkeys = {
            'editor:save': {'key': 'ctrl+s', 'active': True},
            'editor:find': {'key': 'ctrl+f', 'active': True},
        }
        self.user.save()

        # URL for the hotkeys API
        self.url = reverse('current-user-hotkeys')  # Adjust based on your URL configuration

        # Authenticate the test client
        self.client.force_authenticate(user=self.user)

        # Valid payload for tests
        self.valid_payload = {
            'custom_hotkeys': {
                'editor:save': {'key': 'ctrl+shift+s', 'active': True},
                'editor:new': {'key': 'ctrl+n', 'active': True},
            }
        }

    def test_update_hotkeys_authenticated(self):
        """Test updating hotkeys for authenticated user"""
        response = self.client.patch(self.url, data=json.dumps(self.valid_payload), content_type='application/json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['custom_hotkeys'], self.valid_payload['custom_hotkeys'])

        # Verify user data was updated in database
        user = User.objects.get(id=self.user.id)
        self.assertEqual(user.custom_hotkeys, self.valid_payload['custom_hotkeys'])

    def test_update_hotkeys_unauthenticated(self):
        """Test updating hotkeys fails for unauthenticated user"""
        # Logout/un-authenticate the client
        self.client.force_authenticate(user=None)

        response = self.client.patch(self.url, data=json.dumps(self.valid_payload), content_type='application/json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_update_hotkeys_invalid_data(self):
        """Test updating hotkeys with invalid data"""
        invalid_payload = {'custom_hotkeys': {'editor:save': {'active': True}}}  # Missing 'key'

        response = self.client.patch(self.url, data=json.dumps(invalid_payload), content_type='application/json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_update_hotkeys_partial(self):
        """Test updating only some hotkeys preserves existing configuration"""
        partial_update = {'custom_hotkeys': {'editor:save': {'key': 'ctrl+alt+s', 'active': True}}}

        response = self.client.patch(self.url, data=json.dumps(partial_update), content_type='application/json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Should completely replace the user's hotkeys, not merge them
        user = User.objects.get(id=self.user.id)
        self.assertEqual(user.custom_hotkeys, partial_update['custom_hotkeys'])
        self.assertNotIn('editor:find', user.custom_hotkeys)

    def test_empty_hotkeys(self):
        """Test setting empty hotkeys dictionary"""
        empty_payload = {'custom_hotkeys': {}}

        response = self.client.patch(self.url, data=json.dumps(empty_payload), content_type='application/json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # User should now have empty hotkeys
        user = User.objects.get(id=self.user.id)
        self.assertEqual(user.custom_hotkeys, {})

    def test_missing_required_field(self):
        """Test request with missing required field"""
        invalid_payload = {}  # Missing 'custom_hotkeys'

        response = self.client.patch(self.url, data=json.dumps(invalid_payload), content_type='application/json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_get_hotkeys_authenticated(self):
        """Test retrieving hotkeys for authenticated user"""
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('custom_hotkeys', response.data)

        # Should return the user's current hotkeys
        expected_hotkeys = {
            'editor:save': {'key': 'ctrl+s', 'active': True},
            'editor:find': {'key': 'ctrl+f', 'active': True},
        }
        self.assertEqual(response.data['custom_hotkeys'], expected_hotkeys)

    def test_get_hotkeys_unauthenticated(self):
        """Test retrieving hotkeys fails for unauthenticated user"""
        # Logout/un-authenticate the client
        self.client.force_authenticate(user=None)

        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_get_hotkeys_empty_config(self):
        """Test retrieving hotkeys when user has empty configuration"""
        # Clear the user's hotkeys
        self.user.custom_hotkeys = {}
        self.user.save()

        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['custom_hotkeys'], {})


class ProjectHotkeysAPITestCase(TestCase):
    """Tests for project-scoped personal hotkey preferences."""

    def setUp(self):
        self.client = APIClient()
        self.project = ProjectFactory()
        self.user = UserFactory(active_organization=self.project.organization)
        self.client.force_authenticate(user=self.user)
        self.url = reverse('current-user-hotkeys')
        self.valid_payload = {
            'custom_hotkeys': {
                'editor:save': {'key': 'ctrl+shift+s', 'active': True},
                'editor:new': {'key': 'ctrl+n', 'active': True},
            }
        }

    def test_get_project_hotkeys_without_preference(self):
        """A project with no override returns an empty map without creating membership."""
        assert not ProjectMember.objects.filter(user=self.user, project=self.project).exists()

        response = self.client.get(self.url, {'project': self.project.id})

        assert response.status_code == status.HTTP_200_OK
        assert response.json() == {'custom_hotkeys': {}}
        assert not ProjectMember.objects.filter(user=self.user, project=self.project).exists()

    def test_patch_project_hotkeys_creates_preference_not_membership(self):
        """Saving project hotkeys creates only a preference and leaves account defaults unchanged."""
        account_hotkeys = {'editor:save': {'key': 'ctrl+s', 'active': True}}
        self.user.custom_hotkeys = account_hotkeys
        self.user.save(update_fields=['custom_hotkeys'])
        assert not ProjectMember.objects.filter(user=self.user, project=self.project).exists()

        response = self.client.patch(
            f'{self.url}?project={self.project.id}',
            data=self.valid_payload,
            format='json',
        )

        assert response.status_code == status.HTTP_200_OK
        assert response.json() == self.valid_payload
        assert (
            ProjectHotkeyPreference.objects.get(user=self.user, project=self.project).custom_hotkeys
            == self.valid_payload['custom_hotkeys']
        )
        assert not ProjectMember.objects.filter(user=self.user, project=self.project).exists()
        self.user.refresh_from_db()
        assert self.user.custom_hotkeys == account_hotkeys

    def test_empty_project_hotkeys_deletes_preference(self):
        """Saving an empty project override removes its preference row."""
        ProjectHotkeyPreference.objects.create(
            user=self.user,
            project=self.project,
            custom_hotkeys=self.valid_payload['custom_hotkeys'],
        )

        response = self.client.patch(
            f'{self.url}?project={self.project.id}',
            data={'custom_hotkeys': {}},
            format='json',
        )

        assert response.status_code == status.HTTP_200_OK
        assert response.json() == {'custom_hotkeys': {}}
        assert not ProjectHotkeyPreference.objects.filter(user=self.user, project=self.project).exists()

    def test_project_hotkeys_are_isolated_by_project(self):
        """An override for another project is not returned for the requested project."""
        other_project = ProjectFactory(organization=self.project.organization)
        ProjectHotkeyPreference.objects.create(
            user=self.user,
            project=other_project,
            custom_hotkeys=self.valid_payload['custom_hotkeys'],
        )

        response = self.client.get(self.url, {'project': self.project.id})

        assert response.status_code == status.HTTP_200_OK
        assert response.json() == {'custom_hotkeys': {}}

    def test_project_hotkeys_are_isolated_by_user(self):
        """Another user's override is not returned to the current user."""
        other_user = UserFactory(active_organization=self.project.organization)
        ProjectHotkeyPreference.objects.create(
            user=other_user,
            project=self.project,
            custom_hotkeys=self.valid_payload['custom_hotkeys'],
        )

        response = self.client.get(self.url, {'project': self.project.id})

        assert response.status_code == status.HTTP_200_OK
        assert response.json() == {'custom_hotkeys': {}}

    def test_malformed_project_id_returns_bad_request(self):
        """A non-integer project query parameter returns a validation error."""
        response = self.client.get(self.url, {'project': 'not-an-integer'})

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response.json()['validation_errors'] == {'project': 'Project must be an integer.'}

    def test_present_invalid_project_values_return_bad_request(self):
        """Present project parameters must be canonical positive integers, including on GET."""
        invalid_project_values = (
            '',
            'not-an-integer',
            f'+{self.project.id}',
            f'0{self.project.id}',
            f' {self.project.id}',
        )

        for project_value in invalid_project_values:
            with self.subTest(project_value=project_value):
                response = self.client.get(f'{self.url}?project={project_value}')

                assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_invalid_project_patch_never_updates_account_hotkeys(self):
        """An invalid project scope cannot silently fall back to the account preference."""
        account_hotkeys = {'editor:save': {'key': 'ctrl+s', 'active': True}}
        self.user.custom_hotkeys = account_hotkeys
        self.user.save(update_fields=['custom_hotkeys'])
        invalid_project_values = (
            '',
            'not-an-integer',
            f'+{self.project.id}',
            f'0{self.project.id}',
            f' {self.project.id}',
        )

        for project_value in invalid_project_values:
            with self.subTest(project_value=project_value):
                self.user.custom_hotkeys = account_hotkeys
                self.user.save(update_fields=['custom_hotkeys'])
                ProjectHotkeyPreference.objects.filter(user=self.user).delete()
                response = self.client.patch(
                    f'{self.url}?project={project_value}',
                    data=self.valid_payload,
                    format='json',
                )

                assert response.status_code == status.HTTP_400_BAD_REQUEST
                self.user.refresh_from_db()
                assert self.user.custom_hotkeys == account_hotkeys
                assert not ProjectHotkeyPreference.objects.filter(user=self.user).exists()

    def test_cross_organization_project_returns_not_found(self):
        """A project outside the active organization is concealed with a 404."""
        other_project = ProjectFactory()

        response = self.client.get(self.url, {'project': other_project.id})

        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_same_organization_inaccessible_project_returns_forbidden(self):
        """A same-organization project denied by project permissions returns a 403."""
        with patch('projects.models.Project.has_permission', return_value=False):
            response = self.client.patch(
                f'{self.url}?project={self.project.id}',
                data=self.valid_payload,
                format='json',
            )

        assert response.status_code == status.HTTP_403_FORBIDDEN
        assert not ProjectHotkeyPreference.objects.filter(user=self.user, project=self.project).exists()

    def test_invalid_project_hotkeys_return_bad_request(self):
        """Project-scoped hotkeys use the existing payload validation."""
        invalid_payload = {'custom_hotkeys': {'editor:save': {'active': True}}}

        response = self.client.patch(
            f'{self.url}?project={self.project.id}',
            data=invalid_payload,
            format='json',
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert not ProjectHotkeyPreference.objects.filter(user=self.user, project=self.project).exists()
