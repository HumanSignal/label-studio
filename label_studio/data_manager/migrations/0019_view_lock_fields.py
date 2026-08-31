"""Add lock metadata to data manager views."""

import django.db.models.deletion
import django_migration_linter as linter
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('data_manager', '0018_remove_allow_skip'),
    ]

    operations = [
        linter.IgnoreMigration(),
        migrations.AddField(
            model_name='view',
            name='is_locked',
            field=models.BooleanField(
                db_default=False,
                default=False,
                help_text='Whether this data manager tab is locked against configuration changes',
                null=True,
                verbose_name='is locked',
            ),
        ),
        migrations.AddField(
            model_name='view',
            name='locked_at',
            field=models.DateTimeField(blank=True, help_text='Time when this view was locked', null=True, verbose_name='locked at'),
        ),
        migrations.AddField(
            model_name='view',
            name='locked_by',
            field=models.ForeignKey(
                blank=True,
                db_constraint=False,
                db_index=False,
                help_text='User who locked this view',
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='locked_%(app_label)s_%(class)ss',
                to=settings.AUTH_USER_MODEL,
            ),
        ),
    ]
