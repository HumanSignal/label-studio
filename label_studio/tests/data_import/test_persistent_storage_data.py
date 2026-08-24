import json
from unittest import mock
from unittest.mock import Mock

import pytest
from data_import.api import DownloadStorageData
from data_import.models import FileUpload
from django.conf import settings
from django.http import HttpResponse
from organizations.models import Organization
from rest_framework import status
from rest_framework.test import APIRequestFactory
from storages.backends.s3boto3 import S3Boto3Storage
from users.models import User

"""
Comprehensive test suite for DownloadStorageData API

This test module validates the complete functionality of the DownloadStorageData view,
which handles secure file downloads from persistent storage (S3, GCS, Azure, etc.).

## Test Coverage:

### Authentication & Authorization Tests:
- Missing filepath parameter validation
- Invalid filepath security checks  
- FileUpload permission validation
- Organization-based avatar access control
- Cross-organization access prevention

### File Serving Mode Tests:
- **NGINX Mode**: X-Accel-Redirect header generation for high-performance serving
- **Direct Mode**: RangedFileResponse streaming with range request support
- Mode switching via USE_NGINX_FOR_UPLOADS setting

### File Type Support Tests:
- Upload files (settings.UPLOAD_DIR) with permission checking
- Avatar files (settings.AVATAR_PATH) with organization validation
- Content-Type detection for various formats (PDF, MP3, MP4, JPG, unknown)
- Content-Disposition headers (inline vs attachment)

### Edge Case & Security Tests:
- URL encoding/decoding support
- NGINX redirect URL construction
- Mock response handling for different scenarios
- Error response codes (403, 404)

## Test Structure:
Each test method focuses on a specific aspect of the API:
1. Sets up mock objects and request data
2. Calls the DownloadStorageData.get() method
3. Validates response status, headers, and behavior
4. Verifies security constraints and permissions

## Mocking Strategy:
- FileUpload.objects.filter() for database queries
- User.objects.filter() for avatar access
- RangedFileResponse for direct file serving
- Settings overrides for mode switching
- Organization membership checks

This comprehensive test suite ensures the API correctly handles all file types,
security scenarios, and serving modes while maintaining backward compatibility.
"""

pytestmark = pytest.mark.django_db


