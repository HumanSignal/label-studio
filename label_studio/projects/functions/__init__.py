from django.db.models import Count, Q


def annotate_task_number(queryset):
    return queryset.annotate(task_number=Count('tasks', distinct=True))


def annotate_finished_task_number(queryset):
    return queryset.annotate(finished_task_number=Count('tasks', distinct=True, filter=Q(tasks__is_labeled=True)))


def annotate_total_predictions_number(queryset):
    return queryset.annotate(total_predictions_number=Count('tasks__predictions', distinct=True))


def annotate_total_annotations_number(queryset):
    return queryset.annotate(total_annotations_number=Count(
        'tasks__annotations__id', distinct=True, filter=Q(tasks__annotations__was_cancelled=False)
    ))


def annotate_num_tasks_with_annotations(queryset):
    return queryset.annotate(num_tasks_with_annotations=Count(
        'tasks__id',
        distinct=True,
        filter=Q(tasks__annotations__isnull=False)
        & Q(tasks__annotations__ground_truth=False)
        & Q(tasks__annotations__was_cancelled=False)
        & Q(tasks__annotations__result__isnull=False),
    ))


def annotate_useful_annotation_number(queryset):
    return queryset.annotate(useful_annotation_number=Count(
        'tasks__annotations__id',
        distinct=True,
        filter=Q(tasks__annotations__was_cancelled=False)
        & Q(tasks__annotations__ground_truth=False)
        & Q(tasks__annotations__result__isnull=False),
    ))


def annotate_ground_truth_number(queryset):
    return queryset.annotate(ground_truth_number=Count(
        'tasks__annotations__id', distinct=True, filter=Q(tasks__annotations__ground_truth=True)
    ))


def annotate_skipped_annotations_number(queryset):
    return queryset.annotate(skipped_annotations_number=Count(
        'tasks__annotations__id', distinct=True, filter=Q(tasks__annotations__was_cancelled=True)
    ))
