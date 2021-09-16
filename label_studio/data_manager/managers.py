"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import logging
import re

from pydantic import BaseModel

from django.db import models
from django.db.models import Aggregate, Count, Exists, OuterRef, Subquery, Avg, Q, F, Value
from django.contrib.postgres.aggregates import ArrayAgg
from django.contrib.postgres.fields.jsonb import KeyTextTransform
from django.db.models.functions import Coalesce
from django.conf import settings
from django.db.models.functions import Cast
from django.db.models import FloatField
from datetime import datetime

from data_manager.prepare_params import ConjunctionEnum
from label_studio.core.utils.params import cast_bool_from_str
from label_studio.core.utils.common import load_func

logger = logging.getLogger(__name__)

DATETIME_FORMAT = '%Y-%m-%dT%H:%M:%S.%fZ'


class _Operator(BaseModel):
    EQUAL = "equal"
    NOT_EQUAL = "not_equal"
    LESS = "less"
    GREATER = "greater"
    LESS_OR_EQUAL = "less_or_equal"
    GREATER_OR_EQUAL = "greater_or_equal"
    IN = "in"
    NOT_IN = "not_in"
    IN_LIST = "in_list"
    NOT_IN_LIST = "not_in_list"
    EMPTY = "empty"
    CONTAINS = "contains"
    NOT_CONTAINS = "not_contains"
    REGEX = "regex"


Operator = _Operator()

operators = {
    Operator.EQUAL: "",
    Operator.NOT_EQUAL: "",
    Operator.LESS: "__lt",
    Operator.GREATER: "__gt",
    Operator.LESS_OR_EQUAL: "__lte",
    Operator.GREATER_OR_EQUAL: "__gte",
    Operator.IN: "",
    Operator.NOT_IN: "",
    Operator.IN_LIST: "",
    Operator.NOT_IN_LIST: "",
    Operator.EMPTY: "__isnull",
    Operator.CONTAINS: "__icontains",
    Operator.NOT_CONTAINS: "__icontains",
    Operator.REGEX: "__regex"
}


def preprocess_field_name(raw_field_name, only_undefined_field=False):
    field_name = raw_field_name.replace("filter:tasks:", "")
    if field_name.startswith("data."):
        if only_undefined_field:
            field_name = f'data__{settings.DATA_UNDEFINED_NAME}'
        else:
            field_name = field_name.replace("data.", "data__")

    return field_name


def get_fields_for_evaluation(prepare_params, request):
    """ Collecting field names to annotate them

    :param prepare_params: structure with filters and ordering
    :param request: django request
    :return: list of field names
    """
    from tasks.models import Task
    from projects.models import Project

    result = []
    # collect fields from ordering
    if prepare_params.ordering:
        ordering_field_name = prepare_params.ordering[0].replace("tasks:", "").replace("-", "")
        result.append(ordering_field_name)

    # collect fields from filters
    if prepare_params.filters:
        for _filter in prepare_params.filters.items:
            filter_field_name = _filter.filter.replace("filter:tasks:", "")
            result.append(filter_field_name)

    # visible fields calculation
    fields = prepare_params.data.get('hiddenColumns', None)
    if fields:
        from label_studio.data_manager.functions import TASKS
        GET_ALL_COLUMNS = load_func(settings.DATA_MANAGER_GET_ALL_COLUMNS)
        # we need to have a request here to detect user role
        all_columns = GET_ALL_COLUMNS(request, Project.objects.get(id=prepare_params.project))
        all_columns = set([TASKS + ('data.' if c.get('parent', None) == 'data' else '') + c['id']
                           for c in all_columns['columns']])
        hidden = set(fields['explore']) & set(fields['labeling'])
        shown = all_columns - hidden
        shown = {c[len(TASKS):] for c in shown} - {'data'}  # remove tasks:
        result = set(result) | shown

    # remove duplicates
    result = set(result)

    # we don't need to annotate regular model fields, so we skip them
    skipped_fields = [field.attname for field in Task._meta.fields]
    skipped_fields.append("id")
    result = [f for f in result if f not in skipped_fields]
    result = [f for f in result if not f.startswith("data.")]

    return result


def apply_ordering(queryset, ordering, only_undefined_field=False):
    if ordering:
        field_name = ordering[0].replace("tasks:", "")
        ascending = False if field_name[0] == '-' else True  # detect direction
        field_name = field_name[1:] if field_name[0] == '-' else field_name  # remove direction

        if "data." in field_name:
            field_name = field_name.replace(".", "__", 1)
            if only_undefined_field:
                field_name = re.sub('data__\w+', f'data__{settings.DATA_UNDEFINED_NAME}', field_name)

            # annotate task with data field for float/int/bool ordering support
            json_field = field_name.replace('data__', '')
            queryset = queryset.annotate(ordering_field=KeyTextTransform(json_field, 'data'))
            f = F('ordering_field').asc(nulls_last=True) if ascending else F('ordering_field').desc(nulls_last=True)

        else:
            f = F(field_name).asc(nulls_last=True) if ascending else F(field_name).desc(nulls_last=True)

        queryset = queryset.order_by(f)
    else:
        queryset = queryset.order_by("id")

    return queryset


