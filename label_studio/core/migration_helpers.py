import logging
from typing import Callable, Tuple

from core.redis import start_job_async_or_sync
from django.conf import settings
from django.db import connection
from rq import Retry

logger = logging.getLogger(__name__)


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
) -> Tuple[Callable, Callable]:
    """Return (forwards, backwards) for migrations.RunPython.

    - forwards: either schedules job or marks as SCHEDULED
    - backwards: always schedules job to execute reverse SQL
    """
    if not migration_name:
        raise ValueError("make_sql_migration requires explicit migration_name like 'app_label:migration_module'")
    mig_key = migration_name

    def forwards(apps, schema_editor):  # noqa: ARG001
        if schema_editor.connection.vendor == 'sqlite' and not apply_on_sqlite:
            logger.info('Skipping migration for SQLite (apply_on_sqlite=False)')
            return
        should_execute = execute_immediately or not settings.ALLOW_SCHEDULED_MIGRATIONS
        if should_execute:
            start_job_async_or_sync(
                execute_sql_job,
                migration_name=mig_key,
                sql=sql_forwards,
                apply_on_sqlite=apply_on_sqlite,
                reverse=False,
                retry=Retry(max=3, interval=[60, 300, 1800]),
            )
        else:
            AsyncMigrationStatus = apps.get_model('core', 'AsyncMigrationStatus')
            AsyncMigrationStatus.objects.get_or_create(
                name=mig_key,
                defaults={'status': 'SCHEDULED'},
            )

    def backwards(apps, schema_editor):  # noqa: ARG001
        start_job_async_or_sync(
            execute_sql_job,
            migration_name=mig_key,
            sql=sql_backwards,
            apply_on_sqlite=apply_on_sqlite,
            reverse=True,
            retry=Retry(max=3, interval=[60, 300, 1800]),
        )

    return forwards, backwards
