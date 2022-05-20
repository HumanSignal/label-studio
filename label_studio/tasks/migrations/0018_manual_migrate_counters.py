import logging

from django.db import migrations

from django.conf import settings
from django.db.models import F, Subquery, OuterRef, Count, Q

from core.bulk_update_utils import bulk_update

logger = logging.getLogger(__name__)


def forwards(apps, schema_editor):
    logger.warning("To recalculate stats use Django command calculate_stats for your organization.")
    return  # we don't want to apply this migration to all projects
    """
    Project = apps.get_model('projects', 'Project')

    all_projects = Project.objects.all()

    total_annotations = Count("annotations", distinct=True, filter=Q(annotations__was_cancelled=False))
    cancelled_annotations = Count("annotations", distinct=True, filter=Q(annotations__was_cancelled=True))
    total_predictions = Count("predictions", distinct=True)

    for project in all_projects:
        if not project.tasks.exists():
            continue
        objs = []
        results = project.tasks.all()
        results = results.annotate(new_total_annotations=total_annotations,
                                   new_cancelled_annotations=cancelled_annotations,
                                   new_total_predictions=total_predictions)

        for task in results:
            task.total_annotations = task.new_total_annotations
            task.cancelled_annotations = task.new_cancelled_annotations
            task.total_predictions = task.new_total_predictions
            objs.append(task)

        bulk_update(objs, update_fields=['total_annotations', 'cancelled_annotations', 'total_predictions'],
                        batch_size=settings.BATCH_SIZE)

    number = all_projects.count()
    logger.info(f'Patched {number} project with new is_labeled.')"""


def backwards(apps, schema_editor):
    pass


class Migration(migrations.Migration):
    atomic = False

    dependencies = [('tasks', '0017_auto_20220330_1310')]

    operations = [
        migrations.RunPython(forwards, backwards),
    ]