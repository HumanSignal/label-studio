from django_filters import BaseInFilter, CharFilter, Filter, NumberFilter
from django_filters.constants import EMPTY_VALUES


class ListFilter(Filter):
    def filter(self, qs, value):
        if value in EMPTY_VALUES:
            return qs
        value_list = value.split(',')
        qs = super().filter(qs, value_list)
        return qs


class CharInFilter(BaseInFilter, CharFilter):
    """Filter for comma-separated values (e.g., 'AN,RE,MA')."""

    pass


class NumberInFilter(BaseInFilter, NumberFilter):
    """Filter for comma-separated values (e.g., '1,2,3')."""

    pass
