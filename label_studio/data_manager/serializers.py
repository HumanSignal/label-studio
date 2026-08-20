"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license."""

import os
from typing import Any

import ujson as json
from core.current_request import CurrentContext
from core.feature_flags import flag_set
from data_manager.models import Filter, FilterGroup, View
from data_manager.prepare_params import filters_schema, ordering_schema, selected_items_schema
from django.conf import settings
from django.db import transaction
from django.db.models import Max
from django.utils import timezone
from drf_spectacular.utils import extend_schema_field
from fsm.serializer_fields import FSMStateField
from projects.models import Project
from rest_framework import serializers, status
from rest_framework.exceptions import APIException, PermissionDenied
from tasks.models import Task
from tasks.ordering import (
    get_task_annotations_queryset,
    get_task_predictions_queryset,
)
from tasks.serializers import (
    AnnotationDraftSerializer,
    AnnotationSerializer,
    AnnotationStubSerializer,
    CompletedByDMSerializer,
    PredictionSerializer,
    TaskSerializer,
)
from users.models import User

from label_studio.core.utils.common import round_floats

LOCKED_VIEW_MESSAGE = 'This tab has been locked. Refresh to see the latest tab settings.'
LOCK_PERMISSION_MESSAGE = 'Only managers can lock or unlock tabs.'
LOCKED_VIEW_ALLOWED_DATA_KEYS = frozenset({'columnsWidth'})


class LockedViewError(APIException):
    status_code = status.HTTP_409_CONFLICT
    default_detail = LOCKED_VIEW_MESSAGE
    default_code = 'view_locked'


def view_lock_project(instance_or_data):
    """Resolve a project for lock permission checks.

    ``View`` has ``project``; ``DatasetView`` has ``dataset`` only. Returning
    ``None`` lets ``get_user_role`` fall back to an org-level role check.
    """
    if isinstance(instance_or_data, dict):
        return instance_or_data.get('project')
    return getattr(instance_or_data, 'project', None)


def user_can_manage_view_lock(user, project):
    try:
        from lse_organizations.functions import get_user_role
        from lse_organizations.models import OrganizationRole
    except ImportError:
        return True

    role = get_user_role(user=user, organization_or_pk=user.active_organization_id, project=project)
    return role in (OrganizationRole.OWNER, OrganizationRole.ADMINISTRATOR, OrganizationRole.MANAGER)


class ChildFilterSerializer(serializers.ModelSerializer):
    class Meta:
        model = Filter
        fields = '__all__'

    def to_representation(self, value):
        serializer = FilterSerializer(instance=value, context=self.context)
        return serializer.data

    def to_internal_value(self, data):
        """Validate each child like a root while enforcing one nesting level."""
        if isinstance(data, dict):
            if 'child_filters' in data:
                nested_children = data['child_filters']
            elif 'child_filter' in data:
                nested_child = data['child_filter']
                nested_children = [] if nested_child is None else [nested_child]
            else:
                nested_children = []
            if nested_children:
                raise serializers.ValidationError(
                    {'child_filters': 'Child filters cannot contain nested child filters.'}
                )
            data = {key: value for key, value in data.items() if key not in ('child_filter', 'child_filters')}

        serializer = FilterSerializer(data=data, context=self.context)
        serializer.is_valid(raise_exception=True)
        return serializer.validated_data


LIST_MEMBERSHIP_OPERATORS = {'in_list', 'not_in_list'}
PRIMITIVE_LIST_ELEMENT_TYPES = (str, int, float, bool)


def _column_supports_list_membership(column: str) -> bool:
    """Return True if `column` is in the allowlist for `in_list` / `not_in_list`.

    Mirrors `data_manager.managers._is_supported_in_list_field` but operates on the
    raw `filter:tasks:*` column string so the serializer can reject bad views before
    persistence. The runtime check in `apply_filters` remains as a defensive safety
    net for ad-hoc query payloads that bypass this serializer.
    """
    if not column.startswith('filter:tasks:'):
        return False
    field = column[len('filter:tasks:') :]
    if field.startswith('-'):
        field = field[1:]
    if field.startswith('data.'):
        return True
    # Keep in sync with managers.SUPPORTED_IN_LIST_FIELDS
    return field in {
        'id',
        'inner_id',
        'total_annotations',
        'total_predictions',
        'cancelled_annotations',
    }


