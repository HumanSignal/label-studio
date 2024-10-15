"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""

import logging
import random

import ujson as json
from core.permissions import AllPermissions
from core.utils.db import fast_first
from data_manager.functions import DataManagerException
from django.conf import settings
from tasks.models import Annotation, Task
from tasks.serializers import TaskSerializerBulk

logger = logging.getLogger(__name__)
all_permissions = AllPermissions()


def propagate_annotations(project, queryset, **kwargs):
    request = kwargs['request']
    user = request.user
    source_annotation_id = request.data.get('source_annotation_id')
    annotations = Annotation.objects.filter(project=project, id=source_annotation_id)
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
            'parent_annotation_id': source_annotation.id,
            'project': project,
        }
        body = TaskSerializerBulk.add_annotation_fields(body, user, 'propagated_annotation')
        db_annotations.append(Annotation(**body))

    db_annotations = Annotation.objects.bulk_create(db_annotations, batch_size=settings.BATCH_SIZE)
    TaskSerializerBulk.post_process_annotations(user, db_annotations, 'propagated_annotation')
    # Update counters for tasks and is_labeled. It should be a single operation as counters affect bulk is_labeled update
    project.update_tasks_counters_and_is_labeled(tasks_queryset=Task.objects.filter(id__in=tasks))
    return {
        'response_code': 200,
        'detail': f'Created {len(db_annotations)} annotations',
    }


def propagate_annotations_form(user, project):
    first_annotation = fast_first(Annotation.objects.filter(project=project))
    field = {
        'type': 'number',
        'name': 'source_annotation_id',
        'label': 'Enter source annotation ID'
        + (f' [first ID: {str(first_annotation.id)}]' if first_annotation else ''),
    }
    return [{'columnCount': 1, 'fields': [field]}]


def rename_labels(project, queryset, **kwargs):
    request = kwargs['request']

    old_label_name = request.data.get('old_label_name')
    new_label_name = request.data.get('new_label_name')
    control_tag = request.data.get('control_tag')

    labels = project.get_parsed_config()
    if control_tag not in labels:
        raise Exception('Wrong old label name, it is not from labeling config: ' + old_label_name)
    label_type = labels[control_tag]['type'].lower()

    annotations = Annotation.objects.filter(project=project)
    if settings.DJANGO_DB == settings.DJANGO_DB_SQLITE:
        annotations = annotations.filter(result__icontains=control_tag).filter(result__icontains=old_label_name)
    else:
        annotations = annotations.filter(result__contains=[{'from_name': control_tag}]).filter(
            result__contains=[{'value': {label_type: [old_label_name]}}]
        )

    label_count = 0
    annotation_count = 0
    for annotation in annotations:
        changed = False
        for sub in annotation.result:
            if sub.get('from_name', None) == control_tag and old_label_name in sub.get('value', {}).get(
                label_type, []
            ):

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

    # update summaries
    project.summary.reset()
    project.summary.update_data_columns(project.tasks.all())
    annotations = Annotation.objects.filter(project=project)
    project.summary.update_created_annotations_and_labels(annotations)

    return {
        'response_code': 200,
        'detail': f'Updated {label_count} labels in {annotation_count}',
    }


def rename_labels_form(user, project):
    labels = project.get_parsed_config()

    old_names = []
    control_tags = []
    for key, label in labels.items():
        old_names += label.get('labels', [])
        control_tags.append(key)

    return [
        {
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
                {'type': 'input', 'name': 'new_label_name', 'label': 'New label name'},
            ],
        }
    ]


def add_data_field(project, queryset, **kwargs):
    from django.db.models import F, Func, JSONField, Value

    request = kwargs['request']
    value_name = request.data.get('value_name')
    value_type = request.data.get('value_type')
    value = request.data.get('value')
    size = queryset.count()

    cast = {'String': str, 'Number': float, 'Expression': str}
    assert value_type in cast.keys()
    value = cast[value_type](value)

    if value_type == 'Expression':
        add_expression(queryset, size, value, value_name)

    else:

        # sqlite
        if settings.DJANGO_DB == settings.DJANGO_DB_SQLITE:
            tasks = list(queryset.only('data'))
            for task in tasks:
                task.data[value_name] = value
            Task.objects.bulk_update(tasks, fields=['data'], batch_size=1000)

        # postgres and other DB
        else:
            queryset.update(
                data=Func(
                    F('data'),
                    Value([value_name]),
                    Value(value, JSONField()),
                    function='jsonb_set',
                )
            )

    project.summary.update_data_columns([queryset.first()])
    return {'response_code': 200, 'detail': f'Updated {size} tasks'}


