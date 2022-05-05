import logging

from django.db import migrations
from django.contrib.postgres.operations import TrigramExtension

logger = logging.getLogger(__name__)


def forwards(apps, schema_editor):
    if not schema_editor.connection.vendor.startswith('postgres'):
        logger.info('Database vendor: {}'.format(schema_editor.connection.vendor))
        logger.info('Skipping migration without attempting to CREATE INDEX')
        return
    changes = ['ALTER TABLE "prediction" DROP CONSTRAINT "prediction_task_id_fkey", ADD FOREIGN KEY ("task_id") REFERENCES "task" ("id") ON DELETE CASCADE ON UPDATE NO ACTION',
               'ALTER TABLE "task_completion" DROP CONSTRAINT "task_completion_task_id_fkey", ADD FOREIGN KEY ("task_id") REFERENCES "task" ("id") ON DELETE CASCADE ON UPDATE NO ACTION']
    for change in changes:
        schema_editor.execute(change)


def backwards(apps, schema_editor):
    if not schema_editor.connection.vendor.startswith('postgres'):
        logger.info('Database vendor: {}'.format(schema_editor.connection.vendor))
        logger.info('Skipping migration without attempting to DROP INDEX')
        return

    changes = [
        'ALTER TABLE "prediction" DROP CONSTRAINT "prediction_task_id_fkey", ADD FOREIGN KEY ("task_id") REFERENCES "task" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
        'ALTER TABLE "task_completion" DROP CONSTRAINT "task_completion_task_id_fkey", ADD FOREIGN KEY ("task_id") REFERENCES "task" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION']
    for change in changes:
        schema_editor.execute(change)


class Migration(migrations.Migration):
    atomic = False

    dependencies = [('tasks', '0016_auto_20220414_1408')]

    operations = [
        TrigramExtension(),
        migrations.RunPython(forwards, backwards),
    ]
