import time

from django.conf import settings
from django.test import TestCase
from django.urls import reverse
from label_studio.core.argparser import parse_input_args
from organizations.models import OrganizationMember
from organizations.tests.factories import OrganizationFactory
from projects.models import ProjectMember
from projects.tests.access_setup import make_access_world
from projects.tests.factories import ProjectFactory
from rest_framework.test import APITestCase
from server import _create_user
from users.admin import user_may_use_django_admin
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


def _login(client, user):
    """Start a session the inactivity middleware will accept."""
    client.force_login(user)
    session = client.session
    session['last_login'] = time.time()
    session.save()
    client.cookies[settings.SESSION_COOKIE_NAME] = session.session_key


ORDINARY_WHOAMI_PERMISSIONS = [
    'users.token.any',
    'avatar.any',
]

OWNER_WHOAMI_PERMISSIONS = ORDINARY_WHOAMI_PERMISSIONS + [
    'projects.create',
    'organizations.change',
    'organizations.invite',
    'organizations.delete',
    'organizations.create',
]


class UserAccountAccessTests(APITestCase):
    def test_whoami_permissions_are_account_and_organization_only(self):
        world = make_access_world()
        self.client.force_authenticate(world.member_a)
        member = self.client.get('/api/current-user/whoami')
        self.assertEqual(member.status_code, 200)
        self.assertEqual(member.json()['permissions'], ORDINARY_WHOAMI_PERMISSIONS)

        self.client.force_authenticate(world.owner)
        owner = self.client.get('/api/current-user/whoami')
        self.assertEqual(owner.status_code, 200)
        self.assertEqual(owner.json()['permissions'], OWNER_WHOAMI_PERMISSIONS)

        membership = OrganizationMember.objects.get(user=world.owner, organization=world.organization)
        membership.soft_delete()
        world.owner.refresh_from_db()
        removed = self.client.get('/api/current-user/whoami')
        self.assertEqual(removed.json()['permissions'], ORDINARY_WHOAMI_PERMISSIONS)

    def test_user_can_rename_self_but_not_another_user_or_privileged_fields(self):
        world = make_access_world()
        world.member_a.is_staff = False
        world.member_a.is_superuser = False
        world.member_a.save(update_fields=['is_staff', 'is_superuser'])
        original_org = world.member_a.active_organization_id
        self.client.force_authenticate(world.member_a)

        denied = self.client.patch(
            f'/api/users/{world.member_b.id}/',
            {'first_name': 'Hijacked'},
            format='json',
        )
        self.assertEqual(denied.status_code, 403)
        world.member_b.refresh_from_db()
        self.assertNotEqual(world.member_b.first_name, 'Hijacked')

        response = self.client.patch(
            f'/api/users/{world.member_a.id}/',
            {
                'first_name': 'Renamed',
                'is_staff': True,
                'is_superuser': True,
                'active_organization': world.outsider_organization.id,
            },
            format='json',
        )
        self.assertEqual(response.status_code, 200)
        world.member_a.refresh_from_db()
        self.assertEqual(world.member_a.first_name, 'Renamed')
        self.assertFalse(world.member_a.is_staff)
        self.assertFalse(world.member_a.is_superuser)
        self.assertEqual(world.member_a.active_organization_id, original_org)

    def test_staff_superuser_member_cannot_open_hidden_project_or_admin(self):
        world = make_access_world()
        world.member_a.is_staff = True
        world.member_a.is_superuser = True
        world.member_a.save(update_fields=['is_staff', 'is_superuser'])
        self.assertFalse(user_may_use_django_admin(world.member_a))

        self.client.force_authenticate(world.member_a)
        hidden = self.client.get(reverse('projects:api:project-detail', kwargs={'pk': world.project_2.id}))
        self.assertEqual(hidden.status_code, 404)

        _login(self.client, world.member_a)
        admin = self.client.get('/admin/')
        self.assertNotEqual(admin.status_code, 200)
        self.assertNotIn('/user/login/', admin.get('Location') or '')

    def test_staff_organization_owner_can_open_admin(self):
        world = make_access_world()
        world.owner.is_staff = True
        world.owner.is_superuser = False
        world.owner.save(update_fields=['is_staff', 'is_superuser'])
        self.assertTrue(user_may_use_django_admin(world.owner))

        _login(self.client, world.owner)
        admin = self.client.get('/admin/')
        self.assertEqual(admin.status_code, 200)

    def test_superuser_alone_cannot_open_admin(self):
        world = make_access_world()
        world.member_a.is_staff = False
        world.member_a.is_superuser = True
        world.member_a.save(update_fields=['is_staff', 'is_superuser'])
        self.assertFalse(user_may_use_django_admin(world.member_a))
        _login(self.client, world.member_a)
        admin = self.client.get('/admin/')
        self.assertNotEqual(admin.status_code, 200)

    def test_soft_deleted_staff_owner_cannot_open_admin(self):
        world = make_access_world()
        world.owner.is_staff = True
        world.owner.save(update_fields=['is_staff'])
        OrganizationMember.objects.get(user=world.owner, organization=world.organization).soft_delete()
        world.owner.refresh_from_db()
        self.assertFalse(user_may_use_django_admin(world.owner))
        _login(self.client, world.owner)
        admin = self.client.get('/admin/')
        self.assertNotEqual(admin.status_code, 200)

    def test_create_user_does_not_grant_staff_or_superuser(self):
        input_args = parse_input_args(['init', 'test', '--username', 'cli-user@localhost', '--password', '12345678'])
        user = _create_user(input_args, {})
        self.assertFalse(user.is_staff)
        self.assertFalse(user.is_superuser)

    def test_project_shells_do_not_embed_unauthorized_project_title(self):
        world = make_access_world()
        hidden_title = 'hidden-project-title-zz9'
        world.project_2.title = hidden_title
        world.project_2.save(update_fields=['title'])
        _login(self.client, world.member_a)

        settings_page = self.client.get(f'/projects/{world.project_2.id}/settings/')
        self.assertNotContains(settings_page, hidden_title)
        data_page = self.client.get(f'/projects/{world.project_2.id}/data/')
        self.assertNotContains(data_page, hidden_title)
