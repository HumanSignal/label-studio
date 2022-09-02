import pytest

from django.core.files.base import ContentFile

from data_import.models import FileUpload

pytestmark = pytest.mark.django_db


class TestFileUpload:
    @pytest.fixture
    def jsonl_file(self, configured_project):
        return FileUpload.objects.create(
            user=configured_project.created_by,
            project=configured_project,
            file=ContentFile(
                '{"id":100,"annotations":[],"file_upload":"d123c1f3-bb1f75c8cb.json","drafts":[],"predictions":[100],"data":{},"meta":{}, "updated_by":1,"comment_authors":[]}\n'
                '{"id":120,"annotations":[],"file_upload":"d456c1f3-bb1f75c8cb.json","drafts":[],"predictions":[120],"data":{},"meta":{}, "updated_by":2,"comment_authors":[]}\n',
                name="data.jsonl",
            ),
        )

    def test_read_tasks_calls_jsonl_reader(self, mocker, jsonl_file):
        mocked_read_jsonl = mocker.patch(
            "data_import.models.FileUpload.read_tasks_list_from_jsonl"
        )

        jsonl_file.read_tasks()
        mocked_read_jsonl.assert_called_once()

    def test_read_tasks_list_from_jsonl(self, jsonl_file):
        tasks = jsonl_file.read_tasks_list_from_jsonl()

        assert len(tasks) == 2
        assert tasks == [
            {
                "data": {
                    "id": 100,
                    "annotations": [],
                    "file_upload": "d123c1f3-bb1f75c8cb.json",
                    "drafts": [],
                    "predictions": [100],
                    "data": {},
                    "meta": {},
                    "updated_by": 1,
                    "comment_authors": [],
                }
            },
            {
                "data": {
                    "id": 120,
                    "annotations": [],
                    "file_upload": "d456c1f3-bb1f75c8cb.json",
                    "drafts": [],
                    "predictions": [120],
                    "data": {},
                    "meta": {},
                    "updated_by": 2,
                    "comment_authors": [],
                }
            },
        ]
