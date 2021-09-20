"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
from django.db.models import signals

from tasks.models import Annotation, Prediction, update_is_labeled_after_removing_annotation
from core.utils.common import temporary_disconnect_signal, temporary_disconnect_all_signals

from data_manager.functions import evaluate_predictions

from webhooks.utils import emit_webhooks_for_instance
from webhooks.models import WebhookAction
from core.permissions import AllPermissions


all_permissions = AllPermissions()


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

    # delete all project tasks
    if count == project.tasks.count():
        with temporary_disconnect_all_signals():
            queryset.delete()

        project.summary.reset()
        project.update_tasks_states(
            maximum_annotations_changed=False,
            overlap_cohort_percentage_changed=False,
            tasks_number_changed=True
        )

    # delete only specific tasks
    else:
        # this signal re-save the task back
        with temporary_disconnect_signal(signals.post_delete, update_is_labeled_after_removing_annotation, Annotation):
            queryset.delete()

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
    annotations_ids = list(annotations.values('id'))
    annotations.delete()
    emit_webhooks_for_instance(project.organization, project, WebhookAction.ANNOTATIONS_DELETED, annotations_ids)
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


actions = [
    {
        'entry_point': retrieve_tasks_predictions,
        'title': 'Retrieve predictions',
        'order': 90,
        'permission': all_permissions.predictions_any,
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
        'title': 'Delete tasks', 'order': 100,
        'permission': all_permissions.tasks_delete,
        'reload': True,
        'dialog': {
            'text': 'You are going to delete the selected tasks. Please confirm your action.',
            'type': 'confirm'
        }
    },
    {
        'entry_point': delete_tasks_annotations,
        'permission': all_permissions.tasks_delete,
        'title': 'Delete annotations',
        'order': 101,
        'dialog': {
            'text': 'You are going to delete all annotations from the selected tasks. Please confirm your action.',
            'type': 'confirm'
        }
    },
    {
        'entry_point': delete_tasks_predictions,
        'permission': all_permissions.predictions_any,
        'title': 'Delete predictions',
        'order': 102,
        'dialog': {
            'text': 'You are going to delete all predictions from the selected tasks. Please confirm your action.',
            'type': 'confirm'
        }
    }
]
