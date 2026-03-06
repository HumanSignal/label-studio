"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license."""

import unittest
from unittest.mock import MagicMock, patch

import pytest
from io_storages.api import ImportStorageListFilesAPI
from io_storages.serializers import ImportStorageSerializer
from rest_framework import status
from rest_framework.exceptions import ValidationError


class TestImportStorageListFilesAPI(unittest.TestCase):
    """Unit tests for ImportStorageListFilesAPI.

    This test class validates the file listing functionality of storage imports,
    including limit handling, timeout behavior, and error scenarios.
    """

    def setUp(self):
        """Set up test dependencies and mock objects for each test."""
        self.api = ImportStorageListFilesAPI(serializer_class=ImportStorageSerializer)
        self.user = MagicMock()
        self.storage_instance = MagicMock()

        # Configure default storage instance behavior
        self.storage_instance.get_unified_metadata.side_effect = lambda obj: {
            'key': f'file_{obj}.txt',
            'last_modified': '2024-01-01T00:00:00Z',
            'size': 1024,
        }

    def _create_mock_request(self, data=None):
        """Helper method to create mock request with data attribute."""
        request = MagicMock()
        request.data = data or {}
        request.user = self.user
        return request

    @patch('io_storages.functions.validate_storage_instance')
    def test_successful_file_listing_under_limit(self, mock_validate):
        """Test successful file listing when object count is under the limit.

        This test validates:
        - Successful API response with 200 status
        - Correct file metadata structure in response
        - No limit marker added when under limit
        - Proper integration with validate_storage_instance
        """
        # Setup: Configure mock storage with 5 objects (under default limit of 100)
        mock_validate.return_value = self.storage_instance
        self.storage_instance.iter_objects.return_value = range(5)

        # Create mock request with data attribute
        request = self._create_mock_request({'id': 1, 'limit': 100})

        # Execute: Call the API
        response = self.api.create(request)

        # Validate: Check response structure and content
        assert response.status_code == status.HTTP_200_OK
        assert response.data is not None
        assert 'files' in response.data
        assert len(response.data['files']) == 5

        # Verify file metadata structure
        for i, file_data in enumerate(response.data['files']):
            assert file_data['key'] == f'file_{i}.txt'
            assert file_data['last_modified'] == '2024-01-01T00:00:00Z'
            assert file_data['size'] == 1024

        # Verify storage validation was called
        mock_validate.assert_called_once_with(request, ImportStorageSerializer)

    @patch('io_storages.functions.validate_storage_instance')
    def test_file_listing_reaches_limit(self, mock_validate):
        """Test file listing behavior when reaching the specified limit.

        This test validates:
        - Limit enforcement stops iteration at specified count
        - Limit marker is added as final entry when limit is reached
        - File count matches exactly the specified limit + 1 (for marker)
        """
        # Setup: Configure mock storage with many objects, set limit to 3
        mock_validate.return_value = self.storage_instance
        self.storage_instance.iter_objects.return_value = range(100)  # More than limit

        request = self._create_mock_request({'id': 1, 'limit': 3})

        # Execute: Call the API
        response = self.api.create(request)

        # Validate: Check limit enforcement
        assert response.status_code == status.HTTP_200_OK
        assert response.data is not None
        assert len(response.data['files']) == 4  # 3 files + 1 limit marker

        # Verify first 3 entries are real files
        for i in range(3):
            assert response.data['files'][i]['key'] == f'file_{i}.txt'

        # Verify limit marker
        limit_marker = response.data['files'][3]
        assert limit_marker['key'] is None
        assert limit_marker['last_modified'] is None
        assert limit_marker['size'] is None

    @patch('io_storages.functions.validate_storage_instance')
    def test_uses_default_limit_when_not_specified(self, mock_validate):
        """Test that API uses DEFAULT_STORAGE_LIST_LIMIT when limit not in request.

        This test validates:
        - Fallback to settings.DEFAULT_STORAGE_LIST_LIMIT (100) when no limit specified
        - Proper handling of request data without limit parameter
        """
        # Setup: Configure mock storage and no limit in request
        mock_validate.return_value = self.storage_instance
        self.storage_instance.iter_objects.return_value = range(50)  # Under default limit

        request = self._create_mock_request({'id': 1})

        # Execute: Call the API
        response = self.api.create(request)

        # Validate: Should process all 50 files without limit marker
        assert response.status_code == status.HTTP_200_OK
        assert response.data is not None
        assert len(response.data['files']) == 50  # No limit marker

    @patch('io_storages.api.time')
    @patch('io_storages.functions.validate_storage_instance')
    def test_timeout_handling(self, mock_validate, mock_time):
        """Test timeout handling when file scanning exceeds 30 seconds.

        This test validates:
        - Timeout detection after 30 seconds
        - Timeout marker added to response
        - Processing stops when timeout is reached
        - Time checking occurs during iteration
        """
        # Setup: Configure time mock to simulate timeout
        mock_validate.return_value = self.storage_instance
        mock_time.time.side_effect = [0, 35]  # Start at 0, check at 35 seconds (timeout)
        self.storage_instance.iter_objects.return_value = range(100)

        request = self._create_mock_request({'id': 1, 'limit': 100})

        # Execute: Call the API
        response = self.api.create(request)

        # Validate: Check timeout behavior
        assert response.status_code == status.HTTP_200_OK
        assert response.data is not None
        assert len(response.data['files']) == 2  # 1 file + 1 timeout marker

        # Verify first entry is a real file
        assert response.data['files'][0]['key'] == 'file_0.txt'

        # Verify timeout marker
        timeout_marker = response.data['files'][1]
        assert timeout_marker['key'] == '... storage scan timeout reached ...'
        assert timeout_marker['last_modified'] is None
        assert timeout_marker['size'] is None

    @patch('io_storages.functions.validate_storage_instance')
    def test_iter_objects_exception_raises_validation_error(self, mock_validate):
        """Test that exceptions during object iteration are converted to ValidationError.

        This test validates:
        - Exception handling during storage object iteration
        - Proper conversion to ValidationError for API consistency
        - Error message preservation for debugging
        """
        # Setup: Configure storage to raise exception during iteration
        mock_validate.return_value = self.storage_instance
        test_exception = Exception('Storage connection failed')
        self.storage_instance.iter_objects.side_effect = test_exception

        request = self._create_mock_request({'id': 1})

        # Execute & Validate: Should raise ValidationError
        with pytest.raises(ValidationError) as exc_info:
            self.api.create(request)

        # Verify exception details
        assert str(exc_info.value.detail[0]) == 'Failed to list storage files'

    @patch('io_storages.functions.validate_storage_instance')
    def test_get_unified_metadata_exception_raises_validation_error(self, mock_validate):
        """Test that exceptions during metadata retrieval are converted to ValidationError.

        This test validates:
        - Exception handling during metadata extraction
        - Proper error propagation from get_unified_metadata
        - ValidationError conversion for API consistency
        """
        # Setup: Configure storage to raise exception during metadata retrieval
        mock_validate.return_value = self.storage_instance
        self.storage_instance.iter_objects.return_value = range(1)
        test_exception = Exception('Metadata extraction failed')
        self.storage_instance.get_unified_metadata.side_effect = test_exception

        request = self._create_mock_request({'id': 1})

        # Execute & Validate: Should raise ValidationError
        with pytest.raises(ValidationError) as exc_info:
            self.api.create(request)

        # Verify exception details
        assert str(exc_info.value.detail[0]) == 'Failed to list storage files'

    @patch('io_storages.functions.validate_storage_instance')
    def test_validate_storage_instance_exception_propagates(self, mock_validate):
        """Test that validate_storage_instance exceptions are properly propagated.

        This test validates:
        - Exception handling during storage validation
        - Proper propagation of validation errors
        - No additional error wrapping occurs
        """
        # Setup: Configure validate_storage_instance to raise ValidationError
        validation_error = ValidationError('Invalid storage configuration')
        mock_validate.side_effect = validation_error

        request = self._create_mock_request({'invalid': 'data'})

        # Execute & Validate: Should propagate ValidationError
        with pytest.raises(ValidationError) as exc_info:
            self.api.create(request)

        # Verify it's the same exception
        assert exc_info.value == validation_error

    def test_api_initialization_with_serializer_class(self):
        """Test API initialization with custom serializer class.

        This test validates:
        - Proper initialization with custom serializer
        - Serializer class assignment
        - Instance creation without errors
        """
        # Execute: Initialize API with custom serializer
        custom_serializer = ImportStorageSerializer
        api = ImportStorageListFilesAPI(serializer_class=custom_serializer)

        # Validate: Check serializer assignment
        assert api.serializer_class == custom_serializer

    def test_api_initialization_without_serializer_class(self):
        """Test API initialization without serializer class (default behavior).

        This test validates:
        - Initialization with None serializer (default)
        - No errors during instance creation
        - Proper handling of missing serializer
        """
        # Execute: Initialize API without serializer
        api = ImportStorageListFilesAPI()

        # Validate: Check default serializer state
        assert api.serializer_class is None
