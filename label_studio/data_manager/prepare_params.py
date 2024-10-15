"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
from enum import Enum
from typing import Any, List, Optional, Union

from drf_yasg import openapi
from pydantic import BaseModel, StrictBool, StrictFloat, StrictInt, StrictStr


class FilterIn(BaseModel):
    min: Union[StrictInt, StrictFloat, StrictStr]
    max: Union[StrictInt, StrictFloat, StrictStr]


class Filter(BaseModel):
    filter: str
    operator: str
    type: str
    value: Union[StrictInt, StrictFloat, StrictBool, StrictStr, FilterIn, list]


class ConjunctionEnum(Enum):
    OR = 'or'
    AND = 'and'


class Filters(BaseModel):
    conjunction: ConjunctionEnum
    items: List[Filter]


class SelectedItems(BaseModel):
    all: bool
    included: List[int] = []
    excluded: List[int] = []


class PrepareParams(BaseModel):
    project: int
    ordering: List[str] = []
    selectedItems: Optional[SelectedItems] = None
    filters: Optional[Filters] = None
    data: Optional[dict] = None
    request: Optional[Any] = None


class CustomEnum(Enum):
    def __init__(self, value, description):
        self._value_ = value
        self.description = description

    @classmethod
    def enums(cls):
        return sorted([item.value for item in cls])

    @classmethod
    def descriptions(cls):
        return {item.value: item.description for item in sorted(cls, key=lambda x: x.value)}


class Column(Enum):
    ID = 'id', 'Number', 'Task ID'
    INNER_ID = 'inner_id', 'Number', 'Task Inner ID, it starts from 1 for all projects'
    GROUND_TRUTH = 'ground_truth', 'Boolean', 'Ground truth status of the tasks'
    ANNOTATIONS_RESULTS = 'annotations_results', 'String', 'Annotation results for the tasks'
    REVIEWED = 'reviewed', 'Boolean', 'Whether the tasks have been reviewed (Enterprise only)'
    PREDICTIONS_SCORE = 'predictions_score', 'Number', 'Prediction score for the task'
    PREDICTIONS_MODEL_VERSIONS = 'predictions_model_versions', 'String', 'Model version used for the predictions'
    PREDICTIONS_RESULTS = 'predictions_results', 'String', 'Prediction results for the tasks'
    FILE_UPLOAD = 'file_upload', 'String', 'Name of the file uploaded to create the tasks'
    CREATED_AT = 'created_at', 'Datetime', 'Time the task was created at'
    UPDATED_AT = (
        'updated_at',
        'Datetime',
        'Time the task was updated at (e.g. new annotation was created, review added, etc)',
    )
    ANNOTATORS = (
        'annotators',
        'List',
        'Annotators that completed the task (Community). Can include assigned annotators (Enterprise only). '
        'Important note: the filter `type` should be List, but the filter `value` is integer',
    )
    TOTAL_PREDICTIONS = 'total_predictions', 'Number', 'Total number of predictions for the task'
    CANCELLED_ANNOTATIONS = (
        'cancelled_annotations',
        'Number',
        'Number of cancelled or skipped annotations for the task',
    )
    TOTAL_ANNOTATIONS = 'total_annotations', 'Number', 'Total number of annotations on a task'
    COMPLETED_AT = 'completed_at', 'Datetime', 'Time when a task was fully annotated'
    AGREEMENT = 'agreement', 'Number', 'Agreement for annotation results for a specific task (Enterprise only)'
    REVIEWERS = (
        'reviewers',
        'String',
        'Reviewers that reviewed the task, or assigned reviewers (Enterprise only). '
        'Important note: the filter `type` should be List, but the filter `value` is integer',
    )
    REVIEWS_REJECTED = (
        'reviews_rejected',
        'Number',
        'Number of annotations rejected for a task in review (Enterprise only)',
    )
    REVIEWS_ACCEPTED = (
        'reviews_accepted',
        'Number',
        'Number of annotations accepted for a task in review (Enterprise only)',
    )
    COMMENTS = 'comments', 'Number', 'Number of comments in a task'
    UNRESOLVED_COMMENT_COUNT = 'unresolved_comment_count', 'Number', 'Number of unresolved comments in a task'

    def __init__(self, value, value_type, description):
        self._value_ = value
        self.type = value_type
        self.description = description

    @classmethod
    def enums_for_filters(cls):
        return sorted(['filter:tasks:' + str(item.value) for item in cls])

    @classmethod
    def enums_for_ordering(cls):
        return sorted([('tasks:' + str(item.value)) for item in cls])

    @classmethod
    def descriptions_for_filters(cls):
        return {
            'filter:tasks:' + item.value: f'({item.type}) ' + item.description
            for item in sorted(cls, key=lambda x: x.value)
        }


