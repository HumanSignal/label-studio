import os
import sys
import logging

from django.conf import settings

from core.models import AsyncMigrationStatus
from core.redis import start_job_async_or_sync
from core.utils.common import batch
from data_export.models import DataExport
from data_export.serializers import ExportDataSerializer
from organizations.models import Organization
from projects.models import Project
from tasks.models import Task

def calculate_stats_all_orgs(from_scratch, redis):
    logger = logging.getLogger(__name__)
    organizations = Organization.objects.order_by('-id')

    for org in organizations:
        logger.debug(f"Start recalculating stats for Organization {org.id}")

        # start async calculation job on redis
        start_job_async_or_sync(
            redis_job_for_calculation, org, from_scratch,
            redis=redis,
            queue_name='critical',
            job_timeout=3600 * 24  # 24 hours for one organization
        )

        logger.debug(f"Organization {org.id} stats were recalculated")

    logger.debug("All organizations were recalculated")


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
            status=AsyncMigrationStatus.STATUS_STARTED,
        )
        logger.debug(
            f"Start processing stats project <{project.title}> ({project.id}) "
            f"with task count {project.tasks.count()} and updated_at {project.updated_at}"
        )

        task_count = project.update_tasks_counters(project.tasks.all(), from_scratch=from_scratch)

        migration.status = AsyncMigrationStatus.STATUS_FINISHED
        migration.meta = {'tasks_processed': task_count, 'total_project_tasks': project.tasks.count()}
        migration.save()
        logger.debug(
            f"End processing counters for project <{project.title}> ({project.id}), "
            f"processed {str(task_count)} tasks"
        )

def export_project(project_id, format, path):
    logger = logging.getLogger(__name__)

    try:
        project = Project.objects.get(id=project_id)
    except Project.DoesNotExist:
        logger.error(f"Project with id {project_id} does not exist.")
        return

    task_ids = (
        Task.objects.filter(project=project)
        .select_related("project")
        .prefetch_related("annotations", "predictions")
    )

    logger.debug(
        f"Start exporting project <{project.title}> ({project.id}) with task count {task_ids.count()}."
    )

    tasks = []
    for _task_ids in batch(task_ids, 1000):
        tasks += ExportDataSerializer(
            _task_ids, 
            many=True, 
            context={"interpolate_key_frames": settings.INTERPOLATE_KEY_FRAMES}
        ).data

    export_stream, _, filename = DataExport.generate_export_file(
        project, tasks, format, settings.CONVERTER_DOWNLOAD_RESOURCES, {}
    )

    filepath = os.path.join(path, filename)

    with open(filepath, "wb") as file:
        file.write(export_stream.read())

    logger.debug(
        f"End exporting project <{project.title}> ({project.id}) in {format} format."
    )

    return filepath
