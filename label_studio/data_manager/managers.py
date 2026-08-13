"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license."""

import logging
import re
from dataclasses import dataclass
from datetime import datetime
from functools import reduce
from typing import ClassVar

import ujson as json
from core.feature_flags import flag_set
from core.utils.db import fast_first
from data_manager.prepare_params import ConjunctionEnum
from django.conf import settings
from django.contrib.postgres.aggregates import ArrayAgg
from django.core.exceptions import FieldDoesNotExist, FieldError
from django.db import models
from django.db.models import (
    Aggregate,
    Avg,
    Case,
    DateTimeField,
    Exists,
    F,
    FloatField,
    OuterRef,
    Q,
    Subquery,
    TextField,
    Value,
    When,
)
from django.db.models.fields.json import KeyTextTransform
from django.db.models.functions import Cast, Coalesce, Concat
from fsm.queryset_mixins import FSMStateQuerySetMixin
from fsm.registry import get_state_choices
from pydantic import BaseModel
from rest_framework.exceptions import ValidationError

from label_studio.core.utils.common import load_func
from label_studio.core.utils.params import cast_bool_from_str

logger = logging.getLogger(__name__)

DATETIME_FORMAT = '%Y-%m-%dT%H:%M:%S.%fZ'


class _Operator(BaseModel):
    EQUAL: ClassVar[str] = 'equal'
    NOT_EQUAL: ClassVar[str] = 'not_equal'
    LESS: ClassVar[str] = 'less'
    GREATER: ClassVar[str] = 'greater'
    LESS_OR_EQUAL: ClassVar[str] = 'less_or_equal'
    GREATER_OR_EQUAL: ClassVar[str] = 'greater_or_equal'
    IN: ClassVar[str] = 'in'
    NOT_IN: ClassVar[str] = 'not_in'
    IN_LIST: ClassVar[str] = 'in_list'
    NOT_IN_LIST: ClassVar[str] = 'not_in_list'
    EMPTY: ClassVar[str] = 'empty'
    CONTAINS: ClassVar[str] = 'contains'
    NOT_CONTAINS: ClassVar[str] = 'not_contains'
    REGEX: ClassVar[str] = 'regex'


Operator = _Operator()
USER_FILTER_FIELDS = frozenset({'annotators', 'updated_by', 'reviewers', 'comment_authors', 'skipped_by_annotator'})
USER_FILTER_VALUE_OPERATORS = frozenset({Operator.CONTAINS, Operator.NOT_CONTAINS})
# Fields whose root/child hooks implement "is empty". skipped_by_annotator does not (FIT-2435).
USER_FILTER_EMPTY_FIELDS = frozenset({'annotators', 'updated_by', 'reviewers', 'comment_authors'})
LEGACY_USER_FILTER_OPERATORS = {
    Operator.EQUAL: Operator.CONTAINS,
    Operator.IN_LIST: Operator.CONTAINS,
    Operator.NOT_EQUAL: Operator.NOT_CONTAINS,
    Operator.NOT_IN_LIST: Operator.NOT_CONTAINS,
}


def allowed_user_filter_operators(field_name):
    """Operators permitted for a user-list filter field (serializer + apply_filters)."""
    allowed = set(USER_FILTER_VALUE_OPERATORS)
    if field_name in USER_FILTER_EMPTY_FIELDS:
        allowed.add(Operator.EMPTY)
    return frozenset(allowed)


class ResolvedUserFilterIds(list):
    """Marker for IDs expanded by trusted backend code after client-input validation."""


def validate_user_filter_operator(field_name, operator, value):
    """Reject unsupported operators for user-list filters (FIT-2435).

    List-valued membership filters only support contains / not_contains.
    Empty is allowed only for fields in USER_FILTER_EMPTY_FIELDS.
    Legacy scalar equal/not_equal/in_list remain accepted so normalize_persisted_user_filter
    can recover historical views.
    """
    if field_name not in USER_FILTER_FIELDS:
        return

    if isinstance(value, list):
        if operator not in USER_FILTER_VALUE_OPERATORS:
            allowed = ', '.join(sorted(USER_FILTER_VALUE_OPERATORS))
            raise ValidationError(f'List-valued user filters support only these operators: {allowed}.')
        return

    allowed = allowed_user_filter_operators(field_name)
    if operator in allowed:
        return
    if operator in LEGACY_USER_FILTER_OPERATORS:
        return

    allowed_label = ', '.join(sorted(allowed))
    raise ValidationError(
        f'User filter "{field_name}" does not support operator "{operator}". Allowed: {allowed_label}.'
    )


def normalize_persisted_user_filter(field_name, operator, value):
    """Recover historical user-filter shapes without relaxing validation for new writes."""
    if field_name not in USER_FILTER_FIELDS:
        return operator, value
    if operator == Operator.EMPTY:
        if field_name not in USER_FILTER_EMPTY_FIELDS:
            # Drop unsupported empty (e.g. skipped_by_annotator) to a no-op contains.
            return Operator.CONTAINS, []
        try:
            empty_value = cast_bool_from_str(value)
        except ValueError:
            return Operator.CONTAINS, []
        if isinstance(empty_value, bool):
            return operator, empty_value
        if isinstance(empty_value, int) and empty_value in (0, 1):
            return operator, bool(empty_value)
        return Operator.CONTAINS, []

    normalized_operator = LEGACY_USER_FILTER_OPERATORS.get(operator, operator)
    if normalized_operator not in USER_FILTER_VALUE_OPERATORS:
        return Operator.CONTAINS, []

    ids = []
    seen = set()
    max_values = settings.DATA_MANAGER_LIST_FILTER_MAX_VALUES
    collection_value = isinstance(value, (list, tuple)) or (
        isinstance(value, dict) and isinstance(value.get('items'), list)
    )

    def collect(candidate):
        if len(ids) >= max_values or candidate is None or isinstance(candidate, bool):
            return
        if isinstance(candidate, dict):
            if isinstance(candidate.get('items'), list):
                collect(candidate['items'])
            elif 'id' in candidate:
                collect(candidate['id'])
            elif 'value' in candidate:
                collect(candidate['value'])
            return
        if isinstance(candidate, (list, tuple)):
            for item in candidate:
                collect(item)
            return
        if isinstance(candidate, float) and not candidate.is_integer():
            return
        try:
            user_id = int(candidate)
        except (TypeError, ValueError):
            return
        if user_id not in seen:
            seen.add(user_id)
            ids.append(user_id)

    collect(value)
    if collection_value or not ids:
        return normalized_operator, ids
    return normalized_operator, ids[0]


