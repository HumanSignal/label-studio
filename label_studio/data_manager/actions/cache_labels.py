"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""

import logging

from core.permissions import AllPermissions
from core.redis import start_job_async_or_sync
from tasks.models import Annotation, Prediction, Task

logger = logging.getLogger(__name__)
all_permissions = AllPermissions()


def cache_labels_job(project, queryset, **kwargs):
    request_data = kwargs['request_data']
    source = request_data.get('source', 'annotations').lower()
    source_class = Annotation if source == 'annotations' else Prediction
    control_tag = request_data.get('custom_control_tag') or request_data.get('control_tag')
    with_counters = request_data.get('with_counters', 'Yes').lower() == 'yes'
    column_name = f'cache_{control_tag}'

    # ALL is a special case, we will cache all labels from all control tags into one column
    if control_tag == 'ALL' or control_tag is None:
        control_tag = None
        column_name = 'cache_all'

    tasks = list(queryset.only('data'))
    logger.info(f'Cache labels for {len(tasks)} tasks and control tag {control_tag}')

    for task in tasks:
        task_labels = []
        annotations = source_class.objects.filter(task=task)
        for annotation in annotations:
            labels = extract_labels(annotation, control_tag)
            task_labels.extend(labels)

        # cache labels in separate data column
        # with counters
        if with_counters:
            task.data[column_name] = ', '.join(
                sorted([f'{label}: {task_labels.count(label)}' for label in set(task_labels)])
            )
        # no counters
        else:
            task.data[column_name] = ', '.join(sorted(list(set(task_labels))))

    Task.objects.bulk_update(tasks, fields=['data'], batch_size=1000)
    first_task = Task.objects.get(id=queryset.first().id)
    project.summary.update_data_columns([first_task])
    return {'response_code': 200, 'detail': f'Updated {len(tasks)} tasks'}


def extract_labels(annotation, control_tag):
    labels = []
    for region in annotation.result:
        # find regions with specific control tag name or just all regions if control tag is None
        if control_tag is None or region['from_name'] == control_tag and 'value' in region:
            # scan value for a field with list of strings,
            # as bonus it will work with textareas too
            for key in region['value']:
                if (
                    isinstance(region['value'][key], list)
                    and region['value'][key]
                    and isinstance(region['value'][key][0], str)
                ):
                    labels.extend(region['value'][key])
                    break
    return labels


def cache_labels(project, queryset, request, **kwargs):
    """Cache labels from annotations to a new column in tasks"""
    start_job_async_or_sync(
        cache_labels_job,
        project,
        queryset,
        organization_id=project.organization_id,
        request_data=request.data,
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


actions = [
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
