from core.migration_helpers import make_sql_migration
from django.conf import settings
from django.db import migrations, models

sql_forwards = (
    'CREATE INDEX CONCURRENTLY IF NOT EXISTS task_project_latest_idx '
    'ON fsm_taskstate (project_id, task_id, id DESC) INCLUDE (state);'
)
sql_backwards = 'DROP INDEX CONCURRENTLY IF EXISTS task_project_latest_idx;'


class Migration(migrations.Migration):
    atomic = False

    dependencies = [
        ('fsm', '0003_alter_annotationstate_state'),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            database_operations=[
                migrations.RunPython(
                    *make_sql_migration(
                        sql_forwards,
                        sql_backwards,
                        apply_on_sqlite=False,
                        execute_immediately=False,
                        migration_name=__name__,
                        queue_name=settings.SERVICE_QUEUE_NAME,
                    )
                ),
            ],
            state_operations=[
                migrations.AddIndex(
                    model_name='taskstate',
                    index=models.Index(
                        fields=['project_id', 'task_id', '-id'],
                        include=['state'],
                        name='task_project_latest_idx',
                    ),
                ),
            ],
        ),
    ]
