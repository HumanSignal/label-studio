"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
from django.core.management.base import BaseCommand, CommandError
from users.models import User


class Command(BaseCommand):
    help = 'Assign a role (admin or annotator) to a user by email'

    def add_arguments(self, parser):
        parser.add_argument(
            '--email',
            type=str,
            required=True,
            help='Email address of the user to assign role to',
        )
        parser.add_argument(
            '--role',
            type=str,
            required=True,
            choices=['admin', 'annotator'],
            help='Role to assign to the user (admin or annotator)',
        )

    def handle(self, *args, **options):
        email = options['email']
        role = options['role']

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            raise CommandError(f'User with email "{email}" does not exist')

        old_role = user.role
        user.role = role
        user.save()

        self.stdout.write(
            self.style.SUCCESS(
                f'Successfully assigned role "{role}" to user {email} (previous role: {old_role})'
            )
        )
