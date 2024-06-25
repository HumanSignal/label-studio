"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import logging
import re
from datetime import datetime
from typing import ClassVar

import ujson as json
from core.feature_flags import flag_set
from core.utils.db import fast_first
from data_manager.prepare_params import ConjunctionEnum
from django.conf import settings
from django.contrib.postgres.aggregates import ArrayAgg
from django.contrib.postgres.fields.jsonb import KeyTextTransform
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
from django.db.models.functions import Cast, Coalesce, Concat
from pydantic import BaseModel

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
        field_name, ascending = preprocess_field_name(
            raw_field_name, only_undefined_field=project.only_undefined_field
        )

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

        else:
            f = F(field_name).asc(nulls_last=True) if ascending else F(field_name).desc(nulls_last=True)

        queryset = queryset.order_by(f)
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


def add_user_filter(enabled, key, _filter, filter_expressions):
    if enabled and _filter.operator == Operator.CONTAINS:
        filter_expressions.append(Q(**{key: int(_filter.value)}))
        return 'continue'
    elif enabled and _filter.operator == Operator.NOT_CONTAINS:
        filter_expressions.append(~Q(**{key: int(_filter.value)}))
        return 'continue'
    elif enabled and _filter.operator == Operator.EMPTY:
        value = cast_bool_from_str(_filter.value)
        filter_expressions.append(Q(**{key + '__isnull': value}))
        return 'continue'


def apply_filters(queryset, filters, project, request):
    if not filters:
        return queryset

    # convert conjunction to orm statement
    filter_expressions = []
    custom_filter_expressions = load_func(settings.DATA_MANAGER_CUSTOM_FILTER_EXPRESSIONS)

    for _filter in filters.items:

        # we can also have annotations filters
        if not _filter.filter.startswith('filter:tasks:') or _filter.value is None:
            continue

        # django orm loop expression attached to column name
        preprocess_field_name = load_func(settings.PREPROCESS_FIELD_NAME)
        field_name, _ = preprocess_field_name(_filter.filter, project.only_undefined_field)

        # filter pre-processing, value type conversion, etc..
        preprocess_filter = load_func(settings.DATA_MANAGER_PREPROCESS_FILTER)
        _filter = preprocess_filter(_filter, field_name)

        # custom expressions for enterprise
        filter_expression = custom_filter_expressions(_filter, field_name, project, request=request)
        if filter_expression:
            filter_expressions.append(filter_expression)
            continue

        # annotators
        result = add_user_filter(field_name == 'annotators', 'annotations__completed_by', _filter, filter_expressions)
        if result == 'continue':
            continue

        # updated_by
        result = add_user_filter(field_name == 'updated_by', 'updated_by', _filter, filter_expressions)
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
                _filter.value = [int(value) for value in re.split(',|;| ', _filter.value) if value and value.isdigit()]
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
        value_type = 'str'
        if queryset.exists():
            value_type = type(queryset.values_list(field_name, flat=True)[0]).__name__

        if (value_type == 'list' or value_type == 'tuple') and 'equal' in _filter.operator:
            raise Exception('Not supported filter type')

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
        field_name = f"{clean_field_name}{operators.get(_filter.operator, '')}"

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

    """WARNING: Stringifying filter_expressions will evaluate the (sub)queryset.
        Do not use a log in the following manner:
        logger.debug(f'Apply filter: {filter_expressions}')
        Even in DEBUG mode, a subqueryset that has OuterRef will raise an error
        if evaluated outside a parent queryset.
    """
    if filters.conjunction == ConjunctionEnum.OR:
        result_filter = Q()
        for filter_expression in filter_expressions:
            result_filter.add(filter_expression, Q.OR)
        queryset = queryset.filter(result_filter)
    else:
        for filter_expression in filter_expressions:
            queryset = queryset.filter(filter_expression)
    return queryset


