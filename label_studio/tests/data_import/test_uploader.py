from unittest import mock
from unittest.mock import Mock

import pytest
from core.utils.io import validate_upload_url
from data_import.uploader import check_tasks_max_file_size, load_tasks
from django.conf import settings
from rest_framework.exceptions import ValidationError

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
            with mock.patch('core.utils.io.requests.get', return_value=mock_response), pytest.raises(
                ValidationError
            ) as e:
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
            with mock.patch('core.utils.io.requests.get', return_value=mock_response), pytest.raises(
                ValidationError
            ) as e:
                load_tasks(request, project)
            assert 'URL resolves to a reserved network address (block: 1.2.3.4)' in str(e.value)

            mock_response.raw._connection.sock.getpeername.return_value = ('198.51.100.0', 8080)
            with mock.patch('core.utils.io.requests.get', return_value=mock_response), pytest.raises(
                ValidationError
            ) as e:
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
            with mock.patch('core.utils.io.requests.get', return_value=mock_response), pytest.raises(
                ValidationError
            ) as e:
                load_tasks(request, project)
            assert 'URL resolves to a reserved network address (block: 1.2.3.4)' in str(e.value)

            mock_response.raw._connection.sock.getpeername.return_value = ('198.51.100.0', 8080)
            with mock.patch('core.utils.io.requests.get', return_value=mock_response), pytest.raises(
                ValidationError
            ) as e:
                load_tasks(request, project)
            assert "'Mock' object is not subscriptable" in str(e.value)  # validate ip did not raise exception


class TestTasksFileChecks:
    @pytest.mark.parametrize('value', (0, settings.TASKS_MAX_FILE_SIZE - 1))
    def test_check_tasks_max_file_size_does_not_raise_for_correct_value(self, value):
        check_tasks_max_file_size(value)

    def test_check_tasks_max_file_size_raises_for_too_big_value(self):
        value = settings.TASKS_MAX_FILE_SIZE + 1

        with pytest.raises(ValidationError) as e:
            check_tasks_max_file_size(value)

        assert f'Maximum total size of all files is {settings.TASKS_MAX_FILE_SIZE} bytes' in str(e.value)
