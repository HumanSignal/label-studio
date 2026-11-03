"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license."""

from django.urls import reverse
from django.utils import timezone
from organizations.models import OrganizationMember
from projects.models import ProjectMember
from projects.tests.access_setup import make_access_world
from rest_framework.test import APITestCase
from tasks.models import Annotation
from tasks.tests.factories import AnnotationFactory, TaskFactory
from users.tests.factories import UserFactory

IMPLICIT_MANAGER = 'This user already manages the project. Membership cannot grant or revoke that access.'
INACTIVE_TARGET = 'Select an active user in this organization.'
MEMBER_FIELDS = {'id', 'display_name', 'email', 'enabled', 'created_at', 'updated_at', 'access_source'}
AVAILABLE_FIELDS = {'id', 'display_name', 'email'}


class MemberApiTests(APITestCase):
    def test_member_grant_is_idempotent_and_hides_other_organizations(self):
        world = make_access_world()
        self.client.force_authenticate(world.creator)
        url = reverse(
            'projects:api:project-member',
            kwargs={'pk': world.project_1.id, 'user_id': world.unassigned.id},
        )
        first = self.client.put(url)
        second = self.client.put(url)
        self.assertEqual(first.status_code, 200)
        self.assertEqual(second.status_code, 200)
        self.assertEqual(first.json()['id'], second.json()['id'])
        self.assertEqual(first.json()['access_source'], 'member')
        self.assertTrue(first.json()['enabled'])
        outsider = self.client.put(
            reverse('projects:api:project-member', kwargs={'pk': world.project_1.id, 'user_id': world.outsider.id})
        )
        self.assertEqual(outsider.status_code, 400)
        self.assertNotIn(world.outsider.email, outsider.content.decode())
        self.assertEqual(outsider.json()['detail'], INACTIVE_TARGET)
        self.assertEqual(ProjectMember.objects.filter(project=world.project_1, user=world.unassigned).count(), 1)

    def test_member_cannot_call_member_endpoints(self):
        world = make_access_world()
        before = self._membership_rows()
        self.client.force_authenticate(world.member_a)
        responses = [
            self.client.get(self._list_url(world.project_1.id)),
            self.client.get(self._available_url(world.project_1.id)),
            self.client.put(self._member_url(world.project_1.id, world.member_b.id)),
            self.client.delete(self._member_url(world.project_1.id, world.member_a.id)),
        ]
        self.assertEqual([response.status_code for response in responses], [403, 403, 403, 403])
        self.assertEqual(self._membership_rows(), before)

    def test_hidden_project_is_not_found(self):
        world = make_access_world()
        self.client.force_authenticate(world.member_a)
        responses = [
            self.client.get(self._list_url(world.project_2.id)),
            self.client.get(self._available_url(world.project_2.id)),
            self.client.put(self._member_url(world.project_2.id, world.unassigned.id)),
            self.client.delete(self._member_url(world.project_2.id, world.member_b.id)),
            self.client.get(self._list_url(0)),
        ]
        self.assertEqual([response.status_code for response in responses], [404, 404, 404, 404, 404])

    def test_implicit_creator_cannot_be_granted_or_revoked(self):
        world = make_access_world()
        self.client.force_authenticate(world.owner)
        url = self._member_url(world.project_1.id, world.creator.id)
        granted = self.client.put(url, {'role': 'member', 'project': world.project_2.id}, format='json')
        revoked = self.client.delete(url, {'role': 'member', 'organization': world.organization.id}, format='json')
        self.assertEqual(granted.status_code, 400)
        self.assertEqual(revoked.status_code, 400)
        self.assertEqual(granted.json()['detail'], IMPLICIT_MANAGER)
        self.assertEqual(revoked.json()['detail'], IMPLICIT_MANAGER)
        self.assertFalse(ProjectMember.objects.filter(project=world.project_1, user=world.creator).exists())

    def test_delete_member_keeps_annotations_and_is_idempotent(self):
        world = make_access_world()
        task = TaskFactory(project=world.project_1)
        annotation = AnnotationFactory(task=task, project=world.project_1, completed_by=world.member_a)
        self.client.force_authenticate(world.creator)
        url = self._member_url(world.project_1.id, world.member_a.id)

        first = self.client.delete(url)
        second = self.client.delete(url)

        self.assertEqual(first.status_code, 204)
        self.assertEqual(second.status_code, 204)
        self.assertEqual(first.content, b'')
        kept = Annotation.objects.get(pk=annotation.pk)
        self.assertEqual(kept.completed_by_id, world.member_a.id)
        membership = ProjectMember.objects.get(project=world.project_1, user=world.member_a)
        self.assertFalse(membership.enabled)

    def test_member_list_includes_implicit_managers_and_disabled_members(self):
        world = make_access_world()
        world.member_a.first_name = 'Ann'
        world.member_a.last_name = 'Member'
        world.member_a.save(update_fields=['first_name', 'last_name'])
        world.unassigned.first_name = ''
        world.unassigned.last_name = ''
        world.unassigned.save(update_fields=['first_name', 'last_name'])
        world.owner.is_active = False
        world.owner.save(update_fields=['is_active'])

        self.client.force_authenticate(world.creator)
        response = self.client.get(self._list_url(world.project_1.id))

        self.assertEqual(response.status_code, 200)
        rows = {row['id']: row for row in response.json()['results']}
        self.assertEqual(
            set(rows),
            {world.owner.id, world.creator.id, world.member_a.id, world.unassigned.id},
        )
        self.assertEqual(set(rows[world.member_a.id]), MEMBER_FIELDS)
        self.assertEqual(rows[world.owner.id]['access_source'], 'organization_owner')
        self.assertTrue(rows[world.owner.id]['enabled'])
        self.assertIsNone(rows[world.owner.id]['created_at'])
        self.assertIsNone(rows[world.owner.id]['updated_at'])
        self.assertEqual(rows[world.creator.id]['access_source'], 'project_creator')
        self.assertTrue(rows[world.creator.id]['enabled'])
        self.assertIsNone(rows[world.creator.id]['created_at'])
        self.assertIsNone(rows[world.creator.id]['updated_at'])
        self.assertEqual(rows[world.member_a.id]['access_source'], 'member')
        self.assertEqual(rows[world.member_a.id]['display_name'], 'Ann Member')
        self.assertEqual(rows[world.member_a.id]['email'], world.member_a.email)
        self.assertTrue(rows[world.member_a.id]['enabled'])
        self.assertIsNotNone(rows[world.member_a.id]['created_at'])
        self.assertIsNotNone(rows[world.member_a.id]['updated_at'])
        self.assertEqual(rows[world.unassigned.id]['access_source'], 'member')
        self.assertEqual(rows[world.unassigned.id]['display_name'], world.unassigned.email)
        self.assertFalse(rows[world.unassigned.id]['enabled'])

    def test_owner_who_created_the_project_is_one_organization_owner_row(self):
        world = make_access_world()
        self.client.force_authenticate(world.owner)
        response = self.client.get(self._list_url(world.project_2.id))
        self.assertEqual(response.status_code, 200)
        rows = response.json()['results']
        owner_rows = [row for row in rows if row['id'] == world.owner.id]
        self.assertEqual(len(owner_rows), 1)
        self.assertEqual(owner_rows[0]['access_source'], 'organization_owner')
        self.assertTrue(owner_rows[0]['enabled'])
        self.assertIsNone(owner_rows[0]['created_at'])
        self.assertIsNone(owner_rows[0]['updated_at'])
        self.assertEqual(
            {row['id']: row['access_source'] for row in rows},
            {world.owner.id: 'organization_owner', world.member_b.id: 'member'},
        )

    def test_moved_creator_stays_implicit_and_cannot_be_granted(self):
        world = make_access_world()
        world.creator.active_organization = world.outsider_organization
        world.creator.save(update_fields=['active_organization'])
        self.client.force_authenticate(world.owner)

        listed = self.client.get(self._list_url(world.project_1.id))
        creator_row = next(row for row in listed.json()['results'] if row['id'] == world.creator.id)
        self.assertEqual(creator_row['access_source'], 'project_creator')
        self.assertTrue(creator_row['enabled'])

        denied = self.client.put(self._member_url(world.project_1.id, world.creator.id))
        self.assertEqual(denied.status_code, 400)
        self.assertEqual(denied.json()['detail'], IMPLICIT_MANAGER)
        self.assertFalse(ProjectMember.objects.filter(project=world.project_1, user=world.creator).exists())

        available = self.client.get(self._available_url(world.project_1.id))
        available_ids = {row['id'] for row in available.json()['results']}
        self.assertNotIn(world.creator.id, available_ids)

    def test_available_members_are_active_organization_users_that_can_be_enabled(self):
        world = make_access_world()
        world.member_b.first_name = 'Bea'
        world.member_b.last_name = 'Candidate'
        world.member_b.save(update_fields=['first_name', 'last_name'])
        world.unassigned.first_name = 'Una'
        world.unassigned.last_name = 'Reusable'
        world.unassigned.save(update_fields=['first_name', 'last_name'])
        inactive = UserFactory(active_organization=world.organization, first_name='Idle', last_name='Account')
        inactive.is_active = False
        inactive.save(update_fields=['is_active'])
        removed = UserFactory(active_organization=world.organization, first_name='Gone', last_name='Member')
        OrganizationMember.objects.filter(user=removed, organization=world.organization).update(deleted_at=timezone.now())
        user_count = UserFactory._meta.model.objects.count()
        member_count = OrganizationMember.objects.count()

        self.client.force_authenticate(world.creator)
        response = self.client.get(self._available_url(world.project_1.id))

        self.assertEqual(response.status_code, 200)
        rows = {row['id']: row for row in response.json()['results']}
        self.assertEqual(set(rows), {world.member_b.id, world.unassigned.id})
        self.assertEqual(set(rows[world.member_b.id]), AVAILABLE_FIELDS)
        self.assertEqual(rows[world.member_b.id]['display_name'], 'Bea Candidate')
        self.assertEqual(rows[world.member_b.id]['email'], world.member_b.email)
        self.assertNotIn(world.member_a.id, rows)
        self.assertNotIn(world.owner.id, rows)
        self.assertNotIn(world.creator.id, rows)
        self.assertNotIn(world.outsider.id, rows)
        self.assertNotIn(inactive.id, rows)
        self.assertNotIn(removed.id, rows)

        by_email = self.client.get(self._available_url(world.project_1.id), {'search': world.unassigned.email})
        self.assertEqual([row['id'] for row in by_email.json()['results']], [world.unassigned.id])
        by_name = self.client.get(self._available_url(world.project_1.id), {'search': 'Candidate'})
        self.assertEqual([row['id'] for row in by_name.json()['results']], [world.member_b.id])
        by_full_name = self.client.get(self._available_url(world.project_1.id), {'search': 'Bea Candidate'})
        self.assertEqual([row['id'] for row in by_full_name.json()['results']], [world.member_b.id])

        self.assertEqual(UserFactory._meta.model.objects.count(), user_count)
        self.assertEqual(OrganizationMember.objects.count(), member_count)

    def test_grant_ignores_role_project_and_organization_in_the_body(self):
        world = make_access_world()
        self.client.force_authenticate(world.creator)
        response = self.client.put(
            self._member_url(world.project_1.id, world.unassigned.id),
            {
                'role': 'manager',
                'project': world.project_2.id,
                'organization': world.outsider_organization.id,
            },
            format='json',
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['id'], world.unassigned.id)
        self.assertEqual(response.json()['access_source'], 'member')
        self.assertTrue(ProjectMember.objects.get(project=world.project_1, user=world.unassigned).enabled)
        self.assertFalse(ProjectMember.objects.filter(project=world.project_2, user=world.unassigned).exists())
        self.assertFalse(
            OrganizationMember.objects.filter(
                user=world.unassigned, organization=world.outsider_organization, deleted_at__isnull=True
            ).exists()
        )

    def test_member_list_uses_page_and_page_size(self):
        world = make_access_world()
        extra = []
        for index in range(20):
            user = UserFactory(
                active_organization=world.organization,
                first_name='Extra',
                last_name=f'Member{index}',
            )
            ProjectMember.objects.create(project=world.project_1, user=user, enabled=False)
            extra.append(user)
        expected_ids = sorted(
            [world.owner.id, world.creator.id, world.member_a.id, world.unassigned.id, *[user.id for user in extra]]
        )
        self.client.force_authenticate(world.creator)

        first_page = self.client.get(self._list_url(world.project_1.id))
        second_page = self.client.get(self._list_url(world.project_1.id), {'page': 2})
        sized = self.client.get(self._list_url(world.project_1.id), {'page_size': 1, 'page': 1})
        unlimited = self.client.get(self._list_url(world.project_1.id), {'page_size': -1})

        self.assertEqual(first_page.status_code, 200)
        self.assertEqual(first_page.json()['count'], 24)
        self.assertEqual([row['id'] for row in first_page.json()['results']], expected_ids[:20])
        self.assertEqual([row['id'] for row in second_page.json()['results']], expected_ids[20:])
        self.assertEqual([row['id'] for row in sized.json()['results']], expected_ids[:1])
        self.assertEqual([row['id'] for row in unlimited.json()['results']], expected_ids)

    def _list_url(self, project_id):
        return reverse('projects:api:project-member-list', kwargs={'pk': project_id})

    def _available_url(self, project_id):
        return reverse('projects:api:project-member-available', kwargs={'pk': project_id})

    def _member_url(self, project_id, user_id):
        return reverse('projects:api:project-member', kwargs={'pk': project_id, 'user_id': user_id})

    def _membership_rows(self):
        return list(ProjectMember.objects.order_by('id').values_list('id', 'project_id', 'user_id', 'enabled'))
