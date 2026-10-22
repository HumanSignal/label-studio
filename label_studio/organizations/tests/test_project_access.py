"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license."""

from datetime import timedelta

from core.permissions import all_permissions
from django.utils import timezone
from organizations.api import OrganizationMemberListAPI
from organizations.models import OrganizationMember
from projects.access import can_access_project, can_manage_project
from projects.models import ProjectMember
from projects.tests.access_setup import make_access_world
from rest_framework.request import Request
from rest_framework.test import APIRequestFactory, APITestCase, force_authenticate
from tasks.models import TaskLock
from tasks.tests.factories import AnnotationFactory, TaskFactory


class OrganizationAccessTests(APITestCase):
    def test_rejoining_organization_does_not_restore_project_member(self):
        world = make_access_world()
        task = TaskFactory(project=world.project_1)
        TaskLock.objects.create(task=task, user=world.member_a, expire_at=timezone.now() + timedelta(minutes=5))
        membership = OrganizationMember.objects.get(user=world.member_a, organization=world.project_1.organization)
        membership.soft_delete()
        row = ProjectMember.objects.get(project=world.project_1, user=world.member_a)
        self.assertFalse(row.enabled)
        self.assertFalse(TaskLock.objects.filter(task=task, user=world.member_a).exists())
        membership.deleted_at = None
        membership.save(update_fields=['deleted_at'])
        world.member_a.active_organization = world.project_1.organization
        world.member_a.save(update_fields=['active_organization'])
        row.refresh_from_db()
        self.assertFalse(row.enabled)
        self.assertFalse(can_access_project(world.member_a, world.project_1))

    def test_rejoining_creator_restores_manage_without_enabling_disabled_row(self):
        world = make_access_world()
        ProjectMember.objects.create(project=world.project_1, user=world.creator, enabled=False)
        membership = OrganizationMember.objects.get(user=world.creator, organization=world.project_1.organization)
        membership.soft_delete()
        self.assertFalse(can_manage_project(world.creator, world.project_1))
        membership.deleted_at = None
        membership.save(update_fields=['deleted_at'])
        world.creator.active_organization = world.project_1.organization
        world.creator.save(update_fields=['active_organization'])
        row = ProjectMember.objects.get(project=world.project_1, user=world.creator)
        self.assertFalse(row.enabled)
        self.assertTrue(can_manage_project(world.creator, world.project_1))

    def test_add_user_does_not_restore_disabled_project_member(self):
        world = make_access_world()
        membership = OrganizationMember.objects.get(user=world.member_a, organization=world.project_1.organization)
        membership.soft_delete()
        row = ProjectMember.objects.get(project=world.project_1, user=world.member_a)
        self.assertFalse(row.enabled)
        world.project_1.organization.add_user(world.member_a)
        row.refresh_from_db()
        self.assertFalse(row.enabled)

    def test_member_list_and_invite_reset_are_owner_only(self):
        world = make_access_world()
        memberships = f'/api/organizations/{world.organization.id}/memberships'
        self.client.force_authenticate(world.member_a)
        listed = self.client.get(memberships)
        self.assertEqual(listed.status_code, 403)
        reset = self.client.post('/api/invite/reset-token')
        self.assertEqual(reset.status_code, 403)
        token_before = world.organization.token

        self.client.force_authenticate(world.owner)
        listed = self.client.get(memberships)
        self.assertEqual(listed.status_code, 200)
        reset = self.client.post('/api/invite/reset-token')
        self.assertEqual(reset.status_code, 201)
        world.organization.refresh_from_db()
        self.assertNotEqual(world.organization.token, token_before)

    def test_organization_member_list_get_declares_organizations_change(self):
        self.assertEqual(
            OrganizationMemberListAPI.permission_required.GET,
            all_permissions.organizations_change,
        )

    def test_contributed_project_fields_follow_visible_projects(self):
        world = make_access_world()
        world.project_1.title = 'visible-annotated-project'
        world.project_1.save(update_fields=['title'])
        world.project_2.title = 'hidden-contributed-project'
        world.project_2.save(update_fields=['title'])
        AnnotationFactory(
            task=TaskFactory(project=world.project_1),
            project=world.project_1,
            completed_by=world.owner,
        )
        AnnotationFactory(
            task=TaskFactory(project=world.project_2),
            project=world.project_2,
            completed_by=world.owner,
        )

        self.client.force_authenticate(world.member_a)
        response = self.client.get(
            f'/api/organizations/{world.organization.id}/memberships/{world.owner.id}/',
            {'contributed_to_projects': 1},
        )
        self.assertEqual(response.status_code, 200)
        body = response.json()
        created_titles = [row['title'] for row in body['created_projects'] or []]
        contributed_titles = [row['title'] for row in body['contributed_to_projects'] or []]
        self.assertNotIn('hidden-contributed-project', created_titles)
        self.assertNotIn('hidden-contributed-project', contributed_titles)
        self.assertIn('visible-annotated-project', contributed_titles)
        self.assertEqual(body['contributed_projects_count'], 1)
        self.assertEqual(body['annotations_count'], 1)

        self.client.force_authenticate(world.owner)
        owner_response = self.client.get(
            f'/api/organizations/{world.organization.id}/memberships/{world.owner.id}/',
        )
        self.assertEqual(owner_response.status_code, 200)
        self.assertEqual(owner_response.json()['annotations_count'], 2)

    def test_member_detail_get_requires_the_active_organization(self):
        world = make_access_world()
        self.assertTrue(
            OrganizationMember.objects.filter(
                user=world.member_a,
                organization=world.organization,
                deleted_at__isnull=True,
            ).exists()
        )
        world.member_a.active_organization = world.outsider_organization
        world.member_a.save(update_fields=['active_organization'])

        self.client.force_authenticate(world.member_a)
        hidden = self.client.get(f'/api/organizations/{world.organization.id}/memberships/{world.owner.id}/')
        self.assertEqual(hidden.status_code, 404)
        self.assertNotIn('user', hidden.json())
        self.assertNotIn(world.owner.email, hidden.content.decode())

        world.member_a.active_organization = world.organization
        world.member_a.save(update_fields=['active_organization'])
        visible = self.client.get(f'/api/organizations/{world.organization.id}/memberships/{world.owner.id}/')
        self.assertEqual(visible.status_code, 200)
        self.assertEqual(visible.json()['user'], world.owner.id)

    def test_member_list_project_maps_drop_hidden_projects(self):
        world = make_access_world()
        world.project_2.title = 'hidden-from-member-list'
        world.project_2.save(update_fields=['title'])
        AnnotationFactory(
            task=TaskFactory(project=world.project_2),
            project=world.project_2,
            completed_by=world.member_b,
        )
        django_request = APIRequestFactory().get(
            f'/api/organizations/{world.organization.id}/memberships',
            {'contributed_to_projects': '1'},
        )
        force_authenticate(django_request, user=world.member_a)
        view = OrganizationMemberListAPI()
        view.request = Request(django_request)
        view.request.user = world.member_a
        view.kwargs = {'pk': world.organization.id}
        view.format_kwarg = None

        created_titles = [
            project['title'] for projects in view._get_created_projects_map().values() for project in projects
        ]
        contributed_titles = [
            project['title']
            for projects in view._get_contributed_to_projects_map().values()
            for project in projects
        ]
        self.assertNotIn('hidden-from-member-list', created_titles)
        self.assertNotIn('hidden-from-member-list', contributed_titles)
