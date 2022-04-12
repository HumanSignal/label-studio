"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
from django.db import migrations
from core.feature_flags import flag_set
from django.contrib.auth.models import AnonymousUser

def remove(apps, schema_editor):
    user = AnonymousUser()
    if flag_set('ff_back_2070_inner_id_12052022_short', user):
        View = apps.get_model('data_manager', 'View')
        views = View.objects.all()

        for view in views:
            if 'hiddenColumns' in view.data:
                if 'explore' in view.data['hiddenColumns']:
                    view.data['hiddenColumns']['explore'].append('tasks:inner_id')
                    view.data['hiddenColumns']['explore'] = list(set(view.data['hiddenColumns']['explore']))
                if 'labeling' in view.data['hiddenColumns']:
                    view.data['hiddenColumns']['labeling'].append('tasks:inner_id')
                    view.data['hiddenColumns']['labeling'] = list(set(view.data['hiddenColumns']['labeling']))

            view.save()


def backwards(apps, schema_editor):
    user = AnonymousUser()
    if flag_set('ff_back_2070_inner_id_12052022_short', user):
        View = apps.get_model('data_manager', 'View')
        views = View.objects.all()

        for view in views:
            if 'hiddenColumns' in view.data:
                if 'explore' in view.data['hiddenColumns']:
                    view.data['hiddenColumns']['explore'].remove('tasks:inner_id')
                    view.data['hiddenColumns']['explore'] = list(set(view.data['hiddenColumns']['explore']))
                if 'labeling' in view.data['hiddenColumns']:
                    view.data['hiddenColumns']['labeling'].remove('tasks:inner_id')
                    view.data['hiddenColumns']['labeling'] = list(set(view.data['hiddenColumns']['labeling']))

            view.save()


class Migration(migrations.Migration):
    dependencies = [
        ('data_manager', '0005_remove_updated_by'),
    ]

    operations = [
        migrations.RunPython(remove, backwards),
    ]