@dataclass(frozen=True)
class CustomFilterResult:
    """Result from an enterprise filter hook that handled the current filter.

    ``expression=None`` deliberately drops an unavailable filter line. Hooks
    that compile a parent and its children into one expression set
    ``consume_child_filter`` so the generic loop does not apply any child again.
    """

    expression: Q | None
    consume_child_filter: bool = False


operators = {
    Operator.EQUAL: '',
    Operator.NOT_EQUAL: '',
    Operator.LESS: '__lt',
    Operator.GREATER: '__gt',
    Operator.LESS_OR_EQUAL: '__lte',
    Operator.GREATER_OR_EQUAL: '__gte',
    Operator.IN: '',
    Operator.NOT_IN: '',
    Operator.IN_LIST: '',
    Operator.NOT_IN_LIST: '',
    Operator.EMPTY: '__isnull',
    Operator.CONTAINS: '__icontains',
    Operator.NOT_CONTAINS: '__icontains',
    Operator.REGEX: '__regex',
}

KNOWN_FILTER_VALUE_TYPES = {
    'reviewed': 'bool',
}

# Fields supported by the public `in_list` / `not_in_list` operators (BROS-1203 / FIT-2416).
# `data__*` keys are accepted via _is_supported_in_list_field.
# Number counter columns use Django `__in` directly (avoids N OR'd equal filters).
SUPPORTED_IN_LIST_FIELDS = {
    'id',
    'inner_id',
    'total_annotations',
    'total_predictions',
    'cancelled_annotations',
}


def get_fields_for_filter_ordering(prepare_params):
    result = []
    if prepare_params is None:
        return result

    # collect fields from ordering
    if prepare_params.ordering:
        ordering_field_name = prepare_params.ordering[0].replace('tasks:', '').replace('-', '')
        result.append(ordering_field_name)

    # collect fields from filters
    if prepare_params.filters:
        for _filter in prepare_params.filters.items:
            filter_field_name = _filter.filter.replace('filter:tasks:', '')
            result.append(filter_field_name)
    return result


def is_agreement_related_field(field_name):
    return field_name in {
        'agreement',
        'agreement_selected',
        '_agreement',
        '_agreement_selected',
    } or field_name.startswith('dimension_agreement_')


def _is_stale_agreement_field(queryset, field_name):
    """Return true when an agreement field is no longer available for this queryset."""
    if not is_agreement_related_field(field_name):
        return False

    if field_name in getattr(queryset.query, 'annotations', {}):
        return False

    try:
        queryset.model._meta.get_field(field_name)
        return False
    except (AttributeError, FieldDoesNotExist):
        return True


def _set_prefilter_task_ids_for_agreement(request, queryset, prepare_params, project):
    """Pre-narrow agreement candidate tasks using ANDed non-agreement filters.

    Safe optimization: for conjunction=AND, applying only non-agreement filters yields
    a superset of rows that could match the final query after agreement filters/order.
    """
    if request is None:
        return

    if hasattr(request, '_dm_prefilter_task_ids'):
        delattr(request, '_dm_prefilter_task_ids')

    filters = getattr(prepare_params, 'filters', None)
    if not filters or filters.conjunction != ConjunctionEnum.AND:
        return

    fields_for_filter_ordering = get_fields_for_filter_ordering(prepare_params)
    if not any(is_agreement_related_field(field) for field in fields_for_filter_ordering):
        return

    non_agreement_filters = [
        _filter
        for _filter in filters.items
        if _filter.filter.startswith('filter:tasks:')
        and not is_agreement_related_field(_filter.filter.removeprefix('filter:tasks:'))
    ]
    if not non_agreement_filters:
        return

    preprocess_field_name = load_func(settings.PREPROCESS_FIELD_NAME)
    annotation_fields = set(get_annotations_map().keys())
    prefilter_annotation_fields = []
    for _filter in non_agreement_filters:
        filter_field_name = _filter.filter.removeprefix('filter:tasks:')
        if filter_field_name in annotation_fields and filter_field_name not in prefilter_annotation_fields:
            prefilter_annotation_fields.append(filter_field_name)
        processed_field_name, _ = preprocess_field_name(_filter.filter, project=project)
        if processed_field_name in annotation_fields and processed_field_name not in prefilter_annotation_fields:
            prefilter_annotation_fields.append(processed_field_name)

    from data_manager.prepare_params import Filters

    # Run prefilter with deep-copied filter models to avoid mutating the original request filters.
    # apply_filters() casts values in-place (e.g. Datetime strings -> datetime), and reusing those
    # mutated objects in the main filtering pass can trigger type errors.
    #
    # Child filters are dropped for prefiltering.
    narrowed_items = []
    for _filter in non_agreement_filters:
        copied_filter = _filter.copy(deep=True)
        copied_filter.child_filters = []
        narrowed_items.append(copied_filter)

    if prefilter_annotation_fields:
        queryset = PreparedTaskManager.annotate_queryset(
            queryset,
            fields_for_evaluation=prefilter_annotation_fields,
            request=request,
        )

    narrowed_filters = Filters(conjunction=filters.conjunction, items=narrowed_items)
    try:
        narrowed_queryset = apply_filters(queryset, narrowed_filters, project, request)
    except FieldError:
        # Fail open: prefilter is an optimization only, the main filtered query still runs later.
        logger.warning('DM agreement prefilter skipped due to unresolved filter field', exc_info=True)
        return
    except (TypeError, ValueError):
        # Fail open: filter value cannot be cast (e.g. bool passed for a Datetime filter).
        # The main filtered query will surface the error from its own apply_filters pass.
        logger.warning('DM agreement prefilter skipped due to filter value cast error', exc_info=True)
        return
    request._dm_prefilter_task_ids = tuple(narrowed_queryset.values_list('id', flat=True))


