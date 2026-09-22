import logging
from collections.abc import Callable, Sequence
from typing import Tuple

from core.redis import start_job_async_or_sync
from django.conf import settings
from django.db import connection
from rq import Retry

logger = logging.getLogger(__name__)

DEPENDENCY_WAIT_ATTEMPTS_META = 'dependency_wait_attempts'
DEPENDENCY_WAIT_LAST_STATUSES_META = 'dependency_wait_last_statuses'


class MigrationDependencyNotReady(Exception):
    """Raised when a named async-migration dependency is not FINISHED yet."""


class MigrationDependencyFailed(Exception):
    """Raised when a named async-migration dependency is already ERROR."""


def _normalize_dependencies(dependencies: Sequence[str] | None) -> tuple[str, ...]:
    if not dependencies:
        return ()
    return tuple(dependencies)


def dependency_retry_policy() -> Retry:
    delay = settings.MIGRATION_DEPENDENCY_RETRY_DELAY_SECONDS
    max_retries = settings.MIGRATION_DEPENDENCY_MAX_RETRIES
    return Retry(max=max_retries, interval=[delay] * max_retries)


def _unfinished_dependency_statuses(dependency_names: Sequence[str]) -> dict[str, str | None]:
    from core.models import AsyncMigrationStatus

    if not dependency_names:
        return {}
    rows = {row.name: row.status for row in AsyncMigrationStatus.objects.filter(name__in=dependency_names)}
    unfinished: dict[str, str | None] = {}
    for name in dependency_names:
        status = rows.get(name)
        if status == AsyncMigrationStatus.STATUS_FINISHED:
            continue
        unfinished[name] = status
    return unfinished


def _mark_dependency_error(migration, message: str) -> None:
    meta = dict(migration.meta or {})
    meta['error'] = message
    migration.meta = meta
    from core.models import AsyncMigrationStatus

    migration.status = AsyncMigrationStatus.STATUS_ERROR
    migration.save(update_fields=['status', 'meta'])


def wait_for_async_migration_dependencies(migration, dependencies: Sequence[str]) -> None:
    """Return when every named dependency is FINISHED.

    Persist wait state on this migration's AsyncMigrationStatus row and raise when a
    dependency is missing, still running, ERROR, or the wait budget is exhausted.
    RQ Retry (or a sync caller) is responsible for trying again.
    """
    from core.models import AsyncMigrationStatus

    names = _normalize_dependencies(dependencies)
    if not names:
        return

    meta = dict(migration.meta or {})
    meta['dependencies'] = list(names)

    unfinished = _unfinished_dependency_statuses(names)
    if not unfinished:
        meta.pop(DEPENDENCY_WAIT_ATTEMPTS_META, None)
        meta.pop(DEPENDENCY_WAIT_LAST_STATUSES_META, None)
        migration.meta = meta
        migration.save(update_fields=['meta'])
        return

    failed = {name: status for name, status in unfinished.items() if status == AsyncMigrationStatus.STATUS_ERROR}
    if failed:
        failed_bits = ', '.join(f'{name}={status}' for name, status in failed.items())
        message = (
            f'Async migration {migration.name} cannot start because required migration(s) '
            f'are ERROR: {failed_bits}. Fix or re-run those jobs, then re-run {migration.name}.'
        )
        _mark_dependency_error(migration, message)
        raise MigrationDependencyFailed(message)

    attempts = int(meta.get(DEPENDENCY_WAIT_ATTEMPTS_META, 0)) + 1
    max_retries = settings.MIGRATION_DEPENDENCY_MAX_RETRIES
    meta[DEPENDENCY_WAIT_ATTEMPTS_META] = attempts
    meta[DEPENDENCY_WAIT_LAST_STATUSES_META] = unfinished
    status_bits = ', '.join(f'{name}={status or "missing"}' for name, status in unfinished.items())
    message = (
        f'Async migration {migration.name} is waiting for {status_bits} '
        f'(attempt {attempts}/{max_retries}). Re-run {migration.name} after those jobs finish.'
    )

    if attempts > max_retries:
        exhausted = (
            f'Async migration {migration.name} gave up waiting after {max_retries} retries '
            f'({settings.MIGRATION_DEPENDENCY_RETRY_DELAY_SECONDS}s apart). Still not FINISHED: '
            f'{status_bits}. Fix those jobs, then re-run {migration.name}.'
        )
        _mark_dependency_error(migration, exhausted)
        raise MigrationDependencyNotReady(exhausted)

    if migration.status != AsyncMigrationStatus.STATUS_ERROR:
        migration.status = AsyncMigrationStatus.STATUS_STARTED
    migration.meta = meta
    migration.save(update_fields=['status', 'meta'])
    logger.info(message)
    raise MigrationDependencyNotReady(message)


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


def _sql_statements(sql: str | Sequence[str]) -> tuple[str, ...]:
    if isinstance(sql, str):
        return (sql,)
    return tuple(sql)


def _resolve_sql(sql: str | Sequence[str] | Callable[[], str | Sequence[str]]) -> str | Sequence[str]:
    return sql() if callable(sql) else sql


