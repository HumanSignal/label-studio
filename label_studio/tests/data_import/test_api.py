import pytest

from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse

pytestmark = pytest.mark.django_db


class TestImportAPI:
    @pytest.fixture
    def url(self, configured_project):
        return reverse(
            "data_import:api-projects:project-import", args=[configured_project.id]
        )

    def test_import_accepts_jsonl(self, url, business_client):
        data = (
            b'{"id":100,"annotations":[],"file_upload":"d123c1f3-bb1f75c8cb.json","drafts":[],"predictions":[100],"data":{},"meta":{}, "meta_info": "info", "text":"Dog", "updated_by":1,"comment_authors":[]}\n'
            b'{"id":120,"annotations":[],"file_upload":"d456c1f3-bb1f75c8cb.json","drafts":[],"predictions":[120],"data":{},"meta":{}, "meta_info": "info", "text":"Dog", "updated_by":2,"comment_authors":[]}\n'
        )

        file = SimpleUploadedFile("file.jsonl", data, content_type="application/json")
        payload = {"tasks.jsonl": file}

        response = business_client.post(url, payload, format="multipart")
        assert response.status_code == 201, response.content

        data = response.data
        assert data["task_count"] == 2
        assert data["annotation_count"] == 0
        assert data["prediction_count"] == 0
        assert data["found_formats"] == {".jsonl": 1}
