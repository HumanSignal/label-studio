import logging

from django.db import migrations

logger = logging.getLogger(__name__)


def forwards(apps, schema_editor):
    from tasks.functions import calculate_stats_all_orgs
    from tasks.models import Task

    if Task.objects.count() > 100000:
        logger.error("Your instance has a lot of tasks. You should run the migration manually as a separate process "
                     "to recalculate task counters, please use Django command `manage.py calculate_stats_all_orgs`")
    else:
        logger.debug('Your instance has < 100000 tasks, starting calculate_stats_all_orgs')
        calculate_stats_all_orgs(from_scratch=False)

    return


def backwards(apps, schema_editor):
    pass


class Migration(migrations.Migration):
    atomic = False

    dependencies = [('tasks', '0017_auto_20220330_1310')]

    operations = [
        migrations.RunPython(forwards, backwards),
    ]