def _execute_statements(sql: str | Sequence[str]) -> None:
    for statement in _sql_statements(sql):
        with connection.cursor() as cursor:
            cursor.execute(statement)


def execute_sql_job(
    *,
    migration_name: str,
    sql: str | Sequence[str],
    apply_on_sqlite: bool = False,
    reverse: bool = False,
    dependencies: Sequence[str] | None = None,
) -> None:
    from core.models import AsyncMigrationStatus

    if not reverse:
        names = _normalize_dependencies(dependencies)
        migration, created = AsyncMigrationStatus.objects.get_or_create(
            name=migration_name,
            defaults={
                'status': AsyncMigrationStatus.STATUS_STARTED,
                'meta': {'dependencies': list(names)} if names else {},
            },
        )
        if names:
            meta = dict(migration.meta or {})
            meta['dependencies'] = list(names)
            migration.meta = meta
            migration.save(update_fields=['meta'])
        if not created and migration.status == AsyncMigrationStatus.STATUS_FINISHED:
            logger.info(f'Migration {migration_name} already executed with status FINISHED')
            return
        wait_for_async_migration_dependencies(migration, names)
        if migration.status == AsyncMigrationStatus.STATUS_SCHEDULED:
            migration.status = AsyncMigrationStatus.STATUS_STARTED
            migration.save()

        try:
            if connection.vendor == 'sqlite' and not apply_on_sqlite:
                logger.info('SQLite detected; skipping SQL execution as requested')
            else:
                _execute_statements(sql)
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
            _execute_statements(sql)
        except Exception as e:
            logger.exception(f'Reverse migration {migration_name} failed: {e}')
            raise


def make_sql_migration(
    sql_forwards: str | Sequence[str] | Callable[[], str | Sequence[str]],
    sql_backwards: str | Sequence[str] | Callable[[], str | Sequence[str]],
    *,
    apply_on_sqlite: bool = False,
    execute_immediately: bool = False,
    migration_name: str | None = None,
    queue_name: str | None = None,
    job_timeout: int | None = None,
    dependencies: Sequence[str] = (),
) -> Tuple[Callable, Callable]:
    """Return (forwards, backwards) for migrations.RunPython.

    - forwards: either schedules job or marks as SCHEDULED
    - backwards: always schedules job to execute reverse SQL
    - sql may be a string, a sequence of statements (each its own execute), or a
      callable that returns either. Callables are resolved at enqueue time so RQ
      pickles strings, not functions from digit-prefixed migration modules.
    """
    if not migration_name:
        raise ValueError("make_sql_migration requires explicit migration_name like 'app_label:migration_module'")
    mig_key = migration_name
    dep_names = _normalize_dependencies(dependencies)

    def forwards(apps, schema_editor):  # noqa: ARG001
        # Early return for linter to not actually run code
        if getattr(schema_editor, 'collect_sql', False) is True:
            return
        if schema_editor.connection.vendor == 'sqlite' and not apply_on_sqlite:
            logger.info('Skipping migration for SQLite (apply_on_sqlite=False)')
            return
        should_execute = execute_immediately or not settings.ALLOW_SCHEDULED_MIGRATIONS or settings.CI
        if should_execute:
            # Force synchronous execution in CI or when execute_immediately is requested
            force_sync = settings.CI or execute_immediately
            job_kwargs = {}
            if execute_immediately:
                job_kwargs['in_seconds'] = 0
            if queue_name is not None:
                job_kwargs['queue_name'] = queue_name
            if job_timeout is not None:
                job_kwargs['job_timeout'] = job_timeout
            retry = dependency_retry_policy() if dep_names else Retry(max=3, interval=[60, 300, 1800])
            start_migration_job(
                execute_sql_job,
                migration_name=mig_key,
                sql=_resolve_sql(sql_forwards),
                apply_on_sqlite=apply_on_sqlite,
                reverse=False,
                dependencies=list(dep_names),
                retry=retry,
                redis=not force_sync,
                **job_kwargs,
            )
        else:
            AsyncMigrationStatus = apps.get_model('core', 'AsyncMigrationStatus')
            AsyncMigrationStatus.objects.get_or_create(
                name=mig_key,
                defaults={'status': 'SCHEDULED', 'meta': {'dependencies': list(dep_names)}},
            )

    def backwards(apps, schema_editor):  # noqa: ARG001
        # Early return for linter to not actually run code
        if getattr(schema_editor, 'collect_sql', False) is True:
            return
        job_kwargs = {}
        if queue_name is not None:
            job_kwargs['queue_name'] = queue_name
        if job_timeout is not None:
            job_kwargs['job_timeout'] = job_timeout
        start_job_async_or_sync(
            execute_sql_job,
            migration_name=mig_key,
            sql=_resolve_sql(sql_backwards),
            apply_on_sqlite=apply_on_sqlite,
            reverse=True,
            retry=Retry(max=3, interval=[60, 300, 1800]),
            **job_kwargs,
        )

    return forwards, backwards
