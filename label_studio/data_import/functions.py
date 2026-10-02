import logging
import time
import traceback
from typing import Callable, Optional

from core.feature_flags import flag_set
from core.utils.common import load_func
from data_import.uploader import load_tasks_for_async_import_streaming
from django.conf import settings
from django.db import transaction
from label_studio_sdk.label_interface import LabelInterface
from projects.import_health import (
    claim_import_job_in_progress,
    mark_import_job_finished,
    update_import_job_progress,
)
from projects.models import ProjectImport, ProjectReimport, ProjectSummary
from rest_framework.exceptions import ValidationError
from tasks.models import Task
from tasks.serializers import (
    FF_BROS_1092_IMPORT_UNKNOWN_COMPLETED_BY,
    FF_IMPORT_BULK_TASK_STATES,
    TaskSerializerBulk,
    sanitize_prediction_import_payload,
)
from users.models import User
from webhooks.models import WebhookAction
from webhooks.utils import emit_webhooks_for_instance

from .models import FileUpload
from .serializers import ImportApiSerializer
from .uploader import load_tasks_for_async_import

logger = logging.getLogger(__name__)


def async_import_background(
    import_id, user_id, recalculate_stats_func: Optional[Callable[..., None]] = None, **kwargs
):
    with transaction.atomic():
        try:
            project_import = ProjectImport.objects.get(id=import_id)
        except ProjectImport.DoesNotExist:
            logger.error(f'ProjectImport with id {import_id} not found, import processing failed')
            return
        # Claim CREATED, or reclaim a false health-check FAILED so a live worker can run.
        if not claim_import_job_in_progress(project_import):
            logger.error(f'Processing import with id {import_id} already started')
            return

    user = User.objects.get(id=user_id)

    if flag_set('fflag_fix_back_plt_902_async_import_background_oom_fix_22092025_short', user='auto'):
        logger.info(f'Using streaming import for project {project_import.project.id}')
        _async_import_background_streaming(project_import, user)
        return

    start = time.time()
    project = project_import.project
    tasks = None
    # upload files from request, and parse all tasks
    # TODO: Stop passing request to load_tasks function, make all validation before
    tasks, file_upload_ids, found_formats, data_columns = load_tasks_for_async_import(project_import, user)

    if project_import.preannotated_from_fields:
        # turn flat task JSONs {"column1": value, "column2": value} into {"data": {"column1"..}, "predictions": [{..."column2"}]
        raise_errors = flag_set(
            'fflag_feat_utc_210_prediction_validation_15082025', user=project.organization.created_by
        )
        logger.info(f'Reformatting predictions with raise_errors: {raise_errors}')
        tasks = reformat_predictions(tasks, project_import.preannotated_from_fields, project, raise_errors)

    # Always validate predictions regardless of commit_to_project setting
    if project.label_config_is_not_default and flag_set(
        'fflag_feat_utc_210_prediction_validation_15082025', user=project.organization.created_by
    ):
        validation_errors = []
        li = LabelInterface(project.label_config)

        for i, task in enumerate(tasks):
            if 'predictions' in task:
                for j, prediction in enumerate(task['predictions']):
                    try:
                        prediction = sanitize_prediction_import_payload(prediction)
                        validation_errors_list = li.validate_prediction(prediction, return_errors=True)
                        if validation_errors_list:
                            for error in validation_errors_list:
                                validation_errors.append(f'Task {i}, prediction {j}: {error}')
                    except Exception as e:
                        error_msg = f'Task {i}, prediction {j}: Error validating prediction - {str(e)}'
                        validation_errors.append(error_msg)
                        logger.error(f'Exception during validation: {error_msg}')

        if validation_errors:
            error_message = f'Prediction validation failed ({len(validation_errors)} errors):\n'
            for error in validation_errors:
                error_message += f'- {error}\n'

            if flag_set('fflag_feat_utc_210_prediction_validation_15082025', user=project.organization.created_by):
                mark_import_job_finished(project_import, ProjectImport.Status.FAILED, error=error_message)
                return
            else:
                logger.error(
                    f'Prediction validation failed, not raising error - ({len(validation_errors)} errors):\n{error_message}'
                )

    if project_import.commit_to_project:
        with transaction.atomic():
            # Lock summary for update to avoid race conditions
            summary = ProjectSummary.objects.select_for_update().get(project=project)

            # Immediately create project tasks and update project states and counters
            # BROS-1092: pass user so BaseTaskSerializerBulk can attribute unknown
            # completed_by entries back to the importer instead of project.created_by.
            ctx = {'project': project}
            if flag_set(FF_BROS_1092_IMPORT_UNKNOWN_COMPLETED_BY, user=user):
                ctx['user'] = user
            serializer = ImportApiSerializer(data=tasks, many=True, context=ctx)
            serializer.is_valid(raise_exception=True)

            try:
                tasks = serializer.save(project_id=project.id)
                emit_webhooks_for_instance(user.active_organization, project, WebhookAction.TASKS_CREATED, tasks)

                task_count = len(tasks)
                annotation_count = len(serializer.db_annotations)
                prediction_count = len(serializer.db_predictions)
                # Update counters (like total_annotations) for new tasks and after bulk update tasks stats. It should be a
                # single operation as counters affect bulk is_labeled update

                recalculate_stats_counts = {
                    'task_count': task_count,
                    'annotation_count': annotation_count,
                    'prediction_count': prediction_count,
                }

                project.update_tasks_counters_and_task_states(
                    tasks_queryset=tasks,
                    maximum_annotations_changed=False,
                    overlap_cohort_percentage_changed=False,
                    tasks_number_changed=True,
                    recalculate_stats_counts=recalculate_stats_counts,
                )
                logger.info('Tasks bulk_update finished (async import)')

                summary.update_data_columns(tasks)
                # TODO: summary.update_created_annotations_and_labels
            except Exception as e:
                # Handle any other unexpected errors during task creation
                mark_import_job_finished(
                    project_import, ProjectImport.Status.FAILED, error=f'Error creating tasks: {str(e)}'
                )
                return
    else:
        # Do nothing - just output file upload ids for further use
        task_count = len(tasks)
        annotation_count = None
        prediction_count = None

    duration = time.time() - start

    finish_kwargs = {
        'task_count': task_count or 0,
        'annotation_count': annotation_count or 0,
        'prediction_count': prediction_count or 0,
        'file_upload_ids': file_upload_ids,
        'found_formats': found_formats,
        'data_columns': data_columns,
    }
    if project_import.return_task_ids:
        finish_kwargs['task_ids'] = [task.id for task in tasks]

    # Single conditional UPDATE — avoids a second save that could race with job_id writes.
    mark_import_job_finished(project_import, ProjectImport.Status.COMPLETED, duration=duration, **finish_kwargs)