def get_fields_for_evaluation(prepare_params, user, skip_regular=True):
    """Collecting field names to annotate them

    :param prepare_params: structure with filters and ordering
    :param user: user
    :return: list of field names
    """
    from projects.models import Project
    from tasks.models import Task

    result = []
    result += get_fields_for_filter_ordering(prepare_params)

    # visible fields calculation
    fields = prepare_params.data.get('hiddenColumns', None)
    if fields:
        from label_studio.data_manager.functions import TASKS

        GET_ALL_COLUMNS = load_func(settings.DATA_MANAGER_GET_ALL_COLUMNS)
        all_columns = GET_ALL_COLUMNS(Project.objects.get(id=prepare_params.project), user)
        all_columns = set(
            [TASKS + ('data.' if c.get('parent', None) == 'data' else '') + c['id'] for c in all_columns['columns']]
        )
        hidden = set(fields['explore']) & set(fields['labeling'])
        shown = all_columns - hidden
        shown = {c[len(TASKS) :] for c in shown} - {'data'}  # remove tasks:
        result = set(result) | shown

    # remove duplicates
    result = set(result)

    # we don't need to annotate regular model fields, so we skip them
    if skip_regular:
        skipped_fields = [field.attname for field in Task._meta.fields]
        skipped_fields.append('id')
        result = [f for f in result if f not in skipped_fields]
        result = [f for f in result if not f.startswith('data.')]

    return result


def get_visible_data_column_keys(prepare_params, user):
    """Return task.data keys that are visible in the current DM view, or None if unrestricted.

    When ``hiddenColumns`` is present, keys hidden in both explore and labeling modes are
    excluded so list responses can skip URI resolution / payload for those columns (FIT-2416).
    Returns None when visibility cannot be determined (no hiddenColumns / multi-project).
    """
    if prepare_params is None or getattr(prepare_params, 'is_multi_project', False):
        return None
    data = getattr(prepare_params, 'data', None) or {}
    hidden_columns = data.get('hiddenColumns')
    if not hidden_columns:
        return None

    from projects.models import Project

    from label_studio.data_manager.functions import TASKS

    GET_ALL_COLUMNS = load_func(settings.DATA_MANAGER_GET_ALL_COLUMNS)
    project = Project.objects.get(id=prepare_params.project)
    all_columns = GET_ALL_COLUMNS(project, user)['columns']
    data_column_ids = {c['id'] for c in all_columns if c.get('parent') == 'data'}
    if not data_column_ids:
        return frozenset()

    hidden = set(hidden_columns.get('explore', [])) & set(hidden_columns.get('labeling', []))
    # hiddenColumns store ids as ``tasks:data.<key>`` or ``tasks:<id>`` for non-data.
    hidden_data_keys = set()
    prefix = f'{TASKS}data.'
    for column_id in hidden:
        if column_id.startswith(prefix):
            hidden_data_keys.add(column_id[len(prefix) :])
        elif column_id.startswith(TASKS) and column_id[len(TASKS) :] in data_column_ids:
            # Rare: data child listed without data. prefix
            hidden_data_keys.add(column_id[len(TASKS) :])

    return frozenset(data_column_ids - hidden_data_keys)


def apply_ordering(queryset, ordering, project, request, view_data=None):
    if ordering:
        preprocess_field_name = load_func(settings.PREPROCESS_FIELD_NAME)
        raw_field_name = ordering[0]
        numeric_ordering = False
        unsigned_field_name = raw_field_name.lstrip('-+')
        if (
            view_data is not None
            and 'columnsDisplayType' in view_data
            and unsigned_field_name in view_data['columnsDisplayType']
            and view_data['columnsDisplayType'][unsigned_field_name] == 'Number'
        ):
            numeric_ordering = True
        field_name, ascending = preprocess_field_name(raw_field_name, project=project)

        if field_name.startswith('data__'):
            # annotate task with data field for float/int/bool ordering support
            json_field = field_name.replace('data__', '')
            numeric_ordering_applied = False
            if numeric_ordering is True:
                queryset = queryset.annotate(
                    ordering_field=Cast(KeyTextTransform(json_field, 'data'), output_field=FloatField())
                )
                # for non numeric values we need fallback to string ordering
                try:
                    queryset.first()
                    numeric_ordering_applied = True
                except Exception as e:
                    logger.warning(f'Failed to apply numeric ordering for field {json_field}: {e}')
            if not numeric_ordering_applied:
                queryset = queryset.annotate(ordering_field=KeyTextTransform(json_field, 'data'))
            f = F('ordering_field').asc(nulls_last=True) if ascending else F('ordering_field').desc(nulls_last=True)

        elif field_name == 'state':
            state_choices = get_state_choices('task')
            whens = [When(current_state=state, then=Value(i + 1)) for i, state in enumerate(state_choices.values)]
            queryset = queryset.annotate(
                state_order=Case(*whens, default=Value(0), output_field=models.IntegerField())
            )
            f = F('state_order').asc(nulls_last=True) if ascending else F('state_order').desc(nulls_last=True)
        else:
            f = F(field_name).asc(nulls_last=True) if ascending else F(field_name).desc(nulls_last=True)

        try:
            queryset = queryset.order_by(f)
        except FieldError:
            if is_agreement_related_field(field_name):
                logger.warning('Skipping stale agreement ordering field: %s', field_name, exc_info=True)
                return queryset.order_by('id')
            raise
    else:
        queryset = queryset.order_by('id')

    return queryset


def cast_value(_filter):
    # range (is between)
    if hasattr(_filter.value, 'max'):
        if _filter.type == 'Number':
            _filter.value.min = float(_filter.value.min)
            _filter.value.max = float(_filter.value.max)
        elif _filter.type == 'Datetime':
            try:
                _filter.value.min = datetime.strptime(_filter.value.min, DATETIME_FORMAT)
                _filter.value.max = datetime.strptime(_filter.value.max, DATETIME_FORMAT)
            except (TypeError, ValueError):
                logger.warning(
                    'Skipping Datetime range cast for filter %s: invalid value %r',
                    _filter.filter,
                    _filter.value,
                )
    # one value
    else:
        if _filter.type == 'Number':
            _filter.value = float(_filter.value)
        elif _filter.type == 'Datetime':
            try:
                _filter.value = datetime.strptime(_filter.value, DATETIME_FORMAT)
            except (TypeError, ValueError):
                logger.warning(
                    'Skipping Datetime cast for filter %s: invalid value %r',
                    _filter.filter,
                    _filter.value,
                )
        elif _filter.type == 'Boolean':
            _filter.value = cast_bool_from_str(_filter.value)


def _is_supported_in_list_field(field_name: str) -> bool:
    """Return True if `field_name` (post-preprocess) is in the MVP allowlist for in_list / not_in_list."""
    return field_name in SUPPORTED_IN_LIST_FIELDS or field_name.startswith('data__')


