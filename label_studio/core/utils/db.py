import itertools
import logging
import time
from typing import Dict, Optional, TypeVar

from django.db import OperationalError, connection, models, transaction
from django.db.models import Model, QuerySet, Subquery
from django.db.models.signals import post_migrate
from django.db.utils import DatabaseError, ProgrammingError
from django.dispatch import receiver

logger = logging.getLogger(__name__)


class SQCount(Subquery):
    template = '(SELECT count(*) FROM (%(subquery)s) _count)'
    output_field = models.IntegerField()


ModelType = TypeVar('ModelType', bound=Model)


def fast_first(queryset: QuerySet[ModelType]) -> Optional[ModelType]:
    """Replacement for queryset.first() when you don't need ordering,
    queryset.first() works slowly in some cases
    """

    if result := queryset[:1]:
        return result[0]
    return None


def fast_first_or_create(model, **model_params) -> Optional[ModelType]:
    """Like get_or_create, but using fast_first instead of first(). Additionally, unlike get_or_create, this method will not raise an exception if more than one model instance matching the given params is returned, making it a safer choice than get_or_create for models that don't have a uniqueness constraint on the fields used."""
    if instance := fast_first(model.objects.filter(**model_params)):
        return instance
    return model.objects.create(**model_params)


def batch_update_with_retry(queryset, batch_size=500, max_retries=3, **update_fields):
    """
    Update objects in batches with retry logic to handle deadlocks.

    Args:
        queryset: QuerySet of objects to update
        batch_size: Number of objects to update in each batch
        max_retries: Maximum number of retry attempts for each batch
        **update_fields: Fields to update (e.g., overlap=1)
    """
    object_ids = list(queryset.values_list('id', flat=True))
    total_objects = len(object_ids)

    for i in range(0, total_objects, batch_size):
        batch_ids = object_ids[i : i + batch_size]
        retry_count = 0
        last_error = None

        while retry_count < max_retries:
            try:
                with transaction.atomic():
                    queryset.model.objects.filter(id__in=batch_ids).update(**update_fields)
                break
            except OperationalError as e:
                last_error = e
                if 'deadlock detected' in str(e):
                    retry_count += 1
                    wait_time = 0.1 * (2**retry_count)  # Exponential backoff
                    logger.warning(
                        f'Deadlock detected, retry {retry_count}/{max_retries} '
                        f'for batch {i}-{i+len(batch_ids)}. Waiting {wait_time}s...'
                    )
                    time.sleep(wait_time)
                else:
                    raise
        else:
            logger.error(f'Failed to update batch after {max_retries} retries. ' f'Batch: {i}-{i+len(batch_ids)}')
            raise last_error


def batch_delete(queryset, batch_size=500):
    """
    Delete objects in batches to minimize memory usage and transaction size.

    Args:
        queryset: The queryset to delete
        batch_size: Number of objects to delete in each batch

    Returns:
        int: Total number of deleted objects
    """
    total_deleted = 0

    # Create a database cursor that yields primary keys without loading all into memory
    # The iterator position is maintained between calls to islice
    # Example: if queryset has 1500 records and batch_size=500:
    # - First iteration will get records 1-500
    # - Second iteration will get records 501-1000
    # - Third iteration will get records 1001-1500
    # - Fourth iteration will get empty list (no more records)
    pks_to_delete = queryset.values_list('pk', flat=True).iterator(chunk_size=batch_size)

    # Delete in batches
    while True:
        # Get the next batch of primary keys from where the iterator left off
        # islice advances the iterator's position after taking batch_size items
        batch_iterator = itertools.islice(pks_to_delete, batch_size)

        # Convert the slice iterator to a list we can use
        # This only loads batch_size items into memory at a time
        batch = list(batch_iterator)

        # If no more items to process, we're done
        # This happens when the iterator is exhausted
        if not batch:
            break

        # Delete the batch in a transaction
        with transaction.atomic():
            # Delete all objects whose primary keys are in this batch
            deleted = queryset.model.objects.filter(pk__in=batch).delete()[0]
            total_deleted += deleted

    return total_deleted


# =====================
# Schema helpers
# =====================

_column_presence_cache: Dict[str, Dict[str, Dict[str, bool]]] = {}


def current_db_key() -> str:
    """Return a process-stable identifier for the current DB connection.

    Using vendor + NAME isolates caches between sqlite test DBs and postgres runs,
    avoiding stale lookups across pytest sessions or multi-DB setups.
    """
    try:
        name = str(connection.settings_dict.get('NAME'))
    except Exception as e:
        name = 'unknown'
        logger.error(f'Error getting current DB key: {e}')
    return f'{connection.vendor}:{name}'


def has_column_cached(table_name: str, column_name: str) -> bool:
    """Check if a DB column exists for the given table, with per-process memoization.

    Notes:
    - Uses Django introspection; caches per (table, column) with case-insensitive column keys.
    - Safe during early migrations; returns False on any error.
    - Works in both sync and async contexts by temporarily allowing async-unsafe operations.
    """
    col_key = column_name.lower()
    db_cache = _column_presence_cache.get(current_db_key())
    table_cache = db_cache.get(table_name) if db_cache else None
    if table_cache and col_key in table_cache:
        return table_cache[col_key]

    # Check if we're in an async context and need to allow async-unsafe operations
    import asyncio
    import os

    in_async_context = False
    previous_value = os.environ.get('DJANGO_ALLOW_ASYNC_UNSAFE')

    try:
        asyncio.get_running_loop()
        in_async_context = True
        # Temporarily allow async-unsafe operations for schema introspection
        # This is safe because:
        # 1. We're only reading DB schema metadata, not data
        # 2. This happens once per process during startup and is cached
        # 3. No concurrent access to the same data
        os.environ['DJANGO_ALLOW_ASYNC_UNSAFE'] = 'true'
    except RuntimeError:
        pass  # Not in async context

    try:
        with connection.cursor() as cursor:
            cols = connection.introspection.get_table_description(cursor, table_name)
        present = any(getattr(col, 'name', '').lower() == col_key for col in cols)
    except (DatabaseError, ProgrammingError):
        present = False
    finally:
        # Restore the previous value
        if in_async_context:
            if previous_value is None:
                os.environ.pop('DJANGO_ALLOW_ASYNC_UNSAFE', None)
            else:
                os.environ['DJANGO_ALLOW_ASYNC_UNSAFE'] = previous_value

    _column_presence_cache.setdefault(current_db_key(), {}).setdefault(table_name, {})[col_key] = present
    return present


@receiver(post_migrate)
def signal_clear_column_presence_cache(**_kwargs):
    """If some migration adds a column, we need to clear the column_presence_cache
    so that the next migration can introspect the new column using has_column_cached()."""
    logger.debug('Clearing column presence cache in post_migrate signal')
    _column_presence_cache.clear()
