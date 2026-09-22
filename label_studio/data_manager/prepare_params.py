"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license."""

from enum import Enum
from typing import Any, List, Optional, Union

from django.conf import settings
from pydantic import BaseModel, Field, StrictBool, StrictFloat, StrictInt, StrictStr, field_validator, model_validator
from rest_framework.exceptions import ValidationError as APIValidationError


def _strip_dm_column_prefixes(column: str) -> str:
    """Normalize the way preprocess_field_name() does, so the check sees what the ORM would."""
    column_copy = column
    if column_copy.startswith('-'):
        column_copy = column_copy[1:]
    for prefix in ('filter:', 'tasks:'):
        if column_copy.startswith(prefix):
            column_copy = column_copy[len(prefix) :]
    if column_copy.startswith('-'):
        column_copy = column_copy[1:]
    return column_copy


def _reject_fk_traversal(column: str, normalized: str) -> str:
    """Shared CVE-2023-47117 policy: no `__` outside task.data and the allowlist."""
    # task.data JSONField lookups are not relation traversals
    if normalized.startswith('data.'):
        return column
    if normalized in settings.DATA_MANAGER_FILTER_ALLOWLIST:
        return column
    if '__' in normalized:
        raise APIValidationError(
            f'"__" is not generally allowed in filters. Consider asking your administrator to add '
            f'"{normalized}" to DATA_MANAGER_FILTER_ALLOWLIST, but note that some filter expressions '
            'may pose a security risk'
        )
    return column


def validate_filter_column_no_fk_traversal(column: str) -> str:
    """Guard inline filter columns, where FilterSerializer.validate_column never runs."""
    # apply_filters() drops every other name before it can become an ORM lookup,
    # so those must keep being ignored, not 400'd
    if not column.startswith('filter:tasks:'):
        return column
    return _reject_fk_traversal(column, _strip_dm_column_prefixes(column))


def validate_ordering_column_no_fk_traversal(column: str) -> str:
    """Guard inline ordering columns: apply_ordering() feeds every one into F(), no prefix gate."""
    return _reject_fk_traversal(column, _strip_dm_column_prefixes(column))


class FilterIn(BaseModel):
    min: Union[StrictInt, StrictFloat, StrictStr]
    max: Union[StrictInt, StrictFloat, StrictStr]


class Filter(BaseModel):
    child_filters: List['Filter'] = Field(default_factory=list)

    filter: str
    operator: str
    type: str
    value: Union[StrictInt, StrictFloat, StrictBool, StrictStr, FilterIn, list]

    @model_validator(mode='before')
    @classmethod
    def normalize_child_filters(cls, data):
        """Normalize the legacy singular child into the canonical ordered list."""
        if not isinstance(data, dict):
            return data

        normalized = dict(data)
        if 'child_filters' in normalized:
            # The canonical plural field wins deterministically when both are supplied.
            normalized.pop('child_filter', None)
        elif 'child_filter' in normalized:
            child_filter = normalized.pop('child_filter')
            normalized['child_filters'] = [] if child_filter is None else [child_filter]
        return normalized

    @field_validator('filter')
    @classmethod
    def check_filter_column_traversal(cls, column: str) -> str:
        return validate_filter_column_no_fk_traversal(column)

    @property
    def child_filter(self) -> Optional['Filter']:
        """Compatibility accessor for callers that still consume one child."""
        return self.child_filters[0] if self.child_filters else None

    @child_filter.setter
    def child_filter(self, value: Optional['Filter']) -> None:
        self.child_filters = [] if value is None else [value]


class ConjunctionEnum(Enum):
    OR = 'or'
    AND = 'and'


class Filters(BaseModel):
    conjunction: ConjunctionEnum
    items: List[Filter]

    @model_validator(mode='after')
    def validate_one_nesting_level(self):
        for item in self.items:
            if any(child.child_filters for child in item.child_filters):
                raise ValueError('Child filters cannot contain nested child filters')
        return self


class SelectedItems(BaseModel):
    all: bool
    included: List[int] = []
    excluded: List[int] = []


