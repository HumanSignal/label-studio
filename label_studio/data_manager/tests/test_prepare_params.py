"""Unit tests for data_manager.prepare_params FK-traversal validators.

Filters are guarded only when `filter:tasks:`-prefixed (the rest never reach the ORM),
ordering is guarded always. Pydantic models only -- no DB, no HTTP.
"""

import pytest
from data_manager.prepare_params import (
    Filter,
    PrepareParams,
    validate_filter_column_no_fk_traversal,
    validate_ordering_column_no_fk_traversal,
)
from rest_framework.exceptions import ValidationError as APIValidationError

TRAVERSAL = 'project__organization__created_by__password'


def make_filter(column, **extra):
    return Filter(filter=column, operator='equal', value='x', type='String', **extra)


class TestFilterColumnFkTraversal:
    """`__` traversal is rejected only for ORM-reachable filter names."""

    @pytest.mark.parametrize(
        'column',
        [
            f'filter:tasks:{TRAVERSAL}',
            f'filter:tasks:-{TRAVERSAL}',
            'filter:tasks:foo__bar',
        ],
    )
    def test_traversal_rejected(self, column):
        with pytest.raises(APIValidationError):
            make_filter(column)

    @pytest.mark.parametrize(
        'column',
        [
            'filter:tasks:id',
            # task.data lookups and allowlisted FK columns stay usable inline
            'filter:tasks:data.images__0',
            'filter:tasks:updated_by__active_organization',
            'filter:tasks:annotations__completed_by',
        ],
    )
    def test_legitimate_prefixed_columns_accepted(self, column):
        assert make_filter(column).filter == column

    @pytest.mark.parametrize(
        'column',
        [
            # none of these keep the filter:tasks: prefix apply_filters() gates on,
            # so they are dropped before the ORM and must stay ignored, not 400'd
            'ignored__relation',
            'filter:annotations:foo__bar',
            f'-filter:tasks:{TRAVERSAL}',
            f'tasks:{TRAVERSAL}',
        ],
    )
    def test_non_orm_reachable_columns_ignored(self, column):
        assert make_filter(column).filter == column

    def test_child_filter_traversal_rejected(self):
        payload = {
            'filter': 'filter:tasks:id',
            'operator': 'equal',
            'value': 0,
            'type': 'Number',
            'child_filter': {
                'filter': f'filter:tasks:{TRAVERSAL}',
                'operator': 'equal',
                'value': 'x',
                'type': 'String',
            },
        }
        with pytest.raises(APIValidationError):
            Filter(**payload)

    def test_child_filter_non_orm_reachable_ignored(self):
        payload = {
            'filter': 'filter:tasks:id',
            'operator': 'equal',
            'value': 0,
            'type': 'Number',
            'child_filter': {
                'filter': 'ignored__relation',
                'operator': 'equal',
                'value': 'x',
                'type': 'String',
            },
        }
        assert Filter(**payload).child_filter.filter == 'ignored__relation'

    def test_filter_model_wires_filter_validator(self):
        assert make_filter('ignored__relation').filter == 'ignored__relation'
        with pytest.raises(APIValidationError):
            make_filter(f'filter:tasks:{TRAVERSAL}')


class TestOrderingColumnFkTraversal:
    """Every ordering column reaches `F(field_name)`, so the policy stays strict."""

    @pytest.mark.parametrize(
        'column',
        [
            f'tasks:{TRAVERSAL}',
            f'-tasks:{TRAVERSAL}',
            f'tasks:-{TRAVERSAL}',
            # no prefix at all: still a sort oracle
            TRAVERSAL,
            'ignored__relation',
            'filter:annotations:foo__bar',
            f'filter:tasks:{TRAVERSAL}',
        ],
    )
    def test_traversal_rejected(self, column):
        with pytest.raises(APIValidationError):
            PrepareParams(project=1, ordering=[column])

    @pytest.mark.parametrize(
        'column',
        [
            'tasks:id',
            '-tasks:completed_at',
            'tasks:data.images__0',
            'tasks:updated_by__active_organization',
        ],
    )
    def test_legitimate_columns_accepted(self, column):
        params = PrepareParams(project=1, ordering=[column])
        assert params.ordering == [column]


class TestValidatorsDirectly:
    def test_filter_validator_returns_column_unchanged(self):
        assert validate_filter_column_no_fk_traversal('ignored__relation') == 'ignored__relation'
        assert validate_filter_column_no_fk_traversal('filter:tasks:id') == 'filter:tasks:id'

    def test_ordering_validator_returns_column_unchanged(self):
        assert validate_ordering_column_no_fk_traversal('-tasks:completed_at') == '-tasks:completed_at'

    def test_traversal_error_mentions_allowlist(self):
        with pytest.raises(APIValidationError, match='DATA_MANAGER_FILTER_ALLOWLIST'):
            validate_ordering_column_no_fk_traversal(TRAVERSAL)
