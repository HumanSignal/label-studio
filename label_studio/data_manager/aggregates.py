"""
Shim to address None values in arrays
Fixed on https://github.com/django/django/commit/3dc9f3ac6960c83cd32058677eb0ddb5a5e5da43#diff-b6a6632418c964155865691be58c9f76717ef512ced704d461f41cc3612a1db3R240
Remove this shim once this code is a required dependency
"""
from django import __version__

from django.db.models.lookups import Exact
from django.db.models import Func, Value
from django.contrib.postgres import lookups
from django.contrib.postgres.aggregates import ArrayAgg as OriginalArrayAgg
from django.contrib.postgres.fields import ArrayField
from django.contrib.postgres.fields.array import ArrayLenTransform as OriginalArrayLenTransform, ArrayInLookup as OriginalArrayInLookup


class ArrayRHSMixin:
    def __init__(self, lhs, rhs):
        # Don't wrap arrays that contains only None values, psycopg2 doesn't
        # allow this.
        if isinstance(rhs, (tuple, list)) and any(self._rhs_not_none_values(rhs)):
            expressions = []
            for value in rhs:
                if not hasattr(value, "resolve_expression"):
                    field = lhs.output_field
                    value = Value(field.base_field.get_prep_value(value))
                expressions.append(value)
            rhs = Func(
                *expressions,
                function="ARRAY",
                template="%(function)s[%(expressions)s]",
            )
        super().__init__(lhs, rhs)

    def process_rhs(self, compiler, connection):
        rhs, rhs_params = super().process_rhs(compiler, connection)
        cast_type = self.lhs.output_field.cast_db_type(connection)
        return "%s::%s" % (rhs, cast_type), rhs_params

    def _rhs_not_none_values(self, rhs):
        for x in rhs:
            if isinstance(x, (list, tuple)):
                yield from self._rhs_not_none_values(x)
            elif x is not None:
                yield True


class MyArrayField(ArrayField):
    pass

@MyArrayField.register_lookup
class ArrayContains(ArrayRHSMixin, lookups.DataContains):
    pass


@MyArrayField.register_lookup
class ArrayContainedBy(ArrayRHSMixin, lookups.ContainedBy):
    pass


@MyArrayField.register_lookup
class ArrayExact(ArrayRHSMixin, Exact):
    pass


@MyArrayField.register_lookup
class ArrayOverlap(ArrayRHSMixin, lookups.Overlap):
    pass


@MyArrayField.register_lookup
class ArrayLenTransform(OriginalArrayLenTransform):
    pass

@MyArrayField.register_lookup
class ArrayInLookup(OriginalArrayInLookup):
    pass

class ArrayAgg(OriginalArrayAgg):
    @property
    def output_field(self):
        return MyArrayField(self.source_expressions[0].output_field)
