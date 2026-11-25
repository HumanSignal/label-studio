"""Add the nullable column task.import_id — database only.

The model field and the code that uses the column ship separately, in 0064_task_import_id_state, so
this migration can be released first and on its own: application code never depends on a column
that a failed migration did not create.

ADD COLUMN ... NULL is metadata-only (no table rewrite, whatever the table size), but it needs an
ACCESS EXCLUSIVE lock on "task". If a long transaction holds any lock on the table, the ALTER waits
for it and every new query on "task" (reads included) queues behind the waiting ALTER. So on
PostgreSQL each attempt waits for the lock at most LOCK_TIMEOUT and then gives up, holding nothing;
the migration tries ATTEMPTS times with PAUSE_SECONDS between attempts and fails if none got the lock.
"""

import logging
import time

from django.db import OperationalError, migrations, transaction

logger = logging.getLogger(__name__)

LOCK_TIMEOUT = '3s'
ATTEMPTS = 3
PAUSE_SECONDS = 20
LOCK_NOT_AVAILABLE = '55P03'  # PostgreSQL: "canceling statement due to lock timeout"


GAVE_UP_MESSAGE = f"""
Migration tasks.0063_task_import_id was NOT applied: no lock on table "task" within {LOCK_TIMEOUT}
in {ATTEMPTS} attempts ({PAUSE_SECONDS} s apart). Nothing was changed and nothing is left locked;
some long transaction is using the table. The application keeps working on the previous version.

What to do:
1. Find what holds the table (long transactions first):
     SELECT pid, now() - xact_start AS running_for, state, left(query, 120) AS query
     FROM pg_stat_activity
     WHERE xact_start IS NOT NULL AND pid <> pg_backend_pid()
     ORDER BY xact_start LIMIT 20;
2. When it has finished (or at a quiet time), run the migrations again: re-run the deploy / the
   migration job (container command "label-studio-migrate", i.e. "manage.py locked_migrate").
3. Or add the column by hand, then run the migrations again (the migration sees the column and passes):
     SET lock_timeout = '{LOCK_TIMEOUT}';
     ALTER TABLE "task" ADD COLUMN IF NOT EXISTS "import_id" bigint NULL;
   The statement is instant once it gets the lock; if it reports "lock timeout", just repeat it.
"""


def _is_lock_timeout(exc):
    cause = exc.__cause__
    return LOCK_NOT_AVAILABLE in (getattr(cause, 'sqlstate', None), getattr(cause, 'pgcode', None))


def add_column(apps, schema_editor):
    connection = schema_editor.connection
    if connection.vendor != 'postgresql':
        schema_editor.execute('ALTER TABLE "task" ADD COLUMN "import_id" bigint NULL')
        return

    for attempt in range(1, ATTEMPTS + 1):
        try:
            # A savepoint: when the attempt times out, its lock request and SET LOCAL are rolled back,
            # so nothing is held on "task" during the pause.
            with transaction.atomic(using=connection.alias):
                schema_editor.execute(f"SET LOCAL lock_timeout = '{LOCK_TIMEOUT}'")
                schema_editor.execute('ALTER TABLE "task" ADD COLUMN IF NOT EXISTS "import_id" bigint NULL')
            return
        except OperationalError as exc:
            if not _is_lock_timeout(exc):
                raise
            if attempt == ATTEMPTS:
                logger.error(GAVE_UP_MESSAGE)
                raise
            logger.warning(
                'task.import_id: no lock on "task" within %s (attempt %s of %s), retrying in %s s',
                LOCK_TIMEOUT,
                attempt,
                ATTEMPTS,
                PAUSE_SECONDS,
            )
            time.sleep(PAUSE_SECONDS)


def drop_column(apps, schema_editor):
    schema_editor.execute('ALTER TABLE "task" DROP COLUMN "import_id"')


class Migration(migrations.Migration):

    dependencies = [
        ('tasks', '0062_task_data_trgm_idx_async'),
    ]

    operations = [
        migrations.RunPython(add_column, drop_column),
    ]