def _normalize_in_list_value(_filter) -> None:
    """Trim, dedupe, and coerce list values for in_list / not_in_list filters.

    Mutates `_filter.value` in place. Lenient policy for Number type: non-numeric
    tokens are dropped silently (the FE surfaces the invalid count to the user).
    """
    raw = _filter.value if isinstance(_filter.value, list) else []
    cleaned = []
    seen = set()
    for el in raw:
        if isinstance(el, str):
            stripped = el.strip()
            if len(stripped) >= 2 and (
                (stripped[0] == '"' and stripped[-1] == '"') or (stripped[0] == "'" and stripped[-1] == "'")
            ):
                stripped = stripped[1:-1].strip()
            if not stripped:
                continue
            el = stripped
        if _filter.type == 'Number':
            try:
                el = float(el)
            except (TypeError, ValueError):
                continue
        if el in seen:
            continue
        seen.add(el)
        cleaned.append(el)
    _filter.value = cleaned


def validate_in_list_filter(_filter, field_name: str) -> str:
    """Semantic validation for `in_list` / `not_in_list` operators (BROS-1203).

    Returns one of:
      - 'ok'   — proceed with the existing Q(__in=value) branch.
      - 'none' — empty `in_list` after normalization: append a contradiction so the
                 row contributes no matches (works correctly for both AND and OR).
      - 'skip' — empty `not_in_list` after normalization: drop the filter entirely.

    Raises ValidationError for unsupported fields. Only triggers when the *original*
    operator is in_list / not_in_list, so the legacy `annotations_ids contains→in_list`
    rewrite (below) remains unaffected.
    """
    if _filter.operator not in (Operator.IN_LIST, Operator.NOT_IN_LIST):
        return 'ok'
    if not _is_supported_in_list_field(field_name):
        raise ValidationError(
            '`is any of` / `is none of` support Task ID, Inner ID, annotation/prediction counters, '
            'and task.data.* fields.'
        )
    if not isinstance(_filter.value, list):
        raise ValidationError('Filter value must be a list for `is any of` / `is none of`.')
    _normalize_in_list_value(_filter)
    if not _filter.value:
        return 'none' if _filter.operator == Operator.IN_LIST else 'skip'
    return 'ok'


def add_result_filter(field_name, _filter, filter_expressions, project):
    from django.db.models.expressions import RawSQL
    from tasks.models import Annotation, Prediction

    _class = Annotation if field_name == 'annotations_results' else Prediction

    # Annotation
    if field_name == 'annotations_results':
        subquery = Q(
            id__in=Annotation.objects.annotate(json_str=RawSQL('cast(result as text)', ''))
            .filter(Q(project=project) & Q(json_str__contains=_filter.value))
            .filter(task=OuterRef('pk'))
            .values_list('task', flat=True)
        )
    # Predictions: they don't have `project` yet
    else:
        subquery = Exists(
            _class.objects.annotate(json_str=RawSQL('cast(result as text)', '')).filter(
                Q(task=OuterRef('pk')) & Q(json_str__contains=_filter.value)
            )
        )

    if _filter.operator in [Operator.EQUAL, Operator.NOT_EQUAL]:
        try:
            value = json.loads(_filter.value)
        except:  # noqa: E722
            return 'exit'

        q = Exists(_class.objects.filter(Q(task=OuterRef('pk')) & Q(result=value)))
        filter_expressions.append(q if _filter.operator == Operator.EQUAL else ~q)
        return 'continue'
    elif _filter.operator == Operator.CONTAINS:
        filter_expressions.append(Q(subquery))
        return 'continue'
    elif _filter.operator == Operator.NOT_CONTAINS:
        filter_expressions.append(~Q(subquery))
        return 'continue'
    elif _filter.operator == Operator.EMPTY:
        if cast_bool_from_str(_filter.value):
            q = Q(annotations__result__isnull=True) | Q(annotations__result=[])
        else:
            q = Q(annotations__result__isnull=False) & ~Q(annotations__result=[])
        filter_expressions.append(q)
        return 'continue'


def parse_user_filter_ids(value):
    """Parse a scalar or list user-filter value into deduped integer user ids (FIT-2253)."""
    if value is None:
        return []
    if (
        isinstance(value, list)
        and not isinstance(value, ResolvedUserFilterIds)
        and len(value) > settings.DATA_MANAGER_LIST_FILTER_MAX_VALUES
    ):
        raise ValidationError(
            f'User filter list exceeds maximum size of {settings.DATA_MANAGER_LIST_FILTER_MAX_VALUES}.'
        )
    raw = value if isinstance(value, list) else [value]
    ids = []
    seen = set()
    for item in raw:
        try:
            if isinstance(item, bool) or (isinstance(item, float) and not item.is_integer()):
                raise ValueError
            user_id = int(item)
        except (TypeError, ValueError):
            raise ValidationError('User filter values must be integer ids.') from None
        if user_id not in seen:
            seen.add(user_id)
            ids.append(user_id)
    return ids


def add_user_filter(enabled, key, _filter, filter_expressions):
    if not enabled:
        return

    if _filter.operator == Operator.EMPTY:
        value = cast_bool_from_str(_filter.value)
        filter_expressions.append(Q(**{key + '__isnull': value}))
        return 'continue'

    user_ids = parse_user_filter_ids(_filter.value)
    if not user_ids:
        return 'skip_line'

    lookup = f'{key}__in'
    if _filter.operator == Operator.CONTAINS:
        filter_expressions.append(Q(**{lookup: user_ids}))
        return 'continue'
    elif _filter.operator == Operator.NOT_CONTAINS:
        filter_expressions.append(~Q(**{lookup: user_ids}))
        return 'continue'