def cast_value(_filter):
    # range (is between)
    if hasattr(_filter.value, 'max'):
        if _filter.type == 'Number':
            _filter.value.min = float(_filter.value.min)
            _filter.value.max = float(_filter.value.max)
        elif _filter.type == 'Datetime':
            _filter.value.min = datetime.strptime(_filter.value.min, DATETIME_FORMAT)
            _filter.value.max = datetime.strptime(_filter.value.max, DATETIME_FORMAT)
    # one value
    else:
        if _filter.type == 'Number':
            _filter.value = float(_filter.value)
        elif _filter.type == 'Datetime':
            _filter.value = datetime.strptime(_filter.value, DATETIME_FORMAT)
        elif _filter.type == 'Boolean':
            _filter.value = cast_bool_from_str(_filter.value)


def apply_filters(queryset, filters, only_undefined_field=False):
    if not filters:
        return queryset

    # convert conjunction to orm statement
    filter_expressions = Q()
    conjunction = Q.OR if filters.conjunction == ConjunctionEnum.OR else Q.AND

    for _filter in filters.items:

        # we can also have annotations filters
        if not _filter.filter.startswith("filter:tasks:") or _filter.value is None:
            continue

        # django orm loop expression attached to column name
        field_name = preprocess_field_name(_filter.filter, only_undefined_field)

        # custom expressions for enterprise
        if settings.DATA_MANAGER_CUSTOM_FILTER_EXPRESSIONS:
            custom_filter_expressions = load_func(settings.DATA_MANAGER_CUSTOM_FILTER_EXPRESSIONS)
            if custom_filter_expressions(filter_expressions, field_name, _filter.operator, conjunction, _filter):
                continue

        # annotators
        if field_name == 'annotators' and _filter.operator == Operator.CONTAINS:
            filter_expressions.add(Q(annotations__completed_by=int(_filter.value)), conjunction)
            continue
        elif field_name == 'annotators' and _filter.operator == Operator.NOT_CONTAINS:
            filter_expressions.add(~Q(annotations__completed_by=int(_filter.value)), conjunction)
            continue
        elif field_name == 'annotators' and _filter.operator == Operator.EMPTY:
            value = cast_bool_from_str(_filter.value)
            filter_expressions.add(Q(annotations__completed_by__isnull=value), conjunction)
            continue

        # annotations results
        elif field_name == 'annotations_results' and _filter.operator == Operator.CONTAINS:
            filter_expressions.add(Q(annotations__result__icontains=_filter.value), conjunction)
            continue
        elif field_name == 'annotations_results' and _filter.operator == Operator.NOT_CONTAINS:
            filter_expressions.add(~Q(annotations__result__icontains=_filter.value), conjunction)
            continue

        # annotation ids
        if field_name == 'annotations_ids':
            field_name = 'annotations__id'
            if 'contains' in _filter.operator:
                # convert string like "1 2,3" => [1,2,3]
                _filter.value = [int(value)
                                 for value in re.split(',|;| ', _filter.value)
                                 if value and value.isdigit()]
                _filter.operator = 'in_list' if _filter.operator == 'contains' else 'not_in_list'
            elif 'equal' in _filter.operator:
                if not _filter.value.isdigit():
                    _filter.value = 0

        # use other name because of model names conflict
        if field_name == 'file_upload':
            field_name = 'file_upload_field'

        # annotate with cast to number if need
        if _filter.type == 'Number' and field_name.startswith('data__'):
            json_field = field_name.replace('data__', '')
            queryset = queryset.annotate(**{
                f'filter_{json_field.replace("$undefined$", "undefined")}':
                    Cast(KeyTextTransform(json_field, 'data'), output_field=FloatField())
            })
            clean_field_name = f'filter_{json_field.replace("$undefined$", "undefined")}'
        else:
            clean_field_name = field_name

        # special case: predictions, annotations, cancelled --- for them 0 is equal to is_empty=True
        if clean_field_name in ('total_predictions', 'total_annotations', 'cancelled_annotations') and \
                _filter.operator == 'empty':
            _filter.operator = 'equal' if cast_bool_from_str(_filter.value) else 'not_equal'
            _filter.value = 0

        # get type of annotated field
        value_type = 'str'
        if queryset.exists():
            value_type = type(queryset.values_list(field_name, flat=True)[0]).__name__

        if (value_type == 'list' or value_type == 'tuple') and 'equal' in _filter.operator:
            _filter.value = '{' + str(_filter.value) + '}'

        # special case: for strings empty is "" or null=True
        if _filter.type in ('String', 'Unknown') and _filter.operator == 'empty':
            value = cast_bool_from_str(_filter.value)
            if value:  # empty = true
                q = Q(
                    Q(**{field_name: None}) | Q(**{field_name+'__isnull': True})
                )
                if value_type == 'str':
                    q |= Q(**{field_name: ''})
                if value_type == 'list':
                    q = Q(**{field_name: [None]})

            else:  # empty = false
                q = Q(
                    ~Q(**{field_name: None}) & ~Q(**{field_name+'__isnull': True})
                )
                if value_type == 'str':
                    q &= ~Q(**{field_name: ''})
                if value_type == 'list':
                    q = ~Q(**{field_name: [None]})

            filter_expressions.add(q, conjunction)
            continue

        # regex pattern check
        elif _filter.operator == 'regex':
            try:
                re.compile(pattern=str(_filter.value))
            except Exception as e:
                logger.info('Incorrect regex for filter: %s: %s', _filter.value, str(e))
                return queryset.none()

        # append operator
        field_name = f"{clean_field_name}{operators.get(_filter.operator, '')}"

        # in
        if _filter.operator == "in":
            cast_value(_filter)
            filter_expressions.add(
                Q(
                    **{
                        f"{field_name}__gte": _filter.value.min,
                        f"{field_name}__lte": _filter.value.max,
                    }
                ),
                conjunction,
            )

        # not in
        elif _filter.operator == "not_in":
            cast_value(_filter)
            filter_expressions.add(
                ~Q(
                    **{
                        f"{field_name}__gte": _filter.value.min,
                        f"{field_name}__lte": _filter.value.max,
                    }
                ),
                conjunction,
            )

        # in list
        elif _filter.operator == "in_list":
            filter_expressions.add(
                Q(**{f"{field_name}__in": _filter.value}),
                conjunction,
            )

        # not in list
        elif _filter.operator == "not_in_list":
            filter_expressions.add(
                ~Q(**{f"{field_name}__in": _filter.value}),
                conjunction,
            )

        # empty
        elif _filter.operator == 'empty':
            if cast_bool_from_str(_filter.value):
                filter_expressions.add(Q(**{field_name: True}), conjunction)
            else:
                filter_expressions.add(~Q(**{field_name: True}), conjunction)

        # starting from not_
        elif _filter.operator.startswith("not_"):
            cast_value(_filter)
            filter_expressions.add(~Q(**{field_name: _filter.value}), conjunction)

        # all others
        else:
            cast_value(_filter)
            filter_expressions.add(Q(**{field_name: _filter.value}), conjunction)
    
    logger.debug(f'Apply filter: {filter_expressions}')
    queryset = queryset.filter(filter_expressions)
    return queryset


