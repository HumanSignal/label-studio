from organizations.tests.factories import OrganizationFactory
from rest_framework.test import APITestCase
from users.models import User
from users.tests.factories import UserFactory


class TestUserDeleteAuthzAPI(APITestCase):
    """Hard-deleting an account must not be weaker than removing a member from the organization."""

    def setUp(self):
        self.organization = OrganizationFactory()
        self.owner = self.organization.created_by
        self.member = UserFactory(active_organization=self.organization)
        self.other_member = UserFactory(active_organization=self.organization)

    def test_member_cannot_delete_another_member(self):
        self.client.force_authenticate(self.member)

        response = self.client.delete(f'/api/users/{self.other_member.id}/')

        assert response.status_code == 403
        assert User.objects.filter(pk=self.other_member.id).exists()

    def test_member_cannot_delete_self(self):
        """Removing a member is owner-only and self-removal is refused; hard delete follows the same rule."""
        self.client.force_authenticate(self.member)

        response = self.client.delete(f'/api/users/{self.member.id}/')

        assert response.status_code == 403
        assert User.objects.filter(pk=self.member.id).exists()

    def test_owner_can_delete_member(self):
        self.client.force_authenticate(self.owner)

        response = self.client.delete(f'/api/users/{self.member.id}/')

        assert response.status_code == 204
        assert not User.objects.filter(pk=self.member.id).exists()

    def test_organization_owner_cannot_be_deleted(self):
        """created_by is SET_NULL: deleting the owner would break organization administration forever."""
        self.client.force_authenticate(self.owner)

        response = self.client.delete(f'/api/users/{self.owner.id}/')

        assert response.status_code == 403
        assert User.objects.filter(pk=self.owner.id).exists()
        self.organization.refresh_from_db()
        assert self.organization.created_by_id == self.owner.id
