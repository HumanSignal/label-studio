from django.db import migrations
from core.migration_helpers import make_sql_migration

sql_forwards = (
    'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_task_data_trgm '
    'ON task USING gin (project_id, (data::text) gin_trgm_ops);'
)
sql_backwards = (
    'DROP INDEX CONCURRENTLY IF EXISTS idx_task_data_trgm;'
)

class Migration(migrations.Migration):
    atomic = False

    dependencies = [
        ("tasks", "0061_task_project_file_upload_idx_async"),
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
