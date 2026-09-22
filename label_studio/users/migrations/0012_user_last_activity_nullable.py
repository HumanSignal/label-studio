import django.db.models
from django.db import migrations
from django_migration_linter import IgnoreMigration


class Migration(migrations.Migration):
    """Allow last_activity to be NULL.

    PostgreSQL SQL is ALTER COLUMN DROP NOT NULL (metadata-only). The old default was
    a Python callable, not a database DEFAULT, so there is nothing to DROP DEFAULT.
    SQLite rewrites the table; production uses PostgreSQL.
    """

    dependencies = [
        ('users', '0011_user_custom_hotkeys'),
    ]

    operations = [
        IgnoreMigration(),
        migrations.AlterField(
            model_name='user',
            name='last_activity',
            field=django.db.models.DateTimeField(
                blank=True, default=None, editable=False, null=True, verbose_name='last activity'
            ),
        ),
    ]