class Operator(CustomEnum):
    EQUAL = 'equal', 'Equal to'
    NOT_EQUAL = 'not_equal', 'Not equal to'
    GREATER = 'greater', 'Greater than'
    GREATER_OR_EQUAL = 'greater_or_equal', 'Greater than or equal to'
    LESS = 'less', 'Less than'
    LESS_OR_EQUAL = 'less_or_equal', 'Less than or equal to'
    CONTAINS = 'contains', 'Contains'
    NOT_CONTAINS = 'not_contains', 'Does not contain'
    EXISTS = 'exists', 'Exists'
    NOT_EXISTS = 'not_exists', 'Does not exist'
    STARTS_WITH = 'starts_with', 'Starts with'
    ENDS_WITH = 'ends_with', 'Ends with'
    IS_BETWEEN = 'in', 'Is between min and max values, so the filter `value` should be e.g. `{"min": 1, "max": 7}`'
    NOT_BETWEEN = (
        'not_in',
        'Is not between min and max values, so the filter `value` should be e.g. `{"min": 1, "max": 7}`',
    )


class Type(CustomEnum):
    Number = 'Number', 'Float or Integer'
    Datetime = 'Datetime', "Datetime string in `strftime('%Y-%m-%dT%H:%M:%S.%fZ')` format"
    Boolean = 'Boolean', 'Boolean'
    String = 'String', 'String'
    List = 'List', 'List of items'
    Unknown = 'Unknown', 'Unknown is explicitly converted to string format'


# Example request and response
example_request_1 = {
    'filters': {
        'conjunction': 'or',
        'items': [{'filter': 'filter:tasks:id', 'operator': 'greater', 'type': 'Number', 'value': 123}],
    },
    'selectedItems': {'all': True, 'excluded': [124, 125, 126]},
    'ordering': ['tasks:total_annotations'],
}

example_request_2 = {
    'filters': {
        'conjunction': 'or',
        'items': [
            {
                'filter': 'filter:tasks:completed_at',
                'operator': 'in',
                'type': 'Datetime',
                'value': {'min': '2021-01-01T00:00:00.000Z', 'max': '2025-01-01T00:00:00.000Z'},
            }
        ],
    },
    'selectedItems': {'all': False, 'included': [1, 2, 3]},
    'ordering': ['-tasks:completed_at'],
}

