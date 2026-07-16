"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license."""

import logging

from core.permissions import AllPermissions
from core.utils.db import fast_first
from data_manager.actions import DataManagerAction
from data_manager.functions import DataManagerException
from django.conf import settings
from rest_framework.exceptions import ValidationError
from tasks.functions import bulk_create_annotations_with_side_effects
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

    db_annotations = bulk_create_annotations_with_side_effects(
        db_annotations,
        project=project,
        user=user,
        action='propagated_annotation',
        tasks_queryset=Task.objects.filter(id__in=tasks),
        emit_created_webhook=True,
        batch_size=settings.BATCH_SIZE,
    )
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
        raise ValidationError('Wrong old label name, it is not from labeling config: ' + old_label_name)
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
    logger.info(f'calling reset project_id={project.id} rename_labels()')
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


actions: list[DataManagerAction] = [
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
