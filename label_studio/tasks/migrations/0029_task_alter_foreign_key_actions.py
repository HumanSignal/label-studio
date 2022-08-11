import logging

from django.db import migrations
from django.contrib.postgres.operations import TrigramExtension
from django.db import connection

logger = logging.getLogger(__name__)


def forwards(apps, schema_editor):
    if not schema_editor.connection.vendor.startswith('postgres'):
        logger.info('Database vendor: {}'.format(schema_editor.connection.vendor))
        logger.info('Skipping migration without attempting to CREATE INDEX')
        return
    cursor = connection.cursor()
    cursor.execute("SELECT conname FROM pg_catalog.pg_constraint con INNER JOIN pg_catalog.pg_class rel ON rel.oid = con.conrelid INNER JOIN pg_catalog.pg_namespace nsp ON nsp.oid = connamespace WHERE conname LIKE 'prediction_task_id%'")
    prediction_con = cursor.fetchone()
    cursor.execute("SELECT conname FROM pg_catalog.pg_constraint con INNER JOIN pg_catalog.pg_class rel ON rel.oid = con.conrelid INNER JOIN pg_catalog.pg_namespace nsp ON nsp.oid = connamespace WHERE conname LIKE 'task_completion_task_id%'")
    task_completion_con = cursor.fetchone()
    changes = [f'ALTER TABLE "prediction" DROP CONSTRAINT {prediction_con[0]}, ADD FOREIGN KEY ("task_id") REFERENCES "task" ("id") ON DELETE CASCADE ON UPDATE NO ACTION',
               f'ALTER TABLE "task_completion" DROP CONSTRAINT {task_completion_con[0]}, ADD FOREIGN KEY ("task_id") REFERENCES "task" ("id") ON DELETE CASCADE ON UPDATE NO ACTION']
    for change in changes:
        schema_editor.execute(change)


def backwards(apps, schema_editor):
    if not schema_editor.connection.vendor.startswith('postgres'):
        logger.info('Database vendor: {}'.format(schema_editor.connection.vendor))
        logger.info('Skipping migration without attempting to DROP INDEX')
        return
    cursor = connection.cursor()
    cursor.execute("SELECT conname FROM pg_catalog.pg_constraint con INNER JOIN pg_catalog.pg_class rel ON rel.oid = con.conrelid INNER JOIN pg_catalog.pg_namespace nsp ON nsp.oid = connamespace WHERE conname LIKE 'prediction_task_id%'")
    prediction_con = cursor.fetchone()
    cursor.execute("SELECT conname FROM pg_catalog.pg_constraint con INNER JOIN pg_catalog.pg_class rel ON rel.oid = con.conrelid INNER JOIN pg_catalog.pg_namespace nsp ON nsp.oid = connamespace WHERE conname LIKE 'task_completion_task_id%'")
    task_completion_con = cursor.fetchone()
    changes = [
        f'ALTER TABLE "prediction" DROP CONSTRAINT {prediction_con[0]}, ADD FOREIGN KEY ("task_id") REFERENCES "task" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
        f'ALTER TABLE "task_completion" DROP CONSTRAINT {task_completion_con[0]}, ADD FOREIGN KEY ("task_id") REFERENCES "task" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION']
    for change in changes:
        schema_editor.execute(change)


class Migration(migrations.Migration):
    atomic = False

    dependencies = [('tasks', '0028_auto_20220802_2220')]

    operations = [
        TrigramExtension(),
        migrations.RunPython(forwards, backwards),
    ]