def _column_filter_field_name(column: str) -> str | None:
    if not column.startswith('filter:tasks:'):
        return None
    field = column[len('filter:tasks:') :]
    if field.startswith('-'):
        field = field[1:]
    return field


class FilterSerializer(serializers.ModelSerializer):
    child_filters = ChildFilterSerializer(many=True, required=False)

    class Meta:
        model = Filter
        fields = '__all__'

    def to_internal_value(self, data):
        if not isinstance(data, dict):
            return super().to_internal_value(data)

        normalized = dict(data)
        if 'child_filters' in normalized:
            # The canonical plural field wins deterministically when both are supplied.
            normalized.pop('child_filter', None)
        elif 'child_filter' in normalized:
            child_filter = normalized.pop('child_filter')
            normalized['child_filters'] = [] if child_filter is None else [child_filter]
        return super().to_internal_value(normalized)

    def validate(self, attrs):
        """Object-level validation for `in_list` / `not_in_list` filters (BROS-1203).

        Performs both syntax (value shape, size, element types) and the MVP field
        allowlist check, so saving a view with an unsupported field is rejected
        early. The same semantic check is duplicated in
        `data_manager/managers.py::validate_in_list_filter` as a safety net for
        callers that build queries without going through this serializer.
        """
        operator = attrs.get('operator')
        if operator in LIST_MEMBERSHIP_OPERATORS:
            value = attrs.get('value')
            if not isinstance(value, list):
                raise serializers.ValidationError({'value': '`in_list` / `not_in_list` require a JSON array.'})
            max_len = settings.DATA_MANAGER_LIST_FILTER_MAX_VALUES
            if len(value) > max_len:
                raise serializers.ValidationError({'value': f'List exceeds maximum size of {max_len}.'})
            for el in value:
                if not isinstance(el, PRIMITIVE_LIST_ELEMENT_TYPES):
                    raise serializers.ValidationError({'value': 'List elements must be strings or numbers.'})
            column = attrs.get('column', '')
            if not _column_supports_list_membership(column):
                raise serializers.ValidationError(
                    {
                        'column': (
                            '`is any of` / `is none of` support Task ID, Inner ID, '
                            'annotation/prediction counters, and task.data.* fields.'
                        )
                    }
                )
        else:
            from data_manager.managers import (
                USER_FILTER_FIELDS,
                USER_FILTER_VALUE_OPERATORS,
                parse_user_filter_ids,
                validate_user_filter_operator,
            )

            field_name = _column_filter_field_name(attrs.get('column', ''))
            if field_name in USER_FILTER_FIELDS:
                try:
                    validate_user_filter_operator(field_name, operator, attrs.get('value'))
                except serializers.ValidationError as exc:
                    raise serializers.ValidationError({'operator': exc.detail}) from None
                if operator in USER_FILTER_VALUE_OPERATORS:
                    try:
                        parse_user_filter_ids(attrs.get('value'))
                    except serializers.ValidationError as exc:
                        raise serializers.ValidationError({'value': exc.detail}) from None
        return attrs

    def validate_column(self, column: str) -> str:
        """
        Ensure that the passed filter expression starts with 'filter:tasks:' and contains
        no foreign key traversals. This means either the filter expression contains no '__'
        substrings, or that it's the task.data json field that's accessed.

        Users depending on foreign key traversals in views can allowlist them via the
        DATA_MANAGER_FILTER_ALLOWLIST setting in the env.

        Edit with care. The validations below are critical for security.
        """

        column_copy = column

        # We may support 'filter:annotations:' in the future, but we don't as of yet.
        required_prefix = 'filter:tasks:'
        optional_prefix = '-'

        if not column_copy.startswith(required_prefix):
            raise serializers.ValidationError(f'Filter "{column}" should start with "{required_prefix}"')

        column_copy = column_copy[len(required_prefix) :]

        if column_copy.startswith(optional_prefix):
            column_copy = column_copy[len(optional_prefix) :]

        if column_copy.startswith('data.'):
            # Allow underscores if the filter is based on the `task.data` JSONField, because these don't leverage foreign keys.
            return column

        # Specific filters relying on foreign keys can be allowlisted
        if column_copy in settings.DATA_MANAGER_FILTER_ALLOWLIST:
            return column

        # But in general, we don't allow foreign keys
        if '__' in column_copy:
            raise serializers.ValidationError(
                f'"__" is not generally allowed in filters. Consider asking your administrator to add "{column_copy}" '
                'to DATA_MANAGER_FILTER_ALLOWLIST, but note that some filter expressions may pose a security risk'
            )

        return column


