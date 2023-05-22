# Generated by Django 3.2.14 on 2022-10-31 11:06

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('sensormodel', '0008_auto_20221024_2055'),
    ]

    operations = [
        migrations.AddField(
            model_name='sensor',
            name='manufacturer',
            field=models.CharField(blank=True, max_length=50),
        ),
        migrations.AddField(
            model_name='sensor',
            name='name',
            field=models.CharField(blank=True, max_length=50),
        ),
        migrations.AddField(
            model_name='sensor',
            name='parser_template',
            field=models.IntegerField(choices=[], default=1),
        ),
        migrations.AddField(
            model_name='sensor',
            name='version',
            field=models.CharField(blank=True, max_length=50),
        ),
    ]
