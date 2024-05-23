from core.feature_flags import flag_set
from core.utils.db import SQCount
from django.db.models import Count, OuterRef, Q
from tasks.models import Annotation, Prediction, Task


def annotate_task_number(queryset):
    if flag_set('fflag_fix_back_LSDV_4748_annotate_task_number_14032023_short', user='auto'):
        tasks = Task.objects.filter(project=OuterRef('id')).values_list('id')
        return queryset.annotate(task_number=SQCount(tasks))
    else:
        return queryset.annotate(task_number=Count('tasks', distinct=True))


def annotate_finished_task_number(queryset):
    if flag_set('fflag_fix_back_LSDV_4748_annotate_task_number_14032023_short', user='auto'):
        tasks = Task.objects.filter(project=OuterRef('id'), is_labeled=True).values_list('id')
        return queryset.annotate(finished_task_number=SQCount(tasks))
    else:
        return queryset.annotate(finished_task_number=Count('tasks', distinct=True, filter=Q(tasks__is_labeled=True)))


def annotate_total_predictions_number(queryset):
    if flag_set(
        'fflag_perf_back_lsdv_4695_update_prediction_query_to_use_direct_project_relation',
        user='auto',
    ):
        predictions = Prediction.objects.filter(project=OuterRef('id')).values('id')
    else:
        predictions = Prediction.objects.filter(task__project=OuterRef('id')).values('id')
    return queryset.annotate(total_predictions_number=SQCount(predictions))


def annotate_total_annotations_number(queryset):
    if flag_set('fflag_fix_back_LSDV_961_project_list_09022023_short', user='auto'):
        subquery = Annotation.objects.filter(Q(project=OuterRef('pk')) & Q(was_cancelled=False)).values('id')
        return queryset.annotate(total_annotations_number=SQCount(subquery))
    else:
        return queryset.annotate(
            total_annotations_number=Count(
                'tasks__annotations__id', distinct=True, filter=Q(tasks__annotations__was_cancelled=False)
            )
        )


def annotate_num_tasks_with_annotations(queryset):
    # @todo: check do we really need this counter?
    # this function is very slow because of tasks__id and distinct

    if flag_set('fflag_fix_back_LSDV_961_project_list_09022023_short', user='auto'):
        subquery = (
            Annotation.objects.filter(
                Q(project=OuterRef('pk')) & Q(ground_truth=False) & Q(was_cancelled=False) & Q(result__isnull=False)
            )
            .values('task__id')
            .distinct()
        )
        return queryset.annotate(num_tasks_with_annotations=SQCount(subquery))
    else:
        return queryset.annotate(
            num_tasks_with_annotations=Count(
                'tasks__id',
                distinct=True,
                filter=Q(tasks__annotations__isnull=False)
                & Q(tasks__annotations__ground_truth=False)
                & Q(tasks__annotations__was_cancelled=False)
                & Q(tasks__annotations__result__isnull=False),
            )
        )


def annotate_useful_annotation_number(queryset):
    if flag_set('fflag_fix_back_LSDV_961_project_list_09022023_short', user='auto'):
        subquery = Annotation.objects.filter(
            Q(project=OuterRef('pk')) & Q(was_cancelled=False) & Q(ground_truth=False) & Q(result__isnull=False)
        ).values('id')
        return queryset.annotate(useful_annotation_number=SQCount(subquery))
    else:
        return queryset.annotate(
            useful_annotation_number=Count(
                'tasks__annotations__id',
                distinct=True,
                filter=Q(tasks__annotations__was_cancelled=False)
                & Q(tasks__annotations__ground_truth=False)
                & Q(tasks__annotations__result__isnull=False),
            )
        )


def annotate_ground_truth_number(queryset):
    if flag_set('fflag_fix_back_LSDV_961_project_list_09022023_short', user='auto'):
        subquery = Annotation.objects.filter(Q(project=OuterRef('pk')) & Q(ground_truth=True)).values('id')
        return queryset.annotate(ground_truth_number=SQCount(subquery))
    else:
        return queryset.annotate(
            ground_truth_number=Count(
                'tasks__annotations__id', distinct=True, filter=Q(tasks__annotations__ground_truth=True)
            )
        )


def annotate_skipped_annotations_number(queryset):
    if flag_set('fflag_fix_back_LSDV_961_project_list_09022023_short', user='auto'):
        subquery = Annotation.objects.filter(Q(project=OuterRef('pk')) & Q(was_cancelled=True)).values('id')
        return queryset.annotate(skipped_annotations_number=SQCount(subquery))
    else:
        return queryset.annotate(
            skipped_annotations_number=Count(
                'tasks__annotations__id', distinct=True, filter=Q(tasks__annotations__was_cancelled=True)
            )
        )
