# Generated by Django 3.1.14 on 2022-04-12 09:17

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('tasks', '0013_task_updated_by'),
    ]

    operations = [
        migrations.AddField(
            model_name='task',
            name='inner_id',
            field=models.BigIntegerField(db_index=True, null=True, default=0, help_text='Internal task ID in the project, starts with 1', verbose_name='inner id'),
        ),
    ]
