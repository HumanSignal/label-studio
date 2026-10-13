from django.db import migrations, models
from core.migration_helpers import make_sql_migration

sql_forwards = (
    'CREATE INDEX CONCURRENTLY IF NOT EXISTS projects_pi_proj_created_idx '
    'ON projects_projectimport (project_id, created_at DESC);',
    'CREATE INDEX CONCURRENTLY IF NOT EXISTS projects_pr_proj_created_idx '
    'ON projects_projectreimport (project_id, created_at DESC);',
)
sql_backwards = (
    'DROP INDEX CONCURRENTLY IF EXISTS projects_pi_proj_created_idx;',
    'DROP INDEX CONCURRENTLY IF EXISTS projects_pr_proj_created_idx;',
)


class Migration(migrations.Migration):
    atomic = False

    dependencies = [
        ('projects', '0037_projectimport_progress_fields'),
    ]

    operations = [
        # State tracks Meta.indexes; DB uses CONCURRENTLY so lintmigrations stays green.
        migrations.SeparateDatabaseAndState(
            state_operations=[
                migrations.AddIndex(
                    model_name='projectimport',
                    index=models.Index(fields=['project', '-created_at'], name='projects_pi_proj_created_idx'),
                ),
                migrations.AddIndex(
                    model_name='projectreimport',
                    index=models.Index(fields=['project', '-created_at'], name='projects_pr_proj_created_idx'),
                ),
            ],
            database_operations=[
                migrations.RunPython(
                    *make_sql_migration(
                        sql_forwards,
                        sql_backwards,
                        apply_on_sqlite=False,
                        execute_immediately=False,
                        migration_name=__name__,
                    )
                ),
            ],
        ),
    ]
