# Generated manually for FIT-3092 incremental export snapshots

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('data_export', '0010_alter_convertedformat_export_type'),
    ]

    operations = [
        migrations.AddField(
            model_name='export',
            name='since',
            field=models.DateTimeField(
                blank=True,
                help_text='Inclusive lower bound for Task.updated_at when this snapshot is incremental',
                null=True,
                verbose_name='since',
            ),
        ),
        migrations.AddField(
            model_name='export',
            name='until',
            field=models.DateTimeField(
                blank=True,
                help_text='Exclusive upper bound for Task.updated_at; use as next since for cron hops',
                null=True,
                verbose_name='until',
            ),
        ),
        migrations.AddField(
            model_name='export',
            name='ephemeral',
            field=models.BooleanField(
                db_default=False,
                default=False,
                help_text='When true, excluded from list endpoints; TTL GC via RQ cron when enabled',
                null=True,
                verbose_name='ephemeral',
            ),
        ),
    ]
