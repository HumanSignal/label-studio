"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
from django.db.models import signals

from tasks.models import Annotation, update_is_labeled_after_removing_annotation
from core.utils.common import temporary_disconnect_signal


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


actions = [
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
    }
]
