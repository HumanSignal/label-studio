"""Tests for the read-only post-upgrade ``check_schema_drift`` command (FIT-2678)."""

from io import StringIO
from pathlib import Path
from unittest.mock import MagicMock, patch

from core.management.commands import check_schema_drift as drift
from core.models import AsyncMigrationStatus
from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import TestCase


class TestMigrationDefersDdl(TestCase):
    """Deferral detection must work from AST markers without depending on G-4."""

    def test_detects_make_sql_migration(self):
        source = (
            'from core.migration_helpers import make_sql_migration\n'
            'operations = [make_sql_migration("SELECT 1", "SELECT 1", migration_name=__name__)]\n'
        )
        assert drift.migration_module_defers_ddl(source) is True

    def test_detects_start_migration_job(self):
        source = 'from core.migration_helpers import start_migration_job\nstart_migration_job(fn)\n'
        assert drift.migration_module_defers_ddl(source) is True

    def test_detects_start_job_async_or_sync(self):
        source = 'from core.redis import start_job_async_or_sync\nstart_job_async_or_sync(fn)\n'
        assert drift.migration_module_defers_ddl(source) is True

    def test_plain_schema_migration_is_not_deferred(self):
        source = 'from django.db import migrations\nclass Migration(migrations.Migration):\n    operations = []\n'
        assert drift.migration_module_defers_ddl(source) is False

    def test_real_make_sql_migration_module(self):
        """A production async SQL migration must be classified as deferred DDL."""
        import importlib

        mod = importlib.import_module('tasks.migrations.0059_task_completion_id_updated_at_idx_async')
        source = Path(mod.__file__).read_text(encoding='utf-8')
        assert drift.migration_module_defers_ddl(source) is True


class TestExpectedColumns(TestCase):
    def test_includes_concrete_non_m2m_field(self):
        """Expected columns are keyed on db_table + column and name the owning model."""
        rows = list(drift.iter_expected_columns())
        match = [r for r in rows if r.table == 'project' and r.column == 'title']
        assert match, f'expected project.title among {len(rows)} columns'
        assert 'Project' in match[0].model

    def test_excludes_many_to_many(self):
        rows = list(drift.iter_expected_columns())
        # Organization.users is M2M (through OrganizationMember); the M2M field
        # itself must not appear as a column on `organization`.
        m2m = [r for r in rows if r.table == 'organization' and r.column == 'users']
        assert m2m == []


class TestSqliteSkip(TestCase):
    def test_sqlite_exits_cleanly_with_message(self):
        """Non-PostgreSQL vendors skip the check and exit 0 with an explanation.

        LSO CI uses PostgreSQL, so the vendor must be patched — do not rely on
        the live connection (that path reports lost async migrations and exits 1).
        """
        out = StringIO()
        with patch.object(drift.connection, 'vendor', 'sqlite'):
            call_command('check_schema_drift', stdout=out)
        output = out.getvalue()
        assert 'sqlite' in output.lower()
        assert 'postgresql' in output.lower()
        assert 'skip' in output.lower()


