from datetime import timedelta
from importlib import import_module

from core.models import AsyncMigrationStatus
from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone

User = get_user_model()
backfill_migration = import_module('users.migrations.0013_backfill_creation_artifact_last_activity_async')


class TestNullableLastActivity(TestCase):
    def test_create_user_leaves_last_activity_null(self):
        user = User.objects.create_user(email='new@example.com', username='new', password='pass12345')
        user.refresh_from_db()
        self.assertIsNone(user.last_activity)

    def test_login_stamps_last_activity(self):
        user = User.objects.create_user(email='login@example.com', username='login', password='pass12345')
        self.assertIsNone(user.last_activity)

        logged_in = self.client.login(email='login@example.com', password='pass12345')
        self.assertTrue(logged_in)

        user.refresh_from_db()
        self.assertIsNotNone(user.last_activity)
        self.assertGreaterEqual(user.last_activity, user.date_joined)

    def test_backfill_nulls_create_default_only(self):
        now = timezone.now()
        artifact = User.objects.create_user(email='artifact@example.com', username='artifact', password='pass12345')
        artifact.last_activity = artifact.date_joined
        artifact.last_login = None
        artifact.save(update_fields=['last_activity', 'last_login'])

        later_api = User.objects.create_user(email='api@example.com', username='api', password='pass12345')
        later_stamp = later_api.date_joined + timedelta(seconds=2)
        later_api.last_activity = later_stamp
        later_api.last_login = None
        later_api.save(update_fields=['last_activity', 'last_login'])

        logged_in = User.objects.create_user(email='real@example.com', username='real', password='pass12345')
        logged_in.last_activity = logged_in.date_joined
        logged_in.last_login = now
        logged_in.save(update_fields=['last_activity', 'last_login'])

        AsyncMigrationStatus.objects.filter(name=backfill_migration.migration_name).delete()
        backfill_migration.forward_migration(backfill_migration.migration_name)

        artifact.refresh_from_db()
        later_api.refresh_from_db()
        logged_in.refresh_from_db()
        self.assertIsNone(artifact.last_activity)
        self.assertEqual(later_api.last_activity, later_stamp)
        self.assertEqual(logged_in.last_activity, logged_in.date_joined)
