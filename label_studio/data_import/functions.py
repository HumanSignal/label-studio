import logging
import traceback
import time

from django.db import transaction

from projects.models import ProjectImport
from .serializers import ImportApiSerializer
from .uploader import load_tasks_for_async_import
from users.models import User
from webhooks.utils import emit_webhooks_for_instance
from webhooks.models import WebhookAction

logger = logging.getLogger(__name__)


def async_import_background(import_id, user_id, **kwargs):
    with transaction.atomic():
        try:
            project_import = ProjectImport.objects.get(id=import_id)
        except ProjectImport.DoesNotExist:
            logger.error(f'ProjectImport with id {import_id} not found, import processing failed')
            return
        if project_import.status != ProjectImport.Status.CREATED:
            logger.error(f'Processing import with id {import_id} already started')
            return
        project_import.status = ProjectImport.Status.IN_PROGRESS
        project_import.save(update_fields=['status'])

    user = User.objects.get(id=user_id)

    start = time.time()
    project = project_import.project
    tasks = None
    # upload files from request, and parse all tasks
    # TODO: Stop passing request to load_tasks function, make all validation before
    parsed_data, file_upload_ids, found_formats, data_columns = load_tasks_for_async_import(project_import, user)

    if project_import.preannotated_from_fields:
        # turn flat task JSONs {"column1": value, "column2": value} into {"data": {"column1"..}, "predictions": [{..."column2"}]  # noqa
        parsed_data = reformat_predictions(parsed_data, project_import.preannotated_from_fields)

    if project_import.commit_to_project:
        # Immediately create project tasks and update project states and counters
        serializer = ImportApiSerializer(data=tasks, many=True)
        serializer.is_valid(raise_exception=True)
        tasks = serializer.save(project_id=project.id)
        emit_webhooks_for_instance(user.active_organization, project, WebhookAction.TASKS_CREATED, tasks)

        # return tasks, serializer
        # tasks, serializer = self._save(parsed_data)
        task_count = len(tasks)
        annotation_count = len(serializer.db_annotations)
        prediction_count = len(serializer.db_predictions)
        # Update counters (like total_annotations) for new tasks and after bulk update tasks stats. It should be a
        # single operation as counters affect bulk is_labeled update
        project.update_tasks_counters_and_task_states(tasks_queryset=tasks, maximum_annotations_changed=False,
                                                      overlap_cohort_percentage_changed=False,
                                                      tasks_number_changed=True)
        logger.info('Tasks bulk_update finished')

        project.summary.update_data_columns(parsed_data)
        # TODO: project.summary.update_created_annotations_and_labels
    else:
        # Do nothing - just output file upload ids for further use
        task_count = len(parsed_data)
        annotation_count = None
        prediction_count = None

    duration = time.time() - start

    project_import.task_count = task_count or 0
    project_import.annotation_count = annotation_count or 0
    project_import.prediction_count = prediction_count or 0
    project_import.duration = duration
    project_import.file_upload_ids = file_upload_ids
    project_import.found_formats = found_formats
    project_import.data_columns = data_columns
    if project_import.return_task_ids:
        project_import.task_ids = [task.id for task in tasks]

    project_import.status = ProjectImport.Status.COMPLETED
    project_import.save()



def set_import_background_failure(job, connection, type, value, _):
    import_id = job.args[0]
    ProjectImport.objects.filter(id=import_id).update(
        status=ProjectImport.Status.FAILED,
        traceback=traceback.format_exc(),
        error=str(value)
    )


def reformat_predictions(tasks, preannotated_from_fields):
    new_tasks = []
    for task in tasks:
        if 'data' in task:
            task = task['data']
        predictions = [{'result': task.pop(field)} for field in preannotated_from_fields]
        new_tasks.append({
            'data': task,
            'predictions': predictions
        })
    return new_tasks
