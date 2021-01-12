import pytest

# label_studio
from label_studio import blueprint as server
from label_studio.blueprint import (
    validation_error_handler,
)
from label_studio.tests.base import goc_project

from label_studio.utils.uri_resolver import _get_uri_via_regex


@pytest.fixture(autouse=True)
def default_project(monkeypatch):
    """
        apply patch for
        label_studio.server.project_get_or_create()
        for all tests.
    """
    monkeypatch.setattr(server, 'project_get_or_create', goc_project)


class TestUriRegex:
    valid_uri_data = ["s3://my-labelstudio-s3-bucket/my-test-objects/my-object",
                      "gs://my-labelstudio-gs-bucket/my-test-objects/my-object",
                      "<embed src='s3://my-labelstudio-bucket/pdf/my-pdf.pdf'/>",
                      "<embed iframe='gs://my-labelstudio-bucket/my-image.png'/>"]

    invalid_uri_data = ["s3:///my-labelstudio-s3-bucket/my-test-objects/my-object",
                        "gs://my-labelstudio-gs-bucket /my-test-objects/my-object",
                        "<embed iframe='bs://my-labelstudio-bucket/my-image.png'/>"]

    def test_valid_uri_regex(self):
        for text in self.valid_uri_data:
            assert _get_uri_via_regex(text) is not None

    def test_invalid_uri_regex(self):
        for text in self.invalid_uri_data:
            assert _get_uri_via_regex(text) is None
