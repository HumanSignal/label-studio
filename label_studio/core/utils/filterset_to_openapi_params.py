"""
Utility functions to translate Django FilterSet objects into OpenAPI parameter objects.

This module provides functions to convert django-filter FilterSet classes into OpenAPI parameters
for use with extend_schema decorators.
"""

from typing import Any, List, Optional, Type

from django_filters import FilterSet
from django_filters.filters import (
    AllValuesFilter,
    AllValuesMultipleFilter,
    BaseInFilter,
    BooleanFilter,
    ChoiceFilter,
    DateFilter,
    DateFromToRangeFilter,
    DateTimeFilter,
    DateTimeFromToRangeFilter,
    LookupChoiceFilter,
    ModelChoiceFilter,
    ModelMultipleChoiceFilter,
    MultipleChoiceFilter,
    NumberFilter,
    NumericRangeFilter,
    RangeFilter,
    TimeFilter,
    TimeRangeFilter,
    TypedChoiceFilter,
    TypedMultipleChoiceFilter,
    UUIDFilter,
)
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiParameter
from rest_framework.filters import OrderingFilter, SearchFilter


def filterset_to_openapi_params(
    filterset_class: Type[FilterSet],
    location: str = 'query',
    exclude_fields: Optional[List[str]] = None,
    field_overrides: Optional[dict] = None,
) -> List[OpenApiParameter]:
    """
    Convert a Django FilterSet class into a list of OpenAPI parameter objects.

    Args:
        filterset_class: The FilterSet class to convert
        location: The parameter location ('query', 'path', 'header', 'cookie')
        exclude_fields: List of field names to exclude from the parameters
        field_overrides: Dictionary to override specific field configurations
                        Format: {'field_name': {'type': OpenApiTypes.STR, 'description': 'Custom desc'}}

    Returns:
        List of OpenApiParameter objects ready for use with extend_schema

    Example:
        from label_studio.projects.api import ProjectFilterSet

        parameters = filterset_to_openapi_params(
            ProjectFilterSet,
            location='query',
            field_overrides={
                'title': {
                    'description': 'Filter projects by title (case-insensitive contains)'
                }
            }
        )

        @extend_schema(parameters=parameters)
        def my_view(request):
            pass
    """
    if exclude_fields is None:
        exclude_fields = []

    if field_overrides is None:
        field_overrides = {}

    parameters = []

    # Access declared filters directly from the class to avoid instantiation issues
    declared_filters = filterset_class.declared_filters

    for field_name, filter_field in declared_filters.items():
        if field_name in exclude_fields:
            continue

        # Get field configuration
        config = _get_filter_config(filter_field, field_overrides.get(field_name, {}))

        # Create OpenApiParameter
        param = OpenApiParameter(
            name=field_name,
            type=config['type'],
            location=location,
            required=config['required'],
            description=config['description'],
            enum=config.get('enum'),
            **config.get('extra_kwargs', {}),
        )

        parameters.append(param)

    return parameters


def _get_filter_config(filter_field: Any, overrides: dict) -> dict:
    """
    Extract configuration for a filter field to create an OpenAPI parameter.

    Args:
        filter_field: The django-filter field instance
        overrides: Any field-specific overrides

    Returns:
        Dictionary with OpenAPI parameter configuration
    """
    # Start with base configuration
    config = {
        'type': _map_filter_type(filter_field),
        'required': getattr(filter_field, 'required', False),
        'description': _get_filter_description(filter_field),
        'extra_kwargs': {},
    }

    # Apply overrides
    config.update(overrides)

    # Handle special filter types
    if isinstance(filter_field, (ChoiceFilter, TypedChoiceFilter)):
        config['enum'] = _get_choice_enum(filter_field)

    elif isinstance(filter_field, (MultipleChoiceFilter, TypedMultipleChoiceFilter, AllValuesMultipleFilter)):
        config['type'] = OpenApiTypes.STR
        if hasattr(filter_field, 'choices') and filter_field.choices:
            config['extra_kwargs']['items']['enum'] = _get_choice_enum(filter_field)

    elif isinstance(filter_field, BaseInFilter):
        config['type'] = OpenApiTypes.STR
        config['description'] = config.get('description', '') + ' (comma-separated values)'

    elif isinstance(
        filter_field,
        (DateFromToRangeFilter, DateTimeFromToRangeFilter, TimeRangeFilter, NumericRangeFilter, RangeFilter),
    ):
        config['type'] = OpenApiTypes.OBJECT
        config['description'] = config.get('description', '') + ' (range filter with min/max values)'
        config['extra_kwargs']['properties'] = {
            'min': {'type': _map_filter_type(filter_field)},
            'max': {'type': _map_filter_type(filter_field)},
        }

    elif isinstance(filter_field, (OrderingFilter, SearchFilter)):
        config['type'] = OpenApiTypes.STR
        if isinstance(filter_field, OrderingFilter):
            config['description'] = config.get('description', '') + ' (ordering fields)'
        else:
            config['description'] = config.get('description', '') + ' (search term)'

    elif isinstance(filter_field, (ModelChoiceFilter, ModelMultipleChoiceFilter)):
        config['type'] = OpenApiTypes.INT if isinstance(filter_field, ModelChoiceFilter) else OpenApiTypes.STR
        if isinstance(filter_field, ModelMultipleChoiceFilter):
            config['extra_kwargs']['items'] = {'type': OpenApiTypes.INT}

    elif isinstance(filter_field, AllValuesFilter):
        config['type'] = OpenApiTypes.STR
        config['description'] = config.get('description', '') + ' (exact match)'

    return config