def set_import_background_failure(job, connection, type, value, _):
    import_id = job.args[0]
    try:
        project_import = ProjectImport.objects.get(id=import_id)
    except ProjectImport.DoesNotExist:
        return
    mark_import_job_finished(
        project_import,
        ProjectImport.Status.FAILED,
        error=str(value),
        traceback_text=traceback.format_exc(),
    )


def set_reimport_background_failure(job, connection, type, value, _):
    reimport_id = job.args[0]
    try:
        reimport = ProjectReimport.objects.get(id=reimport_id)
    except ProjectReimport.DoesNotExist:
        return
    mark_import_job_finished(
        reimport,
        ProjectReimport.Status.FAILED,
        error=str(value),
        traceback_text=traceback.format_exc(),
    )


def reformat_predictions(tasks, preannotated_from_fields, project=None, raise_errors=False):
    """
    Transform flat task JSON objects into proper format with separate data and predictions fields.
    Also validates the predictions to ensure they are properly formatted using LabelInterface.

    Args:
        tasks: List of task data
        preannotated_from_fields: List of field names to convert to predictions
        project: Optional project instance to determine correct to_name and type from label config
    """
    new_tasks = []
    validation_errors = []

    # If project is provided, create LabelInterface to determine correct mappings
    li = None
    if project:
        try:
            li = LabelInterface(project.label_config)
        except Exception as e:
            logger.warning(f'Could not create LabelInterface for project {project.id}: {e}')

    for task_index, task in enumerate(tasks):
        if 'data' in task:
            task_data = task['data']
        else:
            task_data = task

        predictions = []
        for field in preannotated_from_fields:
            if field not in task_data:
                validation_errors.append(f"Task {task_index}: Preannotated field '{field}' not found in task data")
                continue

            value = task_data[field]
            if value is not None:
                # Try to determine correct to_name and type from project configuration
                to_name = 'text'  # Default fallback
                prediction_type = 'choices'  # Default fallback

                if li:
                    # Find a control tag that matches the field name
                    try:
                        control_tag = li.get_control(field)
                        # Use the control's to_name and determine type
                        if hasattr(control_tag, 'to_name') and control_tag.to_name:
                            to_name = (
                                control_tag.to_name[0]
                                if isinstance(control_tag.to_name, list)
                                else control_tag.to_name
                            )
                            prediction_type = control_tag.tag.lower()
                    except Exception:
                        # Control not found, use defaults
                        pass

                # Create prediction from preannotated field
                # Handle different types of values
                if isinstance(value, dict):
                    # For complex structures like bounding boxes, use the value directly
                    prediction_value = value
                else:
                    # For simple values, use the prediction_type as the key
                    # Handle cases where the type doesn't match the expected key
                    value_key = prediction_type
                    if prediction_type == 'textarea':
                        value_key = 'text'

                    # Most types expect lists, but some expect single values
                    if prediction_type in ['rating', 'number', 'datetime']:
                        prediction_value = {value_key: value}
                    else:
                        # Wrap in list for most types
                        prediction_value = {value_key: [value] if not isinstance(value, list) else value}

                prediction = {
                    'result': [
                        {
                            'from_name': field,
                            'to_name': to_name,
                            'type': prediction_type,
                            'value': prediction_value,
                        }
                    ],
                    'score': 1.0,
                    'model_version': 'preannotated',
                }

                predictions.append(prediction)

        # Create new task structure
        new_task = {'data': task_data, 'predictions': predictions}
        new_tasks.append(new_task)

    # If there are validation errors, raise them
    if validation_errors and raise_errors:
        raise ValidationError({'preannotated_fields': validation_errors})

    return new_tasks


