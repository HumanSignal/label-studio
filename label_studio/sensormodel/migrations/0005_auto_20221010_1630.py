# Generated by Django 3.2.14 on 2022-10-10 14:30

from django.db import migrations, models
import django.utils.timezone


class Migration(migrations.Migration):

    dependencies = [
        ('sensormodel', '0004_auto_20221010_1531'),
    ]

    operations = [
        migrations.AddField(
            model_name='deployment',
            name='sensorlist',
            field=models.TextField(default=django.utils.timezone.now, max_length=200),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='deployment',
            name='subjectlist',
            field=models.TextField(default=django.utils.timezone.now, max_length=200),
            preserve_default=False,
        ),
    ]
