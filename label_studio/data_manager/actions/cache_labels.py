"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license."""

import logging
from collections import defaultdict

from core.permissions import AllPermissions
from core.redis import start_job_async_or_sync
from core.utils.iterators import iterate_queryset
from data_manager.actions import DataManagerAction
from django.db.models import QuerySet
from label_studio_sdk.label_interface import LabelInterface
from tasks.models import Annotation, Prediction, Task

logger = logging.getLogger(__name__)
all_permissions = AllPermissions()

CACHE_LABELS_BATCH_SIZE = 1000
# Annotation/prediction results can be large (brush RLE masks are ~1-2 MB each once loaded),
# so stream them inside a batch instead of loading the whole batch at once
CACHE_LABELS_SOURCE_CHUNK_SIZE = 20


def cache_labels_job(project, task_ids, **kwargs):
    request_data = kwargs['request_data']
    source = request_data.get('source', 'annotations').lower()
    assert source in ['annotations', 'predictions'], 'Source must be annotations or predictions'
    source_class = Annotation if source == 'annotations' else Prediction
    control_tag = request_data.get('custom_control_tag') or request_data.get('control_tag')
    with_counters = request_data.get('with_counters', 'Yes').lower() == 'yes'
    label_interface = LabelInterface(project.label_config)
    label_interface_tags = {tag.name: tag for tag in label_interface.find_tags('control')}

    if source == 'annotations':
        column_name = 'cache'
    else:
        column_name = 'cache_predictions'

    # ALL is a special case, we will cache all labels from all control tags into one column
    if control_tag == 'ALL' or control_tag is None:
        control_tag = None
        column_name = f'{column_name}_all'
    else:
        column_name = f'{column_name}_{control_tag}'

    # Jobs enqueued before task ids were passed still carry a queryset
    if isinstance(task_ids, QuerySet):
        task_ids = list(task_ids.values_list('id', flat=True))
    task_ids = sorted(task_ids)
    logger.info(f'Cache labels for {len(task_ids)} tasks and control tag {control_tag}')

    for start in range(0, len(task_ids), CACHE_LABELS_BATCH_SIZE):
        batch_ids = task_ids[start : start + CACHE_LABELS_BATCH_SIZE]
        tasks = list(Task.objects.filter(id__in=batch_ids).only('id', 'data'))
        labels_by_task = defaultdict(list)
        sources = source_class.objects.filter(task_id__in=batch_ids).only('task_id', 'result')
        for source_obj in iterate_queryset(sources, chunk_size=CACHE_LABELS_SOURCE_CHUNK_SIZE):
            labels_by_task[source_obj.task_id].extend(extract_labels(source_obj, control_tag, label_interface_tags))

        for task in tasks:
            task_labels = labels_by_task.get(task.id, [])
            # cache labels in separate data column
            # with counters
            if with_counters:
                task.data[column_name] = ', '.join(
                    sorted([f'{label}: {task_labels.count(label)}' for label in set(task_labels)])
                )
            # no counters
            else:
                task.data[column_name] = ', '.join(sorted(list(set(task_labels))))

        Task.objects.bulk_update(tasks, fields=['data'], batch_size=CACHE_LABELS_BATCH_SIZE)

    if task_ids:
        project.summary.update_data_columns([Task.objects.get(id=task_ids[0])])
    return {'response_code': 200, 'detail': f'Updated {len(task_ids)} tasks'}


def extract_labels(annotation, control_tag, label_interface_tags=None):
    labels = []
    for region in annotation.result:
        # find regions with specific control tag name or just all regions if control tag is None
        if (control_tag is None or region['from_name'] == control_tag) and 'value' in region:
            # scan value for a field with list of strings (eg choices, textareas)
            # or taxonomy (list of string-lists)
            for key in region['value']:
                if not region['value'][key] or not isinstance(region['value'][key], list):
                    continue
                if key == 'taxonomy':
                    showFullPath = 'true'
                    pathSeparator = '/'
                    if label_interface_tags is not None and region['from_name'] in label_interface_tags:
                        # if from_name is not a custom_control tag, then we can try to fetch taxonomy formatting params
                        label_interface_tag = label_interface_tags[region['from_name']]
                        showFullPath = label_interface_tag.attr.get('showFullPath', 'false')
                        pathSeparator = label_interface_tag.attr.get('pathSeparator', '/')

                    if showFullPath == 'false':
                        for elems in region['value'][key]:
                            labels.append(elems[-1])  # just the leaf node of a taxonomy selection
                    else:
                        for elems in region['value'][key]:
                            labels.append(pathSeparator.join(elems))  # the full delimited taxonomy path
                    break

                # other control tag types like Choices & TextAreas
                if isinstance(region['value'][key][0], str):
                    labels.extend(region['value'][key])
                    break
                # non-string lists (rle masks, polygon points, ...) carry no labels; keep scanning
    return labels


def cache_labels(project, queryset, request, **kwargs):
    """Cache labels from annotations to a new column in tasks"""
    # Pass ids, not the queryset: pickling a QuerySet evaluates it in the request
    task_ids = list(queryset.values_list('id', flat=True))
    start_job_async_or_sync(
        cache_labels_job,
        project,
        task_ids,
        organization_id=project.organization_id,
        request_data=request.data,
        job_timeout=60 * 60 * 5,  # max allowed duration is 5 hours
    )
    return {'response_code': 200}


def cache_labels_form(user, project):
    labels = project.get_parsed_config()
    control_tags = ['ALL']
    for key, _ in labels.items():
        control_tags.append(key)

    return [
        {
            'columnCount': 1,
            'fields': [
                {
                    'type': 'select',
                    'name': 'control_tag',
                    'label': 'Choose a control tag',
                    'options': control_tags,
                },
                {
                    'type': 'input',
                    'name': 'custom_control_tag',
                    'label': "Custom control tag if it's not in label config",
                },
                {
                    'type': 'select',
                    'name': 'with_counters',
                    'label': 'With counters',
                    'options': ['Yes', 'No'],
                },
                {
                    'type': 'select',
                    'name': 'source',
                    'label': 'Source',
                    'options': ['Annotations', 'Predictions'],
                },
            ],
        }
    ]


actions: list[DataManagerAction] = [
    {
        'entry_point': cache_labels,
        'permission': all_permissions.projects_change,
        'title': 'Cache Labels',
        'order': 1,
        'experimental': True,
        'dialog': {
            'text': 'Confirm that you want to add a new task.data field with cached labels from annotations. '
            'This field will help you to quickly filter or order tasks by labels. '
            'After this operation you must refresh the Data Manager page fully to see the new column!',
            'type': 'confirm',
            'form': cache_labels_form,
        },
    },
]
