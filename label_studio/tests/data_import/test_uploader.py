from unittest import mock
from unittest.mock import Mock

import pytest
from core.utils.io import validate_upload_url
from data_import.uploader import check_tasks_max_file_size, load_tasks, tasks_from_url
from django.conf import settings
from organizations.tests.factories import OrganizationFactory
from projects.tests.factories import ProjectFactory
from rest_framework.exceptions import ValidationError
from users.tests.factories import UserFactory

pytestmark = pytest.mark.django_db


class MockedRequest:
    FILES = ()

    def __init__(self, url):
        self.url = url

    @property
    def content_type(self):
        return 'application/x-www-form-urlencoded'

    @property
    def data(self):
        return {'url': self.url}

    @property
    def user(self):
        return None


class TestUploader:
    @pytest.fixture
    def project(self, configured_project, settings):
        return configured_project

    class TestLoadTasks:
        @mock.patch('core.utils.io.validate_upload_url', wraps=validate_upload_url)
        @pytest.mark.parametrize('url', ('file:///etc/passwd', 'ftp://example.org'))
        def test_raises_for_unsafe_urls(self, validate_upload_url_mock, url, project):
            request = MockedRequest(url=url)

            with pytest.raises(ValidationError) as e:
                load_tasks(request, project)
                assert 'The provided URL was not valid.' in e.value

            validate_upload_url_mock.assert_called_once_with(url, block_local_urls=False)

        @mock.patch('core.utils.io.validate_upload_url', wraps=validate_upload_url)
        def test_raises_for_local_urls_with_ssrf_protection_enabled(self, validate_upload_url_mock, project, settings):
            settings.SSRF_PROTECTION_ENABLED = True
            request = MockedRequest(url='http://0.0.0.0')

            with pytest.raises(ValidationError) as e:
                load_tasks(request, project)
                assert 'The provided URL was not valid.' in e.value

            validate_upload_url_mock.assert_called_once_with('http://0.0.0.0', block_local_urls=True)

        def test_local_url_after_redirect(self, project, settings):
            settings.SSRF_PROTECTION_ENABLED = True
            request = MockedRequest(url='http://validurl.com')

            # Mock the necessary parts of the response object
            mock_response = Mock()
            mock_response.raw._connection.sock.getpeername.return_value = ('127.0.0.1', 8080)

            # Patch the requests.get call in the data_import.uploader module
            with (
                mock.patch('core.utils.io.requests.get', return_value=mock_response),
                pytest.raises(ValidationError) as e,
            ):
                load_tasks(request, project)
            assert 'URL resolves to a reserved network address (block: 127.0.0.0/8)' in str(e.value)

        def test_user_specified_block(self, project, settings):
            settings.SSRF_PROTECTION_ENABLED = True
            settings.USER_ADDITIONAL_BANNED_SUBNETS = ['1.2.3.4']
            request = MockedRequest(url='http://validurl.com')

            # Mock the necessary parts of the response object
            mock_response = Mock()
            mock_response.raw._connection.sock.getpeername.return_value = ('1.2.3.4', 8080)

            # Patch the requests.get call in the data_import.uploader module
            with (
                mock.patch('core.utils.io.requests.get', return_value=mock_response),
                pytest.raises(ValidationError) as e,
            ):
                load_tasks(request, project)
            assert 'URL resolves to a reserved network address (block: 1.2.3.4)' in str(e.value)

            mock_response.raw._connection.sock.getpeername.return_value = ('198.51.100.0', 8080)
            with (
                mock.patch('core.utils.io.requests.get', return_value=mock_response),
                pytest.raises(ValidationError) as e,
            ):
                load_tasks(request, project)
            assert 'URL resolves to a reserved network address (block: 198.51.100.0/24)' in str(e.value)

        def test_user_specified_block_without_default(self, project, settings):
            settings.SSRF_PROTECTION_ENABLED = True
            settings.USER_ADDITIONAL_BANNED_SUBNETS = ['1.2.3.4']
            settings.USE_DEFAULT_BANNED_SUBNETS = False
            request = MockedRequest(url='http://validurl.com')

            # Mock the necessary parts of the response object
            mock_response = Mock()
            mock_response.raw._connection.sock.getpeername.return_value = ('1.2.3.4', 8080)

            # Patch the requests.get call in the data_import.uploader module
            with (
                mock.patch('core.utils.io.requests.get', return_value=mock_response),
                pytest.raises(ValidationError) as e,
            ):
                load_tasks(request, project)
            assert 'URL resolves to a reserved network address (block: 1.2.3.4)' in str(e.value)

            mock_response.raw._connection.sock.getpeername.return_value = ('198.51.100.0', 8080)
            with (
                mock.patch('core.utils.io.requests.get', return_value=mock_response),
                pytest.raises(ValidationError) as e,
            ):
                load_tasks(request, project)
            # Verify that the error is NOT an SSRF block (IP validation passed)
            assert 'URL resolves to a reserved network address' not in str(e.value)
            # Instead, it should be some other processing error (not SSRF-related)
            assert len(str(e.value)) > 0  # Some error occurred, but not SSRF


class TestTasksFileChecks:
    @pytest.mark.parametrize('value', (0, settings.TASKS_MAX_FILE_SIZE - 1))
    def test_check_tasks_max_file_size_does_not_raise_for_correct_value(self, value):
        check_tasks_max_file_size(value)

    def test_check_tasks_max_file_size_raises_for_too_big_value(self):
        value = settings.TASKS_MAX_FILE_SIZE + 1

        with pytest.raises(ValidationError) as e:
            check_tasks_max_file_size(value)

        assert f'Maximum total size of all files is {settings.TASKS_MAX_FILE_SIZE} bytes' in str(e.value)


