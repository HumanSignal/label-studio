"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license."""

from django.contrib.auth.models import AnonymousUser
from django.db import connection
from django.test import TestCase
from django.test.utils import CaptureQueriesContext
from django.utils import timezone
from organizations.models import OrganizationMember
from organizations.tests.factories import OrganizationFactory
from projects.access import (
    can_access_project,
    can_create_project,
    can_manage_project,
    can_modify_annotation,
    draft_visible_to,
    project_member_users,
    visible_projects,
)
from projects.models import Project, ProjectMember
from projects.tests.access_setup import make_access_world
from projects.tests.factories import ProjectFactory
from tasks.tests.factories import AnnotationDraftFactory, AnnotationFactory, TaskFactory


class TestProjectAccess(TestCase):
    def test_disabled_member_row_does_not_revoke_creator(self):
        world = make_access_world()
        ProjectMember.objects.create(project=world.project_1, user=world.creator, enabled=False)
        self.assertTrue(can_manage_project(world.creator, world.project_1))
        self.assertTrue(can_access_project(world.creator, world.project_1))

    def test_active_organization_mismatch_denies_creator_and_member(self):
        world = make_access_world()
        other = OrganizationFactory()
        world.creator.active_organization = other
        world.creator.save(update_fields=['active_organization'])
        world.member_a.active_organization = other
        world.member_a.save(update_fields=['active_organization'])
        self.assertFalse(can_access_project(world.creator, world.project_1))
        self.assertFalse(can_manage_project(world.creator, world.project_1))
        self.assertFalse(can_access_project(world.member_a, world.project_1))
        self.assertEqual(list(visible_projects(world.member_a)), [])

    def test_visibility_follows_owner_creator_and_enabled_member(self):
        world = make_access_world()
        self.assertCountEqual(visible_projects(world.member_a), [world.project_1])
        self.assertCountEqual(visible_projects(world.owner), [world.project_1, world.project_2])
        self.assertCountEqual(visible_projects(world.member_b), [world.project_2])
        self.assertEqual(list(visible_projects(world.unassigned)), [])
        self.assertNotIn(world.project_1, list(visible_projects(world.outsider)))

    def test_owner_and_creator_manage_project_member_only_accesses(self):
        world = make_access_world()
        self.assertTrue(can_manage_project(world.owner, world.project_1))
        self.assertTrue(can_manage_project(world.creator, world.project_1))
        self.assertFalse(can_manage_project(world.member_a, world.project_1))
        self.assertTrue(can_access_project(world.member_a, world.project_1))
        self.assertFalse(can_access_project(world.member_a, world.project_2))

    def test_only_active_organization_owner_can_create_project(self):
        world = make_access_world()
        self.assertTrue(can_create_project(world.owner))
        self.assertFalse(can_create_project(world.creator))
        self.assertFalse(can_create_project(world.member_a))

    def test_inactive_owner_regains_create_without_widening_member(self):
        world = make_access_world()
        world.owner.is_active = False
        world.owner.save(update_fields=['is_active'])
        self.assertFalse(can_access_project(world.owner, world.project_1))
        self.assertFalse(can_access_project(world.owner, world.project_2))
        self.assertFalse(can_create_project(world.owner))

        world.owner.is_active = True
        world.owner.save(update_fields=['is_active'])
        self.assertTrue(can_create_project(world.owner))
        self.assertCountEqual(visible_projects(world.member_a), [world.project_1])
        self.assertTrue(can_access_project(world.member_a, world.project_1))
        self.assertFalse(can_access_project(world.member_a, world.project_2))

    def test_staff_superuser_without_enabled_membership_cannot_access(self):
        world = make_access_world()
        world.unassigned.is_staff = True
        world.unassigned.is_superuser = True
        world.unassigned.save(update_fields=['is_staff', 'is_superuser'])
        self.assertFalse(can_access_project(world.unassigned, world.project_1))
        self.assertFalse(can_manage_project(world.unassigned, world.project_1))
        self.assertEqual(list(visible_projects(world.unassigned)), [])

    def test_deleted_project_is_not_accessible(self):
        world = make_access_world()
        Project.all_objects.filter(pk=world.project_1.pk).update(deleted_at=timezone.now())
        project = Project.all_objects.get(pk=world.project_1.pk)
        self.assertFalse(can_access_project(world.owner, project))
        self.assertFalse(can_access_project(world.creator, project))
        self.assertFalse(can_access_project(world.member_a, project))
        self.assertFalse(can_manage_project(world.creator, project))
        self.assertNotIn(project.pk, visible_projects(world.owner).values_list('pk', flat=True))
        self.assertNotIn(project.pk, visible_projects(world.member_a).values_list('pk', flat=True))
        self.assertNotIn(project.pk, visible_projects(world.creator).values_list('pk', flat=True))

    def test_null_created_by_is_managed_only_by_owner(self):
        world = make_access_world()
        project = ProjectFactory(organization=world.organization, created_by=None)
        ProjectMember.objects.create(project=project, user=world.member_a, enabled=True)
        self.assertTrue(can_manage_project(world.owner, project))
        self.assertFalse(can_manage_project(world.member_a, project))
        self.assertFalse(can_manage_project(world.creator, project))
        self.assertTrue(can_access_project(world.member_a, project))

    def test_deleted_organization_member_revokes_creator_and_enabled_member(self):
        world = make_access_world()
        deleted_at = timezone.now()
        OrganizationMember.objects.filter(user=world.creator, organization=world.organization).update(
            deleted_at=deleted_at
        )
        OrganizationMember.objects.filter(user=world.member_a, organization=world.organization).update(
            deleted_at=deleted_at
        )
        self.assertFalse(can_manage_project(world.creator, world.project_1))
        self.assertFalse(can_access_project(world.creator, world.project_1))
        self.assertFalse(can_access_project(world.member_a, world.project_1))
        self.assertEqual(list(visible_projects(world.creator)), [])
        self.assertEqual(list(visible_projects(world.member_a)), [])

        OrganizationMember.objects.filter(user=world.owner, organization=world.organization).update(deleted_at=deleted_at)
        self.assertFalse(can_create_project(world.owner))
        self.assertFalse(can_manage_project(world.owner, world.project_1))
        self.assertFalse(can_access_project(world.owner, world.project_2))

    def test_annotation_modify_follows_author_or_manager(self):
        world = make_access_world()
        task = TaskFactory(project=world.project_1)
        own = AnnotationFactory(task=task, project=world.project_1, completed_by=world.member_a)
        others = AnnotationFactory(task=task, project=world.project_1, completed_by=world.creator)
        self.assertTrue(can_modify_annotation(world.member_a, own))
        self.assertFalse(can_modify_annotation(world.member_a, others))
        self.assertTrue(can_modify_annotation(world.owner, others))
        self.assertTrue(can_modify_annotation(world.creator, own))
        self.assertFalse(can_modify_annotation(world.member_b, own))
        self.assertFalse(can_modify_annotation(world.unassigned, own))

    def test_drafts_are_visible_only_to_their_author_inside_the_project(self):
        world = make_access_world()
        task = TaskFactory(project=world.project_1)
        own_draft = AnnotationDraftFactory(task=task, user=world.member_a)
        other_draft = AnnotationDraftFactory(task=task, user=world.creator)
        outsider_draft = AnnotationDraftFactory(task=task, user=world.member_b)
        self.assertFalse(draft_visible_to(world.owner, other_draft))
        self.assertFalse(draft_visible_to(world.owner, own_draft))
        self.assertFalse(draft_visible_to(world.member_a, other_draft))
        self.assertFalse(draft_visible_to(world.creator, own_draft))
        self.assertTrue(draft_visible_to(world.member_a, own_draft))
        self.assertTrue(draft_visible_to(world.creator, other_draft))
        self.assertFalse(draft_visible_to(world.member_b, outsider_draft))

    def test_project_member_users_include_owner_creator_and_enabled_member(self):
        world = make_access_world()
        self.assertCountEqual(
            project_member_users(world.project_1),
            [world.owner, world.creator, world.member_a],
        )

    def test_visible_projects_for_member_uses_one_query(self):
        world = make_access_world()
        with CaptureQueriesContext(connection) as ctx:
            list(visible_projects(world.member_a))
        self.assertEqual(len(ctx), 1)

    def test_unauthenticated_or_org_less_user_is_denied(self):
        world = make_access_world()
        anonymous = AnonymousUser()
        self.assertFalse(can_access_project(anonymous, world.project_1))
        self.assertFalse(can_manage_project(anonymous, world.project_1))
        self.assertFalse(can_create_project(anonymous))
        self.assertEqual(list(visible_projects(anonymous)), [])

        world.owner.active_organization = None
        world.owner.save(update_fields=['active_organization'])
        self.assertFalse(can_access_project(world.owner, world.project_1))
        self.assertFalse(can_manage_project(world.owner, world.project_1))
        self.assertFalse(can_create_project(world.owner))
        self.assertEqual(list(visible_projects(world.owner)), [])
