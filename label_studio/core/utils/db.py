import logging
from typing import Optional, TypeVar

from django.db import models
from django.db.models import Model, QuerySet, Subquery

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
