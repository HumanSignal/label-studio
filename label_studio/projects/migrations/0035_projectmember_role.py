# Generated migration for adding RBAC roles to ProjectMember

from django.db import migrations, models


def assign_roles_to_existing_members(apps, schema_editor):
    """
    Assign roles to existing ProjectMember records:
    - Project creator gets 'owner' role
    - All other members get 'annotator' role
    - If project has no created_by, first member becomes owner
    """
    ProjectMember = apps.get_model('projects', 'ProjectMember')
    Project = apps.get_model('projects', 'Project')

    for project in Project.objects.all():
        members = ProjectMember.objects.filter(project=project)

        if not members.exists():
            continue

        # Assign owner to project creator
        if project.created_by:
            creator_members = members.filter(user=project.created_by)
            if creator_members.exists():
                creator_members.update(role='owner')
            else:
                # Creator is not a member, create membership
                ProjectMember.objects.create(
                    user=project.created_by,
                    project=project,
                    role='owner',
                    enabled=True
                )

        # If no owner assigned yet (no created_by or creator not found), assign first member as owner
        owner_count = members.filter(role='owner').count()
        if owner_count == 0:
            first_member = members.first()
            if first_member:
                first_member.role = 'owner'
                first_member.save()

        # All other members remain as 'annotator' (default)


def reverse_roles(apps, schema_editor):
    """Reverse migration: no action needed as role field will be removed"""
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('projects', '0034_project_annotator_evaluation_enabled'),
    ]

    operations = [
        # Add role field with default
        migrations.AddField(
            model_name='projectmember',
            name='role',
            field=models.CharField(
                choices=[('owner', 'Owner'), ('reviewer', 'Reviewer'), ('annotator', 'Annotator')],
                default='annotator',
                help_text='User role in this project',
                max_length=20,
            ),
        ),

        # Run data migration to assign roles
        migrations.RunPython(
            assign_roles_to_existing_members,
            reverse_roles,
        ),

        # Add unique constraint
        migrations.AddConstraint(
            model_name='projectmember',
            constraint=models.UniqueConstraint(
                fields=['user', 'project'],
                name='unique_user_project_member',
            ),
        ),

        # Add index on (project, role)
        migrations.AddIndex(
            model_name='projectmember',
            index=models.Index(fields=['project', 'role'], name='projectmember_project_role_idx'),
        ),

        # Set db_table name
        migrations.AlterModelTable(
            name='projectmember',
            table='project_member',
        ),
    ]
