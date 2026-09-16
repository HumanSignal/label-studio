from unittest.mock import MagicMock, patch

import pytest
from core.migration_helpers import (
    DEPENDENCY_WAIT_ATTEMPTS_META,
    MigrationDependencyFailed,
    MigrationDependencyNotReady,
    execute_sql_job,
    make_sql_migration,
    run_migration_job,
    start_migration_job,
)
from core.models import AsyncMigrationStatus
from core.redis import start_job_async_or_sync as real_start_job_async_or_sync
from django.db import connection
from django.test import TestCase, override_settings
from rq import Retry


def _table_exists(table_name: str) -> bool:
    """Vendor-independent table check (CI uses PostgreSQL; local LSO defaults to SQLite)."""
    return table_name in connection.introspection.table_names()


def _drop_table(table_name: str) -> None:
    with connection.cursor() as cursor:
        cursor.execute(f'DROP TABLE IF EXISTS {table_name}')


def _pg_schema_editor():
    schema_editor = MagicMock()
    schema_editor.connection.vendor = 'postgresql'
    return schema_editor


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
    def test_runs_each_statement_on_its_own_cursor(self, mock_connection):
        """A sequence is one execute per statement, each on a fresh cursor."""
        mock_cursor = MagicMock()
        mock_connection.cursor.return_value.__enter__.return_value = mock_cursor
        mock_connection.vendor = 'postgresql'

        execute_sql_job(migration_name=self.migration_name, sql=['SQL A;', 'SQL B;'])

        assert [c.args[0] for c in mock_cursor.execute.call_args_list] == ['SQL A;', 'SQL B;']
        assert mock_connection.cursor.call_count == 2

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
        forwards, _ = make_sql_migration(
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

    @override_settings(ALLOW_SCHEDULED_MIGRATIONS=False)
    @patch('core.migration_helpers.start_job_async_or_sync')
    def test_resolves_callable_sql_and_passes_job_timeout(self, mock_start):
        """Callables are resolved before enqueue so RQ pickles SQL, not a migration-module function."""
        forwards, _ = make_sql_migration(
            lambda: ['SQL A;', 'SQL B;'],
            lambda: ['SQL C;'],
            migration_name=self.migration_name,
            job_timeout=36000,
        )

        apps = MagicMock()
        schema_editor = _pg_schema_editor()

        forwards(apps, schema_editor)

        _, kwargs = mock_start.call_args
        assert kwargs['sql'] == ['SQL A;', 'SQL B;']
        assert kwargs['job_timeout'] == 36000

    @override_settings(ALLOW_SCHEDULED_MIGRATIONS=True, CI=False)
    @patch('core.migration_helpers.start_job_async_or_sync')
    def test_creates_scheduled_status_when_enabled(self, mock_start):
        """ALLOW_SCHEDULED_MIGRATIONS=True + execute_immediately=False writes only a SCHEDULED row."""
        forwards, _ = make_sql_migration(
            self.sql_forwards,
            self.sql_backwards,
            migration_name=self.migration_name,
            execute_immediately=False,
        )

        apps = MagicMock()
        apps.get_model.return_value = AsyncMigrationStatus
        schema_editor = _pg_schema_editor()

        forwards(apps, schema_editor)

        migration = AsyncMigrationStatus.objects.get(name=self.migration_name)
        assert migration.status == AsyncMigrationStatus.STATUS_SCHEDULED
        mock_start.assert_not_called()

    @override_settings(ALLOW_SCHEDULED_MIGRATIONS=True, CI=False)
    @patch('core.migration_helpers.start_job_async_or_sync')
    def test_executes_immediately_when_forced(self, mock_start):
        """execute_immediately=True skips the SCHEDULED path even when scheduling is allowed."""
        forwards, backwards = make_sql_migration(
            self.sql_forwards,
            self.sql_backwards,
            migration_name=self.migration_name,
            execute_immediately=True,
        )

        apps = MagicMock()
        schema_editor = _pg_schema_editor()

        forwards(apps, schema_editor)

        mock_start.assert_called_once()
        args, kwargs = mock_start.call_args
        assert kwargs['migration_name'] == self.migration_name
        assert kwargs['sql'] == self.sql_forwards
        assert kwargs['in_seconds'] == 0
        assert kwargs['redis'] is False

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

    @override_settings(ALLOW_SCHEDULED_MIGRATIONS=False)
    @patch('core.migration_helpers.start_job_async_or_sync')
    def test_omits_queue_name_when_not_provided(self, mock_start):
        """Test that existing callers keep start_job_async_or_sync default queue behavior."""
        forwards, _ = make_sql_migration(
            self.sql_forwards,
            self.sql_backwards,
            migration_name=self.migration_name,
        )

        apps = MagicMock()
        schema_editor = MagicMock()
        schema_editor.connection.vendor = 'postgresql'

        forwards(apps, schema_editor)

        _, kwargs = mock_start.call_args
        assert 'queue_name' not in kwargs

    @override_settings(ALLOW_SCHEDULED_MIGRATIONS=False)
    @patch('core.migration_helpers.start_job_async_or_sync')
    def test_passes_queue_name_parameter_forwards(self, mock_start):
        """Test that queue_name is passed to forward SQL jobs."""
        forwards, _ = make_sql_migration(
            self.sql_forwards,
            self.sql_backwards,
            migration_name=self.migration_name,
            queue_name='service',
        )

        apps = MagicMock()
        schema_editor = MagicMock()
        schema_editor.connection.vendor = 'postgresql'

        forwards(apps, schema_editor)

        _, kwargs = mock_start.call_args
        assert kwargs['queue_name'] == 'service'

    @patch('core.migration_helpers.start_job_async_or_sync')
    def test_passes_queue_name_parameter_backwards(self, mock_start):
        """Test that queue_name is passed to reverse SQL jobs."""
        _, backwards = make_sql_migration(
            self.sql_forwards,
            self.sql_backwards,
            migration_name=self.migration_name,
            queue_name='service',
        )

        apps = MagicMock()
        schema_editor = MagicMock()
        schema_editor.connection.vendor = 'postgresql'

        backwards(apps, schema_editor)

        _, kwargs = mock_start.call_args
        assert kwargs['queue_name'] == 'service'


class TestStartMigrationJob(TestCase):
    """Test start_migration_job delay wrapper."""

    @override_settings(MIGRATION_JOB_START_DELAY_SECONDS=900)
    @patch('core.migration_helpers.start_job_async_or_sync')
    def test_applies_default_delay(self, mock_start):
        """Default in_seconds comes from MIGRATION_JOB_START_DELAY_SECONDS."""
        job = MagicMock(__name__='my_job')

        start_migration_job(job, 1, queue_name='service')

        args, kwargs = mock_start.call_args
        assert args == (job, 1)
        assert kwargs['queue_name'] == 'service'
        assert kwargs['in_seconds'] == 900

    @override_settings(MIGRATION_JOB_START_DELAY_SECONDS=900)
    @patch('core.migration_helpers.start_job_async_or_sync')
    def test_explicit_in_seconds_overrides_default(self, mock_start):
        """An explicit in_seconds is not overwritten by the default."""
        job = MagicMock(__name__='my_job')

        start_migration_job(job, in_seconds=0)

        _, kwargs = mock_start.call_args
        assert kwargs['in_seconds'] == 0

    @override_settings(CI=False, ALLOW_SCHEDULED_MIGRATIONS=False, MIGRATION_JOB_START_DELAY_SECONDS=900)
    @patch('core.migration_helpers.start_job_async_or_sync')
    def test_make_sql_migration_forwards_uses_delay(self, mock_start):
        """execute_immediately=False + CI=False still enqueues with MIGRATION_JOB_START_DELAY_SECONDS."""
        forwards, _ = make_sql_migration(
            'CREATE INDEX test_idx ON test_table (col1);',
            'DROP INDEX test_idx;',
            migration_name='test.migrations.test_migration',
        )

        apps = MagicMock()
        schema_editor = _pg_schema_editor()

        forwards(apps, schema_editor)

        _, kwargs = mock_start.call_args
        assert kwargs['in_seconds'] == 900
        assert kwargs['redis'] is True
        retry = kwargs['retry']
        assert isinstance(retry, Retry)
        assert retry.max == 3
        assert retry.intervals == [60, 300, 1800]
        assert 'queue_name' not in kwargs

    @override_settings(CI=True, ALLOW_SCHEDULED_MIGRATIONS=False)
    @patch('core.migration_helpers.connection')
    def test_ci_runs_synchronously_ignoring_delay(self, mock_connection):
        """In CI the job runs synchronously; the delay must not block execution."""
        mock_cursor = MagicMock()
        mock_connection.cursor.return_value.__enter__.return_value = mock_cursor
        mock_connection.vendor = 'postgresql'

        forwards, _ = make_sql_migration(
            'CREATE INDEX test_idx ON test_table (col1);',
            'DROP INDEX test_idx;',
            migration_name='test.migrations.ci_migration',
        )

        apps = MagicMock()
        schema_editor = MagicMock()
        schema_editor.connection.vendor = 'postgresql'

        forwards(apps, schema_editor)

        # SQL executed inline (sync path), proving the delay didn't defer it.
        mock_cursor.execute.assert_called_once()
        migration = AsyncMigrationStatus.objects.get(name='test.migrations.ci_migration')
        assert migration.status == AsyncMigrationStatus.STATUS_FINISHED

    @override_settings(MIGRATION_JOB_START_DELAY_SECONDS=900)
    @patch('core.migration_helpers.start_job_async_or_sync')
    def test_string_job_routes_through_runner(self, mock_start):
        """A dotted-path string is enqueued as run_migration_job with the string as first arg."""
        start_migration_job('some.module.func', migration_name='test_mig', queue_name='service')

        args, kwargs = mock_start.call_args
        assert args == (run_migration_job, 'some.module.func')
        assert kwargs['migration_name'] == 'test_mig'
        assert kwargs['queue_name'] == 'service'
        assert kwargs['in_seconds'] == 900


class TestExecuteImmediatelyInProcess(TestCase):
    """execute_immediately=True must run DDL in-process even when settings.CI is False."""

    def _assert_retry_and_queue(self, kwargs, *, queue_name='service'):
        retry = kwargs['retry']
        assert isinstance(retry, Retry)
        assert retry.max == 3
        assert retry.intervals == [60, 300, 1800]
        assert kwargs['queue_name'] == queue_name

    @override_settings(CI=False, MIGRATION_JOB_START_DELAY_SECONDS=900)
    @patch('core.redis.redis_connected', return_value=True)
    @patch('core.redis.django_rq')
    @patch('core.migration_helpers.start_job_async_or_sync', wraps=real_start_job_async_or_sync)
    def test_execute_immediately_runs_sql_in_process(self, mock_start, mock_django_rq, _redis_connected):
        """DDL is visible when forwards returns; no delayed RQ job (in_seconds=0, redis=False)."""
        for allow_scheduled in (False, True):
            with self.subTest(allow_scheduled=allow_scheduled):
                mock_start.reset_mock()
                mock_django_rq.reset_mock()
                table = f'fit2681_imm_{int(allow_scheduled)}'
                migration_name = f'test.migrations.fit2681_imm_{int(allow_scheduled)}'
                self.addCleanup(_drop_table, table)
                _drop_table(table)

                with override_settings(ALLOW_SCHEDULED_MIGRATIONS=allow_scheduled):
                    forwards, _ = make_sql_migration(
                        f'CREATE TABLE {table} (id INTEGER PRIMARY KEY)',
                        f'DROP TABLE IF EXISTS {table}',
                        migration_name=migration_name,
                        apply_on_sqlite=True,
                        execute_immediately=True,
                        queue_name='service',
                    )
                    forwards(MagicMock(), _pg_schema_editor())

                assert _table_exists(table), 'schema change must be visible when forwards returns'
                mock_django_rq.get_queue.assert_not_called()
                mock_start.assert_called_once()
                _, kwargs = mock_start.call_args
                assert kwargs['in_seconds'] == 0
                assert kwargs['redis'] is False
                self._assert_retry_and_queue(kwargs)


class TestRunMigrationJob(TestCase):
    """Test run_migration_job dynamic-import runner."""

    def test_imports_and_runs_target(self):
        """Successful import executes the target with forwarded kwargs."""
        mock_func = MagicMock()

        with patch('django.utils.module_loading.import_string', return_value=mock_func) as mock_import:
            run_migration_job('some.module.func', migration_name='test_mig', custom_param='hello')

        mock_import.assert_called_once_with('some.module.func')
        mock_func.assert_called_once_with(migration_name='test_mig', custom_param='hello')

    @override_settings(MIGRATION_JOB_RESCHEDULE_DELAY_SECONDS=30)
    @patch('core.migration_helpers.start_job_async_or_sync')
    def test_import_error_reschedules_preserving_params(self, mock_start):
        """On import failure it reschedules itself, re-deriving queue/timeout from the RQ job."""
        mock_job = MagicMock()
        mock_job.origin = 'service'
        mock_job.timeout = 1800

        with (
            patch('django.utils.module_loading.import_string', side_effect=ImportError('not found')),
            patch('rq.get_current_job', return_value=mock_job),
        ):
            run_migration_job('some.missing.func', migration_name='test_mig', custom_param='hello')

        args, kwargs = mock_start.call_args
        assert args == (run_migration_job, 'some.missing.func')
        assert kwargs['in_seconds'] == 30
        assert kwargs['queue_name'] == 'service'
        assert kwargs['job_timeout'] == 1800
        assert kwargs['migration_name'] == 'test_mig'
        assert kwargs['custom_param'] == 'hello'


class TestAsyncMigrationDependencies(TestCase):
    """execute_sql_job waits on named AsyncMigrationStatus rows before running SQL."""

    def setUp(self):
        self.migration_name = 'test.migrations.dependent'
        self.dep_name = 'test.migrations.prerequisite'
        self.sql = 'CREATE INDEX test_dep_idx ON test_table (col1);'

    def _run(self, **kwargs):
        execute_sql_job(
            migration_name=self.migration_name,
            sql=self.sql,
            dependencies=[self.dep_name],
            **kwargs,
        )

    @patch('core.migration_helpers.connection')
    def test_runs_when_dependency_finished(self, mock_connection):
        """SQL runs only after the named dependency is FINISHED."""
        mock_cursor = MagicMock()
        mock_connection.cursor.return_value.__enter__.return_value = mock_cursor
        mock_connection.vendor = 'postgresql'
        AsyncMigrationStatus.objects.create(name=self.dep_name, status=AsyncMigrationStatus.STATUS_FINISHED)

        self._run()

        mock_cursor.execute.assert_called_once_with(self.sql)
        row = AsyncMigrationStatus.objects.get(name=self.migration_name)
        assert row.status == AsyncMigrationStatus.STATUS_FINISHED
        assert row.meta['dependencies'] == [self.dep_name]
        assert DEPENDENCY_WAIT_ATTEMPTS_META not in (row.meta or {})

    @patch('core.migration_helpers.connection')
    def test_waits_when_dependency_missing(self, mock_connection):
        """A missing dependency does not run SQL and records a wait attempt."""
        mock_cursor = MagicMock()
        mock_connection.cursor.return_value.__enter__.return_value = mock_cursor
        mock_connection.vendor = 'postgresql'

        with pytest.raises(MigrationDependencyNotReady, match='waiting'):
            self._run()

        mock_cursor.execute.assert_not_called()
        row = AsyncMigrationStatus.objects.get(name=self.migration_name)
        assert row.status == AsyncMigrationStatus.STATUS_STARTED
        assert row.meta[DEPENDENCY_WAIT_ATTEMPTS_META] == 1
        assert row.meta['dependency_wait_last_statuses'][self.dep_name] is None

    @patch('core.migration_helpers.connection')
    def test_waits_when_dependency_in_progress(self, mock_connection):
        """STARTED / IN PROGRESS / SCHEDULED dependencies defer SQL."""
        mock_cursor = MagicMock()
        mock_connection.cursor.return_value.__enter__.return_value = mock_cursor
        mock_connection.vendor = 'postgresql'
        AsyncMigrationStatus.objects.create(name=self.dep_name, status=AsyncMigrationStatus.STATUS_IN_PROGRESS)

        with pytest.raises(MigrationDependencyNotReady, match=self.dep_name):
            self._run()

        mock_cursor.execute.assert_not_called()
        row = AsyncMigrationStatus.objects.get(name=self.migration_name)
        assert row.meta['dependency_wait_last_statuses'][self.dep_name] == AsyncMigrationStatus.STATUS_IN_PROGRESS

    @patch('core.migration_helpers.connection')
    def test_waits_when_dependency_scheduled(self, mock_connection):
        """SCHEDULED dependencies defer SQL the same way IN PROGRESS does."""
        mock_cursor = MagicMock()
        mock_connection.cursor.return_value.__enter__.return_value = mock_cursor
        mock_connection.vendor = 'postgresql'
        AsyncMigrationStatus.objects.create(name=self.dep_name, status=AsyncMigrationStatus.STATUS_SCHEDULED)

        with pytest.raises(MigrationDependencyNotReady, match=self.dep_name):
            self._run()

        mock_cursor.execute.assert_not_called()
        row = AsyncMigrationStatus.objects.get(name=self.migration_name)
        assert row.meta['dependency_wait_last_statuses'][self.dep_name] == AsyncMigrationStatus.STATUS_SCHEDULED

    @override_settings(CI=True, ALLOW_SCHEDULED_MIGRATIONS=False)
    @patch('core.migration_helpers.connection')
    def test_ci_does_not_run_sql_before_dependencies_finish(self, mock_connection):
        """CI runs jobs in-process, so a missing dependency must still skip SQL."""
        mock_cursor = MagicMock()
        mock_connection.cursor.return_value.__enter__.return_value = mock_cursor
        mock_connection.vendor = 'postgresql'

        with pytest.raises(MigrationDependencyNotReady):
            self._run()

        mock_cursor.execute.assert_not_called()

    @patch('core.migration_helpers.connection')
    def test_errors_immediately_when_dependency_failed(self, mock_connection):
        """A dependency already in ERROR fails the waiter without running SQL."""
        mock_cursor = MagicMock()
        mock_connection.cursor.return_value.__enter__.return_value = mock_cursor
        mock_connection.vendor = 'postgresql'
        AsyncMigrationStatus.objects.create(name=self.dep_name, status=AsyncMigrationStatus.STATUS_ERROR)

        with pytest.raises(MigrationDependencyFailed, match='ERROR'):
            self._run()

        mock_cursor.execute.assert_not_called()
        row = AsyncMigrationStatus.objects.get(name=self.migration_name)
        assert row.status == AsyncMigrationStatus.STATUS_ERROR
        assert self.dep_name in row.meta['error']

    @override_settings(MIGRATION_DEPENDENCY_MAX_RETRIES=2, MIGRATION_DEPENDENCY_RETRY_DELAY_SECONDS=15)
    @patch('core.migration_helpers.connection')
    def test_exhausts_wait_budget(self, mock_connection):
        """After max retries the waiter becomes ERROR with an actionable message."""
        mock_cursor = MagicMock()
        mock_connection.cursor.return_value.__enter__.return_value = mock_cursor
        mock_connection.vendor = 'postgresql'
        AsyncMigrationStatus.objects.create(name=self.dep_name, status=AsyncMigrationStatus.STATUS_STARTED)

        with pytest.raises(MigrationDependencyNotReady, match='waiting'):
            self._run()
        with pytest.raises(MigrationDependencyNotReady, match='waiting'):
            self._run()
        with pytest.raises(MigrationDependencyNotReady, match='gave up waiting after 2 retries'):
            self._run()

        mock_cursor.execute.assert_not_called()
        row = AsyncMigrationStatus.objects.get(name=self.migration_name)
        assert row.status == AsyncMigrationStatus.STATUS_ERROR
        assert 'gave up waiting' in row.meta['error']
        assert row.meta[DEPENDENCY_WAIT_ATTEMPTS_META] == 2

    @override_settings(ALLOW_SCHEDULED_MIGRATIONS=True, CI=False)
    @patch('core.migration_helpers.start_job_async_or_sync')
    def test_scheduled_path_stores_dependencies_in_meta(self, mock_start):
        """SaaS SCHEDULED rows copy dependency names into meta for the admin action."""
        forwards, _ = make_sql_migration(
            self.sql,
            'DROP INDEX test_dep_idx;',
            migration_name=self.migration_name,
            dependencies=[self.dep_name],
        )
        apps = MagicMock()
        apps.get_model.return_value = AsyncMigrationStatus
        forwards(apps, _pg_schema_editor())

        mock_start.assert_not_called()
        row = AsyncMigrationStatus.objects.get(name=self.migration_name)
        assert row.status == AsyncMigrationStatus.STATUS_SCHEDULED
        assert row.meta['dependencies'] == [self.dep_name]

    @override_settings(ALLOW_SCHEDULED_MIGRATIONS=False)
    @patch('core.migration_helpers.start_job_async_or_sync')
    def test_forwards_passes_dependencies_and_long_retry(self, mock_start):
        """On-prem enqueue forwards dependency names and the 24h retry policy."""
        forwards, _ = make_sql_migration(
            self.sql,
            'DROP INDEX test_dep_idx;',
            migration_name=self.migration_name,
            dependencies=[self.dep_name],
        )
        with override_settings(MIGRATION_DEPENDENCY_MAX_RETRIES=96, MIGRATION_DEPENDENCY_RETRY_DELAY_SECONDS=900):
            forwards(MagicMock(), _pg_schema_editor())

        _, kwargs = mock_start.call_args
        assert kwargs['dependencies'] == [self.dep_name]
        retry = kwargs['retry']
        assert isinstance(retry, Retry)
        assert retry.max == 96
        assert retry.intervals == [900] * 96
