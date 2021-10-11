"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import logging

from core.permissions import AllPermissions
from tasks.serializers import AnnotationSerializer

all_permissions = AllPermissions()
logger = logging.getLogger(__name__)


def predictions_to_annotations(project, queryset, **kwargs):
    request = kwargs['request']
    user = request.user
    model_version = request.data.get('model_version')
    queryset = queryset.filter(predictions__isnull=False, predictions__child_annotations__isnull=True)

    # model version filter
    if model_version is not None:
        queryset = queryset.filter(predictions__model_version=model_version)

    predictions = list(queryset.values_list(
        'predictions__result', 'predictions__model_version', 'id', 'predictions__id'
    ))

    # prepare annotations
    annotations = []
    for prediction in predictions:
        annotations.append({
            'result': prediction[0],
            'completed_by': user.pk,
            'task': prediction[2],
            'parent_prediction': prediction[3]
        })

    count = len(annotations)
    logger.debug(f'{count} predictions will be converter to annotations')
    annotation_ser = AnnotationSerializer(data=annotations, many=True)
    annotation_ser.is_valid(raise_exception=True)
    annotation_ser.save()

    return {'response_code': 200, 'detail': f'Created {count} annotations'}


def predictions_to_annotations_form(user, project):
    return [{
        'columnCount': 1,
        'fields': [{
            'type': 'select',
            'name': 'model_version',
            'label': 'Choose a model',
            'options': project.get_model_versions(),
        }]
    }]


actions = [
    {
        'entry_point': predictions_to_annotations,
        'permission': all_permissions.tasks_change,
        'title': 'Create Annotations From Predictions',
        'order': 91,
        'dialog': {
            'text': 'This action will create a new annotation from predictions with the current project model version '
                    'for each selected task.',
            'type': 'confirm',
            'form': predictions_to_annotations_form,
        }
    }
]
