# Generated by Django 3.2.14 on 2023-01-31 12:06

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('sensormodel', '0013_auto_20230129_1700'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='sensor',
            name='conversion',
        ),
        migrations.RemoveField(
            model_name='sensor',
            name='sampling_rate',
        ),
        migrations.RemoveField(
            model_name='sensor',
            name='unit',
        ),
        migrations.AddField(
            model_name='sensor',
            name='sensor_hash',
            field=models.CharField(blank=True, max_length=10),
        ),
        migrations.AddField(
            model_name='sensortype',
            name='sensortype',
            field=models.CharField(choices=[('I', 'IMU'), ('V', 'Video'), ('M', 'Microphone')], default=1, max_length=1),
        ),
        migrations.DeleteModel(
            name='SensorColumnMetaData',
        ),
    ]
