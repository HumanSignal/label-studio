"""
Utility functions to translate Django REST Framework serializers into OpenAPI parameter objects.
"""

from typing import Any, List, Optional

from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiParameter
from rest_framework import serializers


def serializer_to_openapi_params(
    serializer_class: type[serializers.Serializer],
    location: str = 'query',
    exclude_fields: Optional[List[str]] = None,
    field_overrides: Optional[dict] = None,
) -> List[OpenApiParameter]:
    """
    Convert a Django REST Framework serializer into a list of OpenAPI parameter objects.

    This provides more control than the built-in approach but requires more manual configuration.
    Use serializer_to_parameters() for most cases.

    Args:
        serializer_class: The DRF serializer class to convert
        location: The parameter location ('query', 'path', 'header', 'cookie')
        exclude_fields: List of field names to exclude from the parameters
        field_overrides: Dictionary to override specific field configurations
                        Format: {'field_name': {'type': OpenApiTypes.STR, 'description': 'Custom desc'}}

    Returns:
        List of OpenApiParameter objects ready for use with extend_schema

    Example:
        from label_studio.projects.serializers import GetFieldsSerializer

        parameters = serializer_to_openapi_params(
            GetFieldsSerializer,
            location='query',
            field_overrides={
                'filter': {
                    'enum': ['all', 'pinned_only', 'exclude_pinned'],
                    'description': 'Filter type for the query'
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
    serializer_instance = serializer_class()

    for field_name, field in serializer_instance.fields.items():
        if field_name in exclude_fields:
            continue

        # Get field configuration
        config = _get_field_config(field, field_overrides.get(field_name, {}))

        # Create OpenApiParameter
        param = OpenApiParameter(
            name=field_name,
            type=config['type'],
            location=location,
            required=config['required'],
            description=config['description'],
            default=config['default'],
            enum=config.get('enum'),
            **config.get('extra_kwargs', {}),
        )

        parameters.append(param)

    return parameters


def _get_field_config(field: serializers.Field, overrides: dict) -> dict:
    """
    Extract configuration for a serializer field to create an OpenAPI parameter.

    Args:
        field: The DRF serializer field
        overrides: Any field-specific overrides

    Returns:
        Dictionary with OpenAPI parameter configuration
    """
    # Start with base configuration
    config = {
        'type': _map_field_type(field),
        'required': getattr(field, 'required', False),
        'description': _get_field_description(field),
        'default': _get_field_default(field),
        'extra_kwargs': {},
    }

    # Apply overrides
    config.update(overrides)

    # Handle special field types
    if isinstance(field, serializers.ChoiceField):
        config['enum'] = [choice[0] if isinstance(choice, tuple) else choice for choice in field.choices]

    elif isinstance(field, serializers.BooleanField):
        config['type'] = OpenApiTypes.BOOL

    elif isinstance(field, (serializers.IntegerField, serializers.FloatField)):
        config['type'] = OpenApiTypes.INT if isinstance(field, serializers.IntegerField) else OpenApiTypes.NUMBER

    elif isinstance(field, serializers.DateTimeField):
        config['type'] = OpenApiTypes.STR
        config['extra_kwargs']['format'] = 'date-time'

    elif isinstance(field, serializers.DateField):
        config['type'] = OpenApiTypes.STR
        config['extra_kwargs']['format'] = 'date'

    elif isinstance(field, serializers.TimeField):
        config['type'] = OpenApiTypes.STR
        config['extra_kwargs']['format'] = 'time'

    elif isinstance(field, serializers.EmailField):
        config['type'] = OpenApiTypes.STR
        config['extra_kwargs']['format'] = 'email'

    elif isinstance(field, serializers.URLField):
        config['type'] = OpenApiTypes.STR
        config['extra_kwargs']['format'] = 'uri'

    elif isinstance(field, serializers.UUIDField):
        config['type'] = OpenApiTypes.STR
        config['extra_kwargs']['format'] = 'uuid'

    elif isinstance(field, serializers.JSONField):
        config['type'] = OpenApiTypes.OBJECT
    elif isinstance(field, serializers.ListField):
        config['type'] = OpenApiTypes.STR

    return config


def _map_field_type(field: serializers.Field) -> str:
    """
    Map DRF field types to OpenAPI types.

    Args:
        field: The DRF serializer field

    Returns:
        OpenAPI type string
    """
    # Handle specific field types first
    if isinstance(field, serializers.BooleanField):
        return OpenApiTypes.BOOL
    elif isinstance(field, serializers.IntegerField):
        return OpenApiTypes.INT
    elif isinstance(field, serializers.FloatField):
        return OpenApiTypes.NUMBER
    elif isinstance(field, serializers.DecimalField):
        return OpenApiTypes.NUMBER
    elif isinstance(field, serializers.ListField):
        return OpenApiTypes.STR
    elif isinstance(field, serializers.JSONField):
        return OpenApiTypes.OBJECT
    elif isinstance(field, serializers.DictField):
        return OpenApiTypes.OBJECT
    else:
        # Default to string for most other field types
        return OpenApiTypes.STR


def _get_field_description(field: serializers.Field) -> str:
    """
    Extract description from a serializer field.

    Args:
        field: The DRF serializer field

    Returns:
        Field description or empty string
    """
    if hasattr(field, 'help_text') and field.help_text:
        return str(field.help_text)
    elif hasattr(field, 'label') and field.label:
        return str(field.label)
    else:
        return ''


def _get_field_default(field: serializers.Field) -> Any:
    """
    Extract default value from a serializer field.

    Args:
        field: The DRF serializer field

    Returns:
        Default value or None
    """
    if hasattr(field, 'default') and field.default is not None:
        if callable(field.default):
            # Skip callable defaults (like serializers.CreateOnlyDefault)
            return None
        return field.default
    return None