class TaskQuerySet(models.QuerySet):
    def prepared(self, prepare_params=None):
        """Apply filters, ordering and selected items to queryset

        :param prepare_params: prepare params with project, filters, orderings, etc
        :return: ordered and filtered queryset
        """
        from projects.models import Project

        queryset = self

        if prepare_params is None:
            return queryset

        project = Project.objects.get(pk=prepare_params.project)
        request = prepare_params.request
        queryset = apply_filters(queryset, prepare_params.filters, project, request)
        queryset = apply_ordering(queryset, prepare_params.ordering, project, request, view_data=prepare_params.data)

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

    if (
        is_lse_project
        and has_custom_agreement_queryset
        and flag_set('fflag_feat_optic_161_project_settings_for_low_agreement_threshold_score_short', user='auto')
    ):
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
                | Q(annotation_count__gte=(F('overlap') + max_additional_annotators_assignable))
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
        return queryset.annotate(annotations_results=ArrayAgg('annotations__result', distinct=True))


def annotate_predictions_results(queryset):
    if settings.DJANGO_DB == settings.DJANGO_DB_SQLITE:
        return queryset.annotate(
            predictions_results=Coalesce(
                GroupConcat('predictions__result'), Value(''), output_field=models.CharField()
            )
        )
    else:
        return queryset.annotate(predictions_results=ArrayAgg('predictions__result', distinct=True))


def annotate_annotators(queryset):
    if settings.DJANGO_DB == settings.DJANGO_DB_SQLITE:
        return queryset.annotate(
            annotators=Coalesce(GroupConcat('annotations__completed_by'), Value(''), output_field=models.CharField())
        )
    else:
        return queryset.annotate(annotators=ArrayAgg('annotations__completed_by', distinct=True))


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
        model_version = first_task.project.model_version
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
        return queryset.annotate(annotations_ids=ArrayAgg('annotations__id'))


def annotate_predictions_model_versions(queryset):
    if settings.DJANGO_DB == settings.DJANGO_DB_SQLITE:
        return queryset.annotate(
            predictions_model_versions=GroupConcat('predictions__model_version', output_field=models.CharField())
        )
    else:
        return queryset.annotate(predictions_model_versions=ArrayAgg('predictions__model_version'))


def annotate_avg_lead_time(queryset):
    return queryset.annotate(avg_lead_time=Avg('annotations__lead_time'))


def annotate_draft_exists(queryset):
    from tasks.models import AnnotationDraft

    return queryset.annotate(draft_exists=Exists(AnnotationDraft.objects.filter(task=OuterRef('pk'))))


def file_upload(queryset):
    return queryset.annotate(file_upload_field=F('file_upload__file'))


def dummy(queryset):
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
}


def get_annotations_map():
    return settings.DATA_MANAGER_ANNOTATIONS_MAP


def update_annotation_map(obj):
    settings.DATA_MANAGER_ANNOTATIONS_MAP.update(obj)


class PreparedTaskManager(models.Manager):
    @staticmethod
    def annotate_queryset(queryset, fields_for_evaluation=None, all_fields=False, request=None):
        annotations_map = get_annotations_map()

        if fields_for_evaluation is None:
            fields_for_evaluation = []

        first_task = queryset.first()
        project = None if first_task is None else first_task.project

        # db annotations applied only if we need them in ordering or filters
        for field in annotations_map.keys():
            if field in fields_for_evaluation or all_fields:
                queryset.project = project
                queryset.request = request
                function = annotations_map[field]
                queryset = function(queryset)

        return queryset

    def get_queryset(self, fields_for_evaluation=None, prepare_params=None, all_fields=False):
        """
        :param fields_for_evaluation: list of annotated fields in task
        :param prepare_params: filters, ordering, selected items
        :param all_fields: evaluate all fields for task
        :param request: request for user extraction
        :return: task queryset with annotated fields
        """
        queryset = self.only_filtered(prepare_params=prepare_params)
        return self.annotate_queryset(
            queryset,
            fields_for_evaluation=fields_for_evaluation,
            all_fields=all_fields,
            request=prepare_params.request,
        )

    def only_filtered(self, prepare_params=None):
        request = prepare_params.request
        queryset = TaskQuerySet(self.model).filter(project=prepare_params.project)
        fields_for_filter_ordering = get_fields_for_filter_ordering(prepare_params)
        queryset = self.annotate_queryset(queryset, fields_for_evaluation=fields_for_filter_ordering, request=request)
        return queryset.prepared(prepare_params=prepare_params)


class TaskManager(models.Manager):
    def for_user(self, user):
        return self.filter(project__organization=user.active_organization)
