import logging

from django.core.management.base import BaseCommand

from projects.models import Project

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Recalculate organization project stats (total_annotations, etc)'

    def add_arguments(self, parser):
        parser.add_argument('organization', type=int, help='organization id')

    def handle(self, *args, **options):
        logger.debug(f"Start recalculating for Organization {options['organization']}.")
        projects = Project.objects.filter(organization_id=options['organization'])

        for project in projects:
            logger.debug(f"Start processing project {project.id}.")
            project.update_tasks_counters(project.tasks.all())
            logger.debug(f"End processing project {project.id}.")

        logger.debug(f"Organization {options['organization']} stats were recalculated.")
