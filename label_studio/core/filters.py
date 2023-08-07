from django_filters import Filter  # type: ignore[import]
from django_filters.constants import EMPTY_VALUES  # type: ignore[import]

class ListFilter(Filter):  # type: ignore[misc]
    def filter(self, qs, value):  # type: ignore[no-untyped-def]
        if value in EMPTY_VALUES:
            return qs
        value_list = value.split(",")
        qs = super().filter(qs, value_list)
        return qs
