import pytest

from django.conf import settings
from rest_framework.exceptions import ValidationError

from data_import.uploader import load_tasks, check_tasks_max_file_size

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


class TestUploader:
    @pytest.fixture
    def project(self, configured_project):
        return configured_project

    class TestLoadTasks:
        @pytest.mark.parametrize("url", ("file:///etc/passwd", " file://etc/kernel "))
        def test_raises_for_local_files(self, url, project):
            request = MockedRequest(url=url)

            with pytest.raises(ValidationError) as e:
                load_tasks(request, project)

            assert '"url" is not valid' in str(e.value)


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