class TaskQuerySet(models.QuerySet):
    def prepared(self, prepare_params=None):
        """ Apply filters, ordering and selected items to queryset

        :param prepare_params: prepare params with project, filters, orderings, etc
        :return: ordered and filtered queryset
        """
        from projects.models import Project

        queryset = self

        # project filter
        if prepare_params.project is not None:
            queryset = queryset.filter(project=prepare_params.project)

        project = Project.objects.get(pk=prepare_params.project)

        queryset = apply_filters(queryset, prepare_params.filters, only_undefined_field=project.only_undefined_field)
        queryset = apply_ordering(queryset, prepare_params.ordering, only_undefined_field=project.only_undefined_field)

        if not prepare_params.selectedItems:
            return queryset

        # included selected items
        if prepare_params.selectedItems.all is False and prepare_params.selectedItems.included:
            queryset = queryset.filter(id__in=prepare_params.selectedItems.included)

        # excluded selected items
        elif prepare_params.selectedItems.all is True and prepare_params.selectedItems.excluded:
            queryset = queryset.exclude(id__in=prepare_params.selectedItems.excluded)

        return queryset


class GroupConcat(Aggregate):
    function = "GROUP_CONCAT"
    template = "%(function)s(%(distinct)s%(expressions)s)"

    def __init__(self, expression, distinct=False, output_field=None, **extra):
        output_field = models.JSONField() if output_field is None else output_field
        super().__init__(
            expression, distinct="DISTINCT " if distinct else "", output_field=output_field, **extra
        )