def apply_filters(queryset, filters, project, request):
    if not filters:
        return queryset

    # convert conjunction to orm statement
    custom_filter_expressions = load_func(settings.DATA_MANAGER_CUSTOM_FILTER_EXPRESSIONS)
    preprocess_field_name = load_func(settings.PREPROCESS_FIELD_NAME)
    preprocess_filter = load_func(settings.DATA_MANAGER_PREPROCESS_FILTER)

    # Combine child filters with their parent in the same filter expression.
    # Result-parent hooks consume this complete line and compile one correlated
    # expression; the generic path remains for legacy/non-result filter trees.
    filter_line_expressions: list[list[Q]] = []
    for parent_filter in filters.items:
        child_filters = list(parent_filter.child_filters)
        filter_line = [parent_filter, *child_filters]
        filter_expressions: list[Q] = []

        for _filter in filter_line:
            is_child_filter = _filter is not parent_filter

            # we can also have annotations filters
            if not _filter.filter.startswith('filter:tasks:') or _filter.value is None:
                # Children never become standalone task filters when their parent
                # is empty or malformed.
                if not is_child_filter:
                    break
                continue

            # django orm loop expression attached to column name
            field_name, _ = preprocess_field_name(_filter.filter, project)
            if _is_stale_agreement_field(queryset, field_name):
                logger.warning('Skipping stale agreement filter field: %s', field_name)
                continue
            validate_user_filter_operator(field_name, _filter.operator, _filter.value)

            # filter pre-processing, value type conversion, etc..
            _filter = preprocess_filter(_filter, field_name)

            # Semantic validation for in_list / not_in_list (BROS-1203). Runs *before*
            # the LSE custom hook and *before* the legacy `annotations_ids contains→in_list`
            # rewrite so the rewrite path remains untouched.
            in_list_status = validate_in_list_filter(_filter, field_name)
            if in_list_status == 'none':
                # Empty `in_list`: this filter line matches no rows. Append a contradiction
                # so AND/OR conjunction semantics stay correct (Q(pk__in=[]) is always false).
                filter_expressions.append(Q(pk__in=[]))
                continue
            if in_list_status == 'skip':
                # Empty `not_in_list`: no constraint.
                continue

            # custom expressions for enterprise
            filter_expression = custom_filter_expressions(
                _filter,
                field_name,
                project,
                request=request,
                is_child_filter=is_child_filter,
                child_filter=parent_filter.child_filter if not is_child_filter else None,
                child_filters=child_filters if not is_child_filter else None,
            )
            if isinstance(filter_expression, CustomFilterResult):
                if filter_expression.expression is not None:
                    filter_expressions.append(filter_expression.expression)
                if filter_expression.consume_child_filter:
                    break
                continue
            if filter_expression:
                filter_expressions.append(filter_expression)
                continue

            # annotators
            result = add_user_filter(
                field_name == 'annotators', 'annotations__completed_by', _filter, filter_expressions
            )
            if result == 'skip_line':
                if not is_child_filter:
                    break
                continue
            if result == 'continue':
                continue

            # updated_by
            result = add_user_filter(field_name == 'updated_by', 'updated_by', _filter, filter_expressions)
            if result == 'skip_line':
                if not is_child_filter:
                    break
                continue
            if result == 'continue':
                continue

            # annotations results & predictions results
            if field_name in ['annotations_results', 'predictions_results']:
                result = add_result_filter(field_name, _filter, filter_expressions, project)
                if result == 'exit':
                    return queryset.none()
                elif result == 'continue':
                    continue

            # annotation ids
            if field_name == 'annotations_ids':
                field_name = 'annotations__id'
                if 'contains' in _filter.operator:
                    # convert string like "1 2,3" => [1,2,3]
                    _filter.value = [
                        int(value) for value in re.split(',|;| ', _filter.value) if value and value.isdigit()
                    ]
                    _filter.operator = 'in_list' if _filter.operator == 'contains' else 'not_in_list'
                elif 'equal' in _filter.operator:
                    if not _filter.value.isdigit():
                        _filter.value = 0

            # predictions model versions
            if field_name == 'predictions_model_versions' and _filter.operator == Operator.CONTAINS:
                q = Q()
                for value in _filter.value:
                    q |= Q(predictions__model_version__contains=value)
                filter_expressions.append(q)
                continue
            elif field_name == 'predictions_model_versions' and _filter.operator == Operator.NOT_CONTAINS:
                q = Q()
                for value in _filter.value:
                    q &= ~Q(predictions__model_version__contains=value)
                filter_expressions.append(q)
                continue
            elif field_name == 'predictions_model_versions' and _filter.operator == Operator.EMPTY:
                value = cast_bool_from_str(_filter.value)
                filter_expressions.append(Q(predictions__model_version__isnull=value))
                continue

            # use other name because of model names conflict
            if field_name == 'file_upload':
                field_name = 'file_upload_field'

            # annotate with cast to number if need
            if _filter.type == 'Number' and field_name.startswith('data__'):
                json_field = field_name.replace('data__', '')
                queryset = queryset.annotate(
                    **{
                        f'filter_{json_field.replace("$undefined$", "undefined")}': Cast(
                            KeyTextTransform(json_field, 'data'), output_field=FloatField()
                        )
                    }
                )
                clean_field_name = f'filter_{json_field.replace("$undefined$", "undefined")}'
            else:
                clean_field_name = field_name

            # special case: predictions, annotations, cancelled --- for them 0 is equal to is_empty=True
            if (
                clean_field_name in ('total_predictions', 'total_annotations', 'cancelled_annotations')
                and _filter.operator == 'empty'
            ):
                _filter.operator = 'equal' if cast_bool_from_str(_filter.value) else 'not_equal'
                _filter.value = 0

            # get type of annotated field
            value_type = KNOWN_FILTER_VALUE_TYPES.get(field_name, 'str')
            if field_name not in KNOWN_FILTER_VALUE_TYPES and queryset.exists():
                value_type = type(queryset.values_list(field_name, flat=True)[0]).__name__

            if (value_type == 'list' or value_type == 'tuple') and 'equal' in _filter.operator:
                raise ValidationError('Not supported filter type')

            # special case: for strings empty is "" or null=True
            if _filter.type in ('String', 'Unknown') and _filter.operator == 'empty':
                value = cast_bool_from_str(_filter.value)
                if value:  # empty = true
                    q = Q(Q(**{field_name: None}) | Q(**{field_name + '__isnull': True}))
                    if value_type == 'str':
                        q |= Q(**{field_name: ''})
                    if value_type == 'list':
                        q = Q(**{field_name: [None]})

                else:  # empty = false
                    q = Q(~Q(**{field_name: None}) & ~Q(**{field_name + '__isnull': True}))
                    if value_type == 'str':
                        q &= ~Q(**{field_name: ''})
                    if value_type == 'list':
                        q = ~Q(**{field_name: [None]})

                filter_expressions.append(q)
                continue

            # regex pattern check
            elif _filter.operator == 'regex':
                try:
                    re.compile(pattern=str(_filter.value))
                except Exception as e:
                    logger.info('Incorrect regex for filter: %s: %s', _filter.value, str(e))
                    return queryset.none()

            # append operator
            field_name = f'{clean_field_name}{operators.get(_filter.operator, "")}'

            # in
            if _filter.operator == 'in':
                cast_value(_filter)
                filter_expressions.append(
                    Q(
                        **{
                            f'{field_name}__gte': _filter.value.min,
                            f'{field_name}__lte': _filter.value.max,
                        }
                    ),
                )

            # not in
            elif _filter.operator == 'not_in':
                cast_value(_filter)
                filter_expressions.append(
                    ~Q(
                        **{
                            f'{field_name}__gte': _filter.value.min,
                            f'{field_name}__lte': _filter.value.max,
                        }
                    ),
                )

            # in list
            elif _filter.operator == 'in_list':
                filter_expressions.append(
                    Q(**{f'{field_name}__in': _filter.value}),
                )

            # not in list
            elif _filter.operator == 'not_in_list':
                filter_expressions.append(
                    ~Q(**{f'{field_name}__in': _filter.value}),
                )

            # empty
            elif _filter.operator == 'empty':
                if cast_bool_from_str(_filter.value):
                    filter_expressions.append(Q(**{field_name: True}))
                else:
                    filter_expressions.append(~Q(**{field_name: True}))

            # starting from not_
            elif _filter.operator.startswith('not_'):
                cast_value(_filter)
                filter_expressions.append(~Q(**{field_name: _filter.value}))

            # all others
            else:
                cast_value(_filter)
                filter_expressions.append(Q(**{field_name: _filter.value}))

        if filter_expressions:
            filter_line_expressions.append(filter_expressions)

    resolved_filter_lines = [reduce(lambda x, y: x & y, fle) for fle in filter_line_expressions]

    """WARNING: Stringifying filter_expressions will evaluate the (sub)queryset.
        Do not use a log in the following manner:
        logger.debug(f'Apply filter: {filter_expressions}')
        Even in DEBUG mode, a subqueryset that has OuterRef will raise an error
        if evaluated outside a parent queryset.
    """
    if filters.conjunction == ConjunctionEnum.OR:
        result_filter = Q()
        for resolved_filter in resolved_filter_lines:
            result_filter.add(resolved_filter, Q.OR)
        queryset = queryset.filter(result_filter)
    else:
        for resolved_filter in resolved_filter_lines:
            queryset = queryset.filter(resolved_filter)
    return queryset


