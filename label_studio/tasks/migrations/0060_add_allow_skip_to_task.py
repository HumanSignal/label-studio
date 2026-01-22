# Generated migration for adding allow_skip field to Task model

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('tasks', '0059_task_completion_id_updated_at_idx_async'),
    ]

    operations = [
        migrations.AddField(
            model_name='task',
            name='allow_skip',
            field=models.BooleanField(
                default=True,
                null=True,
                help_text='Whether this task can be skipped. Set to False to make task unskippable.',
                verbose_name='allow_skip',
            ),
        ),
    ]

