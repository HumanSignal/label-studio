"""Fixtures for project access predicate tests."""

from types import SimpleNamespace

from organizations.tests.factories import OrganizationFactory
from projects.models import ProjectMember
from projects.tests.factories import ProjectFactory
from users.tests.factories import UserFactory


def make_access_world():
    """Build the organization, projects, and users the access tests share.

    ``owner`` is the organization creator. ``creator`` created project 1.
    ``member_a`` is an enabled member of project 1 only; ``member_b`` of
    project 2 only. ``unassigned`` belongs to the organization but the only
    project row is disabled. ``outsider`` belongs to a different organization.
    """
    organization = OrganizationFactory()
    owner = organization.created_by
    creator = UserFactory(active_organization=organization)
    member_a = UserFactory(active_organization=organization)
    member_b = UserFactory(active_organization=organization)
    unassigned = UserFactory(active_organization=organization)
    outsider_organization = OrganizationFactory()
    outsider = outsider_organization.created_by

    project_1 = ProjectFactory(organization=organization, created_by=creator)
    project_2 = ProjectFactory(organization=organization, created_by=owner)

    ProjectMember.objects.create(project=project_1, user=member_a, enabled=True)
    ProjectMember.objects.create(project=project_2, user=member_b, enabled=True)
    ProjectMember.objects.create(project=project_1, user=unassigned, enabled=False)

    return SimpleNamespace(
        organization=organization,
        owner=owner,
        creator=creator,
        member_a=member_a,
        member_b=member_b,
        unassigned=unassigned,
        outsider=outsider,
        outsider_organization=outsider_organization,
        project_1=project_1,
        project_2=project_2,
    )
