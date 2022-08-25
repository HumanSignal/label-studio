import pytest

from rest_framework.exceptions import ValidationError

from data_import.uploader import load_tasks

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
