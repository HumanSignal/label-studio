from unittest.mock import MagicMock, patch

import pytest
from core.migration_helpers import execute_sql_job, make_sql_migration
from core.models import AsyncMigrationStatus
from django.test import TestCase, override_settings


class TestExecuteSqlJob(TestCase):
    """Test execute_sql_job function."""

    def setUp(self):
        self.migration_name = 'test.migrations.test_migration'
        self.sql = 'CREATE INDEX test_idx ON test_table (col1);'

    @patch('core.migration_helpers.connection')
    def test_creates_migration_status_record(self, mock_connection):
        """Test that a new AsyncMigrationStatus record is created."""
        mock_cursor = MagicMock()
        mock_connection.cursor.return_value.__enter__.return_value = mock_cursor
        mock_connection.vendor = 'postgresql'

        execute_sql_job(migration_name=self.migration_name, sql=self.sql)

        migration = AsyncMigrationStatus.objects.get(name=self.migration_name)
        assert migration.status == AsyncMigrationStatus.STATUS_FINISHED
        mock_cursor.execute.assert_called_once_with(self.sql)

    @patch('core.migration_helpers.connection')
    def test_skips_if_already_finished(self, mock_connection):
        """Test that migration is skipped if already finished."""
        mock_cursor = MagicMock()
        mock_connection.cursor.return_value.__enter__.return_value = mock_cursor
        mock_connection.vendor = 'postgresql'

        # Create finished migration
        AsyncMigrationStatus.objects.create(
            name=self.migration_name,
            status=AsyncMigrationStatus.STATUS_FINISHED,
        )

        execute_sql_job(migration_name=self.migration_name, sql=self.sql)

        # SQL should not be executed
        mock_cursor.execute.assert_not_called()

    @patch('core.migration_helpers.connection')
    def test_updates_scheduled_to_started(self, mock_connection):
        """Test that SCHEDULED status is updated to STARTED before execution."""
        mock_cursor = MagicMock()
        mock_connection.cursor.return_value.__enter__.return_value = mock_cursor
        mock_connection.vendor = 'postgresql'

        # Create scheduled migration
        migration = AsyncMigrationStatus.objects.create(
            name=self.migration_name,
            status=AsyncMigrationStatus.STATUS_SCHEDULED,
        )

        execute_sql_job(migration_name=self.migration_name, sql=self.sql)

        migration.refresh_from_db()
        assert migration.status == AsyncMigrationStatus.STATUS_FINISHED
        mock_cursor.execute.assert_called_once_with(self.sql)

    @patch('core.migration_helpers.connection')
    def test_skips_sqlite_when_requested(self, mock_connection):
        """Test that SQLite is skipped when apply_on_sqlite=False."""
        mock_cursor = MagicMock()
        mock_connection.cursor.return_value.__enter__.return_value = mock_cursor
        mock_connection.vendor = 'sqlite'

        execute_sql_job(
            migration_name=self.migration_name,
            sql=self.sql,
            apply_on_sqlite=False,
        )

        migration = AsyncMigrationStatus.objects.get(name=self.migration_name)
        assert migration.status == AsyncMigrationStatus.STATUS_FINISHED
        # SQL should not be executed on SQLite
        mock_cursor.execute.assert_not_called()

    @patch('core.migration_helpers.connection')
    def test_executes_on_sqlite_when_requested(self, mock_connection):
        """Test that SQLite execution works when apply_on_sqlite=True."""
        mock_cursor = MagicMock()
        mock_connection.cursor.return_value.__enter__.return_value = mock_cursor
        mock_connection.vendor = 'sqlite'

        execute_sql_job(
            migration_name=self.migration_name,
            sql=self.sql,
            apply_on_sqlite=True,
        )

        migration = AsyncMigrationStatus.objects.get(name=self.migration_name)
        assert migration.status == AsyncMigrationStatus.STATUS_FINISHED
        mock_cursor.execute.assert_called_once_with(self.sql)

    @patch('core.migration_helpers.connection')
    def test_marks_error_on_exception(self, mock_connection):
        """Test that exceptions are caught and migration is marked as ERROR."""
        mock_cursor = MagicMock()
        mock_connection.cursor.return_value.__enter__.return_value = mock_cursor
        mock_connection.vendor = 'postgresql'
        mock_cursor.execute.side_effect = Exception('Test error')

        with pytest.raises(Exception, match='Test error'):
            execute_sql_job(migration_name=self.migration_name, sql=self.sql)

        migration = AsyncMigrationStatus.objects.get(name=self.migration_name)
        assert migration.status == AsyncMigrationStatus.STATUS_ERROR
        assert migration.meta['error'] == 'Test error'

    @patch('core.migration_helpers.connection')
    def test_reverse_does_not_create_status(self, mock_connection):
        """Test that reverse migrations don't create/update AsyncMigrationStatus."""
        mock_cursor = MagicMock()
        mock_connection.cursor.return_value.__enter__.return_value = mock_cursor
        mock_connection.vendor = 'postgresql'

        execute_sql_job(
            migration_name=self.migration_name,
            sql=self.sql,
            reverse=True,
        )

        # No status should be created
        assert not AsyncMigrationStatus.objects.filter(name=self.migration_name).exists()
        mock_cursor.execute.assert_called_once_with(self.sql)

    @patch('core.migration_helpers.connection')
    def test_reverse_skips_sqlite_when_requested(self, mock_connection):
        """Test that reverse migrations skip SQLite when apply_on_sqlite=False."""
        mock_cursor = MagicMock()
        mock_connection.cursor.return_value.__enter__.return_value = mock_cursor
        mock_connection.vendor = 'sqlite'

        execute_sql_job(
            migration_name=self.migration_name,
            sql=self.sql,
            apply_on_sqlite=False,
            reverse=True,
        )

        mock_cursor.execute.assert_not_called()

    @patch('core.migration_helpers.connection')
    def test_reverse_raises_on_exception(self, mock_connection):
        """Test that reverse migrations raise exceptions properly."""
        mock_cursor = MagicMock()
        mock_connection.cursor.return_value.__enter__.return_value = mock_cursor
        mock_connection.vendor = 'postgresql'
        mock_cursor.execute.side_effect = Exception('Test reverse error')

        with pytest.raises(Exception, match='Test reverse error'):
            execute_sql_job(
                migration_name=self.migration_name,
                sql=self.sql,
                reverse=True,
            )


