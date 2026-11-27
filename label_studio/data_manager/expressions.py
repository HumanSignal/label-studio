"""Expressions that keep task-correlated scalars out of the prepared-task GROUP BY.

The prepared-task queryset LEFT JOINs several one-to-many relations (annotations,
predictions, assignments, reviews) and restores per-task values with aggregates.
That fans the outer row set out to the product of those cardinalities. Django puts
every non-aggregate SELECT expression into GROUP BY, so a correlated scalar such as
`_payment_status` ends up in the group key and Postgres evaluates it once per
fanned-out row instead of once per task.

On a task with 3157 annotations that turned four correlated subqueries into ~53s of
execution time (89.7M shared buffer hits). Excluding them from GROUP BY runs each
one once per task: 53.1s -> 88ms.

Only use these wrappers for expressions correlated on `task.id` / `task.project_id`.
They are functionally dependent on the grouped primary key, so Postgres accepts them
in the SELECT list without a matching group key. Wrapping an expression that depends
on a joined (fanned-out) row instead would silently pick an arbitrary row.
"""

from django.db.models import Func
from django.db.models.expressions import RawSQL


class TaskCorrelatedGroupByMixin:
    """Drop the expression from GROUP BY while keeping it in SELECT."""

    def get_group_by_cols(self, *args, **kwargs):
        return []


class TaskCorrelatedExpression(TaskCorrelatedGroupByMixin, Func):
    """Wrap any task-correlated expression, e.g. Coalesce(Subquery(...), Value(0)).

    Renders the wrapped expression verbatim; it only changes GROUP BY behaviour.
    """

    template = '%(expressions)s'
    arity = 1


class TaskCorrelatedRawSQL(TaskCorrelatedGroupByMixin, RawSQL):
    """A task-correlated RawSQL annotated directly (no surrounding expression)."""
