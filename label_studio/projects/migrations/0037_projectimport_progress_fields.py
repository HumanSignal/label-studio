# Generated manually for UTC-1335 import/reimport observability

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('projects', '0036_projecthotkeypreference'),
    ]

    operations = [
        # auto_now_add → manual progress/status clock is ORM-only; column already nullable datetime.
        migrations.SeparateDatabaseAndState(
            state_operations=[
                migrations.AlterField(
                    model_name='projectimport',
                    name='updated_at',
                    field=models.DateTimeField(
                        blank=True,
                        help_text='Last time import progress or terminal status was updated',
                        null=True,
                        verbose_name='updated at',
                    ),
                ),
            ],
            database_operations=[],
        ),
        migrations.AddField(
            model_name='projectimport',
            name='job_id',
            field=models.CharField(
                blank=True,
                help_text='RQ job id for async import background work',
                max_length=256,
                null=True,
                verbose_name='job id',
            ),
        ),
        # Avoid BooleanField(default=...) / db_default in database SQL: on SQLite that
        # rewrites the table and trips migration-linter NOT NULL checks.
        migrations.SeparateDatabaseAndState(
            state_operations=[
                migrations.AddField(
                    model_name='projectimport',
                    name='failed_by_health_check',
                    field=models.BooleanField(
                        default=False,
                        help_text='True when status was marked failed by stale/dead RQ health check (not a worker failure)',
                        null=True,
                    ),
                ),
            ],
            database_operations=[
                migrations.AddField(
                    model_name='projectimport',
                    name='failed_by_health_check',
                    field=models.BooleanField(
                        help_text='True when status was marked failed by stale/dead RQ health check (not a worker failure)',
                        null=True,
                    ),
                ),
            ],
        ),
        # auto_now_add is ORM-only; add a plain nullable column in SQL.
        migrations.SeparateDatabaseAndState(
            state_operations=[
                migrations.AddField(
                    model_name='projectreimport',
                    name='created_at',
                    field=models.DateTimeField(
                        auto_now_add=True,
                        help_text='Creation time',
                        null=True,
                        verbose_name='created at',
                    ),
                ),
            ],
            database_operations=[
                migrations.AddField(
                    model_name='projectreimport',
                    name='created_at',
                    field=models.DateTimeField(
                        help_text='Creation time',
                        null=True,
                        verbose_name='created at',
                    ),
                ),
            ],
        ),
        migrations.AddField(
            model_name='projectreimport',
            name='updated_at',
            field=models.DateTimeField(
                blank=True,
                help_text='Last time reimport progress or terminal status was updated',
                null=True,
                verbose_name='updated at',
            ),
        ),
        migrations.AddField(
            model_name='projectreimport',
            name='finished_at',
            field=models.DateTimeField(
                default=None,
                help_text='Complete or fail time',
                null=True,
                verbose_name='finished at',
            ),
        ),
        migrations.AddField(
            model_name='projectreimport',
            name='job_id',
            field=models.CharField(
                blank=True,
                help_text='RQ job id for async reimport background work',
                max_length=256,
                null=True,
                verbose_name='job id',
            ),
        ),
        migrations.SeparateDatabaseAndState(
            state_operations=[
                migrations.AddField(
                    model_name='projectreimport',
                    name='failed_by_health_check',
                    field=models.BooleanField(
                        default=False,
                        help_text='True when status was marked failed by stale/dead RQ health check (not a worker failure)',
                        null=True,
                    ),
                ),
            ],
            database_operations=[
                migrations.AddField(
                    model_name='projectreimport',
                    name='failed_by_health_check',
                    field=models.BooleanField(
                        help_text='True when status was marked failed by stale/dead RQ health check (not a worker failure)',
                        null=True,
                    ),
                ),
            ],
        ),
    ]
