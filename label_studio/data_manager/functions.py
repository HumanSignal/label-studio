"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import logging

from collections import OrderedDict
from django.conf import settings
from rest_framework.generics import get_object_or_404

from core.utils.common import int_from_request
from data_manager.prepare_params import PrepareParams
from data_manager.models import View
from tasks.models import Task


DATETIME_FORMAT = '%Y-%m-%dT%H:%M:%S.%fZ'
TASKS = 'tasks:'
logger = logging.getLogger(__name__)


class DataManagerException(Exception):
    pass


def get_all_columns(project):
    """ Make columns info for the frontend data manager
    """
    result = {'columns': []}

    # frontend uses MST data model, so we need two directional referencing parent <-> child
    task_data_children = []
    i = 0

    data_types = OrderedDict()
    # add data types from config again
    data_types.update(project.data_types.items())
    # all data types from import data
    if project.summary.all_data_columns:
        data_types.update({key: 'Unknown' for key in project.summary.all_data_columns if key not in data_types})

    # remove $undefined$ if there is one type at least in labeling config, because it will be resolved automatically
    if len(project.data_types) > 0:
        data_types.pop(settings.DATA_UNDEFINED_NAME, None)

    for key, data_type in list(data_types.items()):  # make data types from labeling config first
        column = {
            'id': key,
            'title': key if key != settings.DATA_UNDEFINED_NAME else 'data',
            'type': data_type if data_type in ['Image', 'Audio', 'AudioPlus', 'Unknown'] else 'String',
            'target': 'tasks',
            'parent': 'data',
            'visibility_defaults': {
                'explore': True,
                'labeling': key in project.data_types or key == settings.DATA_UNDEFINED_NAME
            }
        }
        result['columns'].append(column)
        task_data_children.append(column['id'])
        i += 1

    result['columns'] += [
        # --- Tasks ---
        {
            'id': 'id',
            'title': "ID",
            'type': 'Number',
            'help': 'Task ID',
            'target': 'tasks',
            'visibility_defaults': {
                'explore': True,
                'labeling': False
            }
        },
        {
            'id': 'completed_at',
            'title': 'Completed',
            'type': 'Datetime',
            'target': 'tasks',
            'help': 'Last annotation date',
            'visibility_defaults': {
                'explore': True,
                'labeling': False
            }
        },
        {
            'id': 'total_annotations',
            'title': 'Annotations',
            'type': "Number",
            'target': 'tasks',
            'help': 'Total annotations per task',
            'visibility_defaults': {
                'explore': True,
                'labeling': True
            }
        },
        {
            'id': 'cancelled_annotations',
            'title': "Cancelled",
            'type': "Number",
            'target': 'tasks',
            'help': 'Total cancelled (skipped) annotations',
            'visibility_defaults': {
                'explore': True,
                'labeling': False
            }
        },
        {
            'id': 'total_predictions',
            'title': "Predictions",
            'type': "Number",
            'target': 'tasks',
            'help': 'Total predictions per task',
            'visibility_defaults': {
                'explore': True,
                'labeling': False
            }
        },
        {
            'id': 'annotations_results',
            'title': "Annotations results",
            'type': "String",
            'target': 'tasks',
            'help': 'Annotation results stacked over all annotations',
            'visibility_defaults': {
                'explore': False,
                'labeling': False
            }
        },
        {
            'id': 'predictions_score',
            'title': "Predictions score",
            'type': "Number",
            'target': 'tasks',
            'help': 'Average prediction score over all task predictions',
            'visibility_defaults': {
                'explore': False,
                'labeling': False
            }
        },
        {
            'id': 'predictions_results',
            'title': "Predictions results",
            'type': "String",
            'target': 'tasks',
            'help': 'Prediction results stacked over all predictions',
            'visibility_defaults': {
                'explore': False,
                'labeling': False
            }
        },
        {
            'id': 'file_upload',
            'title': "Source filename",
            'type': "String",
            'target': 'tasks',
            'help': 'Source filename from import step',
            'visibility_defaults': {
                'explore': False,
                'labeling': False
            }
        },
        {
            'id': 'created_at',
            'title': 'Created at',
            'type': 'Datetime',
            'target': 'tasks',
            'help': 'Task creation time',
            'visibility_defaults': {
                'explore': False,
                'labeling': False
            }
        },
        {
            'id': 'annotators',
            'title': 'Annotated by',
            'type': 'List',
            'target': 'tasks',
            'help': 'All users who completed the task',
            'visibility_defaults': {
                'explore': True,
                'labeling': False
            }
        },
        {
            'id': 'data',
            'title': "data",
            'type': "List",
            'target': 'tasks',
            'children': task_data_children
        }
    ]
    return result


def get_prepared_queryset(request, project):
    # use filters and selected items from view
    view_id = int_from_request(request.GET, 'view_id', 0)
    if view_id > 0:
        view = get_object_or_404(request, View, pk=view_id)
        if view.project.pk != project.pk:
            raise DataManagerException('Project and View mismatch')
        prepare_params = view.get_prepare_tasks_params(add_selected_items=True)

    # use filters and selected items from request if it's specified
    else:
        selected = request.data.get('selectedItems', {"all": True, "excluded": []})
        if not isinstance(selected, dict):
            raise DataManagerException('selectedItems must be dict: {"all": [true|false], '
                                       '"excluded | included": [...task_ids...]}')
        filters = request.data.get('filters', None)
        ordering = request.data.get('ordering', [])
        prepare_params = PrepareParams(project=project.id, selectedItems=selected,
                                       filters=filters, ordering=ordering)

    queryset = Task.prepared.all(prepare_params=prepare_params)
    return queryset
