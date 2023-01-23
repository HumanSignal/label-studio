from django.db.models import Count, Q, OuterRef

from core.utils.db import SQCount
from tasks.models import Annotation


def annotate_task_number(queryset):
    return queryset.annotate(task_number=Count('tasks', distinct=True))


def annotate_finished_task_number(queryset):
    return queryset.annotate(finished_task_number=Count('tasks', distinct=True, filter=Q(tasks__is_labeled=True)))


def annotate_total_predictions_number(queryset):
    return queryset.annotate(total_predictions_number=Count('tasks__predictions', distinct=True))


def annotate_total_annotations_number(queryset):
    subquery = Annotation.objects.filter(
        Q(project=OuterRef('pk'))
        & Q(was_cancelled=False)
    ).values('id')
    return queryset.annotate(total_annotations_number=SQCount(subquery))


def annotate_num_tasks_with_annotations(queryset):
    subquery = Annotation.objects.filter(
        Q(project=OuterRef('pk'))
        & Q(ground_truth=False)
        & Q(was_cancelled=False)
        & Q(result__isnull=False)
    ).values('task__id').distinct()
    return queryset.annotate(num_tasks_with_annotations=SQCount(subquery))


def annotate_useful_annotation_number(queryset):
    subquery = Annotation.objects.filter(
        Q(project=OuterRef('pk'))
        & Q(was_cancelled=False)
        & Q(ground_truth=False)
        & Q(result__isnull=False)
    ).values('id')
    return queryset.annotate(useful_annotation_number=SQCount(subquery))


def annotate_ground_truth_number(queryset):
    subquery = Annotation.objects.filter(
        Q(project=OuterRef('pk'))
        & Q(ground_truth=True)
    ).values('id')
    return queryset.annotate(ground_truth_number=SQCount(subquery))


def annotate_skipped_annotations_number(queryset):
    subquery = Annotation.objects.filter(
        Q(project=OuterRef('pk'))
        & Q(was_cancelled=True)
    ).values('id')
    return queryset.annotate(skipped_annotations_number=SQCount(subquery))
