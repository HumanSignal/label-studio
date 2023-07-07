import pytest
from unittest import mock

from django.conf import settings
from rest_framework.exceptions import ValidationError

from core.utils.exceptions import InvalidUploadUrlError
from data_import.uploader import load_tasks, check_tasks_max_file_size, validate_upload_url

pytestmark = pytest.mark.django_db


class MockedRequest:
    FILES = ()

    def __init__(self, url):
        self.url = url

    @property
    def content_type(self):
        return "application/x-www-form-urlencoded"

    @property
    def data(self):
        return {"url": self.url}

    @property
    def user(self):
        return None


class TestUploader:
    @pytest.fixture
    def project(self, configured_project, settings):
        return configured_project

    class TestLoadTasks:
        @mock.patch('data_import.uploader.validate_upload_url', wraps=validate_upload_url)
        @pytest.mark.parametrize("url", ("file:///etc/passwd", "ftp://example.org"))
        def test_raises_for_unsafe_urls(self, validate_upload_url_mock, url, project):
            request = MockedRequest(url=url)

            with pytest.raises(ValidationError) as e:
                load_tasks(request, project)
                assert 'The provided URL was not valid.' in e.value

            validate_upload_url_mock.assert_called_once_with(url, block_local_urls=False)

        @mock.patch('data_import.uploader.validate_upload_url', wraps=validate_upload_url)
        def test_raises_for_local_urls_with_ssrf_protection_enabled(self, validate_upload_url_mock, project, settings):
            settings.SSRF_PROTECTION_ENABLED = True
            request = MockedRequest(url='http://0.0.0.0')

            with pytest.raises(ValidationError) as e:
                load_tasks(request, project)
                assert 'The provided URL was not valid.' in e.value

            validate_upload_url_mock.assert_called_once_with('http://0.0.0.0', block_local_urls=True)


class TestTasksFileChecks:
    @pytest.mark.parametrize("value", (0, settings.TASKS_MAX_FILE_SIZE - 1))
    def test_check_tasks_max_file_size_does_not_raise_for_correct_value(self, value):
        check_tasks_max_file_size(value)

    def test_check_tasks_max_file_size_raises_for_too_big_value(self):
        value = settings.TASKS_MAX_FILE_SIZE + 1

        with pytest.raises(ValidationError) as e:
            check_tasks_max_file_size(value)

        correct_error_message = (
            f'Maximum total size of all files is {settings.TASKS_MAX_FILE_SIZE} bytes, '
            f'current size is {value} bytes'
        )
        assert (
            f'Maximum total size of all files is {settings.TASKS_MAX_FILE_SIZE} bytes'
            in str(e.value)
        )