# Define the schemas for filters and selectedItems
filters_schema = openapi.Schema(
    type=openapi.TYPE_OBJECT,
    properties={
        'conjunction': openapi.Schema(
            type=openapi.TYPE_STRING,
            enum=['or', 'and'],
            description=(
                'Logical conjunction for the filters. This conjunction (either "or" or "and") '
                'will be applied to all items in the filters list. It is not possible to combine '
                '"or" and "and" within one list of filters. All filters will be either combined with "or" '
                'or with "and", but not a mix of both.'
            ),
        ),
        'items': openapi.Schema(
            type=openapi.TYPE_ARRAY,
            items=openapi.Schema(
                type=openapi.TYPE_OBJECT,
                properties={
                    'filter': openapi.Schema(
                        type=openapi.TYPE_STRING,
                        enum=Column.enums_for_filters(),
                        description=(
                            'Filter identifier, it should start with `filter:tasks:` prefix, '
                            'e.g. `filter:tasks:agreement`. '
                            'For `task.data` fields it may look like `filter:tasks:data.field_name`. '
                            'If you need more info about columns, check the '
                            '[Get data manager columns](#tag/Data-Manager/operation/api_dm_columns_list) API endpoint. '
                            'Possible values:<br>'
                            + '<br>'.join(
                                [
                                    f'<li>`{key}`<br> {desc}</li>'
                                    for key, desc in Column.descriptions_for_filters().items()
                                ]
                            )
                        ),
                    ),
                    'operator': openapi.Schema(
                        type=openapi.TYPE_STRING,
                        enum=Operator.enums(),
                        description=(
                            'Filter operator. Possible values:<br>'
                            + '<br>'.join(
                                [f'<li>`{key}`<br> {desc}</li>' for key, desc in Operator.descriptions().items()]
                            )
                        ),
                    ),
                    'type': openapi.Schema(
                        type=openapi.TYPE_STRING,
                        description='Type of the filter value. Possible values:<br>'
                        + '<br>'.join([f'<li>`{key}`<br> {desc}</li>' for key, desc in Type.descriptions().items()]),
                    ),
                    'value': openapi.Schema(
                        type=openapi.TYPE_OBJECT,
                        oneOf=[
                            openapi.Schema(type=openapi.TYPE_STRING, title='String', description='String'),
                            openapi.Schema(type=openapi.TYPE_INTEGER, title='Integer', description='Integer'),
                            openapi.Schema(
                                type=openapi.TYPE_NUMBER, title='Float', format='float', description='Float'
                            ),
                            openapi.Schema(type=openapi.TYPE_BOOLEAN, title='Boolean', description='Boolean'),
                            openapi.Schema(
                                type=openapi.TYPE_OBJECT,
                                title='Dictionary',
                                description='Dictionary is used for some operator types, e.g. `in` and `not_in`',
                            ),
                            openapi.Schema(
                                type=openapi.TYPE_OBJECT,
                                title='List',
                                description='List of strings or integers',
                            ),
                        ],
                        description='Value to filter by',
                    ),
                },
                required=['filter', 'operator', 'type', 'value'],
                example=example_request_1['filters']['items'][0],
            ),
            description='List of filter items',
        ),
    },
    required=['conjunction', 'items'],
    description=(
        'Filters to apply on tasks. '
        'You can use [the helper class `Filters` from this page](https://labelstud.io/sdk/data_manager.html) '
        'to create Data Manager Filters.<br>'
        'Example: `{"conjunction": "or", "items": [{"filter": "filter:tasks:completed_at", "operator": "greater", '
        '"type": "Datetime", "value": "2021-01-01T00:00:00.000Z"}]}`'
    ),
)

selected_items_schema = openapi.Schema(
    type=openapi.TYPE_OBJECT,
    required=['all'],
    description='Task selection by IDs. If filters are applied, the selection will be applied to the filtered tasks.'
    'If "all" is `false`, `"included"` must be used. If "all" is `true`, `"excluded"` must be used.<br>'
    'Examples: `{"all": false, "included": [1, 2, 3]}` or `{"all": true, "excluded": [4, 5]}`',
    oneOf=[
        openapi.Schema(
            title='all: false',
            type=openapi.TYPE_OBJECT,
            properties={
                'all': openapi.Schema(type=openapi.TYPE_BOOLEAN, enum=[False], description='No tasks are selected'),
                'included': openapi.Schema(
                    type=openapi.TYPE_ARRAY,
                    items=openapi.Schema(type=openapi.TYPE_INTEGER),
                    description='List of included task IDs',
                ),
            },
            required=['all'],
        ),
        openapi.Schema(
            title='all: true',
            type=openapi.TYPE_OBJECT,
            properties={
                'all': openapi.Schema(type=openapi.TYPE_BOOLEAN, enum=[True], description='All tasks are selected'),
                'excluded': openapi.Schema(
                    type=openapi.TYPE_ARRAY,
                    items=openapi.Schema(type=openapi.TYPE_INTEGER),
                    description='List of excluded task IDs',
                ),
            },
            required=['all'],
        ),
    ],
)

# Define ordering schema
ordering_schema = openapi.Schema(
    type=openapi.TYPE_ARRAY,
    items=openapi.Schema(
        type=openapi.TYPE_STRING,
        enum=Column.enums_for_ordering(),
    ),
    description='List of fields to order by. Fields are similar to filters but without the `filter:` prefix. '
    'To reverse the order, add a minus sign before the field name, e.g. `-tasks:created_at`.',
)

# Define the main schema for the data payload
data_schema = openapi.Schema(
    type=openapi.TYPE_OBJECT,
    properties={'filters': filters_schema, 'selectedItems': selected_items_schema, 'ordering': ordering_schema},
    description='Additional query to filter and order tasks',
)

prepare_params_schema = openapi.Schema(
    type=openapi.TYPE_OBJECT,
    properties={'filters': filters_schema, 'selectedItems': selected_items_schema, 'ordering': ordering_schema},
    description='Data payload containing task filters, selected task items, and ordering',
    example=example_request_1,
)
