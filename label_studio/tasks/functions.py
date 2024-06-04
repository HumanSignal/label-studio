import json
import logging
import os
import shutil
import sys

from core.bulk_update_utils import bulk_update
from core.models import AsyncMigrationStatus
from core.redis import start_job_async_or_sync
from core.utils.common import batch
from data_export.mixins import ExportMixin
from data_export.models import DataExport
from data_export.serializers import ExportDataSerializer
from data_manager.managers import TaskQuerySet
from django.conf import settings
from django.db import transaction
from django.db.models import Count, Q
from organizations.models import Organization
from projects.models import Project
from tasks.models import Annotation, Prediction, Task

logger = logging.getLogger(__name__)


def calculate_stats_all_orgs(from_scratch, redis, migration_name='0018_manual_migrate_counters'):
    logger = logging.getLogger(__name__)
    # Don't load full Organization objects bc some columns (contact_info, verify_ssl_certs)
    # aren't created until after a migration calls this code
    organization_ids = Organization.objects.order_by('-id').values_list('id', flat=True)

    for org_id in organization_ids:
        logger.debug(f'Start recalculating stats for Organization {org_id}')

        # start async calculation job on redis
        start_job_async_or_sync(
            redis_job_for_calculation,
            org_id,
            from_scratch,
            redis=redis,
            queue_name='critical',
            job_timeout=3600 * 24,  # 24 hours for one organization
            migration_name=migration_name,
        )

        logger.debug(f'Organization {org_id} stats were recalculated')

    logger.debug('All organizations were recalculated')


def redis_job_for_calculation(org_id, from_scratch, migration_name='0018_manual_migrate_counters'):
    """
    Recalculate counters for projects list
    :param org_id: ID of organization to recalculate
    :param from_scratch: Start calculation from scratch or skip calculated tasks
    """
    logger = logging.getLogger()
    logger.setLevel(logging.DEBUG)

    handler = logging.StreamHandler(sys.stdout)
    handler.setLevel(logging.DEBUG)
    formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    handler.setFormatter(formatter)
    logger.addHandler(handler)

    project_dicts = (
        Project.objects.filter(organization_id=org_id)
        .order_by('-updated_at')
        .values(
            'id',
            'updated_at',
            'title',
        )
    )
    for project_dict in project_dicts:
        migration = AsyncMigrationStatus.objects.create(
            project_id=project_dict['id'],
            name=migration_name,
            status=AsyncMigrationStatus.STATUS_STARTED,
        )
        project_tasks = Task.objects.filter(project_id=project_dict['id'])
        logger.debug(
            f'Start processing stats project <{project_dict["title"]}> ({project_dict["id"]}) '
            f'with task count {project_tasks.count()} and updated_at {project_dict["updated_at"]}'
        )

        task_count = update_tasks_counters(project_tasks, from_scratch=from_scratch)

        migration.status = AsyncMigrationStatus.STATUS_FINISHED
        migration.meta = {'tasks_processed': task_count, 'total_project_tasks': project_tasks.count()}
        migration.save()
        logger.debug(
            f'End processing counters for project <{project_dict["title"]}> ({project_dict["id"]}), '
            f'processed {str(task_count)} tasks'
        )


def export_project(project_id, export_format, path, serializer_context=None):
    logger = logging.getLogger(__name__)

    project = Project.objects.get(id=project_id)

    export_format = export_format.upper()
    supported_formats = [s['name'] for s in DataExport.get_export_formats(project)]
    assert export_format in supported_formats, f'Export format is not supported, please use {supported_formats}'

    task_ids = (
        Task.objects.filter(project=project).select_related('project').prefetch_related('annotations', 'predictions')
    )

    logger.debug(f'Start exporting project <{project.title}> ({project.id}) with task count {task_ids.count()}.')

    # serializer context
    if isinstance(serializer_context, str):
        serializer_context = json.loads(serializer_context)
    serializer_options = ExportMixin._get_export_serializer_option(serializer_context)

    # export cycle
    tasks = []
    for _task_ids in batch(task_ids, 1000):
        tasks += ExportDataSerializer(_task_ids, many=True, **serializer_options).data

    # convert to output format
    export_file, _, filename = DataExport.generate_export_file(
        project, tasks, export_format, settings.CONVERTER_DOWNLOAD_RESOURCES, {}
    )

    # write to file
    filepath = os.path.join(path, filename) if os.path.isdir(path) else path
    with open(filepath, 'wb') as file:
        shutil.copyfileobj(export_file, file)
    export_file.close()

    logger.debug(f'End exporting project <{project.title}> ({project.id}) in {export_format} format.')

    return filepath


