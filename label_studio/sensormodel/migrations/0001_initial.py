# Generated by Django 3.2.14 on 2022-10-05 14:44

from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
    ]

    operations = [
        migrations.CreateModel(
            name='SensorTabel',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('id_sensor', models.IntegerField()),
                ('name', models.CharField(max_length=20)),
            ],
        ),
    ]