post_process_reimport = load_func(settings.POST_PROCESS_REIMPORT)


def _counters_set_on_create(project, annotation_count, prediction_count):
    """Task counters are set on bulk create; they only need recalculation when annotations or predictions were imported"""
    return (
        annotation_count == 0
        and prediction_count == 0
        and flag_set(FF_IMPORT_BULK_TASK_STATES, organization=project.organization)
    )


def _async_reimport_background_streaming(reimport, project, organization_id, user):
    """Streaming version of reimport that processes tasks in batches to reduce memory usage"""
    start = time.time()
    try:
        # Get batch size from settings or use default
        batch_size = settings.REIMPORT_BATCH_SIZE

        # Initialize counters
        total_task_count = 0
        total_annotation_count = 0
        total_prediction_count = 0
        all_found_formats = {}
        all_data_columns = set()
        all_created_task_ids = []

        # Remove old tasks once before starting
        with transaction.atomic():
            project.remove_tasks_by_file_uploads(reimport.file_upload_ids)

        # Process tasks in batches
        batch_number = 0
        for batch_tasks, batch_formats, batch_columns in FileUpload.load_tasks_from_uploaded_files_streaming(
            project, reimport.file_upload_ids, files_as_tasks_list=reimport.files_as_tasks_list, batch_size=batch_size
        ):
            if not batch_tasks:
                logger.info(f'Empty batch received for reimport {reimport.id}')
                continue

            batch_number += 1
            logger.info(f'Processing batch {batch_number} with {len(batch_tasks)} tasks for reimport {reimport.id}')

            # Process batch in transaction
            with transaction.atomic():
                # Lock summary for update to avoid race conditions
                summary = ProjectSummary.objects.select_for_update().get(project=project)

                # Serialize and save batch
                serializer = ImportApiSerializer(
                    data=batch_tasks,
                    many=True,
                    context={'project': project, 'user': user, 'defer_post_process_custom_callback': True},
                )
                serializer.is_valid(raise_exception=True)
                batch_db_tasks = serializer.save(project_id=project.id)

                # Collect task IDs for later use
                all_created_task_ids.extend([t.id for t in batch_db_tasks])

                # Update batch counters
                batch_task_count = len(batch_db_tasks)
                batch_annotation_count = len(serializer.db_annotations)
                batch_prediction_count = len(serializer.db_predictions)

                total_task_count += batch_task_count
                total_annotation_count += batch_annotation_count
                total_prediction_count += batch_prediction_count

                # Update formats and columns
                all_found_formats.update(batch_formats)
                if batch_columns:
                    if not all_data_columns:
                        all_data_columns = batch_columns
                    else:
                        all_data_columns &= batch_columns

                # Update data columns in summary
                summary.update_data_columns(batch_db_tasks)

            update_import_job_progress(
                reimport,
                task_count=total_task_count,
                annotation_count=total_annotation_count,
                prediction_count=total_prediction_count,
            )

            logger.info(
                f'Batch {batch_number} processed successfully: {batch_task_count} tasks, '
                f'{batch_annotation_count} annotations, {batch_prediction_count} predictions'
            )

        # After all batches are processed, emit webhooks and update task states once
        if all_created_task_ids:
            logger.info(
                f'Finalizing reimport: emitting webhooks and updating task states for {len(all_created_task_ids)} tasks'
            )

            # Emit webhooks for all tasks at once (passing list of IDs)
            emit_webhooks_for_instance(organization_id, project, WebhookAction.TASKS_CREATED, all_created_task_ids)

            # Update task states for all tasks at once
            all_tasks_queryset = Task.objects.filter(id__in=all_created_task_ids)
            recalculate_stats_counts = {
                'task_count': total_task_count,
                'annotation_count': total_annotation_count,
                'prediction_count': total_prediction_count,
            }

            project.update_tasks_counters_and_task_states(
                tasks_queryset=all_tasks_queryset,
                maximum_annotations_changed=False,
                overlap_cohort_percentage_changed=False,
                tasks_number_changed=True,
                recalculate_stats_counts=recalculate_stats_counts,
                update_counters=not _counters_set_on_create(project, total_annotation_count, total_prediction_count),
            )
            logger.info('Tasks bulk_update finished (async streaming reimport)')

            TaskSerializerBulk.post_process_custom_callback(project.id, user)

        # Update reimport with final statistics in the same terminal UPDATE.
        mark_import_job_finished(
            reimport,
            ProjectReimport.Status.COMPLETED,
            duration=time.time() - start,
            task_count=total_task_count,
            annotation_count=total_annotation_count,
            prediction_count=total_prediction_count,
            found_formats=all_found_formats,
            data_columns=list(all_data_columns),
        )

        logger.info(f'Streaming reimport {reimport.id} completed: {total_task_count} tasks imported')

        # Run post-processing
        post_process_reimport(reimport)

    except Exception as e:
        logger.error(f'Error in streaming reimport {reimport.id}: {str(e)}', exc_info=True)
        mark_import_job_finished(
            reimport,
            ProjectReimport.Status.FAILED,
            error=str(e),
            traceback_text=traceback.format_exc(),
        )
        raise


