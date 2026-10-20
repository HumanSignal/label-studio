"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license."""

from django.test import TestCase
from django.utils import timezone
from organizations.models import OrganizationMember
from projects.membership import grant_project_member, revoke_project_member
from projects.models import ProjectMember
from projects.tests.access_setup import make_access_world
from rest_framework.exceptions import PermissionDenied, ValidationError
from tasks.models import Annotation
from tasks.tests.factories import AnnotationFactory, TaskFactory
from users.tests.factories import UserFactory

IMPLICIT_MANAGER = 'This user already manages the project. Membership cannot grant or revoke that access.'
INACTIVE_TARGET = 'Select an active user in this organization.'


class TestProjectMembership(TestCase):
    def test_repeat_grant_keeps_one_row(self):
        world = make_access_world()
        first = grant_project_member(project=world.project_1, actor=world.creator, target=world.unassigned)
        second = grant_project_member(project=world.project_1, actor=world.creator, target=world.unassigned)
        self.assertEqual(first.id, second.id)
        self.assertEqual(ProjectMember.objects.filter(project=world.project_1, user=world.unassigned).count(), 1)
        self.assertTrue(second.enabled)

    def test_implicit_manager_cannot_be_granted_or_revoked(self):
        world = make_access_world()
        with self.assertRaises(ValidationError) as raised:
            revoke_project_member(project=world.project_1, actor=world.owner, target=world.creator)
        self.assertEqual(
            raised.exception.detail,
            'This user already manages the project. Membership cannot grant or revoke that access.',
        )
        self.assertFalse(ProjectMember.objects.filter(project=world.project_1, user=world.creator).exists())

        with self.assertRaises(ValidationError) as granted:
            grant_project_member(project=world.project_1, actor=world.owner, target=world.creator)
        self.assertEqual(granted.exception.detail, IMPLICIT_MANAGER)
        self.assertFalse(ProjectMember.objects.filter(project=world.project_1, user=world.creator).exists())

        with self.assertRaises(ValidationError) as granted_owner:
            grant_project_member(project=world.project_1, actor=world.creator, target=world.owner)
        self.assertEqual(granted_owner.exception.detail, IMPLICIT_MANAGER)
        self.assertFalse(ProjectMember.objects.filter(project=world.project_1, user=world.owner).exists())

    def test_revoke_missing_row_does_not_create_one(self):
        world = make_access_world()
        self.assertFalse(ProjectMember.objects.filter(project=world.project_1, user=world.member_b).exists())
        self.assertIsNone(revoke_project_member(project=world.project_1, actor=world.creator, target=world.member_b))
        self.assertFalse(ProjectMember.objects.filter(project=world.project_1, user=world.member_b).exists())

    def test_revoke_keeps_annotation_and_regrant_reenables_same_row(self):
        world = make_access_world()
        task = TaskFactory(project=world.project_1)
        annotation = AnnotationFactory(task=task, project=world.project_1, completed_by=world.member_a)
        membership = ProjectMember.objects.get(project=world.project_1, user=world.member_a)

        revoke_project_member(project=world.project_1, actor=world.creator, target=world.member_a)

        membership.refresh_from_db()
        self.assertFalse(membership.enabled)
        kept = Annotation.objects.get(pk=annotation.pk)
        self.assertEqual(kept.completed_by_id, world.member_a.id)
        self.assertEqual(kept.project_id, world.project_1.id)
        self.assertEqual(ProjectMember.objects.filter(project=world.project_1, user=world.member_a).count(), 1)

        restored = grant_project_member(project=world.project_1, actor=world.creator, target=world.member_a)
        self.assertEqual(restored.id, membership.id)
        self.assertTrue(restored.enabled)

    def test_invalid_targets_are_rejected_without_their_email(self):
        world = make_access_world()
        inactive = UserFactory(active_organization=world.organization)
        inactive.is_active = False
        inactive.save(update_fields=['is_active'])
        removed = UserFactory(active_organization=world.organization)
        OrganizationMember.objects.filter(user=removed, organization=world.organization).update(
            deleted_at=timezone.now()
        )

        for target in (world.outsider, inactive, removed):
            self._assert_target_rejected(world, target)

    def test_member_cannot_grant(self):
        world = make_access_world()
        before = self._membership_rows()
        with self.assertRaises(PermissionDenied):
            grant_project_member(project=world.project_1, actor=world.member_a, target=world.unassigned)
        self.assertEqual(self._membership_rows(), before)

    def _assert_target_rejected(self, world, target):
        before = self._membership_rows()
        with self.assertRaises(ValidationError) as raised:
            grant_project_member(project=world.project_1, actor=world.creator, target=target)
        self.assertEqual(raised.exception.detail, INACTIVE_TARGET)
        self.assertNotIn(target.email, str(raised.exception))
        with self.assertRaises(ValidationError) as revoked:
            revoke_project_member(project=world.project_1, actor=world.creator, target=target)
        self.assertEqual(revoked.exception.detail, INACTIVE_TARGET)
        self.assertNotIn(target.email, str(revoked.exception))
        self.assertEqual(self._membership_rows(), before)

    def _membership_rows(self):
        return list(ProjectMember.objects.order_by('id').values_list('id', 'project_id', 'user_id', 'enabled'))
