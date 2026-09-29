import django_migration_linter as linter
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('organizations', '0006_alter_organizationmember_deleted_at'),
    ]

    operations = [
        # LSO lints on SQLite, where db_default rebuilds the table; on Postgres this is a plain ADD COLUMN
        linter.IgnoreMigration(),
        migrations.AddField(
            model_name='organization',
            name='allow_unsafe_instruction_tags',
            field=models.BooleanField(
                db_default=False,
                default=False,
                help_text='Keep script, iframe, style and other active tags in project instructions',
                null=True,
                verbose_name='allow unsafe tags in instructions',
            ),
        ),
    ]
