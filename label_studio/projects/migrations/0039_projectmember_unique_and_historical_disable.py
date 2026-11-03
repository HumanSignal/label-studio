"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license."""

from django.db import migrations, models


def disable_historical_project_members(apps, schema_editor):
    """Keep the lowest primary key of each membership, then disable that historical grant.

    Rows are read in primary-key order. For each ``(project_id, user_id)`` the
    first row is kept, ``created_at`` becomes the group's earliest value,
    ``updated_at`` becomes the latest, and ``enabled`` becomes false. Other
    rows in the group are deleted.

    This function lives only in this migration. Do not register it from
    ``AppConfig.ready``; a later upgrade must not disable grants again.
    """
    ProjectMember = apps.get_model('projects', 'ProjectMember')
    memberships = ProjectMember.objects.using(schema_editor.connection.alias)
    groups = {}
    for row in memberships.order_by('pk').iterator():
        key = (row.project_id, row.user_id)
        group = groups.get(key)
        if group is None:
            groups[key] = {
                'pk': row.pk,
                'created_at': row.created_at,
                'updated_at': row.updated_at,
            }
            continue
        if row.created_at < group['created_at']:
            group['created_at'] = row.created_at
        if row.updated_at > group['updated_at']:
            group['updated_at'] = row.updated_at

    for (project_id, user_id), group in groups.items():
        memberships.filter(pk=group['pk']).update(
            created_at=group['created_at'],
            updated_at=group['updated_at'],
            enabled=False,
        )
        memberships.filter(project_id=project_id, user_id=user_id).exclude(pk=group['pk']).delete()


class Migration(migrations.Migration):
    dependencies = [
        ('projects', '0038_projectimport_list_indexes_async'),
    ]

    operations = [
        migrations.RunPython(disable_historical_project_members, migrations.RunPython.noop),
        migrations.AddConstraint(
            model_name='projectmember',
            constraint=models.UniqueConstraint(fields=['project', 'user'], name='unique_project_member_project_user'),
        ),
    ]
