"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
from django.core.management.base import BaseCommand
from projects.models import Project, ProjectMember


class Command(BaseCommand):
    help = 'List all members of a project'

    def add_arguments(self, parser):
        parser.add_argument(
            '--project-id',
            type=int,
            required=True,
            help='ID of the project to list members for'
        )

    def handle(self, *args, **options):
        project_id = options['project_id']

        try:
            project = Project.objects.get(id=project_id)
        except Project.DoesNotExist:
            self.stdout.write(
                self.style.ERROR(f'Error: Project with ID {project_id} not found')
            )
            return

        # Get all project members
        members = ProjectMember.objects.filter(project=project).select_related('user')
        
        if not members:
            self.stdout.write(
                self.style.WARNING(f'No members found for project "{project.title}" (ID: {project.id})')
            )
            return

        self.stdout.write(
            self.style.SUCCESS(f'\nMembers of project "{project.title}" (ID: {project.id}):\n')
        )
        
        # Display members in a formatted table
        self.stdout.write(f'{"Email":<40} {"Role":<15} {"Enabled":<10} {"Created At":<25}')
        self.stdout.write('-' * 90)
        
        for member in members:
            enabled_status = '✓' if member.enabled else '✗'
            self.stdout.write(
                f'{member.user.email:<40} {member.user.role:<15} {enabled_status:<10} {member.created_at.strftime("%Y-%m-%d %H:%M:%S"):<25}'
            )
        
        self.stdout.write(f'\nTotal members: {members.count()}')