class TaskQuerySet(FSMStateQuerySetMixin, models.QuerySet):
    """QuerySet for Task model with Data Manager filters and ordering support."""

    def prepared(self, prepare_params=None):
        """Apply filters, ordering and selected items to queryset

        :param prepare_params: prepare params with project, filters, orderings, etc
        :return: ordered and filtered queryset

        Note: For multi-project queries, filters and ordering will use the first project's
        configuration (label config, custom fields, etc.). This is backwards compatible
        with single-project queries.
        """
        from projects.models import Project

        queryset = self

        if prepare_params is None:
            return queryset

        # Get the project for filter/ordering configuration
        # For multi-project queries, use the first project's configuration
        if prepare_params.is_multi_project:
            project = Project.objects.get(pk=prepare_params.projects[0])
        else:
            # Backwards compatible: prepare_params.project is an int
            project = Project.objects.get(pk=prepare_params.project)
            queryset.project = project

        request = prepare_params.request
        queryset = apply_filters(queryset, prepare_params.filters, project, request)
        queryset = apply_ordering(queryset, prepare_params.ordering, project, request, view_data=prepare_params.data)

        if prepare_params.selectedItems:
            # included selected items
            if prepare_params.selectedItems.all is False and prepare_params.selectedItems.included:
                queryset = queryset.filter(id__in=prepare_params.selectedItems.included)

            # excluded selected items
            elif prepare_params.selectedItems.all is True and prepare_params.selectedItems.excluded:
                queryset = queryset.exclude(id__in=prepare_params.selectedItems.excluded)

        if not prepare_params.is_multi_project:
            queryset.project = project
        return queryset


class GroupConcat(Aggregate):
    function = 'GROUP_CONCAT'
    template = '%(function)s(%(distinct)s%(expressions)s)'

    def __init__(self, expression, distinct=False, output_field=None, **extra):
        output_field = models.JSONField() if output_field is None else output_field
        super().__init__(expression, distinct='DISTINCT ' if distinct else '', output_field=output_field, **extra)


def newest_annotation_subquery() -> Subquery:
    from tasks.models import Annotation

    newest_annotations = Annotation.objects.filter(task=OuterRef('pk')).order_by('-id')[:1]
    return Subquery(newest_annotations.values('created_at'))


def base_annotate_completed_at(queryset: TaskQuerySet) -> TaskQuerySet:
    return queryset.annotate(completed_at=Case(When(is_labeled=True, then=newest_annotation_subquery())))


def annotate_completed_at(queryset: TaskQuerySet) -> TaskQuerySet:
    LseProject = load_func(settings.LSE_PROJECT)
    get_tasks_agreement_queryset = load_func(settings.GET_TASKS_AGREEMENT_QUERYSET)

    is_lse_project = bool(LseProject)
    has_custom_agreement_queryset = bool(get_tasks_agreement_queryset)

    if is_lse_project and has_custom_agreement_queryset:
        return annotated_completed_at_considering_agreement_threshold(queryset)

    return base_annotate_completed_at(queryset)


def annotated_completed_at_considering_agreement_threshold(queryset):
    LseProject = load_func(settings.LSE_PROJECT)
    get_tasks_agreement_queryset = load_func(settings.GET_TASKS_AGREEMENT_QUERYSET)

    is_lse_project = bool(LseProject)
    has_custom_agreement_queryset = bool(get_tasks_agreement_queryset)

    project_exists = is_lse_project and hasattr(queryset, 'project') and queryset.project is not None

    project_id = queryset.project.id if project_exists else None

    if project_id is None or not is_lse_project or not has_custom_agreement_queryset:
        return base_annotate_completed_at(queryset)

    lse_project = fast_first(
        LseProject.objects.filter(project_id=project_id).values(
            'agreement_threshold', 'max_additional_annotators_assignable'
        )
    )

    agreement_threshold = lse_project['agreement_threshold'] if lse_project else None
    if not lse_project or not agreement_threshold:
        # This project doesn't use task_agreement so don't consider it when determining completed_at
        return base_annotate_completed_at(queryset)

    queryset = get_tasks_agreement_queryset(queryset)
    max_additional_annotators_assignable = lse_project['max_additional_annotators_assignable']

    completed_at_case = Case(
        When(
            # If agreement_threshold is set, evaluate all conditions
            Q(is_labeled=True)
            & (
                Q(_agreement__gte=agreement_threshold)
                | Q(annotator_count__gte=(F('overlap') + max_additional_annotators_assignable))
            ),
            then=newest_annotation_subquery(),
        ),
        default=Value(None),
        output_field=DateTimeField(),
    )

    return queryset.annotate(completed_at=completed_at_case)


