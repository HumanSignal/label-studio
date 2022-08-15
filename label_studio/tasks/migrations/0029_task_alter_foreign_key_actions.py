import logging

from django.db import migrations
from django.contrib.postgres.operations import TrigramExtension
from django.db import connection

logger = logging.getLogger(__name__)

CONSTRAINTS = [
    {"SQL": "SELECT conname FROM pg_catalog.pg_constraint con "
        "INNER JOIN pg_catalog.pg_class rel ON rel.oid = con.conrelid "
        "INNER JOIN pg_catalog.pg_namespace nsp ON nsp.oid = connamespace "
        "WHERE conname LIKE 'prediction_task_id%'",
     "TABLE": "prediction",
     "KEY": "task_id",
     "REF": '"task" ("id")'},
    {"SQL": "SELECT conname FROM pg_catalog.pg_constraint con "
        "INNER JOIN pg_catalog.pg_class rel ON rel.oid = con.conrelid "
        "INNER JOIN pg_catalog.pg_namespace nsp ON nsp.oid = connamespace "
        "WHERE conname LIKE 'task_completion_task_id%'",
     "TABLE": "task_completion",
     "KEY": "task_id",
     "REF": '"task" ("id")'},
    {"SQL": "SELECT conname FROM pg_catalog.pg_constraint con "
        "INNER JOIN pg_catalog.pg_class rel ON rel.oid = con.conrelid "
        "INNER JOIN pg_catalog.pg_namespace nsp ON nsp.oid = connamespace "
        "WHERE conname LIKE 'tasks_tasklock_task_id%'",
     "TABLE": "tasks_tasklock",
     "KEY": "task_id",
     "REF": '"task" ("id")'},
    {"SQL": "SELECT conname FROM pg_catalog.pg_constraint con "
        "INNER JOIN pg_catalog.pg_class rel ON rel.oid = con.conrelid "
        "INNER JOIN pg_catalog.pg_namespace nsp ON nsp.oid = connamespace "
        "WHERE conname LIKE 'tasks_taskcompletiondraft_task_id%'",
     "TABLE": "tasks_annotationdraft",
     "KEY": "task_id",
     "REF": '"task" ("id")'},
    {"SQL": "SELECT conname FROM pg_catalog.pg_constraint con "
            "INNER JOIN pg_catalog.pg_class rel ON rel.oid = con.conrelid "
            "INNER JOIN pg_catalog.pg_namespace nsp ON nsp.oid = connamespace "
            "WHERE conname LIKE 'tasks_annotationdraft_task_id%'",
     "TABLE": "tasks_annotationdraft",
     "KEY": "task_id",
     "REF": '"task" ("id")'}
]


def forwards(apps, schema_editor):
    """
    Add ON DELETE CASCADE action for predictions and annotations when deleting tasks
    """
    change_constraint(schema_editor)


def backwards(apps, schema_editor):
    # Rollback ON DELETE CASCADE action for predictions and annotations
    change_constraint(schema_editor, action='NO ACTION')


def change_constraint(schema_editor, action='CASCADE'):
    """
    Change constraints to be ON DELETE CASCADE or NO ACTION
    """
    # Check if postgres db is used
    if not schema_editor.connection.vendor.startswith('postgres'):
        logger.info('Database vendor: {}'.format(schema_editor.connection.vendor))
        logger.info('Skipping migration without attempting to CREATE INDEX')
        return
    # find indexes for prediction_task_id and annotation_task_id
    cursor = connection.cursor()
    # alter indexes to casdade deletion on tasks deletion
    for c in CONSTRAINTS:
        logger.info(f'Starting update for table {c["TABLE"]}')
        cursor.execute(c['SQL'])
        con = cursor.fetchone()
        if not con or len(con) == 0:
            logger.warning(f'No constraint for table {c["TABLE"]} with key {c["KEY"]}')
            continue
        change = f'ALTER TABLE "{c["TABLE"]}" DROP CONSTRAINT {con[0]}, ADD FOREIGN KEY ("{c["KEY"]}") REFERENCES {c["REF"]} ON DELETE {action} ON UPDATE NO ACTION'
        schema_editor.execute(change)


class Migration(migrations.Migration):
    atomic = False

    dependencies = [('tasks', '0028_auto_20220802_2220')]

    operations = [
        TrigramExtension(),
        migrations.RunPython(forwards, backwards),
    ]
