import sys
import logging

from django.db import migrations

logger = logging.getLogger(__name__)


def forwards(apps, schema_editor):
    # This migration was moved to 0024_manual_migrate_counters_again.py

    """
    from tasks.functions import calculate_stats_all_orgs
    from django.conf import settings

    if settings.VERSION_EDITION == 'Community':
        run_command = 'label-studio calculate_stats_all_orgs'
    else:
        run_command = 'cd /label-studio-enterprise/label_studio_enterprise && ' \
                      'python3 manage.py calculate_stats_all_orgs'

    if '--skip-long-migrations' in sys.argv:
        logger.error(
            f"You used --skip-long-migrations, so you should run the migration manually as a separate process "
            f"to recalculate task counters, please use Django command `{run_command}`"
        )
        return

    logger.debug('=> Starting calculate_stats_all_orgs for task counters')
    calculate_stats_all_orgs(from_scratch=False, redis=True)
    """
    return


def backwards(apps, schema_editor):
    pass


class Migration(migrations.Migration):
    atomic = False

    dependencies = [('tasks', '0017_auto_20220330_1310'), ]

    operations = [
        migrations.RunPython(forwards, backwards),
    ]
