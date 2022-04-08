import logging

from django.db import migrations

from django.conf import settings
from core.bulk_update_utils import bulk_update

logger = logging.getLogger(__name__)


def forwards(apps, schema_editor):
    Project = apps.get_model('projects', 'Project')

    all_projects = Project.objects.all()

    for project in all_projects:
        objs = []
        for task in project.tasks.all():
            total_annotations = task.annotations.all().count()
            cancelled_annotations = task.annotations.all().filter(was_cancelled=True).count()
            task.total_annotations = total_annotations - cancelled_annotations
            task.cancelled_annotations = cancelled_annotations
            task.total_predictions = task.predictions.all().count()
            objs.append(task)

        bulk_update(objs, update_fields=['total_annotations', 'cancelled_annotations', 'total_predictions'],
                        batch_size=settings.BATCH_SIZE)

    number = all_projects.count()
    logger.info(f'Patched {number} project with new is_labeled.')


def backwards(apps, schema_editor):
    pass


class Migration(migrations.Migration):
    atomic = False

    dependencies = [('tasks', '0014_auto_20220330_1310')]

    operations = [
        migrations.RunPython(forwards, backwards),
    ]