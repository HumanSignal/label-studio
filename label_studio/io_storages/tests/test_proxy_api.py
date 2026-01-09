import base64
import io
import unittest
from datetime import datetime
from unittest.mock import MagicMock, patch

import pytest
from io_storages.proxy_api import (
    ProjectResolveStorageUri,
    ResolveStorageUriAPIMixin,
    TaskResolveStorageUri,
)
from projects.models import Project
from rest_framework import status
from rest_framework.response import Response
from rest_framework.test import APIRequestFactory, force_authenticate
from tasks.models import Task


class TestResolveStorageUriAPIMixin(unittest.TestCase):
    def setUp(self):
        self.mixin = ResolveStorageUriAPIMixin()
        self.user = MagicMock()
        self.project = MagicMock()
        self.task = MagicMock()
        self.task.project = self.project
        # Set the __class__.__name__ to "Task" for type checks
        type(self.task).__name__ = 'Task'
        self.task.has_permission.return_value = True
        self.request = MagicMock()
        self.request.user = self.user
        self.storage = MagicMock()
        self.storage.presign = True

    def test_resolve_with_permission_denied(self):
        self.task.has_permission.return_value = False
        result = self.mixin.resolve(self.request, 'test_fileuri', self.task)
        assert result.status_code == status.HTTP_403_FORBIDDEN

    @patch('io_storages.proxy_api.get_storage_by_url')
    def test_resolve_with_base64_decoding(self, mock_get_storage):
        mock_get_storage.return_value = self.storage
        fileuri = base64.urlsafe_b64encode(b'test_uri').decode()

        with patch.object(self.mixin, 'redirect_to_presign_url') as mock_redirect:
            mock_redirect.return_value = Response()
            self.mixin.resolve(self.request, fileuri, self.task)
            mock_redirect.assert_called_once_with('test_uri', self.task, 'Task')

    @patch('io_storages.proxy_api.get_storage_by_url')
    def test_resolve_with_url_unquote_fallback(self, mock_get_storage):
        mock_get_storage.return_value = self.storage

        with patch.object(self.mixin, 'redirect_to_presign_url') as mock_redirect:
            mock_redirect.return_value = Response()
            # Non-base64 uri to trigger fallback
            self.mixin.resolve(self.request, 's3://bucket/file.jpg', self.task)
            mock_redirect.assert_called_once_with('s3://bucket/file.jpg', self.task, 'Task')

    @patch('io_storages.proxy_api.get_storage_by_url')
    def test_resolve_storage_not_found(self, mock_get_storage):
        mock_get_storage.return_value = None
        result = self.mixin.resolve(self.request, 'fileuri', self.task)
        assert result.status_code == status.HTTP_404_NOT_FOUND

    @patch('io_storages.proxy_api.get_storage_by_url')
    def test_resolve_storage_no_presign_support(self, mock_get_storage):
        mock_storage = MagicMock()
        delattr(mock_storage, 'presign')
        mock_get_storage.return_value = mock_storage
        result = self.mixin.resolve(self.request, 'fileuri', self.task)
        assert result.status_code == status.HTTP_404_NOT_FOUND

    @patch('io_storages.proxy_api.get_storage_by_url')
    def test_resolve_with_presign_true(self, mock_get_storage):
        mock_storage = MagicMock()
        mock_storage.presign = True
        mock_get_storage.return_value = mock_storage

        with patch.object(self.mixin, 'redirect_to_presign_url') as mock_redirect:
            mock_redirect.return_value = Response()
            self.mixin.resolve(self.request, 'fileuri', self.task)
            mock_redirect.assert_called_once()

    @patch('io_storages.proxy_api.get_storage_by_url')
    def test_resolve_with_presign_false(self, mock_get_storage):
        mock_storage = MagicMock()
        mock_storage.presign = False
        mock_get_storage.return_value = mock_storage
        project = self.task.project

        with patch.object(self.mixin, 'proxy_data_from_storage') as mock_proxy:
            mock_proxy.return_value = Response()
            self.mixin.resolve(self.request, 'fileuri', self.task)
            mock_proxy.assert_called_once_with(self.request, 'fileuri', project, mock_storage)

    def test_redirect_to_presign_url_success(self):
        self.task.resolve_storage_uri.return_value = {'url': 'https://example.com/file.jpg', 'presign_ttl': 60}
        result = self.mixin.redirect_to_presign_url('fileuri', self.task, 'Task')

        assert result.status_code == status.HTTP_303_SEE_OTHER
        assert result.url == 'https://example.com/file.jpg'
        assert result.headers['Cache-Control'] == 'no-store, max-age=3600'

    def test_redirect_to_presign_url_no_url(self):
        self.task.resolve_storage_uri.return_value = {'url': None}
        result = self.mixin.redirect_to_presign_url('fileuri', self.task, 'Task')
        assert result.status_code == status.HTTP_404_NOT_FOUND

    def test_redirect_to_presign_url_exception(self):
        self.task.resolve_storage_uri.side_effect = Exception('Error resolving URL')
        result = self.mixin.redirect_to_presign_url('fileuri', self.task, 'Task')
        assert result.status_code == status.HTTP_404_NOT_FOUND

    def test_proxy_data_from_storage_success(self):
        mock_storage = MagicMock()
        # Ensure get_bytes_stream returns a three-tuple, metadata can be empty initially
        mock_storage.get_bytes_stream.return_value = (io.BytesIO(b'test data'), 'image/jpeg', {})
        mock_project = MagicMock()

        with patch('io_storages.proxy_api.StreamingHttpResponse') as mock_response_class, patch(
            'io_storages.proxy_api.settings'
        ) as mock_settings:
            # Configure mock settings
            mock_settings.RESOLVER_PROXY_MAX_RANGE_SIZE = 1024 * 1024  # 1MB
            mock_settings.RESOLVER_PROXY_BUFFER_SIZE = 8192
            mock_settings.RESOLVER_PROXY_CACHE_TIMEOUT = 3600

            # Set up mock stream and response
            mock_stream = MagicMock()
            mock_metadata = {
                'StatusCode': 200,
                'ContentLength': 1000,
                'LastModified': datetime.now(),
                'ETag': '"abcdef123456"',
            }
            mock_storage.get_bytes_stream.return_value = (mock_stream, 'application/test', mock_metadata)

            # Set up mock response
            mock_response = MagicMock()
            mock_response.headers = {}
            mock_response_class.return_value = mock_response

            # Set up request with range header
            self.request.headers = {'Range': 'bytes=100-200'}

            # Call the method
            result = self.mixin.proxy_data_from_storage(self.request, 'uri', mock_project, mock_storage)

            # Verify the correct range header was passed
            mock_storage.get_bytes_stream.assert_called_once()
            args, kwargs = mock_storage.get_bytes_stream.call_args
            # First positional argument should be the URI
            self.assertEqual(args[0], 'uri')
            # Range header should be passed as a keyword argument and start with 'bytes='
            self.assertIn('range_header', kwargs)
            self.assertTrue(kwargs['range_header'].startswith('bytes='))

            # Verify the response was created with the stream
            mock_response_class.assert_called_once()
            # The first positional argument should be a generator returned by time_limited_chunker
            called_args, _ = mock_response_class.call_args
            streaming_generator = called_args[0]
            self.assertTrue(
                hasattr(streaming_generator, '__next__') and hasattr(streaming_generator, '__iter__'),
                'Expected a generator for streaming chunks',
            )

            # Verify correct headers are set
            self.assertEqual(result, mock_response)
            self.assertTrue('ETag' in mock_response.headers)

    def test_proxy_data_from_storage_no_data(self):
        mock_storage = MagicMock()
        # Return three-tuple with empty metadata when no data is available
        mock_storage.get_bytes_stream.return_value = (None, None, {})
        mock_project = MagicMock()

        result = self.mixin.proxy_data_from_storage(self.request, 'uri', mock_project, mock_storage)
        assert result.status_code == status.HTTP_424_FAILED_DEPENDENCY

    def test_proxy_data_from_storage_exception(self):
        mock_storage = MagicMock()
        mock_storage.get_bytes_stream.side_effect = Exception('Storage error')
        mock_project = MagicMock()

        result = self.mixin.proxy_data_from_storage(self.request, 'uri', mock_project, mock_storage)
        assert result.status_code == status.HTTP_424_FAILED_DEPENDENCY

    def test_time_limited_chunker_normal_case(self):
        """Test time_limited_chunker when all chunks are processed within timeout"""
        # Create a mock stream with iter_chunks method
        mock_stream = MagicMock()
        mock_stream.iter_chunks.return_value = [b'chunk1', b'chunk2', b'chunk3']

        # Set up settings
        with patch('io_storages.proxy_api.settings') as mock_settings, patch('time.monotonic') as mock_time:
            # Mock settings
            mock_settings.RESOLVER_PROXY_BUFFER_SIZE = 8192
            mock_settings.RESOLVER_PROXY_TIMEOUT = 20

            # Mock time to simulate being within timeout
            # Add an extra value for the 'finally' block
            mock_time.side_effect = [0, 1, 2, 3, 4]  # Start, three chunk iterations, finally

            # Run the chunker and collect all chunks
            chunks = list(self.mixin.time_limited_chunker(mock_stream))

            # Verify all chunks were yielded
            assert chunks == [b'chunk1', b'chunk2', b'chunk3']
            assert mock_stream.close.called

    def test_time_limited_chunker_timeout(self):
        """Test time_limited_chunker when timeout is reached during processing"""
        # Create a mock stream with iter_chunks method
        mock_stream = MagicMock()
        mock_stream.iter_chunks.return_value = [b'chunk1', b'chunk2', b'chunk3', b'chunk4', b'chunk5']

        # Set up settings
        with patch('io_storages.proxy_api.settings') as mock_settings, patch('time.monotonic') as mock_time:
            # Mock settings
            mock_settings.RESOLVER_PROXY_BUFFER_SIZE = 8192
            mock_settings.RESOLVER_PROXY_TIMEOUT = 10

            # Mock time to simulate exceeding timeout after second chunk
            # Add an extra value for the 'finally' block
            mock_time.side_effect = [0, 5, 9, 15, 20, 25]  # Start time, chunk checks, finally

            # Run the chunker and collect all chunks
            chunks = list(self.mixin.time_limited_chunker(mock_stream))

            # Verify only the chunks before timeout were yielded
            assert chunks == [b'chunk1', b'chunk2']
            assert mock_stream.close.called

    def test_time_limited_chunker_exception(self):
        """Test time_limited_chunker when an exception occurs during streaming"""
        # Create a mock stream with iter_chunks method that raises an exception
        mock_stream = MagicMock()
        mock_stream.iter_chunks.side_effect = Exception('Streaming error')

        # Set up settings
        with patch('io_storages.proxy_api.settings') as mock_settings, patch('time.monotonic') as mock_time:
            # Mock settings
            mock_settings.RESOLVER_PROXY_BUFFER_SIZE = 8192
            mock_settings.RESOLVER_PROXY_TIMEOUT = 20

            # Mock time - need two values: one for start and one for the finally block
            mock_time.side_effect = [0, 1]

            # Run the chunker and collect all chunks (should be empty due to exception)
            chunks = list(self.mixin.time_limited_chunker(mock_stream))

            # Verify no chunks were yielded and the stream was closed
            assert chunks == []
            assert mock_stream.close.called

    def test_override_range_header_no_header(self):
        """Test override_range_header when no Range header is present"""
        self.request.headers = {}
        result = self.mixin.override_range_header(self.request)
        assert result is None

    def test_override_range_header_header_probes(self):
        """Test override_range_header with header probe formats"""
        # Test bytes=0-
        self.request.headers = {'Range': 'bytes=0-'}
        with patch('io_storages.proxy_api.settings') as mock_settings, patch(
            'io_storages.proxy_api.parse_range'
        ) as mock_parse_range:
            mock_settings.RESOLVER_PROXY_MAX_RANGE_SIZE = 1024 * 1024
            # Mock the parse_range function to return a known value
            mock_parse_range.return_value = (0, '')

            result = self.mixin.override_range_header(self.request)
            assert result == 'bytes=0-'

        # Test bytes=0-0
        self.request.headers = {'Range': 'bytes=0-0'}
        with patch('io_storages.proxy_api.settings') as mock_settings, patch(
            'io_storages.proxy_api.parse_range'
        ) as mock_parse_range:
            mock_settings.RESOLVER_PROXY_MAX_RANGE_SIZE = 1024 * 1024
            # Mock the parse_range function to return a known value
            mock_parse_range.return_value = (0, 0)

            result = self.mixin.override_range_header(self.request)
            assert result == 'bytes=0-0'

    def test_override_range_header_start_no_end(self):
        """Test override_range_header with a start position but no end"""
        # Case: bytes=100-
        self.request.headers = {'Range': 'bytes=100-'}
        with patch('io_storages.proxy_api.settings') as mock_settings, patch(
            'io_storages.proxy_api.parse_range'
        ) as mock_parse_range:
            mock_settings.RESOLVER_PROXY_MAX_RANGE_SIZE = 1024 * 1024  # 1MB
            # Mock the parse_range function to return a known value
            mock_parse_range.return_value = (100, '')

            result = self.mixin.override_range_header(self.request)
            # Should add MAX_RANGE_SIZE to start
            assert result == f'bytes=100-{100 + 1024*1024}'

        # Case: bytes=100-0 (treated like bytes=100-)
        self.request.headers = {'Range': 'bytes=100-0'}
        with patch('io_storages.proxy_api.settings') as mock_settings, patch(
            'io_storages.proxy_api.parse_range'
        ) as mock_parse_range:
            mock_settings.RESOLVER_PROXY_MAX_RANGE_SIZE = 1024 * 1024  # 1MB
            # Mock the parse_range function to return a known value
            mock_parse_range.return_value = (100, 0)

            result = self.mixin.override_range_header(self.request)
            # Should add MAX_RANGE_SIZE to start
            assert result == f'bytes=100-{100 + 1024*1024}'

    def test_override_range_header_start_and_end(self):
        """Test override_range_header with start and end positions"""
        # Case: Range within limit
        self.request.headers = {'Range': 'bytes=100-5000'}
        with patch('io_storages.proxy_api.settings') as mock_settings, patch(
            'io_storages.proxy_api.parse_range'
        ) as mock_parse_range:
            mock_settings.RESOLVER_PROXY_MAX_RANGE_SIZE = 10000  # 10KB
            # Mock the parse_range function to return a known value
            mock_parse_range.return_value = (100, 5000)

            result = self.mixin.override_range_header(self.request)
            # Should remain unchanged as it's within limit
            assert result == 'bytes=100-5000'

        # Case: Range exceeding limit
        self.request.headers = {'Range': 'bytes=100-20000'}
        with patch('io_storages.proxy_api.settings') as mock_settings, patch(
            'io_storages.proxy_api.parse_range'
        ) as mock_parse_range:
            mock_settings.RESOLVER_PROXY_MAX_RANGE_SIZE = 10000  # 10KB
            # Mock the parse_range function to return a known value
            mock_parse_range.return_value = (100, 20000)

            result = self.mixin.override_range_header(self.request)
            # Should limit the range to MAX_RANGE_SIZE from start
            assert result == f'bytes=100-{100 + 10000}'

    def test_override_range_header_negative_start(self):
        """Test override_range_header with negative start position"""
        self.request.headers = {'Range': 'bytes=-1024'}
        with patch('io_storages.proxy_api.settings') as mock_settings, patch(
            'io_storages.proxy_api.parse_range'
        ) as mock_parse_range:
            mock_settings.RESOLVER_PROXY_MAX_RANGE_SIZE = 10000  # 10KB
            # Mock the parse_range function to return a negative start
            mock_parse_range.return_value = (-1024, None)

            result = self.mixin.override_range_header(self.request)
            # Should reset to 0 and add MAX_RANGE_SIZE
            assert result == f'bytes=0-{10000}'

    def test_override_range_header_unsupported_format(self):
        """Test override_range_header with unsupported range format"""
        self.request.headers = {'Range': 'invalid-range-format'}
        with patch('io_storages.proxy_api.settings') as mock_settings, patch(
            'io_storages.proxy_api.parse_range'
        ) as mock_parse_range:
            mock_settings.RESOLVER_PROXY_MAX_RANGE_SIZE = 10000  # 10KB
            # Mock parse_range to simulate failure with invalid format
            mock_parse_range.return_value = (0, None)

            result = self.mixin.override_range_header(self.request)
            # Should reset to default
            assert result == 'bytes=0-'


