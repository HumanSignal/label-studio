from core.feature_flags import flag_set
from django.conf import settings


def iterate_queryset(queryset, chunk_size=None):
    if chunk_size is None:
        chunk_size = settings.QS_ITERATOR_DEFAULT_CHUNK_SIZE

    if chunk_size <= 0:
        raise ValueError(f'chunk_size must be positive, got {chunk_size}')

    if not flag_set('fflag_fix_back_plt_863_remove_iterator_27082025_short', user='auto'):
        for obj in queryset.iterator(chunk_size=chunk_size):
            yield obj
        return

    model = queryset.model
    pk_field = model._meta.pk.name

    all_ids = list(queryset.values_list(pk_field, flat=True))

    if not all_ids:
        return

    for i in range(0, len(all_ids), chunk_size):
        chunk_ids = all_ids[i : i + chunk_size]

        # Create a new queryset based on the original, preserving all optimizations:
        # annotations, select_related, prefetch_related, only/defer
        chunk_qs = queryset.filter(**{f'{pk_field}__in': chunk_ids})

        for obj in chunk_qs:
            yield obj


def iterate_queryset_in_keyset_batches(
    queryset,
    chunk_size=None,
    key_field='pk',
    start_after=None,
    stop_at=None,
):
    """Yield queryset results in keyset-paginated batches.

    Use this for memory-safe iteration where result ordering does not
    matter. This helper always imposes ``order_by(key_field)`` so it bypasses
    and does not preserve any ordering already applied to ``queryset``. Do not
    use it for user-facing lists, exports, reports, or any workflow where the
    queryset's original ordering is meaningful.

    Args:
        queryset: QuerySet to scan. Existing filters, annotations,
            select_related/prefetch_related, and only/defer options are
            preserved, but ordering is replaced with ``order_by(key_field)``.
        chunk_size: Maximum number of objects to load and yield per batch.
            Defaults to ``settings.QS_ITERATOR_DEFAULT_CHUNK_SIZE``.
        key_field: Monotonic field used for pagination, usually ``'pk'`` or
            ``'id'``. The field must be unique enough for ``key_field__gt`` to
            make forward progress without skipping rows that share the same
            value.
        start_after: Optional key value to resume after. Rows with
            ``key_field <= start_after`` are skipped.
        stop_at: Optional inclusive upper bound. Rows with
            ``key_field > stop_at`` are skipped.

    Yields:
        Lists of model instances, each with at most ``chunk_size`` objects.
    """
    if chunk_size is None:
        chunk_size = settings.QS_ITERATOR_DEFAULT_CHUNK_SIZE

    if chunk_size <= 0:
        raise ValueError(f'chunk_size must be positive, got {chunk_size}')

    last_seen = start_after
    base_queryset = queryset.order_by(key_field)

    if stop_at is not None:
        base_queryset = base_queryset.filter(**{f'{key_field}__lte': stop_at})

    while True:
        page_queryset = base_queryset
        if last_seen is not None:
            page_queryset = page_queryset.filter(**{f'{key_field}__gt': last_seen})

        batch = list(page_queryset[:chunk_size])
        if not batch:
            return

        yield batch
        last_seen = getattr(batch[-1], key_field)