def process_arrays(params):
    start, end = params.find('['), -1
    while start != end:
        end = start + params[start:].find(']') + 1
        params = params[0:start] + params[start:end].replace(',', ';') + params[end:]
        start = end + params[end:].find('[') + 1
    return params


add_data_field_examples = (
    'range(2) or '
    'sample() or '
    'random(<min_int>, <max_int>) or '
    'choices(["<value1>", "<value2>", ...], [<weight1>, <weight2>, ...]) or '
    'replace("old-string", "new-string")'
)


def add_expression(queryset, size, value, value_name):
    # simple parsing
    command, args = value.split('(')
    args = process_arrays(args)
    args = args.replace(')', '').split(',')
    args = [] if len(args) == 1 and args[0] == '' else args
    # return comma back, convert quotation mark to doubled quotation mark for json parsing
    for i, arg in enumerate(args):
        args[i] = arg.replace(';', ',').replace("'", '"')

    tasks = list(queryset.only('data'))

    # range
    if command == 'range':
        assert len(args) == 1, 'range(start:int) should have start argument '
        start = int(args[0])
        values = range(start, start + size)
        for i, v in enumerate(values):
            tasks[i].data[value_name] = v

    # permutation sampling
    elif command == 'sample':
        assert len(args) == 0, "sample() doesn't have arguments"
        values = random.sample(range(0, size), size)
        for i, v in enumerate(values):
            tasks[i].data[value_name] = v

    # uniform random
    elif command == 'random':
        assert len(args) == 2, 'random(min, max) should have 2 args: min & max'
        minimum, maximum = int(args[0]), int(args[1])
        for i in range(size):
            tasks[i].data[value_name] = random.randint(minimum, maximum)

    # sampling with choices and weights
    elif command == 'choices':
        assert 0 < len(args) < 3, (
            'choices(values:list, weights:list) ' 'should have 1 or 2 args: values & weights (default=None)'
        )
        weights = json.loads(args[1]) if len(args) == 2 else None
        values = random.choices(population=json.loads(args[0]), weights=weights, k=size)
        for i, v in enumerate(values):
            tasks[i].data[value_name] = v

    # replace
    elif command == 'replace':
        assert len(args) == 2, 'replace(old_value:str, new_value:str) should have 2 args: old value & new value'
        old_value, new_value = json.loads(args[0]), json.loads(args[1])
        for task in tasks:
            if value_name in task.data:
                task.data[value_name] = task.data[value_name].replace(old_value, new_value)

    else:
        raise Exception('Undefined expression, you can use: ' + add_data_field_examples)

    Task.objects.bulk_update(tasks, fields=['data'], batch_size=1000)


def add_data_field_form(user, project):
    return [
        {
            'columnCount': 1,
            'fields': [
                {'type': 'input', 'name': 'value_name', 'label': 'Name'},
                {
                    'type': 'select',
                    'name': 'value_type',
                    'label': 'Type',
                    'options': ['String', 'Number', 'Expression'],
                },
                {'type': 'input', 'name': 'value', 'label': 'Value'},
            ],
        }
    ]


actions = [
    {
        'entry_point': add_data_field,
        'permission': all_permissions.projects_change,
        'title': 'Add Or Modify Data Field',
        'order': 1,
        'experimental': True,
        'dialog': {
            'text': 'Confirm that you want to add a new field in tasks. '
            'After this operation you must refresh the Data Manager page fully to see the new column! '
            'You can use the following expressions: ' + add_data_field_examples,
            'type': 'confirm',
            'form': add_data_field_form,
        },
    },
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
            'form': propagate_annotations_form,
        },
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
        },
    },
]
