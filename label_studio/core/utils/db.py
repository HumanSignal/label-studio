from django.db import models

from django.db.models import (
    Subquery
)


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