class TestDownloadStorageData:
    @pytest.fixture
    def api_factory(self):
        return APIRequestFactory()

    @pytest.fixture
    def user(self):
        """Create a test user with organization"""
        org = Organization.objects.create(title='Test Org')
        user = User.objects.create_user(email='test@example.com', password='test123')
        user.active_organization = org
        user.save()
        return user

    @pytest.fixture
    def other_user(self):
        """Create another user with different organization"""
        other_org = Organization.objects.create(title='Other Org')
        other_user = User.objects.create_user(email='other@example.com', password='test123')
        other_user.active_organization = other_org
        other_user.save()
        return other_user

    @pytest.fixture
    def mock_file_upload(self, user):
        """Create a mock FileUpload object"""
        file_upload = Mock(spec=FileUpload)
        file_upload.has_permission = Mock(return_value=True)

        # Mock the file object and storage
        mock_file = Mock()
        mock_storage = Mock()
        mock_storage.url = Mock(return_value='http://example.com/test.pdf')
        mock_file.storage = mock_storage
        mock_file.name = 'test.pdf'
        mock_file.open = Mock(return_value=Mock())

        file_upload.file = mock_file
        return file_upload

    @pytest.fixture
    def view(self):
        return DownloadStorageData()

    def test_missing_filepath_returns_404(self, api_factory, user, view):
        """Test that missing filepath parameter returns 404"""
        request = api_factory.get('/storage-data/uploaded/')
        request.user = user

        response = view.get(request)
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_invalid_filepath_returns_403(self, api_factory, user, view):
        """Test that filepath not starting with UPLOAD_DIR or AVATAR_PATH returns 403"""
        request = api_factory.get('/storage-data/uploaded/', {'filepath': 'invalid/path/file.pdf'})
        request.user = user

        response = view.get(request)
        assert response.status_code == status.HTTP_403_FORBIDDEN

    @mock.patch('data_import.api.FileUpload.objects.filter')
    def test_upload_file_not_found_returns_403(self, mock_filter, api_factory, user, view):
        """Test that non-existent upload file returns 403"""
        mock_filter.return_value.last.return_value = None

        request = api_factory.get('/storage-data/uploaded/', {'filepath': f'{settings.UPLOAD_DIR}/test.pdf'})
        request.user = user

        response = view.get(request)
        assert response.status_code == status.HTTP_403_FORBIDDEN

    @mock.patch('data_import.api.FileUpload.objects.filter')
    def test_upload_file_no_permission_returns_403(self, mock_filter, api_factory, user, view, mock_file_upload):
        """Test that upload file without permission returns 403"""
        mock_file_upload.has_permission.return_value = False
        mock_filter.return_value.last.return_value = mock_file_upload

        request = api_factory.get('/storage-data/uploaded/', {'filepath': f'{settings.UPLOAD_DIR}/test.pdf'})
        request.user = user

        response = view.get(request)
        assert response.status_code == status.HTTP_403_FORBIDDEN
        mock_file_upload.has_permission.assert_called_once_with(user)

    @mock.patch('data_import.api.User.objects.filter')
    def test_avatar_user_not_found_returns_403(self, mock_filter, api_factory, user, view):
        """Test that non-existent avatar user returns 403"""
        mock_filter.return_value.first.return_value = None

        request = api_factory.get('/storage-data/uploaded/', {'filepath': f'{settings.AVATAR_PATH}/avatar.jpg'})
        request.user = user

        response = view.get(request)
        assert response.status_code == status.HTTP_403_FORBIDDEN

    @mock.patch('data_import.api.User.objects.filter')
    def test_avatar_user_no_organization_access_returns_403(self, mock_filter, api_factory, user, other_user, view):
        """Test that avatar user from different organization returns 403"""
        mock_avatar_user = Mock()
        mock_avatar_user.avatar = Mock()
        mock_filter.return_value.first.return_value = mock_avatar_user

        # Mock organization access check to return False
        user.active_organization.has_user = Mock(return_value=False)

        request = api_factory.get('/storage-data/uploaded/', {'filepath': f'{settings.AVATAR_PATH}/avatar.jpg'})
        request.user = user

        response = view.get(request)
        assert response.status_code == status.HTTP_403_FORBIDDEN

    @mock.patch('data_import.api.FileUpload.objects.filter')
    @mock.patch('data_import.api.settings.USE_NGINX_FOR_UPLOADS', True)
    def test_upload_file_nginx_serving(self, mock_filter, api_factory, user, view, mock_file_upload):
        """Test upload file serving through NGINX"""
        mock_filter.return_value.last.return_value = mock_file_upload

        request = api_factory.get('/storage-data/uploaded/', {'filepath': f'{settings.UPLOAD_DIR}/test.pdf'})
        request.user = user

        response = view.get(request)

        assert isinstance(response, HttpResponse)
        assert response.status_code == 200
        assert 'X-Accel-Redirect' in response
        assert 'Content-Disposition' in response
        assert 'inline' in response['Content-Disposition']
        assert 'test.pdf' in response['Content-Disposition']

    @mock.patch('data_import.api.FileUpload.objects.filter')
    @mock.patch('data_import.api.settings.USE_NGINX_FOR_UPLOADS', False)
    @mock.patch('data_import.api.RangedFileResponse')
    def test_upload_file_direct_serving(
        self, mock_ranged_response, mock_filter, api_factory, user, view, mock_file_upload
    ):
        """Test upload file serving directly (without NGINX)"""
        mock_filter.return_value.last.return_value = mock_file_upload
        mock_response_instance = Mock()
        mock_response_instance.__setitem__ = Mock()  # Allow item assignment
        mock_ranged_response.return_value = mock_response_instance

        request = api_factory.get('/storage-data/uploaded/', {'filepath': f'{settings.UPLOAD_DIR}/test.pdf'})
        request.user = user

        response = view.get(request)

        assert response == mock_response_instance
        mock_ranged_response.assert_called_once()

    @mock.patch('data_import.api.User.objects.filter')
    @mock.patch('data_import.api.settings.USE_NGINX_FOR_UPLOADS', True)
    def test_avatar_file_nginx_serving(self, mock_filter, api_factory, user, view):
        """Test avatar file serving through NGINX"""
        mock_avatar_user = Mock()
        mock_avatar_file = Mock()
        mock_storage = Mock()
        mock_storage.url = Mock(return_value='http://example.com/avatar.jpg')
        mock_avatar_file.storage = mock_storage
        mock_avatar_file.name = 'avatar.jpg'
        mock_avatar_user.avatar = mock_avatar_file
        mock_filter.return_value.first.return_value = mock_avatar_user

        # Mock organization access check to return True
        user.active_organization.has_user = Mock(return_value=True)

        request = api_factory.get('/storage-data/uploaded/', {'filepath': f'{settings.AVATAR_PATH}/avatar.jpg'})
        request.user = user

        response = view.get(request)

        assert isinstance(response, HttpResponse)
        assert response.status_code == 200
        assert 'X-Accel-Redirect' in response
        assert 'Content-Disposition' in response

    @mock.patch('data_import.api.User.objects.filter')
    @mock.patch('data_import.api.settings.USE_NGINX_FOR_UPLOADS', False)
    @mock.patch('data_import.api.RangedFileResponse')
    def test_avatar_file_direct_serving(self, mock_ranged_response, mock_filter, api_factory, user, view):
        """Test avatar file serving directly (without NGINX)"""
        mock_avatar_user = Mock()
        mock_avatar_file = Mock()
        mock_avatar_file.open = Mock(return_value=Mock())
        mock_avatar_user.avatar = mock_avatar_file
        mock_filter.return_value.first.return_value = mock_avatar_user
        mock_response_instance = Mock()
        mock_response_instance.__setitem__ = Mock()  # Allow item assignment
        mock_ranged_response.return_value = mock_response_instance

        # Mock organization access check to return True
        user.active_organization.has_user = Mock(return_value=True)

        request = api_factory.get('/storage-data/uploaded/', {'filepath': f'{settings.AVATAR_PATH}/avatar.jpg'})
        request.user = user

        response = view.get(request)

        assert response == mock_response_instance
        mock_ranged_response.assert_called_once()

    @pytest.mark.parametrize(
        'file_extension,expected_content_type',
        [
            ('test.pdf', 'application/pdf'),
            ('test.mp3', 'audio/mpeg'),
            ('test.mp4', 'video/mp4'),
            ('test.jpg', 'image/jpeg'),
            ('unknown.unknownext', 'application/octet-stream'),
        ],
    )
    @mock.patch('data_import.api.FileUpload.objects.filter')
    @mock.patch('data_import.api.settings.USE_NGINX_FOR_UPLOADS', False)
    @mock.patch('data_import.api.RangedFileResponse')
    def test_content_type_detection(
        self,
        mock_ranged_response,
        mock_filter,
        file_extension,
        expected_content_type,
        api_factory,
        user,
        view,
        mock_file_upload,
    ):
        """Test that content types are properly detected for different file extensions"""
        mock_filter.return_value.last.return_value = mock_file_upload
        mock_response_instance = Mock()
        mock_response_instance.__setitem__ = Mock()  # Allow item assignment
        mock_ranged_response.return_value = mock_response_instance

        request = api_factory.get('/storage-data/uploaded/', {'filepath': f'{settings.UPLOAD_DIR}/{file_extension}'})
        request.user = user

        view.get(request)

        # Check that RangedFileResponse was called with the expected content type
        args, kwargs = mock_ranged_response.call_args
        assert kwargs['content_type'] == expected_content_type

    @mock.patch('data_import.api.FileUpload.objects.filter')
    @mock.patch('data_import.api.settings.USE_NGINX_FOR_UPLOADS', True)
    def test_nginx_redirect_url_construction(self, mock_filter, api_factory, user, view, mock_file_upload):
        """Test that NGINX redirect URL is properly constructed"""
        # Set up mock to return a specific URL
        mock_file_upload.file.storage.url.return_value = 'https://s3.amazonaws.com/bucket/test.pdf'
        mock_filter.return_value.last.return_value = mock_file_upload

        request = api_factory.get('/storage-data/uploaded/', {'filepath': f'{settings.UPLOAD_DIR}/test.pdf'})
        request.user = user

        response = view.get(request)

        # Check that X-Accel-Redirect header contains the expected path
        redirect_header = response['X-Accel-Redirect']
        assert redirect_header == '/file_download/https/s3.amazonaws.com/bucket/test.pdf'

    @mock.patch('data_import.api.unquote')
    @mock.patch('data_import.api.FileUpload.objects.filter')
    def test_filepath_url_decoding(self, mock_filter, mock_unquote, api_factory, user, view, mock_file_upload):
        """Test that filepath is properly URL-decoded"""
        mock_unquote.return_value = f'{settings.UPLOAD_DIR}/decoded file.pdf'
        mock_filter.return_value.last.return_value = mock_file_upload

        encoded_filepath = f'{settings.UPLOAD_DIR}/encoded%20file.pdf'
        request = api_factory.get('/storage-data/uploaded/', {'filepath': encoded_filepath})
        request.user = user

        view.get(request)

        mock_unquote.assert_called_once_with(encoded_filepath)

    # --- Streamer delegation (s3_default) -----------------------------------

    def _s3_file(self, key='upload/1/abc-photo.jpg', region='us-west-2', endpoint=None):
        """Build a mock FileUpload.file backed by an S3Boto3Storage."""
        storage = Mock(spec=S3Boto3Storage)
        storage._clean_name = Mock(return_value=key)
        storage._normalize_name = Mock(return_value=key)
        storage.bucket_name = 'persist-bucket'
        storage.region_name = region
        storage.endpoint_url = endpoint
        mock_file = Mock()
        mock_file.storage = storage
        mock_file.name = key
        return mock_file

    @mock.patch('data_import.api.FileUpload.objects.filter')
    def test_s3_upload_delegates_to_streamer(self, mock_filter, api_factory, user, view):
        """A streamer request for an S3-backed upload returns a delegation payload."""
        file_upload = Mock(spec=FileUpload)
        file_upload.has_permission = Mock(return_value=True)
        file_upload.file = self._s3_file()
        mock_filter.return_value.last.return_value = file_upload

        request = api_factory.get('/storage-data/uploaded/', {'filepath': f'{settings.UPLOAD_DIR}/abc-photo.jpg'})
        request.user = user
        request.is_streamer_delegation = True

        response = view.get(request)

        assert response['X-Streamer-Action'] == 'delegate'
        data = json.loads(response.content)
        assert data['action'] == 'proxy'
        assert data['storage_type'] == 's3_default'
        assert data['storage_id'] == 0
        assert data['bucket'] == 'persist-bucket'
        assert data['key'] == 'upload/1/abc-photo.jpg'
        assert data['region'] == 'us-west-2'
        assert data['endpoint'] == ''
        assert data['content_type'] == 'image/jpeg'

    @mock.patch('data_import.api.FileUpload.objects.filter')
    @mock.patch('data_import.api.settings.USE_NGINX_FOR_UPLOADS', True)
    def test_s3_upload_without_streamer_uses_nginx(self, mock_filter, api_factory, user, view):
        """Without the streamer flag, an S3 upload keeps the legacy X-Accel path."""
        file_upload = Mock(spec=FileUpload)
        file_upload.has_permission = Mock(return_value=True)
        s3_file = self._s3_file()
        # NGINX mode resolves the raw cloud URL via storage.url(..., storage_url=True).
        s3_file.storage.url = Mock(return_value='https://s3.amazonaws.com/persist-bucket/abc-photo.jpg')
        file_upload.file = s3_file
        mock_filter.return_value.last.return_value = file_upload

        request = api_factory.get('/storage-data/uploaded/', {'filepath': f'{settings.UPLOAD_DIR}/abc-photo.jpg'})
        request.user = user
        # No request.is_streamer_delegation attribute → not a streamer request.

        response = view.get(request)

        assert 'X-Streamer-Action' not in response
        assert 'X-Accel-Redirect' in response

    @mock.patch('data_import.api.FileUpload.objects.filter')
    @mock.patch('data_import.api.settings.USE_NGINX_FOR_UPLOADS', True)
    def test_non_s3_upload_falls_through_to_nginx(self, mock_filter, api_factory, user, view, mock_file_upload):
        """A streamer request for a non-S3 backend (GCS/Azure) is not delegated."""
        # mock_file_upload uses a plain Mock storage (not S3Boto3Storage).
        mock_file_upload.file.storage.url = Mock(return_value='https://storage.googleapis.com/b/test.pdf')
        mock_filter.return_value.last.return_value = mock_file_upload

        request = api_factory.get('/storage-data/uploaded/', {'filepath': f'{settings.UPLOAD_DIR}/test.pdf'})
        request.user = user
        request.is_streamer_delegation = True

        response = view.get(request)

        assert 'X-Streamer-Action' not in response
        assert 'X-Accel-Redirect' in response

    @mock.patch('data_import.api.FileUpload.objects.filter')
    def test_streamer_request_without_permission_returns_403(self, mock_filter, api_factory, user, view):
        """Permission is enforced before any delegation, even for streamer requests."""
        file_upload = Mock(spec=FileUpload)
        file_upload.has_permission = Mock(return_value=False)
        file_upload.file = self._s3_file()
        mock_filter.return_value.last.return_value = file_upload

        request = api_factory.get('/storage-data/uploaded/', {'filepath': f'{settings.UPLOAD_DIR}/abc-photo.jpg'})
        request.user = user
        request.is_streamer_delegation = True

        response = view.get(request)

        assert response.status_code == status.HTTP_403_FORBIDDEN
