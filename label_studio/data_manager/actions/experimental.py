"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import logging

from copy import copy, deepcopy
from data_manager.functions import DataManagerException
from core.utils.common import timestamp_now

logger = logging.getLogger(__name__)


def propagate_annotations(project, queryset, **kwargs):
    items = queryset.value_list('id', flat=True)

    if len(items) < 2:
        raise DataManagerException('Select more than two tasks, the first task annotation will be picked as source')

    # check first annotation
    completed_task = items[0]
    task = project.target_storage.get(completed_task)
    if task is None or len(task.get('annotations', [])) == 0:
        raise DataManagerException('The first selected task with ID = ' + str(completed_task) +
                                   ' should have at least one annotation to propagate')

    # get first annotation
    source_annotation = task['annotations'][0]

    # copy first annotation to new annotations for each task
    for i in items[1:]:
        task = project.target_storage.get(i)
        if task is None:
            task = project.source_storage.get(i)
        annotation = deepcopy(source_annotation)

        # start annotation id from task_id * 9000
        annotations = task.get('annotations', None) or [{'id': i * 9000}]
        annotation['id'] = max([c['id'] for c in annotations]) + 1
        annotation['created_at'] = timestamp_now()

        if 'annotations' not in task:
            task['annotations'] = []
        task['annotations'].append(annotation)

        project.target_storage.set(i, task)

    return {'response_code': 200}


def predictions_to_annotations(project, items, **kwargs):
    for i in items:
        task = project.source_storage.get(i)
        predictions = task.get('predictions', [])
        if len(predictions) == 0:
            continue

        prediction = predictions[-1]

        # load task with annotation from target storage
        task_with_annotations = project.target_storage.get(i)
        task = copy(task if task_with_annotations is None else task_with_annotations)

        annotations = task.get('annotations', None) or [{'id': i * 9000}]
        annotation = {
            'id': max([c['id'] for c in annotations]) + 1,
            'created_at': timestamp_now(),
            'lead_time': 0,
            'result': prediction.get('result', [])
        }

        if 'annotations' not in task:
            task['annotations'] = []
        task['annotations'].append(annotation)

        project.target_storage.set(i, task)

    return {'response_code': 200}


actions = [
    {
        'entry_point': propagate_annotations,
        'title': 'Propagate annotations',
        'order': 1,
        'experimental': True,
        'dialog': {
            'text': 'This action will pick the first annotation from the first selected task, '
                    'create new annotations for all selected tasks, '
                    'and propagate the first annotation to others. ' +
                    '.' * 80 +
                    '1. Create the first annotation for task A. '
                    '2. Select task A with checkbox as first selected item. '
                    '3. Select other tasks where you want to copy the first annotation from task A. '
                    '4. Click Propagate annotations. ' +
                    '.' * 80 +
                    '! Warning: it is an experimental feature! It could work well with Choices, '
                    'but other annotation types (RectangleLabels, Text Labels, etc) '
                    'will have a lot of issues.',
            'type': 'confirm'
        }
    },

    {
        'entry_point': predictions_to_annotations,
        'title': 'Predictions => annotations',
        'order': 1,
        'experimental': True,
        'dialog': {
            'text': 'This action will create a new annotation from the last task prediction for each selected task.',
            'type': 'confirm'
        }
    }
]
