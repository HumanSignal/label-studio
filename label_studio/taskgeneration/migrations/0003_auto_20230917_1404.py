# Generated by Django 3.2.16 on 2023-09-17 12:04

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('sensordata', '0011_auto_20230917_1403'),
        ('sensormodel', '0020_auto_20230917_1403'),
        ('projects', '0022_projectimport'),
        ('taskgeneration', '0002_rename_taskpair_videoimuoverlap'),
    ]

    operations = [
        migrations.CreateModel(
            name='SensorOverlap',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('start_A', models.FloatField(blank=True, null=True)),
                ('end_A', models.FloatField(blank=True, null=True)),
                ('start_B', models.FloatField(blank=True, null=True)),
                ('end_B', models.FloatField(blank=True, null=True)),
                ('project', models.ForeignKey(null=True, on_delete=django.db.models.deletion.CASCADE, to='projects.project')),
                ('sensordata_A', models.ForeignKey(null=True, on_delete=django.db.models.deletion.CASCADE, related_name='sensor_A', to='sensordata.sensordata')),
                ('sensordata_B', models.ForeignKey(null=True, on_delete=django.db.models.deletion.CASCADE, related_name='sensor_B', to='sensordata.sensordata')),
                ('subject', models.ForeignKey(null=True, on_delete=django.db.models.deletion.CASCADE, to='sensormodel.subject')),
            ],
        ),
        migrations.DeleteModel(
            name='VideoImuOverlap',
        ),
    ]
