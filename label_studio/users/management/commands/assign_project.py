"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
from django.core.management.base import BaseCommand
from projects.models import Project
from users.models import User


class Command(BaseCommand):
    help = 'Assign a user to a project'

    def add_arguments(self, parser):
        parser.add_argument(
            '--email',
            type=str,
            required=True,
            help='Email address of the user to assign'
        )
        parser.add_argument(
            '--project-id',
            type=int,
            required=True,
            help='ID of the project to assign the user to'
        )

    def handle(self, *args, **options):
        email = options['email']
        project_id = options['project_id']

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            self.stdout.write(
                self.style.ERROR(f'Error: User with email "{email}" not found')
            )
            return

        try:
            project = Project.objects.get(id=project_id)
        except Project.DoesNotExist:
            self.stdout.write(
                self.style.ERROR(f'Error: Project with ID {project_id} not found')
            )
            return

        # Add the user as a collaborator
        created = project.add_collaborator(user)
        
        if created:
            self.stdout.write(
                self.style.SUCCESS(
                    f'Successfully assigned user "{user.email}" to project "{project.title}" (ID: {project.id})'
                )
            )
        else:
            self.stdout.write(
                self.style.WARNING(
                    f'User "{user.email}" is already assigned to project "{project.title}" (ID: {project.id})'
                )
            )
