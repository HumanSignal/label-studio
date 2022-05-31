import logging

from django.core.management.base import BaseCommand

from organizations.models import Organization
from projects.models import Project

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Recalculate project stats (total_annotations, etc) for all organizations'

    def handle(self, *args, **options):
        orgs = Organization.objects.order_by('-id')

        for org in orgs:
            logger.debug(f"Start recalculating stats for Organization {org.id}.")
            projects = Project.objects.filter(organization=org)

            for project in projects:
                logger.debug(f"Start processing stats project {project.id}.")
                project.update_tasks_counters(project.tasks.all())
                logger.debug(f"End processing stats project {project.id}.")

            logger.debug(f"Organization {org.id} stats were recalculated.")

        logger.debug("All organizations were recalculated.")