class FilterGroupSerializer(serializers.ModelSerializer):
    filters = FilterSerializer(many=True)

    def to_representation(self, instance):
        def _build_filter_item(filter_obj):
            from data_manager.managers import normalize_persisted_user_filter

            field_name = _column_filter_field_name(filter_obj.column)
            operator, value = normalize_persisted_user_filter(field_name, filter_obj.operator, filter_obj.value)
            return {
                'filter': filter_obj.column,
                'operator': operator,
                'type': filter_obj.type,
                'value': value,
            }

        def _build_filter_tree(filter_obj):
            """Build hierarchical filter representation."""
            item = _build_filter_item(filter_obj)

            # Child indexes preserve canonical wire order; PK stabilizes legacy rows with no index.
            child_filters = sorted(
                filter_obj.children.all(),
                key=lambda child: (
                    child.index is None,
                    child.index if child.index is not None else 0,
                    child.pk,
                ),
            )
            item['child_filters'] = [_build_filter_item(child) for child in child_filters]

            return item

        # Only process root filters (ordered by index)
        roots = instance.filters.filter(parent__isnull=True).prefetch_related('children').order_by('index')

        return {'conjunction': instance.conjunction, 'items': [_build_filter_tree(f) for f in roots]}

    class Meta:
        model = FilterGroup
        fields = '__all__'


