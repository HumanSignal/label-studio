import sys
import logging

from organizations.models import Organization
from projects.models import Project

logger = logging.getLogger(__name__)


def calculate_stats_all_orgs(from_scratch):
    orgs = Organization.objects.order_by('-id')

    logger = logging.getLogger()
    logger.setLevel(logging.DEBUG)

    handler = logging.StreamHandler(sys.stdout)
    handler.setLevel(logging.DEBUG)
    formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    handler.setFormatter(formatter)
    logger.addHandler(handler)

    for org in orgs:
        logger.info(f"Start recalculating stats for Organization {org.id}.")
        projects = Project.objects.filter(organization=org).order_by('-updated_at')

        for project in projects:
            logger.info(f"Start processing stats project {project.id} "
                        f"with task count {project.tasks.count()} and updated_at {project.updated_at}")

            tasks = project.update_tasks_counters(project.tasks.all(), from_scratch=from_scratch)

            logger.info(f"End processing stats project {project.id}."
                        f"Processed {str(tasks)} tasks.")

        logger.info(f"Organization {org.id} stats were recalculated.")

    logger.info("All organizations were recalculated.")
