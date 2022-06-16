import sys
import logging

from django.db import migrations

logger = logging.getLogger(__name__)


def forwards(apps, schema_editor):
    import label_studio
    from tasks.functions import calculate_stats_all_orgs
    from tasks.models import Task
    from django.conf import settings

    if settings.VERSION_EDITION == 'Community':
        run_command = 'label-studio calculate_stats_all_orgs'
    else:
        run_command = 'manage.py calculate_stats_all_orgs'

    if Task.objects.count() > 100000 and settings.VERSION_EDITION != 'Community':
        logger.error(f"Your instance has a lot of tasks. You should run the migration manually as a separate process "
                     f"to recalculate task counters, please use Django command `{run_command}`")
    else:
        if '--skip-long-migrations' in sys.argv:
            logger.error(
                f"You used --skip-long-migrations, so you should run the migration manually as a separate process "
                f"to recalculate task counters, please use Django command `{run_command}`"
            )
            return

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