class TestCheckSchemaDriftCommand(TestCase):
    """Command-level behaviour on a simulated PostgreSQL vendor (LSO tests use SQLite)."""

    def _patch_postgresql(self):
        return patch.object(drift.connection, 'vendor', 'postgresql')

    def test_clean_instance_exits_zero(self):
        expected = list(drift.iter_expected_columns())
        actual = {(row.table, row.column) for row in expected}
        out = StringIO()
        with (
            self._patch_postgresql(),
            patch.object(drift, 'fetch_actual_columns', return_value=actual),
            patch.object(drift, 'find_lost_async_migrations', return_value=[]),
        ):
            call_command('check_schema_drift', stdout=out)
        output = out.getvalue()
        assert 'RESULT: OK' in output
        assert 'DRIFT DETECTED' not in output

    def test_missing_column_exits_nonzero_and_names_table_column_model(self):
        expected = list(drift.iter_expected_columns())
        dropped = next(row for row in expected if row.table == 'project' and row.column == 'title')
        actual = {(row.table, row.column) for row in expected if row is not dropped}
        out = StringIO()
        with (
            self._patch_postgresql(),
            patch.object(drift, 'fetch_actual_columns', return_value=actual),
            patch.object(drift, 'find_lost_async_migrations', return_value=[]),
        ):
            with self.assertRaises(CommandError):
                call_command('check_schema_drift', stdout=out)
        output = out.getvalue()
        assert 'project' in output
        assert 'title' in output
        assert 'Project' in output

    def test_non_terminal_async_migrations_listed_with_meta_error(self):
        AsyncMigrationStatus.objects.create(name='mig.scheduled', status=AsyncMigrationStatus.STATUS_SCHEDULED)
        AsyncMigrationStatus.objects.create(name='mig.started', status=AsyncMigrationStatus.STATUS_STARTED)
        AsyncMigrationStatus.objects.create(
            name='mig.in_progress',
            status=AsyncMigrationStatus.STATUS_IN_PROGRESS,
        )
        AsyncMigrationStatus.objects.create(
            name='mig.error',
            status=AsyncMigrationStatus.STATUS_ERROR,
            meta={'error': 'worker lost the job'},
        )
        AsyncMigrationStatus.objects.create(name='mig.finished', status=AsyncMigrationStatus.STATUS_FINISHED)

        expected = list(drift.iter_expected_columns())
        actual = {(row.table, row.column) for row in expected}
        out = StringIO()
        with (
            self._patch_postgresql(),
            patch.object(drift, 'fetch_actual_columns', return_value=actual),
            patch.object(drift, 'find_lost_async_migrations', return_value=[]),
        ):
            with self.assertRaises(CommandError):
                call_command('check_schema_drift', stdout=out)
        output = out.getvalue()
        assert 'mig.scheduled' in output and 'SCHEDULED' in output
        assert 'mig.started' in output and 'STARTED' in output
        assert 'mig.in_progress' in output and 'IN PROGRESS' in output
        assert 'mig.error' in output and 'ERROR' in output
        assert 'worker lost the job' in output
        assert 'mig.finished' not in output

    def test_applied_but_no_status_row_exits_nonzero(self):
        expected = list(drift.iter_expected_columns())
        actual = {(row.table, row.column) for row in expected}
        lost = [
            drift.LostAsyncMigration(
                app='tasks',
                name='0059_task_completion_id_updated_at_idx_async',
                module='tasks.migrations.0059_task_completion_id_updated_at_idx_async',
            )
        ]
        out = StringIO()
        with (
            self._patch_postgresql(),
            patch.object(drift, 'fetch_actual_columns', return_value=actual),
            patch.object(drift, 'find_lost_async_migrations', return_value=lost),
        ):
            with self.assertRaises(CommandError):
                call_command('check_schema_drift', stdout=out)
        output = out.getvalue()
        assert '0059_task_completion_id_updated_at_idx_async' in output
        assert 'lost' in output.lower()

    def test_command_performs_no_writes(self):
        expected = list(drift.iter_expected_columns())
        actual = {(row.table, row.column) for row in expected}
        before_count = AsyncMigrationStatus.objects.count()
        before_ids = list(AsyncMigrationStatus.objects.values_list('id', 'status', 'meta'))
        out = StringIO()
        with (
            self._patch_postgresql(),
            patch.object(drift, 'fetch_actual_columns', return_value=actual),
            patch.object(drift, 'find_lost_async_migrations', return_value=[]),
        ):
            call_command('check_schema_drift', stdout=out)
        assert AsyncMigrationStatus.objects.count() == before_count
        assert list(AsyncMigrationStatus.objects.values_list('id', 'status', 'meta')) == before_ids


class TestLoadMigrationSource(TestCase):
    """Source loading must skip unreadable files instead of crashing the check."""

    def test_returns_none_on_unicode_decode_error(self):
        """Non-UTF-8 artifacts (e.g. bytecode) inherit ValueError, not OSError."""
        fake_module = MagicMock()
        fake_module.__file__ = '/tmp/not-utf8.pyc'
        decode_error = UnicodeDecodeError('utf-8', b'\xff', 0, 1, 'invalid start byte')
        with (
            patch.object(drift.importlib, 'import_module', return_value=fake_module),
            patch.object(drift.Path, 'read_text', side_effect=decode_error),
        ):
            assert drift._load_migration_source('tasks', '0059_task_completion_id_updated_at_idx_async') is None

    def test_returns_none_on_os_error(self):
        fake_module = MagicMock()
        fake_module.__file__ = '/tmp/missing.py'
        with (
            patch.object(drift.importlib, 'import_module', return_value=fake_module),
            patch.object(drift.Path, 'read_text', side_effect=FileNotFoundError('missing')),
        ):
            assert drift._load_migration_source('tasks', '0059_task_completion_id_updated_at_idx_async') is None


