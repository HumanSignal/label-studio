"""Unit tests for data_manager serializers.

BROS-1203 — focused on the `_column_supports_list_membership` helper and the
`FilterSerializer.validate` object-level validation for the new `in_list` /
`not_in_list` operators. The manager-side counterpart (`_is_supported_in_list_field`)
operates on a post-preprocessed field name; this serializer-side helper works on
the raw `filter:tasks:*` column string. Both must agree on the allowlist to keep
the public contract consistent.
"""

import pytest
from data_manager.serializers import FilterSerializer, _column_supports_list_membership
from django.test import override_settings


class TestColumnSupportsListMembership:
    """Verifies the raw-column allowlist matches the post-preprocess manager allowlist."""

    def test_task_id_column(self):
        assert _column_supports_list_membership('filter:tasks:id') is True

    def test_inner_id_column(self):
        assert _column_supports_list_membership('filter:tasks:inner_id') is True

    def test_data_dot_field(self):
        assert _column_supports_list_membership('filter:tasks:data.object_id') is True
        assert _column_supports_list_membership('filter:tasks:data.batch.id') is True

    def test_data_exact_no_dot_rejected(self):
        """`filter:tasks:data` (no dot) is NOT a data.* field and must be rejected."""
        assert _column_supports_list_membership('filter:tasks:data') is False

    def test_unsupported_columns(self):
        unsupported = [
            'filter:tasks:annotations_ids',
            'filter:tasks:annotators',
            'filter:tasks:reviewers',
            'filter:tasks:created_at',
            'filter:tasks:completed_at',
            'filter:tasks:total_annotations',
            'filter:tasks:updated_by',
            'filter:tasks:payment_status',
        ]
        for column in unsupported:
            assert _column_supports_list_membership(column) is False, column

    def test_prefix_spoofing_is_not_accepted(self):
        """Reject columns that look like the allowlist but aren't (security smell)."""
        assert _column_supports_list_membership('filter:tasks:id_other') is False
        assert _column_supports_list_membership('filter:tasks:datafield') is False

    def test_missing_prefix_rejected(self):
        assert _column_supports_list_membership('id') is False
        assert _column_supports_list_membership('data.foo') is False
        assert _column_supports_list_membership('') is False

    def test_descending_marker_tolerated(self):
        """The `-` descending marker is stripped (consistent with validate_column)."""
        assert _column_supports_list_membership('filter:tasks:-id') is True


class TestUserFilterValueValidation:
    @staticmethod
    def _filter(column='filter:tasks:annotators', value=None, operator='contains'):
        return {
            'column': column,
            'type': 'List',
            'operator': operator,
            'value': [1, 2] if value is None else value,
        }

    @pytest.mark.parametrize(
        'column',
        [
            'filter:tasks:annotators',
            'filter:tasks:updated_by',
            'filter:tasks:reviewers',
            'filter:tasks:comment_authors',
            'filter:tasks:skipped_by_annotator',
        ],
    )
    def test_user_filter_lists_accept_integer_ids(self, column):
        serializer = FilterSerializer(data=self._filter(column=column))

        assert serializer.is_valid(), serializer.errors

    @pytest.mark.parametrize('value', [['invalid'], [1, None], [True], [1.5]])
    def test_user_filter_lists_reject_malformed_ids(self, value):
        serializer = FilterSerializer(data=self._filter(value=value))

        assert not serializer.is_valid()

    @override_settings(DATA_MANAGER_LIST_FILTER_MAX_VALUES=2)
    def test_user_filter_lists_reject_oversized_values(self):
        serializer = FilterSerializer(data=self._filter(value=[1, 2, 3]))

        assert not serializer.is_valid()

    @override_settings(DATA_MANAGER_LIST_FILTER_MAX_VALUES=1)
    def test_child_user_filter_uses_same_validation(self):
        payload = self._filter(column='filter:tasks:annotations_results_json.choice', value=['A'])
        payload['child_filter'] = self._filter(value=[1, 2])
        serializer = FilterSerializer(data=payload)

        assert not serializer.is_valid()

    @pytest.mark.parametrize(
        'column',
        [
            'filter:tasks:annotators',
            'filter:tasks:updated_by',
            'filter:tasks:reviewers',
            'filter:tasks:comment_authors',
            'filter:tasks:skipped_by_annotator',
        ],
    )
    @pytest.mark.parametrize('operator', ['equal', 'not_equal', 'regex', 'less', 'greater', 'in', 'not_in'])
    def test_user_filters_reject_unsupported_list_operators(self, column, operator):
        """FIT-2435: list-valued user filters only allow contains / not_contains."""
        serializer = FilterSerializer(data=self._filter(column=column, operator=operator))

        assert not serializer.is_valid()
        assert 'operator' in serializer.errors

    @pytest.mark.parametrize(
        'column',
        [
            'filter:tasks:annotators',
            'filter:tasks:updated_by',
            'filter:tasks:reviewers',
            'filter:tasks:comment_authors',
        ],
    )
    def test_user_filters_keep_empty_operator(self, column):
        serializer = FilterSerializer(data=self._filter(column=column, operator='empty', value=True))

        assert serializer.is_valid(), serializer.errors

    def test_skipped_by_annotator_rejects_empty_operator(self):
        """FIT-2435: empty is not supported for skipped_by_annotator."""
        serializer = FilterSerializer(
            data=self._filter(column='filter:tasks:skipped_by_annotator', operator='empty', value=True)
        )

        assert not serializer.is_valid()
        assert 'operator' in serializer.errors

    def test_skipped_by_annotator_empty_child_filter_is_rejected(self):
        """Child filters use the same unified operator allowlist."""
        payload = self._filter(column='filter:tasks:annotations_results', value='x')
        payload['child_filter'] = self._filter(
            column='filter:tasks:skipped_by_annotator',
            operator='empty',
            value=True,
        )
        serializer = FilterSerializer(data=payload)

        assert not serializer.is_valid()

    @pytest.mark.parametrize(
        'column',
        [
            'filter:tasks:annotators',
            'filter:tasks:updated_by',
            'filter:tasks:reviewers',
            'filter:tasks:comment_authors',
            'filter:tasks:skipped_by_annotator',
        ],
    )
    @pytest.mark.parametrize('operator', ['regex', 'less', 'greater'])
    def test_user_filters_reject_unsupported_scalar_operators(self, column, operator):
        serializer = FilterSerializer(data=self._filter(column=column, operator=operator, value=1))

        assert not serializer.is_valid()
        assert 'operator' in serializer.errors

    def test_user_filters_keep_legacy_scalar_equal_operator(self):
        serializer = FilterSerializer(data=self._filter(column='filter:tasks:updated_by', operator='equal', value=1))

        assert serializer.is_valid(), serializer.errors
