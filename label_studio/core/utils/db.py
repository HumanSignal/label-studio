import itertools
import logging
import time
from typing import Dict, Optional, Tuple, TypeVar

from django.db import OperationalError, connection, models, transaction
from django.db.models import Model, QuerySet, Subquery
from django.db.models.signals import post_migrate
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

_column_presence_cache: Dict[Tuple[str, str], bool] = {}


def has_column_cached(table_name: str, column_name: str) -> bool:
    """Check if a DB column exists for the given table, with per-process memoization.

    Notes:
    - Uses Django's introspection API; incurs a single round-trip on first call per (table, column) pair.
    - Safe to call during early migrations; returns False on any error.
    """
    key = (table_name, column_name)
    if key in _column_presence_cache:
        return _column_presence_cache[key]
    try:
        with connection.cursor() as cursor:
            cols = connection.introspection.get_table_description(cursor, table_name)
        present = any(getattr(col, 'name', None) == column_name for col in cols)
    except Exception:
        present = False
    _column_presence_cache[key] = present
    return present


@receiver(post_migrate)
def signal_clear_column_presence_cache(**_kwargs):
    """If some migration adds a column, we need to clear the column_presence_cache 
    so that the next migration can introspect the new column using has_column_cached()."""
    logger.debug('Clearing column presence cache in post_migrate signal')
    _column_presence_cache.clear()
