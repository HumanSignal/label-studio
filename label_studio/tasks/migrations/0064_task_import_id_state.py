"""Tell Django about task.import_id. The column itself is created by 0063_task_import_id."""

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('tasks', '0063_task_import_id'),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            state_operations=[
                migrations.AddField(
                    model_name='task',
                    name='import_id',
                    field=models.BigIntegerField(
                        blank=True,
                        help_text='Original task ID that was at the import step (the "id" of the task in the imported data, or the source task when tasks are copied between projects), or NULL if there was none. It points one step back, so for a copy of a copy it is the ID of the intermediate copy, not of the first task',
                        null=True,
                        verbose_name='import id',
                    ),
                ),
            ],
        ),
    ]
