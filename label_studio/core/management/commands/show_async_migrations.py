import logging

from core.models import AsyncMigrationStatus
from django.core.management.base import BaseCommand

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Show async migrations'

    def add_arguments(self, parser):
        parser.add_argument('-o', '--organization', type=int, help='organization id', default=-1)

    def handle(self, *args, **options):
        org = options['organization']
        logger.debug(f"===> AsyncMigrationStatus for Organization {org if org > -1 else 'ALL'}")
        if org == -1:
            migrations = AsyncMigrationStatus.objects.all().order_by('project_id')
        else:
            migrations = AsyncMigrationStatus.objects.filter(project__organization_id=org)

        for m in migrations:
            logger.debug(f'{m.name} \t {m.created_at} \t Project <{m.project}> \t {m.status} \t {m.meta}')

        logger.debug(f"===> AsyncMigrationStatus for Organization {org if org > -1 else 'ALL'} printed")
