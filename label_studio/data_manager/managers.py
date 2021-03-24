"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import logging
import re

from django.db import models
from django.db.models import Aggregate, Count, Exists, OuterRef, Subquery, Avg, Q, F, Value
from django.contrib.postgres.aggregates import ArrayAgg
from django.db.models.functions import Coalesce
from django.conf import settings

from data_manager.prepare_params import ConjunctionEnum

logger = logging.getLogger(__name__)

operators = {
    "equal": "",
    "not_equal": "",
    "less": "__lt",
    "greater": "__gt",
    "less_or_equal": "__lte",
    "greater_or_equal": "__gte",
    "in": "",
    "not_in": "",
    "empty": "__isnull",
    "contains": "__icontains",
    "not_contains": "__icontains",
}


def preprocess_field_name(raw_field_name, operator, only_undefined_field=False):
    field_name = raw_field_name.replace("filter:tasks:", "")
    if field_name.startswith("data."):
        if only_undefined_field:
            field_name = f'data__{settings.DATA_UNDEFINED_NAME}'
        else:
            field_name = field_name.replace("data.", "data__")

    # append operator
    field_name = "{}{}".format(field_name, operators.get(operator, ""))

    return field_name


def get_fields_for_annotation(prepare_params):
    """ Collecting field names to annotate them

    :param prepare_params: structure with filters and ordering
    :return: list of field names
    """
    from tasks.models import Task

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

    # remove duplicates
    result = set(result)

    # we don't need to annotate regular model fields, so we skip them
    skipped_fields = [field.attname for field in Task._meta.fields]
    skipped_fields.append("id")
    result = [f for f in result if f not in skipped_fields]
    result = [f for f in result if not f.startswith("data.")]

    return result


def apply_ordering(queryset, ordering):
    if ordering:
        field_name = ordering[0].replace("tasks:", "")
        if "data." in field_name:
            field_name = field_name.replace(".", "__", 1)
            only_undefined_field = queryset.exists() and queryset.first().project.only_undefined_field
            if only_undefined_field:
                field_name = re.sub('data__\w+', f'data__{settings.DATA_UNDEFINED_NAME}', field_name)

        ascending = False if field_name[0] == '-' else True  # detect direction
        field_name = field_name[1:] if field_name[0] == '-' else field_name  # remove direction

        f = F(field_name).asc(nulls_last=True) if ascending else F(field_name).desc(nulls_last=True)
        queryset = queryset.order_by(f)
    else:
        queryset = queryset.order_by("id")

    return queryset


def apply_filters(queryset, filters):
    if not filters:
        return queryset

    # convert conjunction to orm statement
    filter_expression = Q()
    if filters.conjunction == ConjunctionEnum.OR:
        conjunction = Q.OR
    else:
        conjunction = Q.AND

    only_undefined_field = queryset.exists() and queryset.first().project.only_undefined_field

    for _filter in filters.items:
        # we can also have annotations filters
        if not _filter.filter.startswith("filter:tasks:"):
            continue

        # django orm loop expression attached to column name
        field_name = preprocess_field_name(_filter.filter, _filter.operator, only_undefined_field)

        if _filter.operator == "in":
            filter_expression.add(
                Q(
                    **{
                        "{}__gte".format(field_name): _filter.value.min,
                        "{}__lte".format(field_name): _filter.value.max,
                    }
                ),
                conjunction,
            )
        elif _filter.operator == "not_in":
            filter_expression.add(
                ~Q(
                    **{
                        "{}__gte".format(field_name): _filter.value.min,
                        "{}__lte".format(field_name): _filter.value.max,
                    }
                ),
                conjunction,
            )
        elif _filter.operator == 'empty':
            if _filter.value == 'True':
                filter_expression.add(Q(**{field_name: True}), conjunction)
            else:
                filter_expression.add(~Q(**{field_name: True}), conjunction)
        elif _filter.operator.startswith("not_"):
            filter_expression.add(~Q(**{field_name: _filter.value}), conjunction)
        else:
            filter_expression.add(Q(**{field_name: _filter.value}), conjunction)
    logger.debug(f'Apply filter: {filter_expression}')
    queryset = queryset.filter(filter_expression)
    return queryset