class TestMakeSqlMigration(TestCase):
    """Test make_sql_migration function."""

    def setUp(self):
        self.sql_forwards = 'CREATE INDEX test_idx ON test_table (col1);'
        self.sql_backwards = 'DROP INDEX test_idx;'
        self.migration_name = 'test.migrations.test_migration'

    def test_requires_migration_name(self):
        """Test that migration_name is required."""
        with pytest.raises(ValueError, match='explicit migration_name'):
            make_sql_migration(
                self.sql_forwards,
                self.sql_backwards,
            )

    @override_settings(ALLOW_SCHEDULED_MIGRATIONS=False)
    @patch('core.migration_helpers.start_job_async_or_sync')
    def test_executes_immediately_when_scheduled_disabled(self, mock_start):
        """Test that migration executes immediately when ALLOW_SCHEDULED_MIGRATIONS=False."""
        forwards, backwards = make_sql_migration(
            self.sql_forwards,
            self.sql_backwards,
            migration_name=self.migration_name,
        )

        apps = MagicMock()
        schema_editor = MagicMock()
        schema_editor.connection.vendor = 'postgresql'

        forwards(apps, schema_editor)

        mock_start.assert_called_once()
        args, kwargs = mock_start.call_args
        assert kwargs['migration_name'] == self.migration_name
        assert kwargs['sql'] == self.sql_forwards
        assert kwargs['reverse'] is False

    @override_settings(ALLOW_SCHEDULED_MIGRATIONS=True)
    def test_creates_scheduled_status_when_enabled(self):
        """Test that SCHEDULED status is created when ALLOW_SCHEDULED_MIGRATIONS=True."""
        forwards, backwards = make_sql_migration(
            self.sql_forwards,
            self.sql_backwards,
            migration_name=self.migration_name,
            execute_immediately=False,
        )

        apps = MagicMock()
        apps.get_model.return_value = AsyncMigrationStatus
        schema_editor = MagicMock()
        schema_editor.connection.vendor = 'postgresql'

        forwards(apps, schema_editor)

        migration = AsyncMigrationStatus.objects.get(name=self.migration_name)
        assert migration.status == AsyncMigrationStatus.STATUS_SCHEDULED

    @override_settings(ALLOW_SCHEDULED_MIGRATIONS=True)
    @patch('core.migration_helpers.start_job_async_or_sync')
    def test_executes_immediately_when_forced(self, mock_start):
        """Test that migration executes immediately when execute_immediately=True."""
        forwards, backwards = make_sql_migration(
            self.sql_forwards,
            self.sql_backwards,
            migration_name=self.migration_name,
            execute_immediately=True,
        )

        apps = MagicMock()
        schema_editor = MagicMock()
        schema_editor.connection.vendor = 'postgresql'

        forwards(apps, schema_editor)

        mock_start.assert_called_once()
        args, kwargs = mock_start.call_args
        assert kwargs['migration_name'] == self.migration_name
        assert kwargs['sql'] == self.sql_forwards

    def test_skips_sqlite_when_requested(self):
        """Test that SQLite is skipped when apply_on_sqlite=False."""
        forwards, backwards = make_sql_migration(
            self.sql_forwards,
            self.sql_backwards,
            migration_name=self.migration_name,
            apply_on_sqlite=False,
        )

        apps = MagicMock()
        schema_editor = MagicMock()
        schema_editor.connection.vendor = 'sqlite'

        # Should return early without creating status
        forwards(apps, schema_editor)

        assert not AsyncMigrationStatus.objects.filter(name=self.migration_name).exists()

    @patch('core.migration_helpers.start_job_async_or_sync')
    def test_backwards_always_executes(self, mock_start):
        """Test that backwards migration always executes immediately."""
        forwards, backwards = make_sql_migration(
            self.sql_forwards,
            self.sql_backwards,
            migration_name=self.migration_name,
        )

        apps = MagicMock()
        schema_editor = MagicMock()
        schema_editor.connection.vendor = 'postgresql'

        backwards(apps, schema_editor)

        mock_start.assert_called_once()
        args, kwargs = mock_start.call_args
        assert kwargs['migration_name'] == self.migration_name
        assert kwargs['sql'] == self.sql_backwards
        assert kwargs['reverse'] is True

    @patch('core.migration_helpers.start_job_async_or_sync')
    def test_passes_apply_on_sqlite_parameter(self, mock_start):
        """Test that apply_on_sqlite parameter is passed to execute_sql_job."""
        forwards, backwards = make_sql_migration(
            self.sql_forwards,
            self.sql_backwards,
            migration_name=self.migration_name,
            apply_on_sqlite=True,
            execute_immediately=True,
        )

        apps = MagicMock()
        schema_editor = MagicMock()
        schema_editor.connection.vendor = 'postgresql'

        forwards(apps, schema_editor)

        args, kwargs = mock_start.call_args
        assert kwargs['apply_on_sqlite'] is True