class TestTasksFromUrl:
    @pytest.fixture
    def organization(self):
        return OrganizationFactory()

    @pytest.fixture
    def user(self, organization):
        return UserFactory(active_organization=organization)

    @pytest.fixture
    def project(self, organization, user):
        return ProjectFactory(organization=organization, created_by=user)

    @staticmethod
    def create_mock_response(url='https://example.com/data.json', content_length='1000', content=b'{"test": "data"}'):
        """Factory method to create mock HTTP response objects"""

        class MockResponse:
            def __init__(self, url, content_length, content):
                self.url = url
                self.headers = {'content-length': content_length}
                self.content = content

        return MockResponse(url, content_length, content)

    @staticmethod
    def create_mock_file_upload(upload_id=1, format_could_be_tasks_list=True):
        """Factory method to create mock FileUpload objects"""
        mock_file_upload = Mock()
        mock_file_upload.id = upload_id
        mock_file_upload.format_could_be_tasks_list = format_could_be_tasks_list
        return mock_file_upload

    @mock.patch('data_import.uploader.ssrf_safe_get')  # Mock where it's used, not where it's defined
    @mock.patch('data_import.uploader.create_file_upload')
    @mock.patch('data_import.models.FileUpload.load_tasks_from_uploaded_files')
    def test_valid_extension_no_error(
        self, mock_load_tasks, mock_create_file_upload, mock_ssrf_safe_get, project, user
    ):
        """Test that valid extension doesn't raise an error"""
        # Create mock response with redirect to a file with valid extension
        mock_response = self.create_mock_response(
            url='https://example.com/data.json',
            content_length='1000',
            content=b'{"test": "data"}',  # Redirected URL
        )
        mock_ssrf_safe_get.return_value = mock_response

        # Create mock file upload
        mock_file_upload = self.create_mock_file_upload(upload_id=1, format_could_be_tasks_list=True)
        mock_create_file_upload.return_value = mock_file_upload

        # Mock load tasks
        mock_load_tasks.return_value = ([{'data': {'test': 'data'}}], ['JSON'], ['test'])

        file_upload_ids = []
        # Original URL is different from response.url to simulate redirect
        data_keys, found_formats, tasks, file_upload_ids, could_be_tasks_list = tasks_from_url(
            file_upload_ids, project, user, 'https://example.com/redirect', False
        )

        # Verify no exception was raised and correct filename was used
        assert file_upload_ids == [1]
        assert could_be_tasks_list is True
        mock_create_file_upload.assert_called_once()
        args, kwargs = mock_create_file_upload.call_args
        # After redirect, filename should be from the resolved URL
        assert args[2].name == 'data.json'

    @mock.patch('data_import.uploader.ssrf_safe_get')  # Mock where it's used
    def test_invalid_extension_raises_error(self, mock_ssrf_safe_get, project, user):
        """Test that invalid extension raises ValidationError"""
        # Create mock response with redirect to a file with invalid extension
        mock_response = self.create_mock_response(
            url='https://example.com/data.exe',  # Redirected URL with invalid extension
            content_length='1000',
            content=b'invalid content',
        )
        mock_ssrf_safe_get.return_value = mock_response

        file_upload_ids = []
        with pytest.raises(ValidationError) as exc_info:
            # Original URL is different from response.url to simulate redirect
            tasks_from_url(file_upload_ids, project, user, 'https://example.com/redirect', False)

        assert '.exe extension is not supported' in str(exc_info.value)

    @mock.patch('data_import.uploader.ssrf_safe_get')  # Mock where it's used
    @mock.patch('data_import.uploader.create_file_upload')
    @mock.patch('data_import.models.FileUpload.load_tasks_from_uploaded_files')
    def test_file_size_within_limit_no_error(
        self, mock_load_tasks, mock_create_file_upload, mock_ssrf_safe_get, project, user
    ):
        """Test that file size within limit doesn't raise an error"""
        # Create mock response with small file size
        mock_response = self.create_mock_response(
            url='https://example.com/data.json',
            content_length=str(settings.TASKS_MAX_FILE_SIZE - 1000),
            content=b'{"test": "data"}',
        )
        mock_ssrf_safe_get.return_value = mock_response

        # Create mock file upload
        mock_file_upload = self.create_mock_file_upload(upload_id=1, format_could_be_tasks_list=False)
        mock_create_file_upload.return_value = mock_file_upload

        # Mock load tasks
        mock_load_tasks.return_value = ([{'data': {'test': 'data'}}], ['JSON'], ['test'])

        file_upload_ids = []
        data_keys, found_formats, tasks, file_upload_ids, could_be_tasks_list = tasks_from_url(
            file_upload_ids, project, user, 'https://example.com/data.json', False
        )

        # Verify no exception was raised
        assert file_upload_ids == [1]

    @mock.patch('data_import.uploader.ssrf_safe_get')  # Mock where it's used
    def test_file_size_exceeds_limit_raises_error(self, mock_ssrf_safe_get, project, user):
        """Test that file size exceeding limit raises ValidationError"""
        # Create mock response with large file size
        mock_response = self.create_mock_response(
            url='https://example.com/data.json',
            content_length=str(settings.TASKS_MAX_FILE_SIZE + 1000),
            content=b'{"test": "data"}',
        )
        mock_ssrf_safe_get.return_value = mock_response

        file_upload_ids = []
        with pytest.raises(ValidationError) as exc_info:
            tasks_from_url(file_upload_ids, project, user, 'https://example.com/data.json', False)

        assert f'Maximum total size of all files is {settings.TASKS_MAX_FILE_SIZE} bytes' in str(exc_info.value)
