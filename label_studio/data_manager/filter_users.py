from data_manager.user_filter_sources import COLUMN_USER_ID_SOURCES, filter_queryset_by_user_id_sources
from django.db.models import QuerySet


def filter_user_queryset(
    queryset: QuerySet,
    *,
    project_id: int,
    column: str,
) -> QuerySet:
    """Restrict users to context-independent DM filter candidates for ``column``.

    Used as the column half of the options union (membership ∪ candidates).
    ``column`` must already be validated against ``COLUMN_USER_ID_SOURCES``
    (see ``UsersListQuerySerializer``).
    """
    return filter_queryset_by_user_id_sources(
        queryset,
        project_id=project_id,
        sources=COLUMN_USER_ID_SOURCES[column],
    )