def _async_import_background_streaming(project_import, user):
    try:
        batch_size = settings.IMPORT_BATCH_SIZE

        total_task_count = 0
        total_annotation_count = 0
        total_prediction_count = 0
        all_created_task_ids = []

        project = project_import.project
        start = time.time()

        batch_number = 0
        streaming_generator = load_tasks_for_async_import_streaming(project_import, user, batch_size)

        final_file_upload_ids = []
        final_found_formats = {}
        final_data_columns = set()

        for batch_tasks, file_upload_ids, found_formats, data_columns in streaming_generator:
            if not batch_tasks:
                logger.info(f'Empty batch received for import {project_import.id}')
                continue

            batch_number += 1
            logger.info(
                f'Processing batch {batch_number} with {len(batch_tasks)} tasks for import {project_import.id}'
            )

            if file_upload_ids and file_upload_ids not in final_file_upload_ids:
                final_file_upload_ids = file_upload_ids
            final_found_formats.update(found_formats)
            final_data_columns.update(data_columns)

            if project_import.preannotated_from_fields:
                raise_errors = flag_set(
                    'fflag_feat_utc_210_prediction_validation_15082025', user=project.organization.created_by
                )
                logger.info(f'Reformatting predictions with raise_errors: {raise_errors}')
                batch_tasks = reformat_predictions(
                    batch_tasks, project_import.preannotated_from_fields, project, raise_errors
                )

            if project.label_config_is_not_default and flag_set(
                'fflag_feat_utc_210_prediction_validation_15082025', user=project.organization.created_by
            ):
                validation_errors = []
                li = LabelInterface(project.label_config)

                for i, task in enumerate(batch_tasks):
                    if 'predictions' in task:
                        for j, prediction in enumerate(task['predictions']):
                            try:
                                prediction = sanitize_prediction_import_payload(prediction)
                                validation_errors_list = li.validate_prediction(prediction, return_errors=True)
                                if validation_errors_list:
                                    for error in validation_errors_list:
                                        validation_errors.append(
                                            f'Task {total_task_count + i}, prediction {j}: {error}'
                                        )
                            except Exception as e:
                                error_msg = f'Task {total_task_count + i}, prediction {j}: Error validating prediction - {str(e)}'
                                validation_errors.append(error_msg)
                                logger.error(f'Exception during validation: {error_msg}')

                if validation_errors:
                    error_message = f'Prediction validation failed ({len(validation_errors)} errors):\n'
                    for error in validation_errors:
                        error_message += f'- {error}\n'

                    if flag_set(
                        'fflag_feat_utc_210_prediction_validation_15082025', user=project.organization.created_by
                    ):
                        mark_import_job_finished(project_import, ProjectImport.Status.FAILED, error=error_message)
                        return
                    else:
                        logger.error(
                            f'Prediction validation failed, not raising error - ({len(validation_errors)} errors):\n{error_message}'
                        )

            if project_import.commit_to_project:
                with transaction.atomic():
                    summary = ProjectSummary.objects.select_for_update().get(project=project)

                    # BROS-1092: see async_import_background above for rationale.
                    ctx = {'project': project, 'defer_post_process_custom_callback': True}
                    if flag_set(FF_BROS_1092_IMPORT_UNKNOWN_COMPLETED_BY, user=user):
                        ctx['user'] = user
                    serializer = ImportApiSerializer(data=batch_tasks, many=True, context=ctx)
                    serializer.is_valid(raise_exception=True)
                    batch_db_tasks = serializer.save(project_id=project.id)

                    all_created_task_ids.extend([t.id for t in batch_db_tasks])

                    batch_task_count = len(batch_db_tasks)
                    batch_annotation_count = len(serializer.db_annotations)
                    batch_prediction_count = len(serializer.db_predictions)

                    total_task_count += batch_task_count
                    total_annotation_count += batch_annotation_count
                    total_prediction_count += batch_prediction_count

                    summary.update_data_columns(batch_db_tasks)

            else:
                total_task_count += len(batch_tasks)

            update_import_job_progress(
                project_import,
                task_count=total_task_count,
                annotation_count=total_annotation_count,
                prediction_count=total_prediction_count,
            )

            logger.info(f'Batch {batch_number} processed successfully: {len(batch_tasks)} tasks')

        final_data_columns = list(final_data_columns)

        if project_import.commit_to_project and all_created_task_ids:
            logger.info(
                f'Finalizing import: emitting webhooks and updating task states for {len(all_created_task_ids)} tasks'
            )

            emit_webhooks_for_instance(
                user.active_organization, project, WebhookAction.TASKS_CREATED, all_created_task_ids
            )

            recalculate_stats_counts = {
                'task_count': total_task_count,
                'annotation_count': total_annotation_count,
                'prediction_count': total_prediction_count,
            }

            all_tasks_queryset = Task.objects.filter(id__in=all_created_task_ids)
            project.update_tasks_counters_and_task_states(
                tasks_queryset=all_tasks_queryset,
                maximum_annotations_changed=False,
                overlap_cohort_percentage_changed=False,
                tasks_number_changed=True,
                recalculate_stats_counts=recalculate_stats_counts,
                update_counters=not _counters_set_on_create(project, total_annotation_count, total_prediction_count),
            )
            logger.info('Tasks bulk_update finished (async streaming import)')

            TaskSerializerBulk.post_process_custom_callback(project.id, user)

        duration = time.time() - start

        finish_kwargs = {
            'task_count': total_task_count or 0,
            'annotation_count': total_annotation_count or 0,
            'prediction_count': total_prediction_count or 0,
            'file_upload_ids': final_file_upload_ids,
            'found_formats': final_found_formats,
            'data_columns': final_data_columns,
        }
        if project_import.return_task_ids:
            finish_kwargs['task_ids'] = all_created_task_ids

        mark_import_job_finished(project_import, ProjectImport.Status.COMPLETED, duration=duration, **finish_kwargs)

        logger.info(f'Streaming import {project_import.id} completed: {total_task_count} tasks imported')

    except Exception as e:
        logger.error(f'Error in streaming import {project_import.id}: {str(e)}', exc_info=True)
        mark_import_job_finished(
            project_import,
            ProjectImport.Status.FAILED,
            error=str(e),
            traceback_text=traceback.format_exc(),
        )
        raise


