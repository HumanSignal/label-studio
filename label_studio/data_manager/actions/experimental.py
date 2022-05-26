"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import logging
import ujson as json

from django.conf import settings
from django.db.models import Count

from tasks.models import Annotation, Task
from tasks.serializers import TaskSerializerBulk
from data_manager.functions import DataManagerException
from data_manager.actions.basic import delete_tasks
from core.permissions import AllPermissions
from collections import defaultdict
from core.redis import start_job_async_or_sync

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
        body = {
            'task_id': i,
            'completed_by_id': user.id,
            'result': source_annotation.result,
            'result_count': source_annotation.result_count,
            'parent_annotation_id': source_annotation.id
        }
        body = TaskSerializerBulk.add_annotation_fields(body, user, 'propagated_annotation')
        db_annotations.append(Annotation(**body))

    db_annotations = Annotation.objects.bulk_create(db_annotations, batch_size=settings.BATCH_SIZE)
    TaskSerializerBulk.post_process_annotations(user, db_annotations, 'propagated_annotation')

    start_job_async_or_sync(project.update_tasks_counters, Task.objects.filter(id__in=tasks))
    return {'response_code': 200, 'detail': f'Created {len(db_annotations)} annotations'}


def propagate_annotations_form(user, project):
    first_annotation = Annotation.objects.filter(task__project=project).first()
    field = {
        'type': 'number',
        'name': 'source_annotation_id',
        'label': 'Enter source annotation ID' +
                 (f' [first ID: {str(first_annotation.id)}]' if first_annotation else '')
    }
    return [{
        'columnCount': 1,
        'fields': [field]
    }]


def remove_duplicates(project, queryset, **kwargs):
    tasks = list(
        queryset
        .annotate(total_annotations=Count('annotations'))
        .values('data', 'id', 'total_annotations')
    )
    duplicates = defaultdict(list)
    for task in list(tasks):
        task['data'] = json.dumps(task['data'])
        duplicates[task['data']].append(task)

    removing = []

    # prepare main tasks which won't be deleted
    for data in duplicates:
        root = duplicates[data]
        if len(root) == 1:
            continue

        one_task_saved = False
        new_root = []
        for task in root:
            # keep all tasks with annotations in safety
            if task['total_annotations'] > 0:
                one_task_saved = True
            else:
                new_root.append(task)

        for task in new_root:
            # keep the first task in safety
            if not one_task_saved:
                one_task_saved = True
            # remove all other tasks
            else:
                removing.append(task['id'])

    # remove tasks
    queryset = queryset.filter(id__in=removing, annotations__isnull=True)
    assert queryset.count() == len(removing), \
        f'Remove duplicates failed, operation is not finished: ' \
        f'queryset count {queryset.count()} != removing {len(removing)}'

    delete_tasks(project, queryset)
    return {'response_code': 200, 'detail': f'Removed {len(removing)} tasks'}


def rename_labels(project, queryset, **kwargs):
    request = kwargs['request']

    old_label_name = request.data.get('old_label_name')
    new_label_name = request.data.get('new_label_name')
    control_tag = request.data.get('control_tag')

    labels = project.get_parsed_config()
    if control_tag not in labels:
        raise Exception('Wrong old label name, it is not from labeling config: ' + old_label_name)
    label_type = labels[control_tag]['type'].lower()

    annotations = Annotation.objects.filter(task__project=project)
    annotations = annotations \
        .filter(result__contains=[{'from_name': control_tag}]) \
        .filter(result__contains=[{'value': {label_type: [old_label_name]}}])

    label_count = 0
    annotation_count = 0
    for annotation in annotations:
        changed = False
        for sub in annotation.result:
            if sub.get('from_name', None) == control_tag \
                    and old_label_name in sub.get('value', {}).get(label_type, []):

                new_labels = []
                for label in sub['value'][label_type]:
                    if label == old_label_name:
                        new_labels.append(new_label_name)
                        label_count += 1
                        changed = True
                    else:
                        new_labels.append(label)

                sub['value'][label_type] = new_labels

        if changed:
            annotation.save(update_fields=['result'])
            annotation_count += 1

    return {'response_code': 200, 'detail': f'Updated {label_count} labels in {annotation_count}'}


def rename_labels_form(user, project):
    labels = project.get_parsed_config()

    old_names = []
    control_tags = []
    for key, label in labels.items():
        old_names += label.get('labels', [])
        control_tags.append(key)

    return [{
        'columnCount': 1,
        'fields': [
            {
                'type': 'select',
                'name': 'control_tag',
                'label': 'Choose a label control tag',
                'options': control_tags,
            },
            {
                'type': 'select',
                'name': 'old_label_name',
                'label': 'Old label name',
                'options': list(set(old_names)),
            },
            {
                'type': 'input',
                'name': 'new_label_name',
                'label': 'New label name'
            },
        ]
    }]


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
    },

    {
        'entry_point': rename_labels,
        'permission': all_permissions.tasks_change,
        'title': 'Rename Labels',
        'order': 1,
        'experimental': True,
        'dialog': {
            'text': 'Confirm that you want to rename a label in all annotations. '
                    'Also you have to change label names in the labeling config manually.',
            'type': 'confirm',
            'form': rename_labels_form,
        }
    }

]
