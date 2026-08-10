from organizations.tests.factories import OrganizationFactory
from projects.models import ProjectMember
from projects.tests.factories import ProjectFactory
from rest_framework.test import APITestCase
from users.tests.factories import UserFactory


class TestUsersListAPI(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.organization = OrganizationFactory()
        cls.owner = cls.organization.created_by
        cls.project = ProjectFactory(organization=cls.organization, created_by=cls.owner)
        cls.project_member = UserFactory(active_organization=cls.organization)
        cls.organization_only_user = UserFactory(active_organization=cls.organization)
        ProjectMember.objects.create(user=cls.project_member, project=cls.project)

    def test_public_list_contract_remains_an_unpaginated_array(self):
        """Internal picker parameters must not change the public users response shape."""
        self.client.force_authenticate(self.owner)

        response = self.client.get(
            f'/api/users/?project={self.project.id}&page=1&page_size=1&search={self.project_member.email}'
        )

        assert response.status_code == 200
        payload = response.json()
        assert isinstance(payload, list)
        assert {self.owner.id, self.project_member.id, self.organization_only_user.id}.issubset(
            {user['id'] for user in payload}
        )
