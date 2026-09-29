from unittest.mock import patch

import pytest
from data_import.functions import _async_import_background_streaming, _async_reimport_background_streaming
from data_import.models import FileUpload
from data_import.serializers import ImportApiSerializer
from data_import.uploader import load_tasks_for_async_import_streaming
from django.core.files.base import ContentFile
from organizations.tests.factories import OrganizationFactory
from projects.models import ProjectImport, ProjectReimport
from projects.tests.factories import ProjectFactory
from rest_framework.exceptions import ValidationError
from tasks.serializers import TaskSerializerBulk
from users.tests.factories import UserFactory

pytestmark = pytest.mark.django_db


@pytest.fixture
def user():
    return UserFactory()


@pytest.fixture
def organization():
    return OrganizationFactory()


@pytest.fixture
def project(user, organization):
    # Simple config with a single text field
    return ProjectFactory(
        created_by=user,
        organization=organization,
        label_config='<View><Text name="text" value="$text"/></View>',
    )


def create_file_upload(user, project, body: bytes, name: str):
    return FileUpload.objects.create(user=user, project=project, file=ContentFile(body, name=name))


class TestJSONStreamingReader:
    def test_array_of_objects_wraps_data(self, user, project):
        content = b'[{"text":"A"},{"text":"B"}]'
        fu = FileUpload.objects.create(user=user, project=project, file=ContentFile(content, name='tasks.json'))

        batches = list(fu.read_tasks_list_from_json_streaming(batch_size=1))
        # Flatten
        tasks = [t for batch in batches for t in batch]

        assert len(tasks) == 2
        assert tasks[0]['data'] == {'text': 'A'}
        assert tasks[1]['data'] == {'text': 'B'}

    def test_array_of_objects_with_data_preserved(self, user, project):
        content = b'[{"data":{"text":"A"}},{"data":{"text":"B"}}]'
        fu = FileUpload.objects.create(user=user, project=project, file=ContentFile(content, name='tasks.json'))

        batches = list(fu.read_tasks_list_from_json_streaming(batch_size=2))
        tasks = [t for batch in batches for t in batch]

        assert len(tasks) == 2
        assert tasks[0]['data'] == {'text': 'A'}
        assert tasks[1]['data'] == {'text': 'B'}

    def test_single_object(self, user, project):
        content = b'{"text":"A"}'
        fu = FileUpload.objects.create(user=user, project=project, file=ContentFile(content, name='task.json'))

        batches = list(fu.read_tasks_list_from_json_streaming(batch_size=10))
        assert len(batches) == 1
        assert len(batches[0]) == 1
        assert batches[0][0]['data'] == {'text': 'A'}

    def test_invalid_array_of_strings_raises(self, user, project):
        content = b'["A","B"]'
        fu = FileUpload.objects.create(user=user, project=project, file=ContentFile(content, name='tasks.json'))

        with pytest.raises(ValidationError):
            list(fu.read_tasks_list_from_json_streaming(batch_size=2))

    def test_invalid_top_level_type_raises(self, user, project):
        content = b'"A"'
        fu = FileUpload.objects.create(user=user, project=project, file=ContentFile(content, name='tasks.json'))

        with pytest.raises(ValidationError):
            list(fu.read_tasks_list_from_json_streaming(batch_size=2))

    def test_read_tasks_streaming_batches(self, user, project):
        items = ','.join([f'{{"text":"T{i}"}}' for i in range(7)]).encode('utf-8')
        content = b'[' + items + b']'
        fu = FileUpload.objects.create(user=user, project=project, file=ContentFile(content, name='tasks.json'))

        batches = list(fu.read_tasks_streaming(batch_size=3))
        # Expect 3,3,1
        sizes = [len(b) for b in batches]
        assert sizes == [3, 3, 1]
        # Spot check the first element
        assert batches[0][0]['data'] == {'text': 'T0'}


class TestEndToEndStreamingFromUploads:
    def test_load_tasks_from_uploaded_files_streaming_real_files(self, user, project):
        content1 = b'[{"text":"A1"},{"text":"A2"},{"text":"A3"},{"text":"A4"}]'
        content2 = b'[{"text":"B1"},{"text":"B2"},{"text":"B3"},{"text":"B4"}]'
        FileUpload.objects.create(user=user, project=project, file=ContentFile(content1, name='a.json'))
        FileUpload.objects.create(user=user, project=project, file=ContentFile(content2, name='b.json'))

        gen = FileUpload.load_tasks_from_uploaded_files_streaming(project, batch_size=3)
        batches = list(gen)

        # Expect 3,3,2 tasks across two files aggregated by batch size
        sizes = [len(b[0]) for b in batches]
        assert sizes == [3, 3, 2]

        # All tasks must have file_upload_id set
        for batch_tasks, _, _ in batches:
            for t in batch_tasks:
                assert 'file_upload_id' in t
                assert t['data'] and isinstance(t['data'], dict)


