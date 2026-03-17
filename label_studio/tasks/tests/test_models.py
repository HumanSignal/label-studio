from unittest.mock import PropertyMock, patch

from django.test import TestCase, override_settings
from io_storages.tests.factories import GCSImportStorageFactory, S3ImportStorageFactory
from projects.models import Project
from tasks.models import Task
from tasks.tests.factories import TaskFactory


class TestTaskResolveUris(TestCase):
    """Tests for Task.resolve_uris method in tasks/models.py."""

    @classmethod
    def setUpTestData(cls):
        cls.s3_storage = S3ImportStorageFactory(bucket='test-bucket')
        cls.project = cls.s3_storage.project
        cls.task = TaskFactory(project=cls.project)

    @override_settings(CLOUD_FILE_STORAGE_ENABLED=False)
    def test_single_field_multiple_uris(self):
        """A single field with two s3:// URIs is fully resolved by one storage."""
        resolved_html = '<div><img src="RESOLVED_1" /><img src="RESOLVED_2" /></div>'

        with (
            patch.object(
                Project,
                'get_all_import_storage_objects',
                new_callable=PropertyMock,
                return_value=[self.s3_storage],
            ),
            patch.object(self.s3_storage, 'resolve_uris', return_value=resolved_html),
            patch.object(Task, 'storage', new_callable=PropertyMock, return_value=None),
        ):
            task_data = {'text': '<div><img src="s3://b/1.jpg" /><img src="s3://b/2.jpg" /></div>'}
            result = self.task.resolve_uris(task_data, self.project)

        assert result['text'] == resolved_html

    @override_settings(CLOUD_FILE_STORAGE_ENABLED=False)
    def test_cross_storage_resolution(self):
        """A field containing both s3:// and gs:// URIs is resolved by two different storages."""
        gcs_storage = GCSImportStorageFactory(project=self.project, bucket='gcs-bucket')

        with (
            patch.object(
                Project,
                'get_all_import_storage_objects',
                new_callable=PropertyMock,
                return_value=[self.s3_storage, gcs_storage],
            ),
            patch.object(
                self.s3_storage,
                'resolve_uris',
                return_value='<div><img src="RESOLVED_S3" /><img src="gs://b/2.jpg" /></div>',
            ),
            patch.object(
                gcs_storage,
                'resolve_uris',
                return_value='<div><img src="RESOLVED_S3" /><img src="RESOLVED_GCS" /></div>',
            ),
            patch.object(Task, 'storage', new_callable=PropertyMock, return_value=None),
        ):
            task_data = {'text': '<div><img src="s3://b/1.jpg" /><img src="gs://b/2.jpg" /></div>'}
            result = self.task.resolve_uris(task_data, self.project)

        assert 'RESOLVED_S3' in result['text']
        assert 'RESOLVED_GCS' in result['text']

    @override_settings(CLOUD_FILE_STORAGE_ENABLED=False)
    def test_fallback_storage_used_when_not_in_objects(self):
        """When get_all_import_storage_objects is empty, self.storage is used as fallback."""
        fallback_storage = S3ImportStorageFactory(bucket='fallback-bucket')

        with (
            patch.object(
                Project,
                'get_all_import_storage_objects',
                new_callable=PropertyMock,
                return_value=[],
            ),
            patch.object(Task, 'storage', new_callable=PropertyMock, return_value=fallback_storage),
            patch.object(fallback_storage, 'resolve_uris', return_value='RESOLVED') as mock_resolve,
        ):
            task_data = {'image': 's3://bucket/file.jpg'}
            result = self.task.resolve_uris(task_data, self.project)

        assert result['image'] == 'RESOLVED'
        mock_resolve.assert_called_once()

    @override_settings(CLOUD_FILE_STORAGE_ENABLED=False)
    def test_fallback_storage_not_duplicated(self):
        """When self.storage has the same id as a storage in storage_objects,
        it is not called a second time.
        """
        with (
            patch.object(
                Project,
                'get_all_import_storage_objects',
                new_callable=PropertyMock,
                return_value=[self.s3_storage],
            ),
            patch.object(self.s3_storage, 'resolve_uris', return_value='RESOLVED'),
            patch.object(Task, 'storage', new_callable=PropertyMock, return_value=self.s3_storage),
        ):
            task_data = {'image': 's3://bucket/file.jpg'}
            self.task.resolve_uris(task_data, self.project)

            assert self.s3_storage.resolve_uris.call_count == 1

    @override_settings(CLOUD_FILE_STORAGE_ENABLED=False)
    def test_unresolvable_field_left_unchanged(self):
        """When no storage can resolve a field's value, it is left as-is."""
        with (
            patch.object(
                Project,
                'get_all_import_storage_objects',
                new_callable=PropertyMock,
                return_value=[self.s3_storage],
            ),
            patch.object(self.s3_storage, 'resolve_uris', return_value=None),
            patch.object(Task, 'storage', new_callable=PropertyMock, return_value=None),
        ):
            original_value = 'just plain text'
            task_data = {'text': original_value}
            result = self.task.resolve_uris(task_data, self.project)

        assert result['text'] == original_value

    @override_settings(HOSTNAME='http://localhost:8080')
    @patch('tasks.models.reverse', return_value='/projects/1/file-proxy/')
    def test_credential_based_proxy(self, mock_reverse):
        """When the project has task_data_login/password set,
        all URL values are proxied through the file-proxy endpoint instead.
        """
        self.project.task_data_login = 'user'
        self.project.task_data_password = 'pass'
        try:
            task_data = {'url': 'https://example.com/file.jpg'}
            result = self.task.resolve_uris(task_data, self.project)
            assert 'http://localhost:8080' in result['url']
        finally:
            self.project.task_data_login = None
            self.project.task_data_password = None