class ViewSerializer(serializers.ModelSerializer):
    filter_group = FilterGroupSerializer(required=False)
    locked_by = serializers.SerializerMethodField()

    class Meta:
        model = View
        fields = '__all__'

    @extend_schema_field(
        {
            'type': 'object',
            'nullable': True,
            'title': 'Locked by user',
            'properties': {
                'id': {'type': 'integer', 'title': 'User ID'},
                'name': {'type': 'string', 'title': 'Display name'},
                'email': {'type': 'string', 'format': 'email', 'title': 'Email'},
            },
        }
    )
    def get_locked_by(self, instance):
        if not instance.locked_by:
            return None
        return {
            'id': instance.locked_by_id,
            'name': instance.locked_by.name_or_email(),
            'email': instance.locked_by.email,
        }

    def to_internal_value(self, data):
        """
        map old filters structure to models
        "filters": {  ===> FilterGroup model
            "conjunction": "or",
            "items":[  ===> "filters" in FilterGroup
                 {  ==> Filter model
                   "filter":"filter:tasks:data.image", ==> column
                    "operator":"contains",
                    "type":"Image",
                    "value": <string: "XXX" | int: 123 | dict | list>
                 },
                  {
                    "filter":"filter:tasks:data.image",
                    "operator":"equal",
                    "type":"Image",
                    "value": <string: "XXX" | int: 123 | dict | list>
                 }
              ]
           }
        }
        """
        _data = data.get('data')

        if not isinstance(_data, dict):
            return super().to_internal_value(data)

        filters = _data.pop('filters', {})
        conjunction = filters.get('conjunction')
        if 'filter_group' not in data and conjunction:
            data['filter_group'] = {'conjunction': conjunction, 'filters': []}
            if 'items' in filters:
                # Support "nested" list where each root item may contain ``child_filters``

                def _convert_filter(src_filter):
                    """Convert a single filter JSON object into internal representation."""

                    filter_payload = {
                        'column': src_filter.get('filter', ''),
                        'operator': src_filter.get('operator', ''),
                        'type': src_filter.get('type', ''),
                        'value': src_filter.get('value', {}),
                    }

                    if 'child_filters' in src_filter:
                        child_filters = src_filter['child_filters']
                    elif 'child_filter' in src_filter:
                        child_filter = src_filter['child_filter']
                        child_filters = [] if child_filter is None else [child_filter]
                    else:
                        child_filters = None

                    if child_filters is not None:
                        filter_payload['child_filters'] = (
                            [_convert_filter(child) for child in child_filters]
                            if isinstance(child_filters, list)
                            else child_filters
                        )

                    return filter_payload

                # Iterate over top-level items (roots)
                for f in filters['items']:
                    data['filter_group']['filters'].append(_convert_filter(f))

        ordering = _data.pop('ordering', {})
        data['ordering'] = ordering

        return super().to_internal_value(data)

    def to_representation(self, instance):
        result = super().to_representation(instance)

        # Handle filter_group serialization
        filters = result.pop('filter_group', {})
        if filters:
            result['data']['filters'] = filters

        selected_items = result.pop('selected_items', {})
        if selected_items:
            result['data']['selectedItems'] = selected_items

        ordering = result.pop('ordering', {})
        if ordering:
            result['data']['ordering'] = ordering
        return result

    @staticmethod
    def _create_filters(filter_group, filters_data):
        """Create Filter objects inside the provided ``filter_group``.

        Root and child indexes preserve the order of their respective wire lists.
        """

        for root_index, data in enumerate(filters_data):
            child_filters = data.pop('child_filters', [])
            data['index'] = root_index
            root = Filter.objects.create(parent=None, **data)
            filter_group.filters.add(root)

            for child_index, child_data in enumerate(child_filters):
                if child_data.pop('child_filters', []):
                    raise serializers.ValidationError('Child filters cannot contain nested child filters.')
                child_data.pop('parent', None)
                child_data['index'] = child_index
                child = Filter.objects.create(parent=root, **child_data)
                filter_group.filters.add(child)

    def create(self, validated_data):
        with transaction.atomic():
            filter_group_data = validated_data.pop('filter_group', None)
            if filter_group_data:
                filters_data = filter_group_data.pop('filters', [])
                filter_group = FilterGroup.objects.create(**filter_group_data)

                self._create_filters(filter_group=filter_group, filters_data=filters_data)

                validated_data['filter_group_id'] = filter_group.id

            # Trust caller / perform_create order (Max+1). Never use count(), which
            # collides when order values have gaps. If order is still absent, assign
            # Max+1 for project-scoped views only (DatasetView has no project).
            if 'order' not in validated_data:
                project = view_lock_project(validated_data)
                if project is not None:
                    max_order = View.objects.filter(project=project).aggregate(Max('order'))['order__max']
                    validated_data['order'] = (max_order if max_order is not None else -1) + 1

            if validated_data.get('is_locked'):
                request = self.context.get('request')
                user = getattr(request, 'user', None)
                if not user_can_manage_view_lock(user, view_lock_project(validated_data)):
                    raise PermissionDenied(LOCK_PERMISSION_MESSAGE)
                validated_data['locked_by'] = user
                validated_data['locked_at'] = timezone.now()
            view = self.Meta.model.objects.create(**validated_data)

            return view

    def update(self, instance, validated_data):
        with transaction.atomic():
            request = self.context.get('request')
            user = getattr(request, 'user', None)
            is_locked = validated_data.pop('is_locked', serializers.empty)
            filter_group_data = validated_data.pop('filter_group', None)

            instance = self.Meta.model.objects.select_for_update().get(pk=instance.pk)

            if is_locked is not serializers.empty and bool(is_locked) != bool(instance.is_locked):
                if not user_can_manage_view_lock(user, view_lock_project(instance)):
                    raise PermissionDenied(LOCK_PERMISSION_MESSAGE)

            # If the tab is locked and this request is not unlocking it, only apply
            # the allowlisted fields from `data` and silently ignore everything else.
            # The frontend always sends the full view snapshot, so mutation-detection
            # is unreliable — a stale snapshot looks like a mutation even when the
            # user only resized a column.
            is_unlocking = is_locked is not serializers.empty and not bool(is_locked) and bool(instance.is_locked)
            if instance.is_locked and not is_unlocking:
                incoming_data = validated_data.get('data', serializers.empty)
                if incoming_data is not serializers.empty:
                    current_data = dict(instance.data or {})
                    changed = False
                    for key in LOCKED_VIEW_ALLOWED_DATA_KEYS:
                        if key in incoming_data and current_data.get(key) != incoming_data[key]:
                            current_data[key] = incoming_data[key]
                            changed = True
                    if changed:
                        instance.data = current_data
                        instance.save(update_fields=['data'])
                return instance

            if is_locked is not serializers.empty and bool(is_locked) != bool(instance.is_locked):
                if is_locked:
                    instance.lock(user)
                else:
                    instance.unlock()
                instance.save(update_fields=['is_locked', 'locked_by', 'locked_at'])

            if filter_group_data:
                filters_data = filter_group_data.pop('filters', [])

                # BROS-1324: serialize concurrent view-saves. The Data Manager fires a
                # burst of un-cancelled save requests during tab load/edit; without a
                # row lock the filter replacement below (delete + recreate) interleaves
                # across requests and leaves duplicate root filters in the group's M2M,
                # which the user sees as filters multiplying on every reload.
                filter_group = instance.filter_group
                if filter_group is None:
                    filter_group = FilterGroup.objects.create(**filter_group_data)
                    instance.filter_group = filter_group
                    instance.save(update_fields=['filter_group'])

                conjunction = filter_group_data.get('conjunction')
                if conjunction and filter_group.conjunction != conjunction:
                    filter_group.conjunction = conjunction
                    filter_group.save()

                # BROS-1324: delete the old filters outright (cascades to child filters
                # via the parent FK) instead of only clearing the M2M associations,
                # which left orphaned Filter rows accumulating in the DB on every save.
                Filter.objects.filter(filter_groups=filter_group).delete()
                self._create_filters(filter_group=filter_group, filters_data=filters_data)

            ordering = validated_data.pop('ordering', None)
            if ordering and ordering != instance.ordering:
                instance.ordering = ordering
                instance.save(update_fields=['ordering'])

            data = validated_data.get('data', serializers.empty)
            if data is not serializers.empty and data != instance.data:
                instance.data = data
                instance.save(update_fields=['data'])

            return instance


