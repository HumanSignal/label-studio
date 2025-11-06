from unittest.mock import patch

from core.migration_helpers import execute_sql_job
from core.models import AsyncMigrationStatus
from django.contrib import admin as dj_admin
from django.test import RequestFactory, TestCase
from users.admin import AsyncMigrationStatusAdmin


class TestAdminRunScheduledMigrations(TestCase):
    def setUp(self):
        self.factory = RequestFactory()
        self.request = self.factory.get('/')
        # Avoid Django messages in tests
        self.admin = AsyncMigrationStatusAdmin(AsyncMigrationStatus, dj_admin.site)
        self.admin.message_user = lambda *args, **kwargs: None

    @patch('core.redis.start_job_async_or_sync')
    def test_success_dispatches_job_and_updates_status(self, mock_start):
        m = AsyncMigrationStatus.objects.create(
            name='label_studio.tasks.migrations.0059_task_completion_id_updated_at_idx_async',
            status=AsyncMigrationStatus.STATUS_SCHEDULED,
        )

        qs = AsyncMigrationStatus.objects.filter(pk=m.pk)
        self.admin.run_scheduled_migrations(self.request, qs)

        m.refresh_from_db()
        assert m.status == AsyncMigrationStatus.STATUS_STARTED
        assert mock_start.called
        args, kwargs = mock_start.call_args
        # First positional arg is the job function
        assert args and args[0] is execute_sql_job
        # Ensure correct kwargs passed to the job
        assert kwargs.get('migration_name') == m.name
        assert isinstance(kwargs.get('sql'), str)
        assert kwargs.get('reverse') is False

    @patch('core.redis.start_job_async_or_sync')
    def test_invalid_path_marks_error(self, mock_start):
        m = AsyncMigrationStatus.objects.create(
            name='0059_task_completion_id_updated_at_idx_async',
            status=AsyncMigrationStatus.STATUS_SCHEDULED,
        )

        qs = AsyncMigrationStatus.objects.filter(pk=m.pk)
        self.admin.run_scheduled_migrations(self.request, qs)

        m.refresh_from_db()
        assert m.status == AsyncMigrationStatus.STATUS_ERROR
        assert 'import path' in (m.meta or {}).get('error', '')
        mock_start.assert_not_called()

    @patch('core.redis.start_job_async_or_sync')
    def test_import_error_marks_error(self, mock_start):
        m = AsyncMigrationStatus.objects.create(
            name='label_studio.nonexistentapp.migrations.nonexistent_migration',
            status=AsyncMigrationStatus.STATUS_SCHEDULED,
        )

        qs = AsyncMigrationStatus.objects.filter(pk=m.pk)
        self.admin.run_scheduled_migrations(self.request, qs)

        m.refresh_from_db()
        assert m.status == AsyncMigrationStatus.STATUS_ERROR
        assert 'Import error' in (m.meta or {}).get('error', '')
        mock_start.assert_not_called()
