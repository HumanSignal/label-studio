import logging

from django.core.management.base import BaseCommand
from organizations.models import Organization, OrganizationMember
from users.models import User

log = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Assign superusers without organization memberships to organization ID 1'

    def add_arguments(self, parser):
        parser.add_argument(
            '--org-id',
            type=int,
            default=1,
            help='Organization ID to assign superusers to (default: 1)',
        )
        parser.add_argument(
            '--email',
            type=str,
            default=None,
            help='Specific user email to assign (optional, if not provided, assigns all superusers without org)',
        )
        parser.add_argument(
            '--force',
            action='store_true',
            help='Force assignment even if user already has a membership (will create duplicate if needed)',
        )

    def handle(self, *args, **options):
        org_id = options['org_id']
        email = options.get('email')
        force = options.get('force', False)
        
        # Get the organization
        try:
            org = Organization.objects.get(pk=org_id)
        except Organization.DoesNotExist:
            self.stdout.write(
                self.style.ERROR(f'Organization with id {org_id} not found')
            )
            return

        # If specific email provided, assign that user
        if email:
            try:
                user = User.objects.get(email=email)
                if not user.is_superuser:
                    self.stdout.write(
                        self.style.WARNING(f'User {email} is not a superuser. Assigning anyway...')
                    )
                
                # Check if user already has membership in this org
                existing_membership = OrganizationMember.objects.filter(
                    user=user,
                    organization=org,
                    deleted_at__isnull=True
                ).first()
                
                if existing_membership and not force:
                    # Ensure active_organization is set even if membership exists
                    if user.active_organization_id != org_id:
                        user.active_organization = org
                        user.save(update_fields=['active_organization'])
                        self.stdout.write(
                            self.style.SUCCESS(
                                f'User {email} already has an active membership in organization {org.title} (ID: {org_id}). '
                                f'Updated active_organization to match.'
                            )
                        )
                    else:
                        self.stdout.write(
                            self.style.SUCCESS(
                                f'User {email} already has an active membership in organization {org.title} (ID: {org_id}) '
                                f'and active_organization is correctly set.'
                            )
                        )
                    return
                
                # Assign user to organization
                try:
                    org.add_user(user, joined_via_invitation=False)
                    user.active_organization = org
                    user.save(update_fields=['active_organization'])
                    self.stdout.write(
                        self.style.SUCCESS(
                            f'Assigned user {user.email} (ID: {user.pk}) to organization {org.title} (ID: {org_id})'
                        )
                    )
                except Exception as e:
                    self.stdout.write(
                        self.style.ERROR(f'Failed to assign user {email}: {str(e)}')
                    )
                return
            except User.DoesNotExist:
                self.stdout.write(
                    self.style.ERROR(f'User with email {email} not found')
                )
                return

        # Find all superusers
        superusers = User.objects.filter(is_superuser=True)
        
        # Find superusers without organization memberships
        superusers_without_org = []
        for user in superusers:
            # Check if user has any active organization memberships
            has_membership = OrganizationMember.objects.filter(
                user=user,
                deleted_at__isnull=True
            ).exists()
            
            if not has_membership:
                superusers_without_org.append(user)

        if not superusers_without_org:
            self.stdout.write(
                self.style.SUCCESS('No superusers without organization memberships found.')
            )
            return

        # Assign each superuser to the organization
        assigned_count = 0
        for user in superusers_without_org:
            try:
                org.add_user(user, joined_via_invitation=False)
                # Set as active organization
                user.active_organization = org
                user.save(update_fields=['active_organization'])
                assigned_count += 1
                self.stdout.write(
                    self.style.SUCCESS(
                        f'Assigned superuser {user.email} (ID: {user.pk}) to organization {org.title} (ID: {org_id})'
                    )
                )
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(
                        f'Failed to assign superuser {user.email} (ID: {user.pk}): {str(e)}'
                    )
                )

        self.stdout.write(
            self.style.SUCCESS(
                f'\nSuccessfully assigned {assigned_count} superuser(s) to organization {org.title} (ID: {org_id})'
            )
        )