@extend_schema_field(
    {
        'type': 'array',
        'title': 'User IDs',
        'description': 'User IDs who updated this task',
        'items': {'type': 'object', 'title': 'User IDs'},
    }
)
class UpdatedByDMFieldSerializer(serializers.SerializerMethodField):
    # TODO: get_updated_by implementation is weird, but we need to adhere schema to it
    pass


@extend_schema_field(
    {
        'type': 'array',
        'title': 'Annotators',
        'description': 'Who annotated this task; each item includes user_id plus minimal profile fields for Data Manager display.',
        'items': {
            'type': 'object',
            'title': 'Annotator',
        },
    }
)
class AnnotatorsDMFieldSerializer(serializers.SerializerMethodField):
    # TODO: get_updated_by implementation is weird, but we need to adhere schema to it
    pass


@extend_schema_field(
    {
        'type': 'object',
        'title': 'User details',
        'description': 'User details who completed this annotation.',
    }
)
class CompletedByDMSerializerWithGenericSchema(serializers.PrimaryKeyRelatedField):
    # TODO: likely we need to remove full user details from GET /api/tasks/{id} as it non-secure and currently controlled by the export toggle
    pass


class AnnotationsDMFieldSerializer(AnnotationSerializer):
    completed_by = CompletedByDMSerializerWithGenericSchema(required=False, queryset=User.objects.all())


