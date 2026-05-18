"""Unit tests for data_manager serializers.

BROS-1203 — focused on the `_column_supports_list_membership` helper and the
`FilterSerializer.validate` object-level validation for the new `in_list` /
`not_in_list` operators. The manager-side counterpart (`_is_supported_in_list_field`)
operates on a post-preprocessed field name; this serializer-side helper works on
the raw `filter:tasks:*` column string. Both must agree on the allowlist to keep
the public contract consistent.
"""

from data_manager.serializers import _column_supports_list_membership


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
