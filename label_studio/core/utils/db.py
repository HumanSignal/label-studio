from typing import TYPE_CHECKING, Optional, TypeVar
import logging

from core.feature_flags import flag_set
from django.db import models
from django.db.models import Model, QuerySet, Subquery

if TYPE_CHECKING:
    from users.models import User

logger = logging.getLogger(__name__)


class SQCount(Subquery):
    template = "(SELECT count(*) FROM (%(subquery)s) _count)"
    output_field = models.IntegerField()


ModelType = TypeVar('ModelType', bound=Model)

def fast_first(queryset: QuerySet[ModelType]) -> Optional[ModelType]:
    """Replacement for queryset.first() when you don't need ordering,
    queryset.first() works slowly in some cases
    """

    if result := queryset[:1]:
        return result[0]
    return None


def should_run_bulk_update_in_transaction(organization_created_by_user: "User") -> bool:
    """Check flag for the given user, log result and user id to info for debugging
    purposes"""

    bulk_update_should_run_in_transaction = flag_set(
        "fflag_fix_back_lsdv_5289_run_bulk_updates_in_transactions_short",
        user=organization_created_by_user,
        override_system_default=True,
    )

    logger.info(
        f"[deadlocks debugging] {bulk_update_should_run_in_transaction=} {organization_created_by_user.id=}"
    )

    return bulk_update_should_run_in_transaction
