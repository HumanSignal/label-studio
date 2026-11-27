"""Stable ordering helpers for annotations and predictions in task API payloads."""

from django.db.models import Prefetch
from tasks.models import Annotation, Prediction

ANNOTATION_ORDER_DESC = ('-id',)
ANNOTATION_ORDER_ASC = ('id',)
PREDICTION_ORDER_DESC = ('-id',)
PREDICTION_ORDER_ASC = ('id',)

# GET /api/tasks/<id>/?annotations_ordering=-id — Django / DRF-style (same idea as ?ordering=-id)
ANNOTATIONS_ORDERING_QUERY_PARAM = 'annotations_ordering'

# Normalized values placed in serializer context
ANNOTATION_ORDERING_ID_DESC = '-id'
ANNOTATION_ORDERING_ID_ASC = 'id'


def _query_get(request, name):
    if getattr(request, 'query_params', None) is not None:
        return request.query_params.get(name)
    return request.GET.get(name)


def parse_annotations_ordering_request(request):
    """Parse annotations_ordering query param.

    Returns ANNOTATION_ORDERING_ID_DESC, ANNOTATION_ORDERING_ID_ASC, or None.
    Accepts `-id`/`-pk` and `id`/`pk`; if comma-separated (Django style), uses the first segment.
    """
    if not request:
        return None
    raw = _query_get(request, ANNOTATIONS_ORDERING_QUERY_PARAM)
    if raw is None:
        return None
    s = str(raw).strip()
    if not s:
        return None
    first = s.split(',')[0].strip().lower()
    if first in ('-id', '-pk'):
        return ANNOTATION_ORDERING_ID_DESC
    if first in ('id', 'pk'):
        return ANNOTATION_ORDERING_ID_ASC
    return None


def order_annotations(queryset):
    """Order annotations by primary key descending (newest / highest id first)."""
    return queryset.order_by(*ANNOTATION_ORDER_DESC)


def order_predictions(queryset):
    """Order predictions by primary key descending."""
    return queryset.order_by(*PREDICTION_ORDER_DESC)


def order_annotations_asc(queryset):
    return queryset.order_by(*ANNOTATION_ORDER_ASC)


def order_predictions_asc(queryset):
    return queryset.order_by(*PREDICTION_ORDER_ASC)


def apply_annotation_ordering(queryset, ordering):
    if ordering == ANNOTATION_ORDERING_ID_DESC:
        return order_annotations(queryset)
    if ordering == ANNOTATION_ORDERING_ID_ASC:
        return order_annotations_asc(queryset)
    return queryset


def apply_prediction_ordering(queryset, ordering):
    if ordering == ANNOTATION_ORDERING_ID_DESC:
        return order_predictions(queryset)
    if ordering == ANNOTATION_ORDERING_ID_ASC:
        return order_predictions_asc(queryset)
    return queryset


def has_explicit_id_ordering(ordering):
    return ordering in (ANNOTATION_ORDERING_ID_DESC, ANNOTATION_ORDERING_ID_ASC)


def get_task_predictions_queryset(task, ordering):
    """Return task predictions queryset with stable ordering semantics.

    When explicit id ordering is requested, bypass relation prefetch cache and query from DB.
    """
    predictions = (
        Prediction.objects.filter(task_id=task.pk) if has_explicit_id_ordering(ordering) else task.predictions.all()
    )
    return apply_prediction_ordering(predictions, ordering)


def get_task_annotations_queryset(task, ordering, *, include_completed_by=False):
    """Return task annotations queryset with stable ordering semantics.

    When explicit id ordering is requested, bypass relation prefetch cache and query from DB.
    """
    if has_explicit_id_ordering(ordering):
        annotations = Annotation.objects.filter(task_id=task.pk)
        if include_completed_by:
            annotations = annotations.select_related('completed_by')
    else:
        annotations = task.annotations.all()
    return apply_annotation_ordering(annotations, ordering)


def get_task_children_prefetch(ordering):
    """Build prefetch entries for task annotations/predictions for requested ordering."""
    if ordering == ANNOTATION_ORDERING_ID_DESC:
        return (
            Prefetch('annotations', queryset=order_annotations(Annotation.objects.all())),
            Prefetch('predictions', queryset=order_predictions(Prediction.objects.all())),
        )
    if ordering == ANNOTATION_ORDERING_ID_ASC:
        return (
            Prefetch('annotations', queryset=order_annotations_asc(Annotation.objects.all())),
            Prefetch('predictions', queryset=order_predictions_asc(Prediction.objects.all())),
        )
    return ('annotations', 'predictions')
