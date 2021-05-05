"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
from django.db.models import signals

from tasks.models import Annotation, Prediction, update_is_labeled_after_removing_annotation
from core.utils.common import temporary_disconnect_signal

from data_manager.functions import evaluate_predictions


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
    count = queryset.count()
    # this signal re-save the task back
    with temporary_disconnect_signal(signals.post_delete, update_is_labeled_after_removing_annotation, Annotation):
        queryset.delete()

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
    annotations.delete()
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
        'permissions': 'can_manage_annotations',
        'dialog': {
            'text': 'Send the selected tasks to all ML backends connected to the project.'
                    'This operation migth be abruptly interrupted due to a timeout. ' 
                    'The recommended way to get predictions is to update tasks using the Label Studio API.'
                    '<a href="https://labelstud.io/guide/ml.html>See more in the documentation</a>.'
                    'Please confirm your action.',
            'type': 'confirm'
        }
    },
    {
        'entry_point': delete_tasks,
        'title': 'Delete tasks', 'order': 100,
        'permissions': 'can_delete_tasks',
        'reload': True,
        'dialog': {
            'text': 'You are going to delete the selected tasks. Please confirm your action.',
            'type': 'confirm'
        }
    },
    {
        'entry_point': delete_tasks_annotations,
        'title': 'Delete annotations',
        'order': 101,
        'permissions': 'can_manage_annotations',
        'dialog': {
            'text': 'You are going to delete all annotations from the selected tasks. Please confirm your action.',
            'type': 'confirm'
        }
    },
    {
        'entry_point': delete_tasks_predictions,
        'title': 'Delete predictions',
        'order': 102,
        'permissions': 'can_manage_annotations',
        'dialog': {
            'text': 'You are going to delete all predictions from the selected tasks. Please confirm your action.',
            'type': 'confirm'
        }
    }
]
