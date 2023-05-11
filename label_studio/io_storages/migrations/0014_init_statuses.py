"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
from django.db import migrations


def forwards(apps, schema_editor):
    pass  # View = apps.get_model('data_manager', 'View')


def backwards(apps, schema_editor):
    pass


class Migration(migrations.Migration):
    dependencies = [
        ('io_storages', '0013_auto_20230420_0259'),
    ]

    operations = [
        migrations.RunPython(forwards, backwards),
    ]
