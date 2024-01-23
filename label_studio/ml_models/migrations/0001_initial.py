# Generated by Django 3.2.23 on 2024-01-22 19:49

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('organizations', '0006_alter_organizationmember_deleted_at'),
    ]

    operations = [
        migrations.CreateModel(
            name='ModelInterface',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('title', models.CharField(help_text='Model name', max_length=500, verbose_name='title')),
                ('description', models.TextField(blank=True, help_text='Model description', null=True, verbose_name='description')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='created at')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='updated at')),
                ('created_by', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='created_models', to=settings.AUTH_USER_MODEL)),
                ('organization', models.ForeignKey(null=True, on_delete=django.db.models.deletion.CASCADE, related_name='model_interfaces', to='organizations.organization')),
            ],
        ),
    ]