def async_reimport_background(reimport_id, organization_id, user, **kwargs):
    with transaction.atomic():
        try:
            reimport = ProjectReimport.objects.get(id=reimport_id)
        except ProjectReimport.DoesNotExist:
            logger.error(f'ProjectReimport with id {reimport_id} not found, import processing failed')
            return
        if not claim_import_job_in_progress(reimport):
            logger.error(f'Processing reimport with id {reimport_id} already started')
            return

    project = reimport.project
    start = time.time()

    # Check feature flag for memory improvement
    if flag_set('fflag_fix_back_plt_838_reimport_memory_improvement_05082025_short', user='auto'):
        logger.info(f'Using streaming reimport for project {project.id}')
        _async_reimport_background_streaming(reimport, project, organization_id, user)
    else:
        # Original implementation
        tasks, found_formats, data_columns = FileUpload.load_tasks_from_uploaded_files(
            reimport.project, reimport.file_upload_ids, files_as_tasks_list=reimport.files_as_tasks_list
        )

        with transaction.atomic():
            # Lock summary for update to avoid race conditions
            summary = ProjectSummary.objects.select_for_update().get(project=project)

            project.remove_tasks_by_file_uploads(reimport.file_upload_ids)
            serializer = ImportApiSerializer(data=tasks, many=True, context={'project': project, 'user': user})
            serializer.is_valid(raise_exception=True)
            tasks = serializer.save(project_id=project.id)
            emit_webhooks_for_instance(organization_id, project, WebhookAction.TASKS_CREATED, tasks)

            task_count = len(tasks)
            annotation_count = len(serializer.db_annotations)
            prediction_count = len(serializer.db_predictions)

            recalculate_stats_counts = {
                'task_count': task_count,
                'annotation_count': annotation_count,
                'prediction_count': prediction_count,
            }

            # Update counters (like total_annotations) for new tasks and after bulk update tasks stats. It should be a
            # single operation as counters affect bulk is_labeled update
            project.update_tasks_counters_and_task_states(
                tasks_queryset=tasks,
                maximum_annotations_changed=False,
                overlap_cohort_percentage_changed=False,
                tasks_number_changed=True,
                recalculate_stats_counts=recalculate_stats_counts,
            )
            logger.info('Tasks bulk_update finished (async reimport)')

            summary.update_data_columns(tasks)
            # TODO: summary.update_created_annotations_and_labels

        mark_import_job_finished(
            reimport,
            ProjectReimport.Status.COMPLETED,
            duration=time.time() - start,
            task_count=task_count,
            annotation_count=annotation_count,
            prediction_count=prediction_count,
            found_formats=found_formats,
            data_columns=list(data_columns),
        )

        post_process_reimport(reimport)