def annotate_completed_at(queryset):
    from tasks.models import Annotation

    newest = Annotation.objects.filter(task=OuterRef("pk"), task__is_labeled=True).distinct().order_by("-created_at")
    return queryset.annotate(completed_at=Subquery(newest.values("created_at")[:1]))


def annotate_annotations_results(queryset):
    if settings.DJANGO_DB == settings.DJANGO_DB_SQLITE:
        return queryset.annotate(annotations_results=Coalesce(
            GroupConcat("annotations__result"), Value(''), output_field=models.CharField()))
    else:
        return queryset.annotate(annotations_results=ArrayAgg("annotations__result", distinct=True))


def annotate_predictions_results(queryset):
    if settings.DJANGO_DB == settings.DJANGO_DB_SQLITE:
        return queryset.annotate(predictions_results=Coalesce(
            GroupConcat("predictions__result"), Value(''), output_field=models.CharField()))
    else:
        return queryset.annotate(predictions_results=ArrayAgg("predictions__result", distinct=True))


def annotate_annotators(queryset):
    if settings.DJANGO_DB == settings.DJANGO_DB_SQLITE:
        return queryset.annotate(annotators=Coalesce(
            GroupConcat("annotations__completed_by"), Value(''), output_field=models.CharField()))
    else:
        return queryset.annotate(annotators=ArrayAgg("annotations__completed_by", distinct=True))


def annotate_predictions_score(queryset):
    return queryset.annotate(predictions_score=Avg("predictions__score"))


def annotate_annotations_ids(queryset):
    if settings.DJANGO_DB == settings.DJANGO_DB_SQLITE:
        return queryset.annotate(annotations_ids=GroupConcat('annotations__id', output_field=models.CharField()))
    else:
        return queryset.annotate(annotations_ids=ArrayAgg('annotations__id'))


def file_upload(queryset):
    return queryset.annotate(file_upload_field=F('file_upload__file'))


def dummy(queryset):
    return queryset


settings.DATA_MANAGER_ANNOTATIONS_MAP = {
    "completed_at": annotate_completed_at,
    "annotations_results": annotate_annotations_results,
    "predictions_results": annotate_predictions_results,
    "predictions_score": annotate_predictions_score,
    "annotators": annotate_annotators,
    "annotations_ids": annotate_annotations_ids,
    "file_upload": file_upload,
    "cancelled_annotations": dummy,
    "total_annotations": dummy,
    "total_predictions": dummy
}


def get_annotations_map():
    return settings.DATA_MANAGER_ANNOTATIONS_MAP


def update_annotation_map(obj):
    settings.DATA_MANAGER_ANNOTATIONS_MAP.update(obj)


class PreparedTaskManager(models.Manager):
    def get_queryset(self, fields_for_evaluation=None):
        """
        :param fields_for_evaluation: list of annotated fields in task or 'all' or None
        :return: task queryset with annotated fields
        """
        queryset = TaskQuerySet(self.model)
        annotations_map = get_annotations_map()

        all_fields = fields_for_evaluation == 'all'
        if fields_for_evaluation is None:
            fields_for_evaluation = []

        # default annotations for calculating total values in pagination output
        if 'total_annotations' in fields_for_evaluation or 'annotators' in fields_for_evaluation or all_fields:
            queryset = queryset.annotate(
                total_annotations=Count("annotations", distinct=True, filter=Q(annotations__was_cancelled=False))
            )
        if 'cancelled_annotations' in fields_for_evaluation or all_fields:
            queryset = queryset.annotate(
                cancelled_annotations=Count("annotations", distinct=True, filter=Q(annotations__was_cancelled=True))
            )
        if 'total_predictions' in fields_for_evaluation or all_fields:
            queryset = queryset.annotate(
                total_predictions=Count("predictions", distinct=True)
            )

        # db annotations applied only if we need them in ordering or filters
        for field in annotations_map.keys():
            if field in fields_for_evaluation or all_fields:
                function = annotations_map[field]
                queryset = function(queryset)

        return queryset

    def all(self, prepare_params=None, request=None, fields_for_evaluation=None):
        """ Make a task queryset with filtering, ordering, annotations

        :param prepare_params: prepare params with filters, orderings, etc
        :param request: django request instance from API
        :param fields_for_evaluation - 'all' or None for auto-evaluation by enabled filters, ordering, fields
        :return: TaskQuerySet with filtered, ordered, annotated tasks
        """
        if prepare_params is None:
            return self.get_queryset()

        fields = fields_for_evaluation or get_fields_for_evaluation(prepare_params, request)
        return self.get_queryset(
            fields_for_evaluation=fields
        ).prepared(prepare_params=prepare_params)


class TaskManager(models.Manager):
    def for_user(self, user):
        return self.filter(project__organization=user.active_organization)