class TestFindLostAsyncMigrations(TestCase):
    """Lost-migration detection must not depend on which historical migrations
    happen to lack an AsyncMigrationStatus row. In CI, ``settings.CI`` runs
    ``make_sql_migration`` in-process and writes FINISHED rows, so 0059 is not
    lost on a healthy test database.
    """

    _DEFERRED_APP = 'tasks'
    _DEFERRED_NAME = '0059_task_completion_id_updated_at_idx_async'
    _DEFERRED_MODULE = 'tasks.migrations.0059_task_completion_id_updated_at_idx_async'
    _DEFERRED_SOURCE = (
        'from core.migration_helpers import make_sql_migration\n'
        'operations = [make_sql_migration("SELECT 1", "SELECT 1", migration_name=__name__)]\n'
    )

    def _applied(self):
        # Django 5.2 returns a dict of (app, name) -> Migration; iterating yields keys.
        return {(self._DEFERRED_APP, self._DEFERRED_NAME): object()}

    def _load(self, app, name):
        if (app, name) != (self._DEFERRED_APP, self._DEFERRED_NAME):
            return None
        return self._DEFERRED_MODULE, self._DEFERRED_SOURCE

    def _patch_finder(self):
        """Replace MigrationRecorder so CI's live django_migrations + FINISHED
        rows (settings.CI runs deferred DDL in-process) cannot leak into the test.
        """
        recorder = MagicMock()
        recorder.applied_migrations.return_value = self._applied()
        return (
            patch.object(drift, 'MigrationRecorder', return_value=recorder),
            patch.object(drift, '_load_migration_source', side_effect=self._load),
        )

    def test_applied_deferred_migration_without_status_row_is_lost(self):
        AsyncMigrationStatus.objects.all().delete()
        rec_patch, load_patch = self._patch_finder()
        with rec_patch, load_patch:
            lost = drift.find_lost_async_migrations()
        names = {(row.app, row.name) for row in lost}
        assert names == {(self._DEFERRED_APP, self._DEFERRED_NAME)}

    def test_status_row_clears_lost_finding(self):
        AsyncMigrationStatus.objects.create(
            name=self._DEFERRED_MODULE,
            status=AsyncMigrationStatus.STATUS_FINISHED,
        )
        rec_patch, load_patch = self._patch_finder()
        with rec_patch, load_patch:
            lost = drift.find_lost_async_migrations()
        names = {(row.app, row.name) for row in lost}
        assert names == set()

    def test_bare_migration_name_status_row_also_matches(self):
        AsyncMigrationStatus.objects.create(
            name=self._DEFERRED_NAME,
            status=AsyncMigrationStatus.STATUS_FINISHED,
        )
        rec_patch, load_patch = self._patch_finder()
        with rec_patch, load_patch:
            lost = drift.find_lost_async_migrations()
        names = {(row.app, row.name) for row in lost}
        assert names == set()


class TestFetchActualColumnsSql(TestCase):
    def test_information_schema_query_is_select_only(self):
        captured = []

        class _Cursor:
            def __enter__(self):
                return self

            def __exit__(self, *args):
                return False

            def execute(self, sql, params=None):
                captured.append(sql)

            def fetchall(self):
                return []

        class _Conn:
            vendor = 'postgresql'

            def cursor(self):
                return _Cursor()

        with patch.object(drift, 'connection', _Conn()):
            drift.fetch_actual_columns()
        assert captured, 'expected information_schema query'
        sql = captured[0].lower()
        assert 'information_schema.columns' in sql
        assert sql.strip().startswith('select')
        for verb in ('alter ', 'create ', 'drop ', 'insert ', 'update ', 'delete '):
            assert verb not in sql
