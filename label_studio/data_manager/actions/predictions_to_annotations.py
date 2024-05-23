"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import logging

from core.permissions import AllPermissions
from django.utils.timezone import now
from tasks.models import Annotation, Prediction, Task
from tasks.serializers import TaskSerializerBulk
from webhooks.models import WebhookAction
from webhooks.utils import emit_webhooks_for_instance

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
    db_annotations = Annotation.objects.bulk_create(db_annotations)
    Task.objects.filter(id__in=tasks_ids).update(updated_at=now(), updated_by=request.user)

    if db_annotations:
        TaskSerializerBulk.post_process_annotations(user, db_annotations, 'prediction')
        # Execute webhook for created annotations
        emit_webhooks_for_instance(
            user.active_organization, project, WebhookAction.ANNOTATIONS_CREATED, db_annotations
        )
        # Update counters for tasks and is_labeled. It should be a single operation as counters affect bulk is_labeled update
        project.update_tasks_counters_and_is_labeled(Task.objects.filter(id__in=tasks_ids))
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
                }
            ],
        }
    ]


actions = [
    {
        'entry_point': predictions_to_annotations,
        'permission': all_permissions.tasks_change,
        'title': 'Create Annotations From Predictions',
        'order': 91,
        'dialog': {
            'title': 'Create Annotations From Predictions',
            'text': 'Create annotations from predictions using selected predictions set '
            'for each selected task.'
            'Your account will be assigned as an owner to those annotations. ',
            'type': 'confirm',
            'form': predictions_to_annotations_form,
        },
    }
]