@extend_schema_field(
    {
        'type': 'array',
        'title': 'Annotation drafts',
        'description': 'Drafts for this task',
        'items': {
            'type': 'object',
            'title': 'Draft object',
            'properties': {
                'result': {
                    'type': 'array',
                    'title': 'Draft result',
                    'items': {
                        'type': 'object',
                        'title': 'Draft result item',
                    },
                },
                'created_at': {
                    'type': 'string',
                    'format': 'date-time',
                    'title': 'Creation time',
                },
                'updated_at': {
                    'type': 'string',
                    'format': 'date-time',
                    'title': 'Last update time',
                },
            },
        },
    }
)
class AnnotationDraftDMFieldSerializer(serializers.SerializerMethodField):
    pass


@extend_schema_field(
    {
        'type': 'array',
        'title': 'Predictions',
        'description': 'Predictions for this task',
        'items': {
            'type': 'object',
            'title': 'Prediction object',
            'properties': {
                'result': {
                    'type': 'array',
                    'title': 'Prediction result',
                    'items': {
                        'type': 'object',
                        'title': 'Prediction result item',
                    },
                },
                'score': {
                    'type': 'number',
                    'title': 'Prediction score',
                },
                'model_version': {
                    'type': 'string',
                    'title': 'Model version',
                },
                'model': {
                    'type': 'object',
                    'title': 'ML Backend instance',
                },
                'model_run': {
                    'type': 'object',
                    'title': 'Model Run instance',
                },
                'task': {
                    'type': 'integer',
                    'title': 'Task ID related to the prediction',
                },
                'project': {
                    'type': 'integer',
                    'title': 'Project ID related to the prediction',
                },
                'created_at': {
                    'type': 'string',
                    'format': 'date-time',
                    'title': 'Creation time',
                },
                'updated_at': {
                    'type': 'string',
                    'format': 'date-time',
                    'title': 'Last update time',
                },
            },
        },
    }
)
class PredictionsDMFieldSerializer(serializers.SerializerMethodField):
    pass