class TestLoadTasksForAsyncImportStreaming:
    def test_from_file_upload_ids_batches_and_metadata(self, user, project, settings):
        settings.IMPORT_BATCH_SIZE = 3
        fu1 = create_file_upload(user, project, b'[{"text":"A1"},{"text":"A2"},{"text":"A3"}]', 'a.json')
        fu2 = create_file_upload(user, project, b'[{"text":"B1"},{"text":"B2"},{"text":"B3"},{"text":"B4"}]', 'b.json')

        pimport = ProjectImport.objects.create(project=project, file_upload_ids=[fu1.id, fu2.id])

        gen = load_tasks_for_async_import_streaming(pimport, user, batch_size=3)
        batches = list(gen)

        # Expect 3,3,1 aggregated across files with batch size 3
        sizes = [len(b[0]) for b in batches]
        assert sizes == [3, 3, 1]

        # Each batch returns file_upload_ids and metadata
        for batch_tasks, file_upload_ids, found_formats, data_columns in batches:
            assert file_upload_ids == [fu1.id, fu2.id]
            assert isinstance(found_formats, dict)
            assert isinstance(data_columns, list)

    def test_from_url_with_json_string(self, user, project, settings):
        settings.IMPORT_BATCH_SIZE = 10
        # Use JSON-in-URL mode (no network). Function will create an inplace file upload and parse it.
        url_json = '[{"text":"U1"},{"text":"U2"}]'
        pimport = ProjectImport.objects.create(project=project, url=url_json)

        gen = load_tasks_for_async_import_streaming(pimport, user, batch_size=2)
        batches = list(gen)

        assert len(batches) == 1
        tasks, file_upload_ids, found_formats, data_columns = batches[0]
        assert [t['data'] for t in tasks] == [{'text': 'U1'}, {'text': 'U2'}]
        assert isinstance(file_upload_ids, list)
        assert isinstance(found_formats, dict)
        assert isinstance(data_columns, list)

    def test_from_tasks_inline(self, user, project, settings):
        settings.IMPORT_BATCH_SIZE = 2
        tasks = [{'data': {'text': 'T1'}}, {'data': {'text': 'T2'}}, {'data': {'text': 'T3'}}]
        pimport = ProjectImport.objects.create(project=project, tasks=tasks)

        gen = load_tasks_for_async_import_streaming(pimport, user, batch_size=2)
        batches = list(gen)

        sizes = [len(b[0]) for b in batches]
        assert sizes == [2, 1]


class TestAsyncImportBackgroundStreaming:
    @patch('data_import.functions.flag_set', return_value=False)
    def test_counts_and_status_without_commit(self, mock_flag, user, project, settings):
        settings.IMPORT_BATCH_SIZE = 4
        fu1 = create_file_upload(user, project, b'[{"text":"A1"},{"text":"A2"}]', 'a.json')
        fu2 = create_file_upload(user, project, b'[{"text":"B1"},{"text":"B2"},{"text":"B3"}]', 'b.json')

        pimport = ProjectImport.objects.create(
            project=project,
            file_upload_ids=[fu1.id, fu2.id],
            commit_to_project=False,
            return_task_ids=False,
        )

        _async_import_background_streaming(pimport, user)

        pimport.refresh_from_db()
        assert pimport.status == ProjectImport.Status.COMPLETED
        assert pimport.task_count == 5
        # found_formats and data_columns are populated
        assert isinstance(pimport.found_formats, dict)
        assert pimport.found_formats.get('.json')
        assert isinstance(pimport.data_columns, (list, set))

    def test_custom_callback_runs_once_per_import(self, user, project, settings):
        settings.IMPORT_BATCH_SIZE = 2
        fu = create_file_upload(
            user, project, b'[{"text":"A"},{"text":"B"},{"text":"C"},{"text":"D"},{"text":"E"}]', 'a.json'
        )
        pimport = ProjectImport.objects.create(project=project, file_upload_ids=[fu.id], commit_to_project=True)

        with patch.object(TaskSerializerBulk, 'post_process_custom_callback') as callback:
            _async_import_background_streaming(pimport, user)

        pimport.refresh_from_db()
        assert pimport.status == ProjectImport.Status.COMPLETED
        assert pimport.task_count == 5
        callback.assert_called_once_with(project.id, user)


class TestAsyncReimportBackgroundStreaming:
    def test_custom_callback_runs_once_per_reimport(self, user, project, settings):
        settings.REIMPORT_BATCH_SIZE = 2
        fu = create_file_upload(
            user, project, b'[{"text":"A"},{"text":"B"},{"text":"C"},{"text":"D"},{"text":"E"}]', 'a.json'
        )
        reimport = ProjectReimport.objects.create(project=project, file_upload_ids=[fu.id])

        with patch.object(TaskSerializerBulk, 'post_process_custom_callback') as callback:
            _async_reimport_background_streaming(reimport, project, project.organization_id, user)

        assert project.tasks.count() == 5
        callback.assert_called_once_with(project.id, user)


def test_custom_callback_runs_when_not_deferred(user, project):
    serializer = ImportApiSerializer(data=[{'data': {'text': 'A'}}], many=True, context={'project': project})
    serializer.is_valid(raise_exception=True)

    with patch.object(TaskSerializerBulk, 'post_process_custom_callback') as callback:
        serializer.save(project_id=project.id)

    callback.assert_called_once()