class TaskQuerySet(models.QuerySet):
    def prepared(self, prepare_params=None):
        """ Apply filters, ordering and selected items to queryset

        :param prepare_params: prepare params with project, filters, orderings, etc
        :return: ordered and filtered queryset
        """
        queryset = self

        # project filter
        if prepare_params.project is not None:
            queryset = queryset.filter(project=prepare_params.project)

        queryset = apply_filters(queryset, prepare_params.filters)
        queryset = apply_ordering(queryset, prepare_params.ordering)

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

    def __init__(self, expression, distinct=False, **extra):
        super().__init__(
            expression, distinct="DISTINCT " if distinct else "", output_field=models.CharField(), **extra
        )


def annotate_completed_at(queryset):
    from tasks.models import Annotation

    newest = Annotation.objects.filter(task=OuterRef("pk")).order_by("-created_at")
    return queryset.annotate(completed_at=Subquery(newest.values("created_at")[:1]))


def annotate_cancelled_annotations(queryset):
    from tasks.models import Annotation

    cancelled_annotations = Annotation.objects.filter(was_cancelled=True, task=OuterRef("pk"))
    return queryset.annotate(cancelled_annotations=Exists(cancelled_annotations))


def annotate_annotations_results(queryset):
    if settings.DJANGO_DB == settings.DJANGO_DB_SQLITE:
        return queryset.annotate(annotations_results=Coalesce(GroupConcat("annotations__result"), Value('')))
    else:
        return queryset.annotate(annotations_results=ArrayAgg("annotations__result"))


def annotate_predictions_results(queryset):
    if settings.DJANGO_DB == settings.DJANGO_DB_SQLITE:
        return queryset.annotate(predictions_results=Coalesce(GroupConcat("predictions__result"), Value('')))
    else:
        return queryset.annotate(predictions_results=ArrayAgg("predictions__result"))


def annotate_annotators(queryset):
    if settings.DJANGO_DB == settings.DJANGO_DB_SQLITE:
        return queryset.annotate(annotators=Coalesce(GroupConcat("annotations__completed_by"), Value(None)))
    else:
        return queryset.annotate(annotators=ArrayAgg("annotations__completed_by"))


def annotate_predictions_score(queryset):
    return queryset.annotate(predictions_score=Avg("predictions__score"))


def dummy(queryset):
    return queryset


annotations_map = {
    "completed_at": annotate_completed_at,
    "cancelled_annotations": annotate_cancelled_annotations,
    "annotations_results": annotate_annotations_results,
    "predictions_results": annotate_predictions_results,
    "predictions_score": annotate_predictions_score,
    "annotators": annotate_annotators,
    "total_annotations": dummy,
    "total_predictions": dummy
}


class PreparedTaskManager(models.Manager):
    def get_queryset(self, fields_for_evaluation=None):
        queryset = TaskQuerySet(self.model)

        if fields_for_evaluation is None:
            fields_for_evaluation = []

        # default annotations for calculating total values in pagination output
        queryset = queryset.annotate(
            total_annotations=Count("annotations", distinct=True, filter=Q(annotations__was_cancelled=False)),
            total_predictions=Count("predictions", distinct=True),
        )

        # db annotations applied only if we need them in ordering or filters
        for field in fields_for_evaluation:
            function = annotations_map[field]
            queryset = function(queryset)

        return queryset

    def all(self, prepare_params=None):
        """ Make a task queryset with filtering, ordering, annotations

        :param prepare_params: prepare params with filters, orderings, etc
        :return: TaskQuerySet with filtered, ordered, annotated tasks
        """
        if prepare_params is None:
            return self.get_queryset()

        fields_for_annotation = get_fields_for_annotation(prepare_params)
        return self.get_queryset(fields_for_annotation).prepared(prepare_params=prepare_params)
