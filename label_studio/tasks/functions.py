import json
import logging
import os
import shutil
import sys
from importlib import import_module
from typing import Optional

from core.models import AsyncMigrationStatus
from core.redis import start_job_async_or_sync
from core.utils.common import batch, batched_iterator, load_func
from core.utils.iterators import iterate_queryset
from data_export.mixins import ExportMixin
from data_export.models import DataExport
from data_export.serializers import ExportDataSerializer
from data_manager.managers import TaskQuerySet
from django.conf import settings
from django.db.models import Count, F, Q
from django.utils.timezone import now
from organizations.models import Organization
from projects.models import Project
from tasks.models import Annotation, Prediction, Task

logger = logging.getLogger(__name__)


def bulk_create_annotations_with_side_effects(
    annotations: list[Annotation],
    *,
    project: Project,
    user=None,
    action: Optional[str] = None,
    tasks_queryset=None,
    update_project_summary: bool = True,
    post_process_annotations: bool = True,
    initialize_fsm_states: bool = True,
    emit_created_webhook: bool = False,
    update_task_timestamps: bool = True,
    update_task_counters: bool = True,
    recalculate_stats: bool = True,
    batch_size: Optional[int] = None,
) -> list[Annotation]:
    """
    Bulk-create annotations and run the side effects normally skipped by ``bulk_create``.

    Django does not call ``Annotation.save()`` or model signals for bulk inserts.  Keep
    this helper as the single place where bulk annotation flows opt into the
    equivalent project-summary, history, FSM, webhook, task-counter, and stats work.
    """
    if not annotations:
        return []

    db_annotations = Annotation.objects.bulk_create(annotations, batch_size=batch_size or settings.BATCH_SIZE)
    if not db_annotations:
        return db_annotations

    if update_project_summary and hasattr(project, 'summary'):
        project.summary.update_created_annotations_and_labels(db_annotations)

    if post_process_annotations and user is not None and action is not None:
        from tasks.serializers import TaskSerializerBulk

        TaskSerializerBulk.post_process_annotations(user, db_annotations, action)

    if initialize_fsm_states and user is not None:
        initializer = load_func(settings.BULK_CREATE_ANNOTATIONS_FSM_INITIALIZER)
        if initializer is not None:
            initializer(db_annotations, user, project)

    if emit_created_webhook and user is not None:
        from webhooks.models import WebhookAction
        from webhooks.utils import emit_webhooks_for_instance

        emit_webhooks_for_instance(
            user.active_organization, project, WebhookAction.ANNOTATIONS_CREATED, db_annotations
        )

    if update_task_timestamps:
        task_ids = {annotation.task_id for annotation in db_annotations if annotation.task_id}
        if task_ids:
            update_fields = {'updated_at': now()}
            if user is not None:
                update_fields['updated_by'] = user
            Task.objects.filter(id__in=task_ids).update(**update_fields)

    if update_task_counters and tasks_queryset is not None:
        # Derive the tasks to recount from the annotations we just created instead of
        # re-evaluating tasks_queryset. tasks_queryset may be a lazy, state-dependent
        # Data Manager filter (e.g. "Annotations = 0" / a "not labeled" view). Re-running
        # it here — after bulk_create already added the annotations — would match zero rows
        # and skip the counter update, leaving total_annotations / is_labeled stale. The
        # freshly created annotations always point at exactly the tasks that need recounting.
        # (TRIAG-2440)
        counter_task_ids = list({annotation.task_id for annotation in db_annotations if annotation.task_id})
        project.update_tasks_counters_and_is_labeled(tasks_queryset=counter_task_ids)

    if recalculate_stats:
        try:
            recalculate_stats_async_or_sync = import_module('stats.functions.stats').recalculate_stats_async_or_sync
            # AnnotationStats updates PredictionStats for the new annotations and
            # predictions on their tasks. Do not additionally enqueue a
            # project-wide prediction stats rebuild for this annotation-only flow.
            recalculate_stats_async_or_sync(project, all=False, recalculate_prediction_stats=False)
        except (ModuleNotFoundError, ImportError):
            logger.info('Bulk annotations created in LSO, stats recomputation skipped')

    return db_annotations


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
    serializer_options = ExportMixin._get_export_serializer_option(serializer_context, project=project)

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
    # order_by('id') ensures consistent row locking order to prevent deadlocks
    queryset.filter(annotations__isnull=True, predictions__isnull=True).order_by('id').update(
        total_annotations=0, cancelled_annotations=0, total_predictions=0
    )

    # filter our tasks with 0 annotations and 0 predictions
    queryset = queryset.filter(Q(annotations__isnull=False) | Q(predictions__isnull=False))
    queryset = queryset.annotate(
        new_total_annotations=total_annotations,
        new_cancelled_annotations=cancelled_annotations,
        new_total_predictions=total_predictions,
    )

    updated_count = 0

    tasks_iterator = iterate_queryset(
        queryset.only('id', 'total_annotations', 'cancelled_annotations', 'total_predictions'),
        chunk_size=settings.BATCH_SIZE,
    )

    for _batch in batched_iterator(tasks_iterator, settings.BATCH_SIZE):
        batch_list = []
        for task in _batch:
            task.total_annotations = task.new_total_annotations
            task.cancelled_annotations = task.new_cancelled_annotations
            task.total_predictions = task.new_total_predictions
            batch_list.append(task)

        if batch_list:
            Task.objects.bulk_update(
                batch_list,
                ['total_annotations', 'cancelled_annotations', 'total_predictions'],
                batch_size=settings.BATCH_SIZE,
            )
            updated_count += len(batch_list)

    return updated_count


def bulk_update_is_labeled_by_overlap(tasks_ids, project):
    if not tasks_ids:
        return

    batch_size = settings.BATCH_SIZE

    # Use distinct annotator count for overlap comparison
    for i in range(0, len(tasks_ids), batch_size):
        batch_ids = tasks_ids[i : i + batch_size]

        # Annotate with distinct annotator count
        if project.skip_queue == project.SkipQueue.IGNORE_SKIPPED:
            annotator_count_expr = Count('annotations__completed_by', distinct=True)
        else:
            annotator_count_expr = Count(
                'annotations__completed_by',
                distinct=True,
                filter=Q(annotations__was_cancelled=False),
            )

        tasks_qs = Task.objects.filter(id__in=batch_ids, project=project).annotate(
            annotator_count=annotator_count_expr
        )

        # Get IDs of tasks that meet the overlap requirement
        finished_task_ids = list(tasks_qs.filter(annotator_count__gte=F('overlap')).values_list('id', flat=True))

        # Update is_labeled based on annotator count
        Task.objects.filter(id__in=finished_task_ids, project=project).update(is_labeled=True)
        Task.objects.filter(id__in=batch_ids, project=project).exclude(id__in=finished_task_ids).update(
            is_labeled=False
        )
