"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import logging

from datetime import datetime
from django.db.models.signals import post_delete, pre_delete

from core.permissions import AllPermissions
from core.redis import start_job_async_or_sync
from core.utils.common import temporary_disconnect_list_signal
from projects.models import Project

from tasks.models import (
    Annotation, Prediction, Task, bulk_update_stats_project_tasks, update_is_labeled_after_removing_annotation,
    update_all_task_states_after_deleting_task, remove_data_columns, remove_project_summary_annotations
)
from webhooks.utils import emit_webhooks_for_instance
from webhooks.models import WebhookAction
from data_manager.functions import evaluate_predictions

all_permissions = AllPermissions()
logger = logging.getLogger(__name__)


def retrieve_tasks_predictions(project, queryset, **kwargs):
    """ Retrieve predictions by tasks ids

    :param project: project instance
    :param queryset: filtered tasks db queryset
    """
    evaluate_predictions(queryset)
    return {'processed_items': queryset.count(), 'detail': 'Retrieved ' + str(queryset.count()) + ' predictions'}


def delete_tasks(project, queryset, **kwargs):
    """ Delete tasks by ids

    :param project: project instance
    :param queryset: filtered tasks db queryset
    """
    tasks_ids = list(queryset.values('id'))
    count = len(tasks_ids)
    tasks_ids_list = [task['id'] for task in tasks_ids]
    # signals to switch off
    signals = [
        (post_delete, update_is_labeled_after_removing_annotation, Annotation),
        (post_delete, update_all_task_states_after_deleting_task, Task),
        (pre_delete, remove_data_columns, Task),
        (pre_delete, remove_project_summary_annotations, Annotation)
    ]

    # delete all project tasks
    if count == project.tasks.count():
        with temporary_disconnect_list_signal(signals):
            queryset.delete()
        project.summary.reset()

    # delete only specific tasks
    else:
        # update project summary
        start_job_async_or_sync(async_project_summary_recalculation, tasks_ids_list, project.id)

        with temporary_disconnect_list_signal(signals):
            queryset.delete()

    project.update_tasks_states(
        maximum_annotations_changed=False,
        overlap_cohort_percentage_changed=False,
        tasks_number_changed=True
    )

    # emit webhooks for project
    emit_webhooks_for_instance(project.organization, project, WebhookAction.TASKS_DELETED, tasks_ids)

    # remove all tabs if there are no tasks in project
    reload = False
    if not project.tasks.exists():
        project.views.all().delete()
        reload = True

    return {'processed_items': count, 'reload': reload,
            'detail': 'Deleted ' + str(count) + ' tasks'}


def delete_tasks_annotations(project, queryset, **kwargs):
    """ Delete all annotations by tasks ids

    :param project: project instance
    :param queryset: filtered tasks db queryset
    """
    task_ids = queryset.values_list('id', flat=True)
    annotations = Annotation.objects.filter(task__id__in=task_ids)
    count = annotations.count()

    # take only tasks where annotations were deleted
    real_task_ids = set(list(annotations.values_list('task__id', flat=True)))
    annotations_ids = list(annotations.values('id'))
    annotations.delete()
    emit_webhooks_for_instance(project.organization, project, WebhookAction.ANNOTATIONS_DELETED, annotations_ids)
    start_job_async_or_sync(bulk_update_stats_project_tasks, queryset.filter(is_labeled=True))
    Task.objects.filter(id__in=real_task_ids).update(updated_at=datetime.now())
    return {'processed_items': count,
            'detail': 'Deleted ' + str(count) + ' annotations'}


def delete_tasks_predictions(project, queryset, **kwargs):
    """ Delete all predictions by tasks ids

    :param project: project instance
    :param queryset: filtered tasks db queryset
    """
    task_ids = queryset.values_list('id', flat=True)
    predictions = Prediction.objects.filter(task__id__in=task_ids)
    count = predictions.count()
    predictions.delete()
    return {'processed_items': count, 'detail': 'Deleted ' + str(count) + ' predictions'}


def async_project_summary_recalculation(tasks_ids_list, project_id):
    queryset = Task.objects.filter(id__in=tasks_ids_list)
    project = Project.objects.get(id=project_id)
    project.summary.remove_created_annotations_and_labels(Annotation.objects.filter(task__in=queryset))
    project.summary.remove_data_columns(queryset)


actions = [
    {
        'entry_point': retrieve_tasks_predictions,
        'permission': all_permissions.predictions_any,
        'title': 'Retrieve Predictions',
        'order': 90,
        'dialog': {
            'text': 'Send the selected tasks to all ML backends connected to the project.'
                    'This operation might be abruptly interrupted due to a timeout. '
                    'The recommended way to get predictions is to update tasks using the Label Studio API.'
                    '<a href="https://labelstud.io/guide/ml.html>See more in the documentation</a>.'
                    'Please confirm your action.',
            'type': 'confirm'
        }
    },
    {
        'entry_point': delete_tasks,
        'permission': all_permissions.tasks_delete,
        'title': 'Delete Tasks',
        'order': 100,
        'reload': True,
        'dialog': {
            'text': 'You are going to delete the selected tasks. Please confirm your action.',
            'type': 'confirm'
        }
    },
    {
        'entry_point': delete_tasks_annotations,
        'permission': all_permissions.tasks_delete,
        'title': 'Delete Annotations',
        'order': 101,
        'dialog': {
            'text': 'You are going to delete all annotations from the selected tasks. Please confirm your action.',
            'type': 'confirm'
        }
    },
    {
        'entry_point': delete_tasks_predictions,
        'permission': all_permissions.predictions_any,
        'title': 'Delete Predictions',
        'order': 102,
        'dialog': {
            'text': 'You are going to delete all predictions from the selected tasks. Please confirm your action.',
            'type': 'confirm'
        }
    }
]