class TestTaskResolveStorageUri:
    @pytest.fixture
    def setup(self):
        # Create the necessary objects for testing without database
        self.factory = APIRequestFactory()
        self.user = MagicMock()
        self.task = MagicMock(spec=Task)
        self.view = TaskResolveStorageUri.as_view()

    @patch('io_storages.proxy_api.Task.objects.get')
    def test_get_with_missing_params(self, mock_task_get, setup):
        # Mock the database query
        mock_task_get.return_value = self.task

        # Test missing fileuri parameter
        request = self.factory.get('/task/1/resolve/')
        force_authenticate(request, user=self.user)
        response = self.view(request, task_id=1)
        assert response.status_code == status.HTTP_400_BAD_REQUEST

        # Test missing task_id parameter
        request = self.factory.get('/task/resolve/?fileuri=test')
        force_authenticate(request, user=self.user)
        response = self.view(request)
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    @patch('io_storages.proxy_api.Task.objects.get')
    def test_get_task_not_found(self, mock_task_get, setup):
        # Mock the database query to raise DoesNotExist
        mock_task_get.side_effect = Task.DoesNotExist

        request = self.factory.get('/task/999/resolve/?fileuri=test')
        force_authenticate(request, user=self.user)
        response = self.view(request, task_id=999)

        assert response.status_code == status.HTTP_404_NOT_FOUND

    @patch('io_storages.proxy_api.Task.objects.get')
    @patch.object(ResolveStorageUriAPIMixin, 'resolve')
    def test_get_success(self, mock_resolve, mock_task_get, setup):
        # Mock the database query and resolve method
        mock_task_get.return_value = self.task
        mock_resolve.return_value = Response(status=status.HTTP_200_OK)

        request = self.factory.get('/task/1/resolve/?fileuri=test')
        force_authenticate(request, user=self.user)
        response = self.view(request, task_id=1)

        mock_task_get.assert_called_once_with(pk=1)
        # Use any_call instead of assert_called_once_with to handle DRF request vs WSGIRequest
        assert mock_resolve.call_args is not None
        assert mock_resolve.call_args[0][1] == 'test'
        assert mock_resolve.call_args[0][2] == self.task
        assert response.status_code == status.HTTP_200_OK


