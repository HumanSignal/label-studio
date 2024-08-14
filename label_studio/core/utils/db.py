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


def fast_first_or_create(model, **model_params) -> Optional[ModelType]:
    """Like get_or_create, but using fast_first instead of first(). Additionally, unlike get_or_create, this method will not raise an exception if more than one model instance matching the given params is returned, making it a safer choice than get_or_create for models that don't have a uniqueness constraint on the fields used."""
    if instance := fast_first(model.objects.filter(**model_params)):
        return instance
    return model.objects.create(**model_params)
