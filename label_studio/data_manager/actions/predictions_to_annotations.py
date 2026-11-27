"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license."""

import logging

from core.permissions import AllPermissions
from data_manager.actions import DataManagerAction
from tasks.functions import bulk_create_annotations_with_side_effects
from tasks.models import Annotation, Prediction, Task
from tasks.serializers import TaskSerializerBulk

all_permissions = AllPermissions()
logger = logging.getLogger(__name__)


def predictions_to_annotations(project, queryset, **kwargs):
    request = kwargs['request']
    user = request.user
    model_version = request.data.get('model_version')
    queryset = queryset.filter(predictions__isnull=False)
    predictions = Prediction.objects.filter(task__in=queryset, child_annotations__isnull=True)

    # model version filter
    if model_version is not None:
        if isinstance(model_version, list):
            predictions = predictions.filter(model_version__in=model_version).distinct()
        else:
            predictions = predictions.filter(model_version=model_version)

    predictions_values = list(predictions.values_list('result', 'model_version', 'task_id', 'id'))

    # prepare annotations
    annotations = []
    tasks_ids = []
    for result, model_version, task_id, prediction_id in predictions_values:
        tasks_ids.append(task_id)
        body = {
            'result': result,
            'completed_by_id': user.pk,
            'task_id': task_id,
            'parent_prediction_id': prediction_id,
            'project': project,
        }
        body = TaskSerializerBulk.add_annotation_fields(body, user, 'prediction')
        annotations.append(body)

    count = len(annotations)
    logger.debug(f'{count} predictions will be converter to annotations')
    db_annotations = [Annotation(**annotation) for annotation in annotations]
    db_annotations = bulk_create_annotations_with_side_effects(
        db_annotations,
        project=project,
        user=user,
        action='prediction',
        tasks_queryset=Task.objects.filter(id__in=tasks_ids),
        emit_created_webhook=True,
    )

    return {'response_code': 200, 'detail': f'Created {count} annotations'}


def predictions_to_annotations_form(user, project):
    versions = project.get_model_versions()

    # put the current model version on the top of the list
    # if it exists
    first = project.model_version
    if first:
        try:
            versions.remove(first)
        except ValueError:
            pass
        versions = [first] + versions

    return [
        {
            'columnCount': 1,
            'fields': [
                {
                    'type': 'select',
                    'name': 'model_version',
                    'label': 'Choose predictions',
                    'options': versions,
                    'value': first,
                }
            ],
        }
    ]


actions: list[DataManagerAction] = [
    {
        'entry_point': predictions_to_annotations,
        'permission': all_permissions.tasks_change,
        'title': 'Create Annotations From Predictions',
        'order': 91,
        'dialog': {
            'title': 'Create Annotations From Predictions',
            'text': 'Create annotations from predictions using selected predictions set '
            'for each selected task. '
            'Your account will be assigned as an owner to those annotations. ',
            'type': 'confirm',
            'form': predictions_to_annotations_form,
        },
    }
]
