import logging

from organizations.models import Organization
from projects.models import Project

logger = logging.getLogger(__name__)


def calculate_stats_all_orgs(from_scratch):
    orgs = Organization.objects.order_by('-id')

    for org in orgs:
        logger.debug(f"Start recalculating stats for Organization {org.id}.")
        projects = Project.objects.filter(organization=org).order_by('-updated_at')

        for project in projects:
            logger.debug(f"Start processing stats project {project.id} "
                         f"with task count {project.tasks.count()} and updated_at {project.updated_at}")

            tasks = project.update_tasks_counters(project.tasks.all(), from_scratch=from_scratch)

            logger.debug(f"End processing stats project {project.id}."
                         f"Processed {str(tasks)} tasks.")

        logger.debug(f"Organization {org.id} stats were recalculated.")

    logger.debug("All organizations were recalculated.")
