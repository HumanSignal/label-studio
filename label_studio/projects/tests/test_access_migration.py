"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license."""

from datetime import timedelta

from django.core.management import call_command
from django.db import connection
from django.db.migrations.executor import MigrationExecutor
from django.test import TransactionTestCase
from django.utils import timezone
from organizations.tests.factories import OrganizationFactory
from projects.models import ProjectMember
from projects.tests.factories import ProjectFactory
from users.tests.factories import UserFactory


class TestProjectMemberAccessMigration(TransactionTestCase):
    def tearDown(self):
        call_command('migrate', 'projects', interactive=False, verbosity=0)
        super().tearDown()

    def test_historical_duplicates_are_collapsed_and_disabled_once(self):
        call_command('migrate', 'projects', '0038', interactive=False, verbosity=0)
        organization = OrganizationFactory()
        user = UserFactory(active_organization=organization)
        project = ProjectFactory(organization=organization, created_by=organization.created_by)
        historical_member = self._historical_project_member()

        smaller = historical_member.objects.create(project_id=project.id, user_id=user.id, enabled=True)
        larger = historical_member.objects.create(project_id=project.id, user_id=user.id, enabled=True)
        self.assertLess(smaller.pk, larger.pk)

        later_created = timezone.now().replace(microsecond=0) - timedelta(days=1)
        earlier_created = later_created - timedelta(days=2)
        earlier_updated = later_created - timedelta(days=1)
        later_updated = timezone.now().replace(microsecond=0)
        historical_member.objects.filter(pk=smaller.pk).update(
            created_at=later_created,
            updated_at=earlier_updated,
            enabled=True,
        )
        historical_member.objects.filter(pk=larger.pk).update(
            created_at=earlier_created,
            updated_at=later_updated,
            enabled=True,
        )
        stored = list(historical_member.objects.filter(pk__in=(smaller.pk, larger.pk)))
        expected_created = min(row.created_at for row in stored)
        expected_updated = max(row.updated_at for row in stored)
        self.assertGreater(min(stored, key=lambda row: row.pk).created_at, expected_created)
        self.assertEqual(max(stored, key=lambda row: row.pk).updated_at, expected_updated)

        call_command('migrate', 'projects', '0039', interactive=False, verbosity=0)

        remaining = list(ProjectMember.objects.filter(project_id=project.id, user_id=user.id).order_by('pk'))
        self.assertEqual([row.pk for row in remaining], [smaller.pk])
        survivor = remaining[0]
        self.assertEqual(survivor.created_at, expected_created)
        self.assertEqual(survivor.updated_at, expected_updated)
        self.assertFalse(survivor.enabled)

        ProjectMember.objects.filter(pk=survivor.pk).update(enabled=True)
        call_command('migrate', 'projects', interactive=False, verbosity=0)
        survivor.refresh_from_db()
        self.assertTrue(survivor.enabled)

    def _historical_project_member(self):
        executor = MigrationExecutor(connection)
        state = executor.loader.project_state(('projects', '0038_projectimport_list_indexes_async'))
        return state.apps.get_model('projects', 'ProjectMember')
