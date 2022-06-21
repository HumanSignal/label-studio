import sys
import logging

from core.models import AsyncMigrationStatus
from core.redis import start_job_async_or_sync
from organizations.models import Organization
from projects.models import Project


def calculate_stats_all_orgs(from_scratch):
    logger = logging.getLogger(__name__)
    orgs = Organization.objects.order_by('-id')

    for org in orgs:
        logger.debug(f"Start recalculating stats for Organization {org.id}.")

        # start async calculation job on redis
        start_job_async_or_sync(redis_job_for_calculation, org, from_scratch)

        logger.debug(f"Organization {org.id} stats were recalculated.")

    logger.debug("All organizations were recalculated.")


def redis_job_for_calculation(org, from_scratch):
    """
    Recalculate counters for projects list
    :param org: Organization to recalculate
    :param from_scratch: Start calculation from scratch or skip calculated tasks
    """
    logger = logging.getLogger()
    logger.setLevel(logging.DEBUG)

    handler = logging.StreamHandler(sys.stdout)
    handler.setLevel(logging.DEBUG)
    formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    handler.setFormatter(formatter)
    logger.addHandler(handler)
    
    projects = Project.objects.filter(organization=org).order_by('-updated_at')
    for project in projects:
        migration = AsyncMigrationStatus.objects.create(
            project=project,
            name='0018_manual_migrate_counters',
            status='STARTED',
        )
        logger.debug(f"Start processing stats project {project.id} "
                     f"with task count {project.tasks.count()} and updated_at {project.updated_at}")

        tasks = project.update_tasks_counters(project.tasks.all(), from_scratch=from_scratch)

        migration.status = 'FINISHED'
        migration.meta = {'tasks_counted': tasks}
        migration.save()
        logger.debug(f"End processing stats project {project.id}."
                     f"Processed {str(tasks)} tasks.")