def annotate_storage_filename(queryset: TaskQuerySet) -> TaskQuerySet:
    from label_studio.data_manager.functions import intersperse

    storage_key_names = [F(s + '__key') for s in settings.IO_STORAGES_IMPORT_LINK_NAMES]
    return queryset.annotate(
        storage_filename=Concat(*intersperse(storage_key_names, Value(';')), output_field=TextField())
    )


def annotate_annotations_results(queryset):
    if settings.DJANGO_DB == settings.DJANGO_DB_SQLITE:
        return queryset.annotate(
            annotations_results=Coalesce(
                GroupConcat('annotations__result'), Value(''), output_field=models.CharField()
            )
        )
    else:
        return queryset.annotate(annotations_results=ArrayAgg('annotations__result', distinct=True, default=Value([])))


def annotate_predictions_results(queryset):
    if settings.DJANGO_DB == settings.DJANGO_DB_SQLITE:
        return queryset.annotate(
            predictions_results=Coalesce(
                GroupConcat('predictions__result'), Value(''), output_field=models.CharField()
            )
        )
    else:
        return queryset.annotate(predictions_results=ArrayAgg('predictions__result', distinct=True, default=Value([])))


def annotate_annotators(queryset):
    if settings.DJANGO_DB == settings.DJANGO_DB_SQLITE:
        return queryset.annotate(
            annotators=Coalesce(GroupConcat('annotations__completed_by'), Value(''), output_field=models.CharField())
        )
    else:
        return queryset.annotate(annotators=ArrayAgg('annotations__completed_by', distinct=True, default=Value([])))


def annotate_predictions_score(queryset):
    first_task = queryset.first()
    if not first_task:
        return queryset

    # new approach with each ML backend contains it's version
    if flag_set('ff_front_dev_1682_model_version_dropdown_070622_short', first_task.project.organization.created_by):
        model_versions = list(
            first_task.project.ml_backends.filter(project=first_task.project).values_list('model_version', flat=True)
        )
        if len(model_versions) == 0:
            return queryset.annotate(predictions_score=Avg('predictions__score'))

        else:
            return queryset.annotate(
                predictions_score=Avg('predictions__score', filter=Q(predictions__model_version__in=model_versions))
            )
    else:
        project = first_task.project
        model_version = project.model_version
        if model_version is not None:
            backend_exists_for_model_version = project.ml_backends.filter(model_version=model_version).exists()
            predictions_exists_for_model_version = False
            if not backend_exists_for_model_version:
                predictions_exists_for_model_version = project.predictions.filter(model_version=model_version).exists()
            if not backend_exists_for_model_version and not predictions_exists_for_model_version:
                # project.model_version can secretly store a title instead of a model_version
                backup_model_version = (
                    project.ml_backends.filter(title=model_version)
                    .order_by('-updated_at')
                    .values_list('model_version', flat=True)
                    .first()
                )
                if backup_model_version is not None:
                    # '' is used for 'no selected model version', don't overwrite it
                    model_version = backup_model_version

        if model_version is None:
            return queryset.annotate(predictions_score=Avg('predictions__score'))
        else:
            return queryset.annotate(
                predictions_score=Avg('predictions__score', filter=Q(predictions__model_version=model_version))
            )


def annotate_annotations_ids(queryset):
    if settings.DJANGO_DB == settings.DJANGO_DB_SQLITE:
        return queryset.annotate(annotations_ids=GroupConcat('annotations__id', output_field=models.CharField()))
    else:
        return queryset.annotate(annotations_ids=ArrayAgg('annotations__id', default=Value([])))


def annotate_predictions_model_versions(queryset):
    if settings.DJANGO_DB == settings.DJANGO_DB_SQLITE:
        return queryset.annotate(
            predictions_model_versions=GroupConcat('predictions__model_version', output_field=models.CharField())
        )
    else:
        return queryset.annotate(predictions_model_versions=ArrayAgg('predictions__model_version', default=Value([])))


def annotate_avg_lead_time(queryset):
    return queryset.annotate(avg_lead_time=Avg('annotations__lead_time'))


def annotate_draft_exists(queryset):
    from tasks.models import AnnotationDraft

    return queryset.annotate(draft_exists=Exists(AnnotationDraft.objects.filter(task=OuterRef('pk'))))


def file_upload(queryset):
    return queryset.annotate(file_upload_field=F('file_upload__file'))


def dummy(queryset):
    return queryset


def annotate_state(queryset):
    """
    Annotate queryset with FSM state as 'state' field.

    Uses FSMStateQuerySetMixin.with_state() to efficiently annotate
    the current state without causing N+1 queries. Aliases 'current_state' to
    'state' to match the Data Manager column name.

    Note: Feature flag checks and user context validation are handled by
    with_state() itself, so no additional checks are needed here.
    """
    # Use the mixin's with_state() method which creates 'current_state' annotation
    # (includes feature flag and user context checks)
    queryset = queryset.with_state()

    # Alias 'current_state' to 'state' for Data Manager column compatibility
    # Only add the alias if current_state was actually added (feature flags enabled)
    if 'current_state' in queryset.query.annotations:
        return queryset.annotate(state=F('current_state'))

    return queryset


settings.DATA_MANAGER_ANNOTATIONS_MAP = {
    'avg_lead_time': annotate_avg_lead_time,
    'completed_at': annotate_completed_at,
    'annotations_results': annotate_annotations_results,
    'predictions_results': annotate_predictions_results,
    'predictions_model_versions': annotate_predictions_model_versions,
    'predictions_score': annotate_predictions_score,
    'annotators': annotate_annotators,
    'annotations_ids': annotate_annotations_ids,
    'file_upload': file_upload,
    'draft_exists': annotate_draft_exists,
    'storage_filename': annotate_storage_filename,
    'state': annotate_state,
}


def get_annotations_map():
    return settings.DATA_MANAGER_ANNOTATIONS_MAP


def update_annotation_map(obj):
    settings.DATA_MANAGER_ANNOTATIONS_MAP.update(obj)