def _map_filter_type(filter_field: Any) -> str:
    """
    Map django-filter field types to OpenAPI types.

    Args:
        filter_field: The django-filter field instance

    Returns:
        OpenAPI type string
    """
    # Handle specific filter types first
    if isinstance(filter_field, (BooleanFilter, LookupChoiceFilter)):
        return OpenApiTypes.BOOL

    elif isinstance(filter_field, (NumberFilter, NumericRangeFilter, RangeFilter)):
        return OpenApiTypes.NUMBER

    elif isinstance(filter_field, (DateFilter, DateFromToRangeFilter)):
        return OpenApiTypes.STR  # Date as string with format

    elif isinstance(filter_field, (DateTimeFilter, DateTimeFromToRangeFilter)):
        return OpenApiTypes.STR  # DateTime as string with format

    elif isinstance(filter_field, TimeFilter):
        return OpenApiTypes.STR  # Time as string with format

    elif isinstance(filter_field, UUIDFilter):
        return OpenApiTypes.STR  # UUID as string with format

    elif isinstance(filter_field, (ModelChoiceFilter, ModelMultipleChoiceFilter)):
        return OpenApiTypes.INT  # Model choice as integer ID

    elif isinstance(
        filter_field, (MultipleChoiceFilter, TypedMultipleChoiceFilter, AllValuesMultipleFilter, BaseInFilter)
    ):
        return OpenApiTypes.STR

    elif isinstance(
        filter_field,
        (DateFromToRangeFilter, DateTimeFromToRangeFilter, TimeRangeFilter, NumericRangeFilter, RangeFilter),
    ):
        return OpenApiTypes.OBJECT

    else:
        # Default to string for most other field types (CharFilter, etc.)
        return OpenApiTypes.STR


def _get_filter_description(filter_field: Any) -> str:
    """
    Extract description from a filter field.

    Args:
        filter_field: The django-filter field instance

    Returns:
        Field description or empty string
    """
    # Check for help_text first
    if hasattr(filter_field, 'help_text') and filter_field.help_text:
        return str(filter_field.help_text)

    # Check for label
    if hasattr(filter_field, 'label') and filter_field.label:
        return str(filter_field.label)

    # Generate description based on field type and lookup
    lookup_expr = getattr(filter_field, 'lookup_expr', None)
    field_name = getattr(filter_field, 'field_name', 'field')

    if lookup_expr:
        lookup_descriptions = {
            'exact': 'exact match',
            'iexact': 'exact match (case-insensitive)',
            'contains': 'contains',
            'icontains': 'contains (case-insensitive)',
            'startswith': 'starts with',
            'istartswith': 'starts with (case-insensitive)',
            'endswith': 'ends with',
            'iendswith': 'ends with (case-insensitive)',
            'regex': 'regular expression match',
            'iregex': 'regular expression match (case-insensitive)',
            'gt': 'greater than',
            'gte': 'greater than or equal to',
            'lt': 'less than',
            'lte': 'less than or equal to',
            'in': 'in list',
            'range': 'in range',
            'date': 'date',
            'year': 'year',
            'month': 'month',
            'day': 'day',
            'week': 'week',
            'week_day': 'week day',
            'time': 'time',
            'hour': 'hour',
            'minute': 'minute',
            'second': 'second',
            'isnull': 'is null',
            'search': 'search',
        }

        lookup_desc = lookup_descriptions.get(lookup_expr, f'filter by {lookup_expr}')
        return f'Filter {field_name} by {lookup_desc}'

    return f'Filter by {field_name}'


def _get_choice_enum(filter_field: Any) -> List[str]:
    """
    Extract enum values from a choice filter field.

    Args:
        filter_field: The choice filter field instance

    Returns:
        List of choice values
    """
    if not hasattr(filter_field, 'choices') or not filter_field.choices:
        return []

    choices = filter_field.choices
    if callable(choices):
        choices = choices()

    # Handle different choice formats
    enum_values = []
    for choice in choices:
        if isinstance(choice, (list, tuple)) and len(choice) >= 2:
            # Choice is (value, label) tuple
            enum_values.append(str(choice[0]))
        else:
            # Choice is just a value
            enum_values.append(str(choice))

    return enum_values