@pytest.mark.django_db
class TestProjectResolveStorageUri:
    @pytest.fixture
    def setup(self):
        # Create the necessary objects for testing without database
        self.factory = APIRequestFactory()
        self.user = MagicMock()
        self.project = MagicMock()  # Avoid using spec=Project - it triggers database access
        self.view = ProjectResolveStorageUri.as_view()

    @patch('io_storages.proxy_api.Project.objects.get')
    def test_get_with_missing_params(self, mock_project_get, setup):
        # Mock the database query
        mock_project_get.return_value = self.project

        # Test missing fileuri parameter
        request = self.factory.get('/project/1/resolve/')
        force_authenticate(request, user=self.user)
        response = self.view(request, project_id=1)
        assert response.status_code == status.HTTP_400_BAD_REQUEST

        # Test missing project_id parameter
        request = self.factory.get('/project/resolve/?fileuri=test')
        force_authenticate(request, user=self.user)
        response = self.view(request)
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    @patch('io_storages.proxy_api.Project.objects.get')
    def test_get_project_not_found(self, mock_project_get, setup):
        # Mock the database query to raise DoesNotExist
        mock_project_get.side_effect = Project.DoesNotExist

        request = self.factory.get('/project/999/resolve/?fileuri=test')
        force_authenticate(request, user=self.user)
        response = self.view(request, project_id=999)

        assert response.status_code == status.HTTP_404_NOT_FOUND

    @patch('io_storages.proxy_api.Project.objects.get')
    @patch.object(ResolveStorageUriAPIMixin, 'resolve')
    def test_get_success(self, mock_resolve, mock_project_get, setup):
        # Mock the database query and resolve method
        mock_project_get.return_value = self.project
        mock_resolve.return_value = Response(status=status.HTTP_200_OK)

        request = self.factory.get('/project/1/resolve/?fileuri=test')
        force_authenticate(request, user=self.user)
        response = self.view(request, project_id=1)

        mock_project_get.assert_called_once_with(pk=1)
        # Use any_call instead of assert_called_once_with to handle DRF request vs WSGIRequest
        assert mock_resolve.call_args is not None
        assert mock_resolve.call_args[0][1] == 'test'
        assert mock_resolve.call_args[0][2] == self.project
        assert response.status_code == status.HTTP_200_OK
