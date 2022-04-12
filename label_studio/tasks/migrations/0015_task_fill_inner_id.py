"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
from django.db import migrations
from django.db.models import F, Window, Subquery, OuterRef
from django.db.models.functions import RowNumber
from django.contrib.auth.models import AnonymousUser

from core.bulk_update_utils import bulk_update
from core.feature_flags import flag_set


def remove(apps, schema_editor):
    user = AnonymousUser()
    if flag_set('ff_back_2070_inner_id_12052022_short', user):
        Project = apps.get_model('projects', 'Project')
        projects = Project.objects.all()
        for project in projects:
            project_tasks = project.tasks.all()
            if project_tasks:
                obj = []
                results = project_tasks.annotate(row_number=Window(
                    expression=RowNumber(),
                    partition_by=[('project')],
                    order_by=F('id').asc()))
                for task in results:
                    task.inner_id = task.row_number
                    obj.append(task)
                bulk_update(obj, batch_size=1000)


def backwards(apps, schema_editor):
    pass

class Migration(migrations.Migration):
    dependencies = [
        ('tasks', '0014_task_inner_id'),
    ]

    operations = [
        migrations.RunPython(remove, backwards),
    ]