class DataManagerTaskSerializer(TaskSerializer):
    """Data Manager Task Serializer with FSM state support."""

    predictions = PredictionsDMFieldSerializer(required=False, read_only=True)
    annotations = serializers.SerializerMethodField(required=False, read_only=True)
    drafts = AnnotationDraftDMFieldSerializer(required=False, read_only=True)
    annotators = AnnotatorsDMFieldSerializer(required=False, read_only=True)

    inner_id = serializers.IntegerField(required=False)
    cancelled_annotations = serializers.IntegerField(required=False)
    total_annotations = serializers.IntegerField(required=False)
    total_predictions = serializers.IntegerField(required=False)
    completed_at = serializers.DateTimeField(required=False)
    annotations_results = serializers.SerializerMethodField(required=False)
    predictions_results = serializers.SerializerMethodField(required=False)
    predictions_score = serializers.FloatField(required=False)
    file_upload = serializers.SerializerMethodField(required=False)
    storage_filename = serializers.SerializerMethodField(required=False)
    annotations_ids = serializers.SerializerMethodField(required=False)
    predictions_model_versions = serializers.SerializerMethodField(required=False)
    avg_lead_time = serializers.FloatField(required=False)
    draft_exists = serializers.BooleanField(required=False)
    updated_by = UpdatedByDMFieldSerializer(required=False, read_only=True)
    state = FSMStateField(read_only=True)  # FSM state - automatically uses annotation if present

    CHAR_LIMITS = 500

    class Meta:
        model = Task
        ref_name = 'data_manager_task_serializer'
        exclude = ('precomputed_agreement', 'allow_skip')
        expandable_fields = {'annotations': (AnnotationSerializer, {'many': True})}

    def to_representation(self, obj):
        """Dynamically manage including of some fields in the API result"""
        # Restrict task.data to visible DM columns before URI resolve (FIT-2416).
        visible_data_keys = self.context.get('dm_visible_data_keys')
        if visible_data_keys is not None and isinstance(getattr(obj, 'data', None), dict):
            obj.data = {key: value for key, value in obj.data.items() if key in visible_data_keys}

        ret = super(DataManagerTaskSerializer, self).to_representation(obj)
        if not self.context.get('annotations'):
            ret.pop('annotations', None)
        if not self.context.get('predictions'):
            ret.pop('predictions', None)
        # Remove state field if feature flags are disabled
        user = CurrentContext.get_user()
        if not (
            flag_set('fflag_feat_fit_568_finite_state_management', user=user)
            and flag_set('fflag_feat_fit_710_fsm_state_fields', user=user)
        ):
            ret.pop('state', None)
        return ret

    def _pretty_results(self, task, field, unique=False) -> str:
        if not hasattr(task, field) or getattr(task, field) is None:
            return ''

        result = getattr(task, field)
        if isinstance(result, str):
            output = result
            if unique:
                output = list(set(output.split(',')))
                output = ','.join(output)

        elif isinstance(result, int):
            output = str(result)
        else:
            result = [r for r in result if r is not None]
            if unique:
                result = list(set(result))
            result = round_floats(result)
            output = json.dumps(result, ensure_ascii=False)[1:-1]  # remove brackets [ ]

        return output[: self.CHAR_LIMITS].replace(',"', ', "').replace('],[', '] [').replace('"', '')

    def get_annotations_results(self, task) -> str:
        return self._pretty_results(task, 'annotations_results')

    def get_predictions_results(self, task) -> str:
        return self._pretty_results(task, 'predictions_results')

    def get_predictions(self, task) -> list[dict[str, Any]]:
        ordering = self.context.get('annotations_ordering')
        predictions = get_task_predictions_queryset(task, ordering)
        return PredictionSerializer(predictions, many=True, default=[], read_only=True).data

    def get_annotations(self, task) -> list[dict[str, Any]]:
        """Return annotations for the task.

        If annotations_stub=True is in context (via feature flag
        fflag_fix_all_fit_720_lazy_load_annotations), returns lightweight
        annotation stubs without result data for improved performance.
        """
        if not self.context.get('annotations'):
            return []

        ordering = self.context.get('annotations_ordering')
        annotations = get_task_annotations_queryset(task, ordering, include_completed_by=True)

        # Use stub serializer if requested (feature flag checked at API level)
        if self.context.get('annotations_stub'):
            return AnnotationStubSerializer(
                annotations,
                many=True,
                read_only=True,
                context=self.context,
                expand=['completed_by'],
            ).data

        return AnnotationsDMFieldSerializer(
            annotations,
            many=True,
            read_only=True,
            context=self.context,
        ).data

    @staticmethod
    def get_file_upload(task) -> str | None:
        if hasattr(task, 'file_upload_field'):
            file_upload = task.file_upload_field
            return os.path.basename(task.file_upload_field) if file_upload else None
        return None

    @staticmethod
    def get_storage_filename(task) -> str | None:
        return task.get_storage_filename()

    @staticmethod
    def get_updated_by(obj) -> list[dict[str, int]]:
        return [{'user_id': obj.updated_by_id}] if obj.updated_by_id else []

    def get_annotators(self, obj) -> list[dict[str, Any]]:
        if not hasattr(obj, 'annotators'):
            return []

        annotators = obj.annotators
        if not annotators:
            return []
        if isinstance(annotators, str):
            annotators = [int(v) for v in annotators.split(',')]

        annotators = list(set(annotators))
        annotators = [a for a in annotators if a is not None]
        if not annotators:
            return []

        ordered_ids = sorted(annotators)

        users_by_id = User.objects.in_bulk(ordered_ids, field_name='id')
        out = []
        for pk in ordered_ids:
            user_obj = users_by_id.get(pk)
            if not user_obj:
                continue
            user_data = CompletedByDMSerializer(user_obj, context=self.context).data
            out.append(
                {
                    'user_id': pk,
                    'annotated': True,
                    'review': None,
                    'reviewed': False,
                    **user_data,
                }
            )
        return out

    def get_annotations_ids(self, task) -> str:
        return self._pretty_results(task, 'annotations_ids', unique=True)

    def get_predictions_model_versions(self, task) -> str:
        return self._pretty_results(task, 'predictions_model_versions', unique=True)

    def get_drafts_serializer(self):
        return AnnotationDraftSerializer

    def get_drafts_queryset(self, user, task):
        """Get all user's draft"""
        return task.drafts.filter(user=user)

    def get_drafts(self, task):
        """Return drafts only for the current user"""
        # it's for openapi3 documentation
        if not isinstance(task, Task) or not self.context.get('drafts'):
            return []

        if 'request' in self.context and hasattr(self.context['request'], 'user'):
            user = self.context['request'].user
            drafts = self.get_drafts_queryset(user, task)
        else:
            drafts = task.drafts

        serializer_class = self.get_drafts_serializer()
        return serializer_class(drafts, many=True, read_only=True, default=True, context=self.context).data


