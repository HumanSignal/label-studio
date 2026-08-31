from django.test import TestCase
from organizations.tests.factories import OrganizationFactory
from projects.models import ProjectMember
from projects.tests.factories import ProjectFactory
from users.project_access import get_user_ids_in_projects
from users.tests.factories import UserFactory


class TestGetUserIdsInProjects(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.org = OrganizationFactory()
        cls.owner = cls.org.created_by
        cls.project = ProjectFactory(organization=cls.org, created_by=cls.owner)
        cls.other_org = OrganizationFactory()
        cls.outsider = UserFactory(active_organization=cls.other_org)

    def test_empty_project_ids_returns_empty(self):
        assert get_user_ids_in_projects(project_ids=[], organization_id=self.org.id) == []

    def test_direct_project_members_included(self):
        member = UserFactory(active_organization=self.org)
        ProjectMember.objects.create(user=member, project=self.project)

        result = get_user_ids_in_projects(project_ids=[self.project.id], organization_id=self.org.id)

        assert set(result) == {member.id}

    def test_non_member_excluded(self):
        non_member = UserFactory(active_organization=self.org)

        result = get_user_ids_in_projects(project_ids=[self.project.id], organization_id=self.org.id)

        assert non_member.id not in result

    def test_user_from_other_org_excluded_even_when_member_elsewhere(self):
        other_project = ProjectFactory(organization=self.other_org, created_by=self.outsider)
        ProjectMember.objects.create(user=self.outsider, project=other_project)

        result = get_user_ids_in_projects(project_ids=[self.project.id], organization_id=self.org.id)

        assert self.outsider.id not in result
