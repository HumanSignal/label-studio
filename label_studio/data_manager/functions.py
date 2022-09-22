"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import logging
import ujson as json

from collections import OrderedDict
from django.conf import settings
from rest_framework.generics import get_object_or_404

from core.utils.common import int_from_request
from data_manager.prepare_params import PrepareParams
from data_manager.models import View
from tasks.models import Task
from urllib.parse import unquote
from core.feature_flags import flag_set

TASKS = 'tasks:'
logger = logging.getLogger(__name__)


class DataManagerException(Exception):
    pass


def get_all_columns(project, *_):
    """ Make columns info for the frontend data manager
    """
    result = {'columns': []}

    # frontend uses MST data model, so we need two directional referencing parent <-> child
    task_data_children = []
    i = 0

    data_types = OrderedDict()

    # add data types from config again
    project_data_types = {}
    for key, value in project.data_types.items():
        # skip keys from Repeater tag, because we already have its base data,
        # e.g.: skip 'image[{{idx}}]' because we have 'image' list already
        if '[' not in key:
            project_data_types[key] = value
    data_types.update(project_data_types.items())

    # all data types from import data
    all_data_columns = project.summary.all_data_columns
    if all_data_columns:
        data_types.update({key: 'Unknown' for key in all_data_columns if key not in data_types})

    # remove $undefined$ if there is one type at least in labeling config, because it will be resolved automatically
    if len(project_data_types) > 0:
        data_types.pop(settings.DATA_UNDEFINED_NAME, None)

    for key, data_type in list(data_types.items()):  # make data types from labeling config first
        column = {
            'id': key,
            'title': key if key != settings.DATA_UNDEFINED_NAME else 'data',
            'type': data_type if data_type in ['Image', 'Audio', 'AudioPlus', 'Video', 'Unknown'] else 'String',
            'target': 'tasks',
            'parent': 'data',
            'visibility_defaults': {
                'explore': True,
                'labeling': key in project_data_types or key == settings.DATA_UNDEFINED_NAME
            }
        }
        result['columns'].append(column)
        task_data_children.append(column['id'])
        i += 1

    # --- Data root ---
    data_root = {
        'id': 'data',
        'title': "data",
        'type': "List",
        'target': 'tasks',
        'children': task_data_children
    }

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
        }
    ]

    if flag_set('ff_back_2070_inner_id_12052022_short', user=project.organization.created_by):
        result['columns'] += [{
            'id': 'inner_id',
            'title': "Inner ID",
            'type': 'Number',
            'help': 'Internal task ID starting from 1 for the current project',
            'target': 'tasks',
            'visibility_defaults': {
                'explore': False,
                'labeling': False
            }
        }]

    result['columns'] += [
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
            'id': 'annotators',
            'title': 'Annotated by',
            'type': 'List',
            'target': 'tasks',
            'help': 'All users who completed the task',
            'schema': {'items': project.organization.members.values_list('user__id', flat=True)},
            'visibility_defaults': {
                'explore': True,
                'labeling': False
            }
        },
        {
            'id': 'annotations_results',
            'title': "Annotation results",
            'type': "String",
            'target': 'tasks',
            'help': 'Annotation results stacked over all annotations',
            'visibility_defaults': {
                'explore': False,
                'labeling': False
            }
        },
        {
            'id': 'annotations_ids',
            'title': "Annotation IDs",
            'type': "String",
            'target': 'tasks',
            'help': 'Annotation IDs stacked over all annotations',
            'visibility_defaults': {
                'explore': False,
                'labeling': False
            }
        },
        {
            'id': 'predictions_score',
            'title': "Prediction score",
            'type': "Number",
            'target': 'tasks',
            'help': 'Average prediction score over all task predictions',
            'visibility_defaults': {
                'explore': False,
                'labeling': False
            }
        },
        {
            'id': 'predictions_model_versions',
            'title': "Prediction model versions",
            'type': 'List',
            'target': 'tasks',
            'help': 'Model versions aggregated over all predictions',
            'schema': {'items': project.get_model_versions()},
            'visibility_defaults': {
                'explore': False,
                'labeling': False
            }
        },
        {
            'id': 'predictions_results',
            'title': "Prediction results",
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
            'title': "Upload filename",
            'type': "String",
            'target': 'tasks',
            'help': 'Filename of uploaded file',
            'visibility_defaults': {
                'explore': False,
                'labeling': False
            }
        },
        {
            'id': 'storage_filename',
            'title': "Storage filename",
            'type': "String",
            'target': 'tasks',
            'help': 'Filename from import storage',
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
            'id': 'updated_at',
            'title': 'Updated at',
            'type': 'Datetime',
            'target': 'tasks',
            'help': 'Task update time',
            'visibility_defaults': {
                'explore': False,
                'labeling': False
            }
        },
        {
            'id': 'updated_by',
            'title': 'Updated by',
            'type': 'List',
            'target': 'tasks',
            'help': 'User who did the last task update',
            'schema': {'items': project.organization.members.values_list('user__id', flat=True)},
            'visibility_defaults': {
                'explore': False,
                'labeling': False
            }
        },
        {
            'id': 'avg_lead_time',
            'title': "Lead Time",
            'type': 'Number',
            'help': 'Average lead time over all annotations (seconds)',
            'target': 'tasks',
            'visibility_defaults': {
                'explore': False,
                'labeling': False
            }
        }
    ]

    result['columns'].append(data_root)

    return result


