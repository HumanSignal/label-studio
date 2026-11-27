# Async Migrations in Label Studio

## Overview

Async migrations are a mechanism for executing heavy database operations (e.g., creating indexes, bulk data updates) in the background without blocking the main Django migration process.

## Key Components

### AsyncMigrationStatus

Model for tracking async migration status (`label_studio/core/models.py:12`).

**Statuses:**
- `SCHEDULED` - Migration is scheduled but not yet started
- `STARTED` - Migration is started or queued
- `IN PROGRESS` - Migration is in progress (check meta for job_id or status)
- `FINISHED` - Migration completed successfully
- `ERROR` - Migration completed with errors (check meta for details)

### make_sql_migration Helper

The main tool for creating new async migrations is located in `label_studio/core/migration_helpers.py:55`.

### Deploy-safe job start

Migration jobs are delayed ~15 min via `start_migration_job` (`MIGRATION_JOB_START_DELAY_SECONDS`) so they run **after** a rolling deploy completes — on new workers, not stale ones still alive during the deploy. `make_sql_migration` uses it automatically; **hand-written migrations must call `start_migration_job` instead of `start_job_async_or_sync`** whenever they schedule an async job.

#### Scheduling a function defined inside the migration module

If the job function is defined **inside the migration module itself** (the common case for
hand-written backfills), pass it as a **dotted-path string**, not a direct reference:

```python
def forwards(apps, schema_editor):
    start_migration_job(
        f'{__name__}.run_backfill',
        migration_name=migration_name,
        queue_name=settings.SERVICE_QUEUE_NAME,
    )
```

`start_migration_job` routes string targets through `run_migration_job`, which imports them
on the worker via `import_string`. This is required because Python does not bind submodules
whose name starts with a digit (e.g. `0005_...`) as attributes on their parent package, so RQ
cannot deserialize a direct function reference from such a module — it raises
`AttributeError`/`ValueError` on the worker. `run_migration_job` also reschedules itself
(after `MIGRATION_JOB_RESCHEDULE_DELAY_SECONDS`, default 30s) if the import fails because the
worker hasn't been upgraded yet during a rolling deploy.

## How to Create a New Async Migration

### Using the make_sql_migration Helper

```python
from django.db import migrations
from core.migration_helpers import make_sql_migration

# SQL for forward migration
sql_forwards = (
    'CREATE INDEX CONCURRENTLY IF NOT EXISTS my_index_name '
    'ON my_table (column1, column2);'
)

# SQL for rollback
sql_backwards = (
    'DROP INDEX CONCURRENTLY IF EXISTS my_index_name;'
)

class Migration(migrations.Migration):
    atomic = False  # Important for CONCURRENTLY operations in PostgreSQL

    dependencies = [
        ("tasks", "0054_previous_migration"),
    ]

    operations = [
        migrations.RunPython(
            *make_sql_migration(
                sql_forwards,
                sql_backwards,
                migration_name=__name__,  # Automatically uses module name
                apply_on_sqlite=False,  # Optional: whether to apply on SQLite (default False)
                execute_immediately=False,  # Optional: execute immediately or allow scheduling
            )
        ),
    ]
```

### make_sql_migration Parameters

- **sql_forwards** (required): SQL for forward migration
- **sql_backwards** (required): SQL for rollback
- **migration_name** (required): Migration name. Use `__name__` to automatically use the module name (e.g., `tasks.migrations.0055_task_proj_octlen_idx_async`)
- **apply_on_sqlite** (optional, default `False`): Whether to apply SQL on SQLite
- **execute_immediately** (optional, default `False`): Execute immediately or allow scheduling

## Migration Scheduling

### Automatic Scheduling

By default, migrations execute immediately when running `manage.py migrate`. However, you can enable scheduling mode.

**Enabling scheduling mode:**

Set the environment variable:
```bash
export ALLOW_SCHEDULED_MIGRATIONS=true
```

### Scheduling Behavior

When `ALLOW_SCHEDULED_MIGRATIONS=true` and `execute_immediately=False`:

1. When the migration runs, an `AsyncMigrationStatus` record is created with `SCHEDULED` status
2. The migration is not executed automatically
3. Administrators can manually trigger scheduled migrations via Django Admin

### Forcing Immediate Execution

If you need a migration to execute immediately regardless of `ALLOW_SCHEDULED_MIGRATIONS`:

```python
operations = [
    migrations.RunPython(
        *make_sql_migration(
            sql_forwards,
            sql_backwards,
            migration_name=__name__,
            execute_immediately=True,  # Force immediate execution
        )
    ),
]
```