class PreparedTaskManager(models.Manager):
    """
    Manager for Task model with Data Manager annotations.

    Provides:
    - Advanced query annotations for Data Manager
    - Filter and ordering support
    - FSM state annotation support (via TaskQuerySet)

    Note: Overrides the base get_queryset() to return TaskQuerySet. Also has
    a custom get_queryset(fields_for_evaluation, prepare_params, ...) method
    for Data Manager-specific functionality.
    """

    @staticmethod
    def annotate_queryset(
        queryset, fields_for_evaluation=None, all_fields=False, excluded_fields_for_evaluation=None, request=None
    ):
        annotations_map = get_annotations_map()
        project = getattr(queryset, 'project', None)
        # If configured, inject dynamic annotation fields without mutating the global map.
        # Do not pre-gate this with the Agreement V2 feature flag here: LSE uses this hook
        # for project-level Agreement V2 targeting, so the hook itself must decide whether
        # to return dynamic agreement fields for the current project.
        inject_path = getattr(settings, 'GET_DYNAMIC_DM_ANNOTATIONS', None)
        if inject_path:
            overlay_func = load_func(inject_path)
            # Expect a dict of {field_name: function that annotates the queryset}
            if project is None:
                first_task = queryset.first()
                project = None if first_task is None else first_task.project
                if project is not None:
                    queryset.project = project
            overlay_map = overlay_func(request=request, project=project) or {}
            if isinstance(overlay_map, dict) and overlay_map:
                # Only add overlay_map keys if they're explicitly requested in fields_for_evaluation
                # or if all_fields=True. Don't automatically add all overlay_map keys to avoid
                # processing all tasks when only a page is needed (e.g., in only_filtered).
                # Merge overlay with base map for this call only (all keys available, but only used if requested)
                annotations_map = {**annotations_map, **overlay_map}
                # Only add overlay_map keys to fields_for_evaluation if they're explicitly requested
                if fields_for_evaluation is not None:
                    # Only include overlay_map keys that are already in fields_for_evaluation
                    overlay_keys_in_request = [k for k in overlay_map.keys() if k in fields_for_evaluation]
                    if overlay_keys_in_request:
                        # Ensure they're in the list (they already are, but this makes it explicit)
                        fields_for_evaluation = list(set(fields_for_evaluation) | set(overlay_keys_in_request))

        if fields_for_evaluation is None:
            fields_for_evaluation = []

        if excluded_fields_for_evaluation is None:
            excluded_fields_for_evaluation = []

        if request is not None:
            # Expose the exact annotation fields requested in this pass so downstream
            # annotators can choose cheaper implementations when safe.
            request._dm_annotation_fields = tuple(fields_for_evaluation)

        if project is None:
            first_task = queryset.first()
            project = None if first_task is None else first_task.project
            if project is not None:
                queryset.project = project

        # db annotations applied only if we need them in ordering or filters
        for field in annotations_map.keys():
            # Include field if it's explicitly requested or all_fields=True, but exclude if it's in the exclusion list
            if (field in fields_for_evaluation or all_fields) and field not in excluded_fields_for_evaluation:
                queryset.project = project
                queryset.request = request
                function = annotations_map[field]
                queryset = function(queryset)

        return queryset

    def get_queryset(
        self, fields_for_evaluation=None, prepare_params=None, all_fields=False, excluded_fields_for_evaluation=None
    ):
        """
        Get queryset with optional Data Manager annotations and filters.

        When called without parameters (Django internal use), returns TaskQuerySet.
        When called with parameters (Data Manager use), returns annotated and filtered queryset.

        :param fields_for_evaluation: list of annotated fields in task
        :param prepare_params: filters, ordering, selected items
        :param all_fields: evaluate all fields for task
        :param excluded_fields_for_evaluation: list of fields to exclude even when all_fields=True
        :param request: request for user extraction
        :return: task queryset with annotated fields
        """
        # If called without parameters, return base TaskQuerySet (for Django internal use)
        if prepare_params is None:
            return TaskQuerySet(self.model, using=self._db)

        # Otherwise, use Data Manager filtering and annotation
        queryset = self.only_filtered(prepare_params=prepare_params)
        # Expose view data to annotation functions for column-specific configuration
        queryset.view_data = getattr(prepare_params, 'data', None)
        return self.annotate_queryset(
            queryset,
            fields_for_evaluation=fields_for_evaluation,
            all_fields=all_fields,
            excluded_fields_for_evaluation=excluded_fields_for_evaluation,
            request=prepare_params.request,
        )

    def only_filtered(self, prepare_params=None):
        from projects.models import Project

        request = prepare_params.request
        if request is not None and hasattr(request, '_dm_prefilter_task_ids'):
            delattr(request, '_dm_prefilter_task_ids')
        # Support both single and multiple projects
        if prepare_params.is_multi_project:
            queryset = TaskQuerySet(self.model).filter(project__in=prepare_params.projects)
            project = Project.objects.get(pk=prepare_params.projects[0])
            queryset.project = project
        else:
            queryset = TaskQuerySet(self.model).filter(project=prepare_params.project)
            project = Project.objects.get(pk=prepare_params.project)
            # Attach project before annotate_queryset so it does not call queryset.first().
            queryset.project = project
            _set_prefilter_task_ids_for_agreement(request, queryset, prepare_params, project)
        fields_for_filter_ordering = get_fields_for_filter_ordering(prepare_params)
        queryset = self.annotate_queryset(queryset, fields_for_evaluation=fields_for_filter_ordering, request=request)
        # TaskListAPI runs a second annotate_queryset on the same request for the paginated id__in slice.
        # Drop the prefilter so agreement does not reuse this large ID list for that pass (must use page tasks only).
        if request is not None and hasattr(request, '_dm_prefilter_task_ids'):
            delattr(request, '_dm_prefilter_task_ids')
        return queryset.prepared(prepare_params=prepare_params)


class TaskManager(models.Manager):
    """
    Default manager for Task model.

    Provides:
    - User-scoped filtering
    - Custom QuerySet with FSM state support

    Note: Overrides get_queryset() to return TaskQuerySet, which includes
    FSMStateQuerySetMixin for state annotation support.
    """

    def get_queryset(self):
        """Return TaskQuerySet which includes FSM state annotation support"""
        return TaskQuerySet(self.model, using=self._db)

    def for_user(self, user):
        return self.get_queryset().filter(project__organization=user.active_organization)

    def with_state(self):
        """Return queryset with FSM state annotated."""
        return self.get_queryset().with_state()