@extend_schema_field(selected_items_schema)
class SelectedItemsSerializer(serializers.Serializer):
    all = serializers.BooleanField()
    included = serializers.ListField(child=serializers.IntegerField(), required=False)
    excluded = serializers.ListField(child=serializers.IntegerField(), required=False)

    def validate(self, data):
        if data['all'] is True and data.get('included'):
            raise serializers.ValidationError('included not allowed with all==true')
        if data['all'] is False and data.get('excluded'):
            raise serializers.ValidationError('excluded not allowed with all==false')

        view = self.context.get('view')
        request = self.context.get('request')
        if view and request and request.method in ('PATCH', 'DELETE'):
            all_value = view.selected_items.get('all')
            if all_value and all_value != data['all']:
                raise serializers.ValidationError('changing all value possible only with POST method')

        return data


class ViewResetSerializer(serializers.Serializer):
    project = serializers.PrimaryKeyRelatedField(queryset=Project.objects.all())


class ViewOrderSerializer(serializers.Serializer):
    project = serializers.IntegerField()
    ids = serializers.ListField(
        child=serializers.IntegerField(), allow_empty=False, help_text='A list of view IDs in the desired order.'
    )


class PrepareParamsChildFilterItemSerializer(serializers.Serializer):
    """Canonical public Data Manager filter item without recursive children."""

    filter = serializers.CharField(help_text='Filter identifier, e.g. filter:tasks:completed_at')
    operator = serializers.CharField(help_text='Filter operator, e.g. equal, greater, in_list')
    type = serializers.CharField(help_text='Type of the filter value')
    value = serializers.JSONField(help_text='Value to filter by')


class PrepareParamsFilterItemSerializer(PrepareParamsChildFilterItemSerializer):
    """Canonical public root filter item with one supported level of children."""

    child_filters = serializers.ListField(
        child=PrepareParamsChildFilterItemSerializer(),
        required=False,
        help_text='Ordered child filters AND-merged with their parent (one nesting level).',
    )


@extend_schema_field(filters_schema, component_name='PrepareParamsFiltersRequest')
class PrepareParamsFiltersSerializer(serializers.Serializer):
    conjunction = serializers.ChoiceField(choices=['or', 'and'])
    items = PrepareParamsFilterItemSerializer(many=True)


@extend_schema_field(ordering_schema, component_name='PrepareParamsOrderingRequest')
class PrepareParamsOrderingField(serializers.ListField):
    """Runtime list validation with the established public ordering schema."""


class PrepareParamsRequestSerializer(serializers.Serializer):
    filters = PrepareParamsFiltersSerializer(required=False, allow_null=True)
    selectedItems = SelectedItemsSerializer(required=False, allow_null=True)
    ordering = PrepareParamsOrderingField(child=serializers.CharField(), required=False, allow_null=True)


class ViewDataRequestSerializer(serializers.Serializer):
    """Established public view payload nested under ``data``."""

    filters = PrepareParamsFiltersSerializer(required=False, allow_null=True)
    ordering = PrepareParamsOrderingField(child=serializers.CharField(), required=False, allow_null=True)


class ViewRequestSerializer(serializers.Serializer):
    """Public view write contract; runtime conversion remains in ``ViewSerializer``."""

    data = ViewDataRequestSerializer(required=False)
    project = serializers.IntegerField(required=False, help_text='Project ID')
