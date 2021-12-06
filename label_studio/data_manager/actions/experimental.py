"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import logging
import ujson as json

from collections import Counter
from django.conf import settings

from tasks.models import Annotation
from tasks.serializers import TaskSerializerBulk
from data_manager.functions import DataManagerException
from core.permissions import AllPermissions

logger = logging.getLogger(__name__)
all_permissions = AllPermissions()


def propagate_annotations(project, queryset, **kwargs):
    request = kwargs['request']
    user = request.user
    source_annotation_id = request.data.get('source_annotation_id')
    annotations = Annotation.objects.filter(task__project=project, id=source_annotation_id)
    if not annotations:
        raise DataManagerException(f'Source annotation {source_annotation_id} not found in the current project')
    source_annotation = annotations.first()

    tasks = set(queryset.values_list('id', flat=True))
    try:
        tasks.remove(source_annotation.task.id)
    except KeyError:
        pass

    # copy source annotation to new annotations for each task
    db_annotations = []
    for i in tasks:
        db_annotations.append(
            Annotation(
                task_id=i,
                completed_by_id=user.id,
                result=source_annotation.result,
                result_count=source_annotation.result_count,
                parent_annotation_id=source_annotation.id
            )
        )

    db_annotations = Annotation.objects.bulk_create(db_annotations, batch_size=settings.BATCH_SIZE)
    TaskSerializerBulk.post_process_annotations(db_annotations)

    return {'response_code': 200, 'detail': f'Created {len(db_annotations)} annotations'}


def propagate_annotations_form(user, project):
    return [{
        'columnCount': 1,
        'fields': [{
            'type': 'number',
            'name': 'source_annotation_id',
            'label': 'Enter source annotation ID'
        }]
    }]


def remove_duplicates(project, queryset, **kwargs):
    tasks = list(queryset.values('data', 'id'))
    for task in list(tasks):
        task['data'] = json.dumps(task['data'])

    counter = Counter([task['data'] for task in tasks])

    removing = []
    first = set()
    for task in tasks:
        if counter[task['data']] > 1 and task['data'] in first:
            removing.append(task['id'])
        else:
            first.add(task['data'])

    # iterate by duplicate groups
    queryset.filter(id__in=removing, annotations__isnull=True).delete()

    return {'response_code': 200, 'detail': f'Removed {len(removing)} tasks'}


actions = [
    {
        'entry_point': propagate_annotations,
        'permission': all_permissions.tasks_change,
        'title': 'Propagate Annotations',
        'order': 1,
        'experimental': True,
        'dialog': {
            'text': 'Confirm that you want to copy the source annotation to all selected tasks. '
                    'Note: this action can be applied only for similar source objects: '
                    'images with the same width and height, '
                    'texts with the same length, '
                    'audios with the same durations.',
            'type': 'confirm',
            'form': propagate_annotations_form
        }
    },

    {
        'entry_point': remove_duplicates,
        'permission': all_permissions.tasks_change,
        'title': 'Remove Duplicated Tasks',
        'order': 1,
        'experimental': True,
        'dialog': {
            'text': 'Confirm that you want to remove duplicated tasks with the same data fields.'
                    'Only tasks without annotations will be deleted.',
            'type': 'confirm'
        }
    }
]