class PrepareParams(BaseModel):
    project: Union[int, List[int]]  # Support both single project and multiple projects
    ordering: List[str] = []
    selectedItems: Optional[SelectedItems] = None
    filters: Optional[Filters] = None
    data: Optional[dict] = None
    request: Optional[Any] = None

    @field_validator('ordering')
    @classmethod
    def check_ordering_traversal(cls, ordering: List[str]) -> List[str]:
        for column in ordering:
            validate_ordering_column_no_fk_traversal(column)
        return ordering

    @property
    def projects(self) -> List[int]:
        """Get project IDs as a list, whether single or multiple were provided."""
        if isinstance(self.project, list):
            return self.project
        return [self.project]

    @property
    def is_multi_project(self) -> bool:
        """Check if this PrepareParams includes multiple projects."""
        return isinstance(self.project, list) and len(self.project) > 1


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
    IS_ANY_OF = (
        'in_list',
        'Field value is one of the items in the supplied list. Value must be a JSON array of strings or '
        'numbers, e.g. `[1, 2, 3]` or `["a", "b"]`. Supported only for Task ID, Inner ID, and `task.data.*` '
        'fields.',
    )
    IS_NONE_OF = (
        'not_in_list',
        'Field value is NOT in the supplied list. Value must be a JSON array of strings or numbers. '
        'Supported only for Task ID, Inner ID, and `task.data.*` fields.',
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
filters_schema = {
    'type': 'object',
    'properties': {
        'conjunction': {
            'type': 'string',
            'enum': ['or', 'and'],
            'description': (
                'Logical conjunction for the filters. This conjunction (either "or" or "and") '
                'will be applied to all items in the filters list. It is not possible to combine '
                '"or" and "and" within one list of filters. All filters will be either combined with "or" '
                'or with "and", but not a mix of both.'
            ),
        },
        'items': {
            'type': 'array',
            'items': {
                'type': 'object',
                'properties': {
                    'filter': {
                        'type': 'string',
                        'enum': Column.enums_for_filters(),
                        'description': (
                            'Filter identifier, it should start with `filter:tasks:` prefix, '
                            'e.g. `filter:tasks:agreement`. '
                            'For `task.data` fields it may look like `filter:tasks:data.field_name`. '
                            'If you need more info about columns, check the '
                            '[Get data manager columns](api:GET/api/dm/columns/) API endpoint. '
                            'Possible values:<br>'
                            + '<br>'.join(
                                [
                                    f'<li>`{key}`<br> {desc}</li>'
                                    for key, desc in Column.descriptions_for_filters().items()
                                ]
                            )
                        ),
                    },
                    'operator': {
                        'type': 'string',
                        'enum': Operator.enums(),
                        'description': (
                            'Filter operator. Possible values:<br>'
                            + '<br>'.join(
                                [f'<li>`{key}`<br> {desc}</li>' for key, desc in Operator.descriptions().items()]
                            )
                        ),
                    },
                    'type': {
                        'type': 'string',
                        'description': 'Type of the filter value. Possible values:<br>'
                        + '<br>'.join([f'<li>`{key}`<br> {desc}</li>' for key, desc in Type.descriptions().items()]),
                    },
                    'value': {
                        'type': 'object',
                        'oneOf': [
                            {'type': 'string', 'title': 'String', 'description': 'String'},
                            {'type': 'integer', 'title': 'Integer', 'description': 'Integer'},
                            {'type': 'number', 'title': 'Float', 'format': 'float', 'description': 'Float'},
                            {'type': 'boolean', 'title': 'Boolean', 'description': 'Boolean'},
                            {
                                'type': 'object',
                                'title': 'Dictionary',
                                'description': 'Dictionary is used for some operator types, e.g. `in` and `not_in`',
                            },
                            {
                                'type': 'object',
                                'title': 'List',
                                'description': (
                                    'List of strings or integers. Used by the `in_list` and `not_in_list` '
                                    'operators, e.g. `[1, 2, 3]` or `["a", "b"]`.'
                                ),
                            },
                        ],
                        'description': 'Value to filter by',
                    },
                },
                'required': ['filter', 'operator', 'type', 'value'],
                'example': example_request_1['filters']['items'][0],
            },
            'description': 'List of filter items',
        },
    },
    'required': ['conjunction', 'items'],
    'description': (
        'Filters to apply on tasks. '
        'You can use [the helper class `Filters` from this page](https://labelstud.io/sdk/data_manager.html) '
        'to create Data Manager Filters.<br>'
        'Example: `{"conjunction": "or", "items": [{"filter": "filter:tasks:completed_at", "operator": "greater", '
        '"type": "Datetime", "value": "2021-01-01T00:00:00.000Z"}]}`'
    ),
}

# Keep the public schema canonical and explicitly limit children to one nesting level.
_filter_item_schema = filters_schema['properties']['items']['items']
_child_filter_item_schema = {
    'type': 'object',
    'properties': dict(_filter_item_schema['properties']),
    'required': list(_filter_item_schema['required']),
}
_filter_item_schema['properties']['child_filters'] = {
    'type': 'array',
    'items': _child_filter_item_schema,
    'description': 'Ordered child filters AND-merged with their parent. Child filters cannot be nested.',
}

selected_items_schema = {
    'type': 'object',
    'required': ['all'],
    'description': 'Task selection by IDs. If filters are applied, the selection will be applied to the filtered tasks.'
    'If "all" is `false`, `"included"` must be used. If "all" is `true`, `"excluded"` must be used.<br>'
    'Examples: `{"all": false, "included": [1, 2, 3]}` or `{"all": true, "excluded": [4, 5]}`',
    'oneOf': [
        {
            'title': 'all: false',
            'type': 'object',
            'properties': {
                'all': {'type': 'boolean', 'enum': [False], 'description': 'No tasks are selected'},
                'included': {
                    'type': 'array',
                    'items': {'type': 'integer'},
                    'description': 'List of included task IDs',
                },
            },
            'required': ['all'],
        },
        {
            'title': 'all: true',
            'type': 'object',
            'properties': {
                'all': {'type': 'boolean', 'enum': [True], 'description': 'All tasks are selected'},
                'excluded': {
                    'type': 'array',
                    'items': {'type': 'integer'},
                    'description': 'List of excluded task IDs',
                },
            },
            'required': ['all'],
        },
    ],
}

# Define ordering schema
ordering_schema = {
    'type': 'array',
    'items': {
        'type': 'string',
        'enum': Column.enums_for_ordering(),
    },
    'description': 'List of fields to order by. Fields are similar to filters but without the `filter:` prefix. '
    'To reverse the order, add a minus sign before the field name, e.g. `-tasks:created_at`.',
}

# Define the main schema for the data payload
data_schema = {
    'type': 'object',
    'properties': {'filters': filters_schema, 'selectedItems': selected_items_schema, 'ordering': ordering_schema},
    'description': 'Additional query to filter and order tasks',
}

prepare_params_schema = {
    'type': 'object',
    'properties': {'filters': filters_schema, 'selectedItems': selected_items_schema, 'ordering': ordering_schema},
    'description': 'Data payload containing task filters, selected task items, and ordering',
    'example': example_request_1,
}
