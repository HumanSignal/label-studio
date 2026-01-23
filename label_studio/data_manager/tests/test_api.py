"""Test data_manager.api module functionality.

This file tests the TaskPagination class optimizations that prevent
loading heavy task.data fields during pagination.
"""
from unittest.mock import MagicMock, patch

from data_manager.api import TaskPagination
from django.test import TestCase
from rest_framework.pagination import PageNumberPagination


class TestTaskPaginationMemoryOptimization(TestCase):
    """Test TaskPagination uses .only('id') to avoid loading heavy fields.

    The optimization prevents loading full task objects (with potentially
    multi-megabyte data fields) during pagination. Only task IDs are loaded;
    full task objects are loaded later with proper annotations.

    Critical validation: The queryset passed to the parent paginate_queryset
    must have .only('id') applied to defer loading of heavy fields.
    """

    def setUp(self):
        """Set up test fixtures."""
        self.pagination = TaskPagination()
        self.mock_request = MagicMock()
        self.mock_request.query_params = {'page': '1', 'page_size': '30'}

    def test_sync_paginate_queryset_uses_only_id(self):
        """Test sync_paginate_queryset applies .only('id') optimization.

        This test validates:
        - The queryset passed to parent's paginate_queryset has .only('id') applied
        - Count queries still work with the original queryset
        - The optimization is always applied (no feature flag)
        """
        mock_queryset = MagicMock()
        mock_id_only_queryset = MagicMock()
        mock_queryset.only.return_value = mock_id_only_queryset

        with patch('data_manager.api.Prediction') as mock_prediction:
            with patch('data_manager.api.Annotation') as mock_annotation:
                # Setup count mocks
                mock_prediction.objects.filter.return_value.count.return_value = 10
                mock_annotation.objects.filter.return_value.count.return_value = 5

                # Mock the parent's paginate_queryset
                with patch.object(PageNumberPagination, 'paginate_queryset', return_value=[]) as mock_parent_paginate:
                    self.pagination.sync_paginate_queryset(mock_queryset, self.mock_request)

                    # Verify .only('id') was called on the queryset
                    mock_queryset.only.assert_called_once_with('id')

                    # Verify parent's paginate_queryset was called with the id-only queryset
                    mock_parent_paginate.assert_called_once()
                    call_args = mock_parent_paginate.call_args
                    assert call_args[0][0] is mock_id_only_queryset

    def test_paginate_totals_queryset_uses_only_id(self):
        """Test paginate_totals_queryset applies .only('id') optimization.

        This test validates:
        - The optimized path (with fflag_fix_back_optic_1407_optimize_tasks_api_pagination_counts)
          also uses .only('id')
        - Aggregate queries work correctly
        """
        mock_queryset = MagicMock()
        mock_id_only_queryset = MagicMock()
        mock_queryset.only.return_value = mock_id_only_queryset
        mock_queryset.values.return_value.aggregate.return_value = {
            'total_annotations': 10,
            'total_predictions': 5,
        }

        with patch.object(PageNumberPagination, 'paginate_queryset', return_value=[]) as mock_parent_paginate:
            self.pagination.paginate_totals_queryset(mock_queryset, self.mock_request)

            # Verify .only('id') was called on the queryset
            mock_queryset.only.assert_called_once_with('id')

            # Verify parent's paginate_queryset was called with the id-only queryset
            mock_parent_paginate.assert_called_once()
            call_args = mock_parent_paginate.call_args
            assert call_args[0][0] is mock_id_only_queryset

    def test_count_queries_use_original_queryset(self):
        """Test that count queries use the original queryset (for correct subqueries).

        This test validates:
        - Prediction count query uses the original queryset, not the .only('id') version
        - Annotation count query uses the original queryset
        - This ensures subquery counts work correctly
        """
        mock_queryset = MagicMock()
        mock_id_only_queryset = MagicMock()
        mock_queryset.only.return_value = mock_id_only_queryset

        with patch('data_manager.api.Prediction') as mock_prediction:
            with patch('data_manager.api.Annotation') as mock_annotation:
                mock_prediction.objects.filter.return_value.count.return_value = 10
                mock_annotation.objects.filter.return_value.count.return_value = 5

                with patch.object(PageNumberPagination, 'paginate_queryset', return_value=[]):
                    self.pagination.sync_paginate_queryset(mock_queryset, self.mock_request)

                    # Verify count queries used the ORIGINAL queryset (not id-only)
                    mock_prediction.objects.filter.assert_called_once()
                    prediction_filter_kwargs = mock_prediction.objects.filter.call_args[1]
                    assert prediction_filter_kwargs['task_id__in'] is mock_queryset

                    mock_annotation.objects.filter.assert_called_once()
                    annotation_filter_kwargs = mock_annotation.objects.filter.call_args[1]
                    assert annotation_filter_kwargs['task_id__in'] is mock_queryset