def get_prepare_params(request, project):
    """ This function extract prepare_params from
        * view_id if it's inside of request data
        * selectedItems, filters, ordering if they are in request and there is no view id
    """
    # use filters and selected items from view
    view_id = int_from_request(request.GET, 'view', 0) or int_from_request(request.data, 'view', 0)
    if view_id > 0:
        view = get_object_or_404(View, pk=view_id)
        if view.project.pk != project.pk:
            raise DataManagerException('Project and View mismatch')
        prepare_params = view.get_prepare_tasks_params(add_selected_items=True)
        prepare_params.request = request

    # use filters and selected items from request if it's specified
    else:
        # query arguments from url
        if 'query' in request.GET:
            data = json.loads(unquote(request.GET['query']))
        # data payload from body
        else:
            data = request.data

        selected = data.get('selectedItems', {"all": True, "excluded": []})
        if not isinstance(selected, dict):
            raise DataManagerException('selectedItems must be dict: {"all": [true|false], '
                                       '"excluded | included": [...task_ids...]}')
        filters = data.get('filters', None)
        ordering = data.get('ordering', [])
        prepare_params = PrepareParams(project=project.id, selectedItems=selected, data=data,
                                       filters=filters, ordering=ordering, request=request)
    return prepare_params


def get_prepared_queryset(request, project):
    prepare_params = get_prepare_params(request, project)
    queryset = Task.prepared.only_filtered(prepare_params=prepare_params)
    return queryset


def evaluate_predictions(tasks):
    """ Call ML backend for prediction evaluation of the task queryset
    """
    if not tasks:
        return

    project = tasks[0].project

    for ml_backend in project.ml_backends.all():
        # tasks = tasks.filter(~Q(predictions__model_version=ml_backend.model_version))
        ml_backend.predict_tasks(tasks)


def filters_ordering_selected_items_exist(data):
    return data.get('filters') or data.get('ordering') or data.get('selectedItems')


def custom_filter_expressions(*args, **kwargs):
    pass


def preprocess_filter(_filter, *_):
    return _filter


def preprocess_field_name(raw_field_name, only_undefined_field=False):
    field_name = raw_field_name.replace("filter:", "")
    field_name = field_name.replace("tasks:", "")
    ascending = False if field_name[0] == '-' else True  # detect direction
    field_name = field_name[1:] if field_name[0] == '-' else field_name  # remove direction
    if field_name.startswith("data."):
        if only_undefined_field:
            field_name = f'data__{settings.DATA_UNDEFINED_NAME}'
        else:
            field_name = field_name.replace("data.", "data__")
    return field_name, ascending
