from django.test import TestCase, override_settings
from django.urls import reverse
from organizations.models import Organization, OrganizationMember
from rest_framework import status
from rest_framework.test import APIClient
from users.tests.factories import UserFactory


class UserListQueryOptimizationTest(TestCase):
    """Test that GET /api/users uses select_related/prefetch_related to avoid N+1 queries."""

    def setUp(self):
        self.client = APIClient()
        self.owner = UserFactory()
        self.org = Organization.create_organization(created_by=self.owner, title='Test Org')
        self.owner.active_organization = self.org
        self.owner.save(update_fields=['active_organization'])
        OrganizationMember.objects.get_or_create(user=self.owner, organization=self.org)
        self.client.force_authenticate(user=self.owner)

    def _create_users(self, count: int) -> list:
        return [UserFactory(active_organization=self.org) for _ in range(count)]

    def test_list_query_count_does_not_scale_with_user_count(self):
        """The number of queries should be constant regardless of how many users are in the org."""
        self._create_users(5)
        with self.assertNumQueries(3) as ctx_small:
            response_small = self.client.get(reverse('user-list'))
        self.assertEqual(response_small.status_code, status.HTTP_200_OK)
        baseline = len(ctx_small.captured_queries)

        self._create_users(20)
        with self.assertNumQueries(baseline):
            response_large = self.client.get(reverse('user-list'))
        self.assertEqual(response_large.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response_large.data), 26)

    def test_list_returns_active_organization_meta(self):
        """Verify that active_organization_meta is populated correctly with prefetch."""
        self._create_users(3)
        response = self.client.get(reverse('user-list'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        for user_data in response.data:
            self.assertIn('active_organization_meta', user_data)
            meta = user_data['active_organization_meta']
            self.assertIn('title', meta)
            self.assertIn('email', meta)

    def test_list_deleted_member_shown_as_deleted(self):
        """Verify that soft-deleted org members are shown as 'Deleted User' with prefetch."""
        users = self._create_users(2)
        om = OrganizationMember.objects.get(user=users[0], organization=self.org)
        om.soft_delete()

        response = self.client.get(reverse('user-list'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        deleted_user_data = next(u for u in response.data if u['id'] == users[0].id)
        self.assertEqual(deleted_user_data['first_name'], 'Deleted')
        self.assertEqual(deleted_user_data['last_name'], 'User')

    def test_retrieve_still_works(self):
        """Verify that GET /api/users/<id> still works with the optimized queryset."""
        users = self._create_users(1)
        response = self.client.get(reverse('user-detail', args=[users[0].id]))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['id'], users[0].id)
