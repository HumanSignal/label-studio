from typing import TYPE_CHECKING
import logging

from core.feature_flags import flag_set
from django.db import models
from django.db.models import Subquery

if TYPE_CHECKING:
    from users.models import User

logger = logging.getLogger(__name__)


class SQCount(Subquery):
    template = "(SELECT count(*) FROM (%(subquery)s) _count)"
    output_field = models.IntegerField()


def fast_first(queryset):
    """Replacement for queryset.first() when you don't need ordering,
    queryset.first() works slowly in some cases
    """
    try:
        return queryset.all()[0]
    except IndexError:
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
