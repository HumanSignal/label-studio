# Generated by Django 3.1.14 on 2023-10-05 14:06

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('sensordata', '0009_auto_20231005_1606'),
        ('projects', '0016_auto_20220211_2218'),
        ('sensormodel', '0019_auto_20230927_1322'),
    ]

    operations = [
        migrations.CreateModel(
            name='SensorOverlap',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
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
    ]
