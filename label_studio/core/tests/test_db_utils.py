import logging

from label_studio.core.utils import db as db_utils


class _BrokenConnection:
    vendor = 'testdb'

    @property
    def settings_dict(self):
        # Simulate an unexpected error when accessing connection.settings_dict
        raise RuntimeError('boom')


def test_current_db_key_exception_path(monkeypatch, caplog):
    # Arrange: replace connection with a broken one to trigger the except path
    monkeypatch.setattr(db_utils, 'connection', _BrokenConnection())

    # Act: call current_db_key and capture error logs
    with caplog.at_level(logging.ERROR, logger='label_studio.core.utils.db'):
        key = db_utils.current_db_key()

    # Assert: name fallback used and error message logged
    assert key == 'testdb:unknown'
    assert any('Error getting current DB key' in rec.message for rec in caplog.records)


"""This module contains tests for database utility functions in core/utils/db.py"""
import pytest
from core.utils.db import batch_delete
from django.db import transaction
from users.models import User
from users.tests.factories import UserFactory


class TestBatchDelete:
    """Test suite for the batch_delete utility function"""

    @pytest.mark.django_db
    def test_batch_delete_empty_queryset(self):
        """Test batch deletion with an empty queryset.

        This test verifies that:
        - Function handles empty querysets gracefully
        - Returns 0 for total deleted items
        - No errors are raised
        """
        # Setup: Empty queryset
        queryset = User.objects.filter(email='nonexistent@example.com')

        # Action: Attempt to delete empty queryset
        total_deleted = batch_delete(queryset)

        # Assert: No items were deleted
        assert total_deleted == 0

    @pytest.mark.django_db
    def test_batch_delete_single_batch(self):
        """Test batch deletion when all items fit in a single batch.

        This test verifies that:
        - All items are deleted when count < batch_size
        - Items are actually removed from database
        """
        # Setup: Create 5 users
        [UserFactory() for _ in range(5)]
        initial_count = User.objects.count()
        assert initial_count == 5  # Verify setup
        queryset = User.objects.all()

        # Action: Delete with batch size larger than number of items
        batch_delete(queryset, batch_size=10)

        # Assert: All users were deleted
        assert User.objects.count() == 0

    @pytest.mark.django_db
    def test_batch_delete_multiple_batches(self):
        """Test batch deletion when items span multiple batches.

        This test verifies that:
        - All items are deleted when count > batch_size
        - Items are deleted in correct batches
        - All items are removed from database
        """
        # Setup: Create 25 users (will require 3 batches with batch_size=10)
        [UserFactory() for _ in range(25)]
        initial_count = User.objects.count()
        assert initial_count == 25  # Verify setup
        queryset = User.objects.all()

        # Action: Delete with batch size smaller than number of items
        batch_delete(queryset, batch_size=10)

        # Assert: All users were deleted
        assert User.objects.count() == 0

    @pytest.mark.django_db
    def test_batch_delete_with_transaction(self):
        """Test batch deletion within a transaction.

        This test verifies that:
        - Batch deletion works correctly inside a transaction
        - Changes are committed properly
        - No errors occur with nested transactions
        """
        # Setup: Create 15 users
        [UserFactory() for _ in range(15)]
        initial_count = User.objects.count()
        assert initial_count == 15  # Verify setup
        queryset = User.objects.all()

        # Action: Delete within a transaction
        with transaction.atomic():
            batch_delete(queryset, batch_size=10)

        # Assert: All users were deleted
        assert User.objects.count() == 0

    @pytest.mark.django_db
    def test_batch_delete_exact_batch_size(self):
        """Test batch deletion when item count matches batch size exactly.

        This test verifies that:
        - All items are deleted when count == batch_size
        - No extra queries are made after the last batch
        """
        # Setup: Create exactly 10 users
        [UserFactory() for _ in range(10)]
        initial_count = User.objects.count()
        assert initial_count == 10  # Verify setup
        queryset = User.objects.all()

        # Action: Delete with batch size equal to number of items
        batch_delete(queryset, batch_size=10)

        # Assert: All users were deleted
        assert User.objects.count() == 0
