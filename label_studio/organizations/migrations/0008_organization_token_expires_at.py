import django_migration_linter as linter
import organizations.models
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('organizations', '0007_organization_allow_unsafe_instruction_tags'),
    ]

    operations = [
        # LSO lints on SQLite, where adding a column with a default rebuilds the table; on Postgres this is
        # ADD COLUMN with a constant default (metadata-only), then DROP DEFAULT
        linter.IgnoreMigration(),
        # The callable default is evaluated once at migrate time, so links issued before expiry existed get one
        # full lifetime from the deploy (or none when expiration is disabled). Rows written later without a value
        # (old pods during cutover) read as expired while expiration is enabled; see is_invite_token_expired
        migrations.AddField(
            model_name='organization',
            name='token_expires_at',
            field=models.DateTimeField(
                blank=True,
                default=organizations.models.default_invite_token_expires_at,
                help_text='When the current invite link stops working; null works only while expiration is disabled',
                null=True,
                verbose_name='token expires at',
            ),
        ),
    ]
