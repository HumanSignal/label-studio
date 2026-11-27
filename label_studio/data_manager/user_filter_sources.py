from collections.abc import Callable, Sequence

from django.db.models import QuerySet
from tasks.models import Annotation, Task

UserIdSource = Callable[[int], QuerySet]


def annotation_author_user_ids(project_id: int) -> QuerySet:
    return Annotation.objects.filter(
        project_id=project_id,
        completed_by_id__isnull=False,
    ).values_list('completed_by_id', flat=True)


def task_updated_by_user_ids(project_id: int) -> QuerySet:
    return Task.objects.filter(
        project_id=project_id,
        updated_by_id__isnull=False,
    ).values_list('updated_by_id', flat=True)


def annotation_updated_by_user_ids(project_id: int) -> QuerySet:
    return Annotation.objects.filter(
        project_id=project_id,
        updated_by_id__isnull=False,
    ).values_list('updated_by_id', flat=True)


COLUMN_USER_ID_SOURCES: dict[str, tuple[UserIdSource, ...]] = {
    'annotators': (annotation_author_user_ids,),
    'updated_by': (task_updated_by_user_ids, annotation_updated_by_user_ids),
}


def filter_queryset_by_user_id_sources(
    queryset: QuerySet,
    *,
    project_id: int,
    sources: Sequence[UserIdSource],
) -> QuerySet:
    """Restrict ``queryset`` to users present in any candidate source for ``project_id``.

    Uses a single SQL ``UNION`` of source ID subqueries instead of ``OR``-chained
    ``pk__in`` clauses, which scales better for large projects (thousands of members /
    high annotation volume).
    """
    if not sources:
        return queryset.none()

    id_qs = sources[0](project_id)
    for source in sources[1:]:
        id_qs = id_qs.union(source(project_id))
    return queryset.filter(pk__in=id_qs)
