"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
from django.db import migrations


def remove(apps, schema_editor):
    View = apps.get_model('data_manager', 'View')
    views = View.objects.all()

    for view in views:
        if 'hiddenColumns' in view.data:
            if 'explore' in view.data['hiddenColumns']:
                view.data['hiddenColumns']['explore'].append('tasks:predictions_model_versions')
                view.data['hiddenColumns']['explore'] = list(set(view.data['hiddenColumns']['explore']))
            if 'labeling' in view.data['hiddenColumns']:
                view.data['hiddenColumns']['labeling'].append('tasks:predictions_model_versions')
                view.data['hiddenColumns']['labeling'] = list(set(view.data['hiddenColumns']['labeling']))

        view.save()


class Migration(migrations.Migration):
    dependencies = [
        ('data_manager', '0002_remove_annotations_ids'),
    ]

    operations = [
        migrations.RunPython(remove),
    ]
