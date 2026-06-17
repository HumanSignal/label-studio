import logging
from typing import Callable, Tuple

from core.redis import start_job_async_or_sync
from django.conf import settings
from django.db import connection
from rq import Retry

logger = logging.getLogger(__name__)


def run_migration_job(target_func_path, *args, **kwargs):
    """Worker-side runner for migration jobs scheduled by dotted-path string.

    Imports target_func_path dynamically and runs it. Solves two deploy-time problems:
    1. RQ can't deserialize a direct function reference from a digit-prefixed migration
       module (e.g. 0005_...); Python doesn't bind such submodules as attributes on their
       parent package, so RQ's import_attribute raises AttributeError/ValueError. A
       dotted-path string imported via import_string sidesteps that.
    2. If the worker hasn't been upgraded yet (import fails), reschedule self after a short
       delay, preserving queue/timeout from the current RQ job.
    """
    from django.utils.module_loading import import_string

    try:
        func = import_string(target_func_path)
    except (ImportError, AttributeError) as e:
        logger.warning(
            f'Failed to import migration function {target_func_path}; worker codebase '
            f'may not be updated yet. Rescheduling. Error: {e}'
        )

        # start_job_async_or_sync consumes queue_name/job_timeout itself, so they are not
        # forwarded to us. Re-derive them from the current RQ job to preserve enqueue params.
        queue_name = 'default'
        job_timeout = None
        try:
            import rq

            current_job = rq.get_current_job()
            if current_job:
                queue_name = current_job.origin
                job_timeout = current_job.timeout
        except Exception as rq_err:
            logger.debug(f'Failed to read current RQ job: {rq_err}')

        start_job_async_or_sync(
            run_migration_job,
            target_func_path,
            *args,
            in_seconds=settings.MIGRATION_JOB_RESCHEDULE_DELAY_SECONDS,
            queue_name=queue_name,
            job_timeout=job_timeout,
            **kwargs,
        )
        return

    func(*args, **kwargs)


def start_migration_job(job, *args, **kwargs):
    """Enqueue a migration RQ job delayed by MIGRATION_JOB_START_DELAY_SECONDS.

    Use this from data migrations instead of start_job_async_or_sync so the job starts AFTER a
    rolling deploy finishes (avoids stale workers running it on old code). `in_seconds` can be
    passed explicitly to override the default; sync/CI execution ignores the delay.

    If `job` is a dotted-path string, it is routed through run_migration_job so the target is
    imported on the worker by string. Use this form when the job function is defined inside a
    digit-prefixed migration module (e.g. 0005_...), which RQ cannot deserialize by direct
    reference.
    """
    kwargs.setdefault('in_seconds', settings.MIGRATION_JOB_START_DELAY_SECONDS)
    if isinstance(job, str):
        return start_job_async_or_sync(run_migration_job, job, *args, **kwargs)
    return start_job_async_or_sync(job, *args, **kwargs)


def execute_sql_job(*, migration_name: str, sql: str, apply_on_sqlite: bool = False, reverse: bool = False) -> None:
    from core.models import AsyncMigrationStatus

    if not reverse:
        migration, created = AsyncMigrationStatus.objects.get_or_create(
            name=migration_name,
            defaults={'status': AsyncMigrationStatus.STATUS_STARTED},
        )
        if not created and migration.status == AsyncMigrationStatus.STATUS_FINISHED:
            logger.info(f'Migration {migration_name} already executed with status FINISHED')
            return
        if migration.status == AsyncMigrationStatus.STATUS_SCHEDULED:
            migration.status = AsyncMigrationStatus.STATUS_STARTED
            migration.save()

        try:
            if connection.vendor == 'sqlite' and not apply_on_sqlite:
                logger.info('SQLite detected; skipping SQL execution as requested')
            else:
                with connection.cursor() as cursor:
                    cursor.execute(sql)
            migration.status = AsyncMigrationStatus.STATUS_FINISHED
            migration.save()
        except Exception as e:
            logger.exception(f'Migration {migration_name} failed: {e}')
            migration.status = AsyncMigrationStatus.STATUS_ERROR
            if not migration.meta:
                migration.meta = {}
            migration.meta['error'] = str(e)
            migration.save()
            raise
    else:
        # Reverse path: don't create/update AsyncMigrationStatus. Just run SQL.
        try:
            if connection.vendor == 'sqlite' and not apply_on_sqlite:
                logger.info('SQLite detected; skipping SQL execution as requested (reverse)')
                return
            with connection.cursor() as cursor:
                cursor.execute(sql)
        except Exception as e:
            logger.exception(f'Reverse migration {migration_name} failed: {e}')
            raise


def make_sql_migration(
    sql_forwards: str,
    sql_backwards: str,
    *,
    apply_on_sqlite: bool = False,
    execute_immediately: bool = False,
    migration_name: str | None = None,
    queue_name: str | None = None,
) -> Tuple[Callable, Callable]:
    """Return (forwards, backwards) for migrations.RunPython.

    - forwards: either schedules job or marks as SCHEDULED
    - backwards: always schedules job to execute reverse SQL
    """
    if not migration_name:
        raise ValueError("make_sql_migration requires explicit migration_name like 'app_label:migration_module'")
    mig_key = migration_name

    def forwards(apps, schema_editor):  # noqa: ARG001
        # Early return for linter to not actually run code
        if getattr(schema_editor, 'collect_sql', False) is True:
            return
        if schema_editor.connection.vendor == 'sqlite' and not apply_on_sqlite:
            logger.info('Skipping migration for SQLite (apply_on_sqlite=False)')
            return
        should_execute = execute_immediately or not settings.ALLOW_SCHEDULED_MIGRATIONS or settings.CI
        if should_execute:
            # In CI, force synchronous execution so columns exist before tests run
            force_sync = settings.CI
            job_kwargs = {}
            if queue_name is not None:
                job_kwargs['queue_name'] = queue_name
            start_migration_job(
                execute_sql_job,
                migration_name=mig_key,
                sql=sql_forwards,
                apply_on_sqlite=apply_on_sqlite,
                reverse=False,
                retry=Retry(max=3, interval=[60, 300, 1800]),
                redis=not force_sync,
                **job_kwargs,
            )
        else:
            AsyncMigrationStatus = apps.get_model('core', 'AsyncMigrationStatus')
            AsyncMigrationStatus.objects.get_or_create(
                name=mig_key,
                defaults={'status': 'SCHEDULED'},
            )

    def backwards(apps, schema_editor):  # noqa: ARG001
        # Early return for linter to not actually run code
        if getattr(schema_editor, 'collect_sql', False) is True:
            return
        job_kwargs = {}
        if queue_name is not None:
            job_kwargs['queue_name'] = queue_name
        start_job_async_or_sync(
            execute_sql_job,
            migration_name=mig_key,
            sql=sql_backwards,
            apply_on_sqlite=apply_on_sqlite,
            reverse=True,
            retry=Retry(max=3, interval=[60, 300, 1800]),
            **job_kwargs,
        )

    return forwards, backwards
