"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import logging

from django.db import migrations
from django.db.models import F, Window
from django.db.models.functions import RowNumber
from django.db.utils import NotSupportedError
from core.bulk_update_utils import bulk_update
from core.feature_flags import flag_set
from django.contrib.auth.models import AnonymousUser

logger = logging.getLogger(__name__)


def remove(apps, schema_editor):
    # if not flag_set('ff_back_2070_inner_id_12052022_short', user=AnonymousUser()):
    return  # we don't want to apply this migration to all projects

    """ Project = apps.get_model('projects', 'Project')
    projects = Project.objects.all()
    for project in projects:
        logger.info(f'Evaluate inner id for {project}')
        project_tasks = project.tasks.all()
        if project_tasks.exists():
            obj = []
            try:
                results = project_tasks.annotate(row_number=Window(
                    expression=RowNumber(),
                    partition_by=['project'],
                    order_by=F('id').asc()))
                for task in results:
                    task.inner_id = task.row_number
                    obj.append(task)
                bulk_update(obj, batch_size=1000)

            # not window is not supported
            except NotSupportedError:
                first_id = project_tasks.order_by('id').first().id
                project_tasks.update(inner_id=F('id') - first_id)"""


def backwards(apps, schema_editor):
    pass


class Migration(migrations.Migration):
    dependencies = [
        ('tasks', '0014_task_inner_id'),
    ]

    operations = [
        migrations.RunPython(remove, backwards),
    ]