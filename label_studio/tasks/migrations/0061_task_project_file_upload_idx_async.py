from django.db import migrations
from core.migration_helpers import make_sql_migration

sql_forwards = (
    'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_task_project_file_upload '
    'ON task (project_id, file_upload_id);'
)
sql_backwards = (
    'DROP INDEX CONCURRENTLY IF EXISTS idx_task_project_file_upload;'
)

class Migration(migrations.Migration):
    atomic = False

    dependencies = [
        ("tasks", "0060_add_allow_skip_to_task"),
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
