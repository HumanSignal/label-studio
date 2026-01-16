"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('projects', '0001_initial'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('tasks', '0063_quality_metrics'),
    ]

    operations = [
        migrations.CreateModel(
            name='AuditLog',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('action', models.CharField(choices=[('create', 'Created'), ('update', 'Updated'), ('delete', 'Deleted'), ('view', 'Viewed'), ('export', 'Exported'), ('import', 'Imported'), ('approve', 'Approved'), ('reject', 'Rejected'), ('assign', 'Assigned'), ('unassign', 'Unassigned'), ('comment', 'Commented'), ('review', 'Reviewed'), ('rollback', 'Rolled Back')], help_text='Action performed', max_length=20, verbose_name='action')),
                ('entity_type', models.CharField(choices=[('annotation', 'Annotation'), ('task', 'Task'), ('project', 'Project'), ('user', 'User'), ('comment', 'Comment'), ('quality_score', 'Quality Score'), ('member', 'Project Member'), ('settings', 'Settings')], help_text='Type of entity affected', max_length=30, verbose_name='entity type')),
                ('entity_id', models.IntegerField(help_text='ID of the affected entity', verbose_name='entity id')),
                ('description', models.TextField(help_text='Human-readable description of the action', verbose_name='description')),
                ('changes', models.JSONField(blank=True, help_text='JSON of what changed (before/after)', null=True, verbose_name='changes')),
                ('metadata', models.JSONField(blank=True, help_text='Additional metadata (IP, user agent, etc.)', null=True, verbose_name='metadata')),
                ('created_at', models.DateTimeField(auto_now_add=True, db_index=True, verbose_name='created at')),
                ('project', models.ForeignKey(blank=True, help_text='Project context (if applicable)', null=True, on_delete=django.db.models.deletion.CASCADE, related_name='audit_logs', to='projects.project')),
                ('user', models.ForeignKey(help_text='User who performed the action', null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='audit_logs', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'db_table': 'audit_log',
                'ordering': ['-created_at'],
            },
        ),
        migrations.CreateModel(
            name='AnnotationVersion',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('version_number', models.IntegerField(help_text='Sequential version number', verbose_name='version number')),
                ('result', models.JSONField(help_text='Annotation result at this version', verbose_name='result')),
                ('lead_time', models.FloatField(blank=True, help_text='Lead time at this version', null=True, verbose_name='lead time')),
                ('change_summary', models.TextField(blank=True, help_text='Summary of changes in this version', verbose_name='change summary')),
                ('changes_diff', models.JSONField(blank=True, help_text='Detailed diff of changes', null=True, verbose_name='changes diff')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='created at')),
                ('is_rollback', models.BooleanField(default=False, help_text='Whether this version is a rollback', verbose_name='is rollback')),
                ('rolled_back_from_version', models.IntegerField(blank=True, help_text='Version number this was rolled back from', null=True, verbose_name='rolled back from version')),
                ('annotation', models.ForeignKey(help_text='Annotation this version belongs to', on_delete=django.db.models.deletion.CASCADE, related_name='versions', to='tasks.annotation')),
                ('created_by', models.ForeignKey(help_text='User who created this version', null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='annotation_versions_created', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'db_table': 'annotation_version',
                'ordering': ['-version_number'],
            },
        ),
        migrations.CreateModel(
            name='ProjectChangeLog',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('field_name', models.CharField(help_text='Name of the field that changed', max_length=100, verbose_name='field name')),
                ('old_value', models.TextField(blank=True, help_text='Previous value (JSON serialized)', verbose_name='old value')),
                ('new_value', models.TextField(blank=True, help_text='New value (JSON serialized)', verbose_name='new value')),
                ('change_type', models.CharField(choices=[('settings', 'Settings'), ('members', 'Members'), ('config', 'Label Config'), ('storage', 'Storage'), ('ml', 'ML Backend'), ('webhook', 'Webhook')], help_text='Type of change', max_length=20, verbose_name='change type')),
                ('description', models.TextField(help_text='Description of the change', verbose_name='description')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='created at')),
                ('project', models.ForeignKey(help_text='Project being changed', on_delete=django.db.models.deletion.CASCADE, related_name='change_logs', to='projects.project')),
                ('user', models.ForeignKey(help_text='User who made the change', null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='project_changes', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'db_table': 'project_change_log',
                'ordering': ['-created_at'],
            },
        ),
        # Indexes for AuditLog
        migrations.AddIndex(
            model_name='auditlog',
            index=models.Index(fields=['user', 'created_at'], name='audit_log_user_cr_8f2a1b_idx'),
        ),
        migrations.AddIndex(
            model_name='auditlog',
            index=models.Index(fields=['project', 'created_at'], name='audit_log_project_4e9c3d_idx'),
        ),
        migrations.AddIndex(
            model_name='auditlog',
            index=models.Index(fields=['entity_type', 'entity_id'], name='audit_log_entity_5a7b2f_idx'),
        ),
        migrations.AddIndex(
            model_name='auditlog',
            index=models.Index(fields=['action', 'created_at'], name='audit_log_action_9d4c1e_idx'),
        ),
        migrations.AddIndex(
            model_name='auditlog',
            index=models.Index(fields=['created_at'], name='audit_log_created_6b8e4a_idx'),
        ),
        # Indexes for AnnotationVersion
        migrations.AddIndex(
            model_name='annotationversion',
            index=models.Index(fields=['annotation', 'version_number'], name='annotation_annotat_3c7f9e_idx'),
        ),
        migrations.AddIndex(
            model_name='annotationversion',
            index=models.Index(fields=['annotation', 'created_at'], name='annotation_annotat_1d6b5a_idx'),
        ),
        migrations.AddIndex(
            model_name='annotationversion',
            index=models.Index(fields=['created_by'], name='annotation_created_7e9a2c_idx'),
        ),
        # Indexes for ProjectChangeLog
        migrations.AddIndex(
            model_name='projectchangelog',
            index=models.Index(fields=['project', 'created_at'], name='project_ch_project_8f1c3b_idx'),
        ),
        migrations.AddIndex(
            model_name='projectchangelog',
            index=models.Index(fields=['user', 'created_at'], name='project_ch_user_cr_4d7e9a_idx'),
        ),
        migrations.AddIndex(
            model_name='projectchangelog',
            index=models.Index(fields=['change_type'], name='project_ch_change__6c3f8e_idx'),
        ),
        # Unique constraints
        migrations.AlterUniqueTogether(
            name='annotationversion',
            unique_together={('annotation', 'version_number')},
        ),
    ]