def _fill_annotations_project(project_id):
    Annotation.objects.filter(task__project_id=project_id).update(project_id=project_id)


def fill_annotations_project():
    logger.info('Start filling project field for Annotation model')

    project_ids = Project.objects.all().values_list('id', flat=True)
    for project_id in project_ids:
        start_job_async_or_sync(_fill_annotations_project, project_id)

    logger.info('Finished filling project field for Annotation model')


def _fill_predictions_project(migration_name='0043_auto_20230825'):
    project_ids = Project.objects.all().values_list('id', flat=True)
    for project_id in project_ids:
        migration = AsyncMigrationStatus.objects.create(
            project_id=project_id,
            name=migration_name,
            status=AsyncMigrationStatus.STATUS_STARTED,
        )

        updated_count = Prediction.objects.filter(task__project_id=project_id).update(project_id=project_id)

        migration.status = AsyncMigrationStatus.STATUS_FINISHED
        migration.meta = {
            'predictions_processed': updated_count,
            'total_project_predictions': Prediction.objects.filter(project_id=project_id).count(),
        }
        migration.save()


def fill_predictions_project(migration_name):
    logger.info('Start filling project field for Prediction model')
    start_job_async_or_sync(_fill_predictions_project, migration_name=migration_name)
    logger.info('Finished filling project field for Prediction model')


def update_tasks_counters(queryset, from_scratch=True):
    """
    Update tasks counters for the passed queryset of Tasks
    :param queryset: Tasks to update queryset
    :param from_scratch: Skip calculated tasks
    :return: Count of updated tasks
    """
    objs = []

    total_annotations = Count('annotations', distinct=True, filter=Q(annotations__was_cancelled=False))
    cancelled_annotations = Count('annotations', distinct=True, filter=Q(annotations__was_cancelled=True))
    total_predictions = Count('predictions', distinct=True)
    # construct QuerySet in case of list of Tasks
    if isinstance(queryset, list) and len(queryset) > 0 and isinstance(queryset[0], Task):
        queryset = Task.objects.filter(id__in=[task.id for task in queryset])
    # construct QuerySet in case annotated queryset
    if isinstance(queryset, TaskQuerySet) and queryset.exists() and isinstance(queryset[0], int):
        queryset = Task.objects.filter(id__in=queryset)

    if not from_scratch:
        queryset = queryset.exclude(
            Q(total_annotations__gt=0) | Q(cancelled_annotations__gt=0) | Q(total_predictions__gt=0)
        )

    # filter our tasks with 0 annotations and 0 predictions and update them with 0
    queryset.filter(annotations__isnull=True, predictions__isnull=True).update(
        total_annotations=0, cancelled_annotations=0, total_predictions=0
    )

    # filter our tasks with 0 annotations and 0 predictions
    queryset = queryset.filter(Q(annotations__isnull=False) | Q(predictions__isnull=False))
    queryset = queryset.annotate(
        new_total_annotations=total_annotations,
        new_cancelled_annotations=cancelled_annotations,
        new_total_predictions=total_predictions,
    )

    for task in queryset.only('id', 'total_annotations', 'cancelled_annotations', 'total_predictions'):
        task.total_annotations = task.new_total_annotations
        task.cancelled_annotations = task.new_cancelled_annotations
        task.total_predictions = task.new_total_predictions
        objs.append(task)
    with transaction.atomic():
        bulk_update(
            objs,
            update_fields=['total_annotations', 'cancelled_annotations', 'total_predictions'],
            batch_size=settings.BATCH_SIZE,
        )
    return len(objs)
