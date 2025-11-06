from django.db import migrations
from core.migration_helpers import make_sql_migration

sql_forwards = (
    'CREATE INDEX CONCURRENTLY IF NOT EXISTS task_completion_id_updated_at_idx '
    'ON task_completion (id, updated_at);'
)
sql_backwards = (
    'DROP INDEX CONCURRENTLY IF EXISTS task_completion_id_updated_at_idx;'
)

class Migration(migrations.Migration):
    atomic = False

    dependencies = [
        ("tasks", "0058_task_precomputed_agreement"),
    ]
    operations = [
        migrations.RunPython(
            *make_sql_migration(
                sql_forwards,
                sql_backwards,
                apply_on_sqlite=False,
                execute_immediately=False,
                migration_name=__name__,
            )
        ),
    ]
