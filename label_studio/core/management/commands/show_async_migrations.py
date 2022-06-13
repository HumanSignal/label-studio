import logging

from django.core.management.base import BaseCommand

from core.models import AsyncMigrationStatus

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Show async migrations'

    def add_arguments(self, parser):
        parser.add_argument('organization', type=int, help='organization id', default=-1)

    def handle(self, *args, **options):
        org = options['organization']
        logger.debug(f"Showing AsyncMigrationStatus for Organization {org if org > -1 else 'ALL'}.")
        if org == -1:
            migrations = AsyncMigrationStatus.objects.all()
        else:
            migrations = AsyncMigrationStatus.objects.filter(organization_id=org)

        for m in migrations:
            logger.debug(f"Migration: {m.name} \t {m.status}")

        logger.debug(f"Organization {org if org > -1 else 'ALL'} AsyncMigrationStatus printed.")
