import logging

from django.core.management.base import BaseCommand
from organizations.functions import destroy_organization
from organizations.models import Organization

log = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Destroy organization'

    def add_arguments(self, parser):
        parser.add_argument('organization_id', type=int)

    def handle(self, *args, **options):
        org = Organization.objects.filter(pk=options['organization_id']).first()
        if org is None:
            print(f'Organization with id: {options["organization_id"]} not found')
            return
        yes = input(
            f'You are trying to remove organization with id: {org.id} and title: "{org.title}". This is not reversible!! Are you sure? yes/no: '
        )
        if yes == 'yes':
            destroy_organization(org)
