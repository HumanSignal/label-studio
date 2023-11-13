# Generated by Django 3.1.14 on 2023-10-26 17:32

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('data_import', '0002_auto_20231005_1606'),
        ('sensordata', '0009_auto_20231005_1606'),
    ]

    operations = [
        migrations.AddField(
            model_name='sensordata',
            name='file_upload_project2',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='subjectannotation_file', to='data_import.fileupload'),
        ),
        migrations.AlterField(
            model_name='sensordata',
            name='file_upload',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='dataimport_file', to='data_import.fileupload'),
        ),
    ]
