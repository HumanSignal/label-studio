from unittest.mock import patch

from django.test import TestCase, override_settings
from io_storages.tests.factories import AzureBlobExportStorageFactory, S3ImportStorageFactory
from projects.tests.factories import ProjectFactory
from tasks.models import Annotation
from tasks.tests.factories import TaskFactory


class TestImportStorageResolveUris(TestCase):
    """Tests for ImportStorage.resolve_uris method in io_storages/base_models.py."""

    @classmethod
    def setUpTestData(cls):
        cls.storage = S3ImportStorageFactory(bucket='test-bucket')
        cls.task = TaskFactory(project=cls.storage.project)

    @override_settings(HOSTNAME='http://localhost:8080')
    @patch('io_storages.base_models.reverse', return_value='/api/storages/task/1/resolve/')
    def test_single_bare_uri(self, mock_reverse):
        """A bare s3:// URI is resolved to a proxy URL pointing at the hostname."""
        result = self.storage.resolve_uris('s3://test-bucket/file.jpg', self.task)

        assert result is not None
        assert 's3://test-bucket/file.jpg' not in result
        assert 'http://localhost:8080' in result

    @override_settings(HOSTNAME='http://localhost:8080')
    @patch('io_storages.base_models.reverse', return_value='/api/storages/task/1/resolve/')
    def test_multiple_uris_in_html(self, mock_reverse):
        """Two s3:// URIs embedded in HTML are both replaced with proxy URLs."""
        html = (
            '<div>'
            '<img src="s3://test-bucket/img1.jpg" alt="Image 1" style="width:300px;" />'
            '<img src="s3://test-bucket/img2.jpg" alt="Image 2" style="width:300px;" />'
            '</div>'
        )
        result = self.storage.resolve_uris(html, self.task)

        assert result is not None
        assert 's3://test-bucket/img1.jpg' not in result
        assert 's3://test-bucket/img2.jpg' not in result
        assert result.count('http://localhost:8080') == 2

    def test_no_matching_scheme(self):
        """Data containing only URIs of a different scheme returns None."""
        result = self.storage.resolve_uris('gs://other-bucket/file.jpg', self.task)
        assert result is None

    def test_empty_url_scheme_returns_none(self):
        """A storage with an empty url_scheme short-circuits and returns None."""
        with patch.object(self.storage, 'url_scheme', ''):
            result = self.storage.resolve_uris('s3://bucket/file.jpg', self.task)
        assert result is None

    def test_non_string_data_returns_none(self):
        """Non-string, non-container data types (int, None) return None."""
        assert self.storage.resolve_uris(123, self.task) is None
        assert self.storage.resolve_uris(None, self.task) is None

    @override_settings(HOSTNAME='http://localhost:8080')
    @patch('io_storages.base_models.reverse', return_value='/api/storages/task/1/resolve/')
    def test_list_data(self, mock_reverse):
        """A list of URI strings is resolved element-by-element."""
        data = ['s3://test-bucket/a.jpg', 's3://test-bucket/b.jpg']
        result = self.storage.resolve_uris(data, self.task)

        assert isinstance(result, list)
        assert len(result) == 2
        assert 's3://test-bucket/a.jpg' not in result[0]
        assert 's3://test-bucket/b.jpg' not in result[1]

    @override_settings(HOSTNAME='http://localhost:8080')
    @patch('io_storages.base_models.reverse', return_value='/api/storages/task/1/resolve/')
    def test_dict_data(self, mock_reverse):
        """A dict with mixed URI and plain-text values resolves only the URI values."""
        data = {'image': 's3://test-bucket/file.jpg', 'label': 'cat'}
        result = self.storage.resolve_uris(data, self.task)

        assert isinstance(result, dict)
        assert 's3://test-bucket/file.jpg' not in result['image']
        assert result['label'] == 'cat'

    @override_settings(HOSTNAME='http://localhost:8080')
    @patch('io_storages.base_models.reverse', return_value='/api/storages/task/1/resolve/')
    def test_mixed_resolvable_and_unresolvable(self, mock_reverse):
        """URIs from a different bucket are skipped; resolvable ones are still replaced."""
        html = '<img src="s3://test-bucket/img1.jpg" alt="1" /><img src="s3://other-bucket/img2.jpg" alt="2" />'
        result = self.storage.resolve_uris(html, self.task)

        assert result is not None
        assert 's3://test-bucket/img1.jpg' not in result
        assert 's3://other-bucket/img2.jpg' in result

    def test_all_uris_unresolvable_returns_none(self):
        """When can_resolve_url returns False for every URI, the method returns None."""
        html = '<img src="s3://wrong-bucket/img.jpg" alt="test" />'
        result = self.storage.resolve_uris(html, self.task)
        assert result is None

    def test_task_none_returns_none(self):
        """When task is None, resolve_uris logs an error and returns None
        (the ValueError is caught internally, matching resolve_uri behavior).
        """
        result = self.storage.resolve_uris('s3://test-bucket/file.jpg', task=None)
        assert result is None

    @override_settings(HOSTNAME='http://localhost:8080')
    @patch('io_storages.base_models.reverse', return_value='/api/storages/task/1/resolve/')
    def test_bare_uri_with_spaces_in_path(self, mock_reverse):
        """A bare URI with literal spaces in the path is resolved to a proxy URL."""
        uri = 's3://test-bucket/images/some directory/sub folder/img.jpg'
        result = self.storage.resolve_uris(uri, self.task)

        assert result is not None
        assert 's3://test-bucket' not in result
        assert 'http://localhost:8080' in result

    @override_settings(HOSTNAME='http://localhost:8080')
    @patch('io_storages.base_models.reverse', return_value='/api/storages/task/1/resolve/')
    def test_embedded_uri_with_spaces_in_path(self, mock_reverse):
        """A quoted URI embedded in HTML is resolved when its path contains literal spaces."""
        html = '<img src="s3://test-bucket/images/some directory/sub folder/img.jpg" alt="test" />'
        result = self.storage.resolve_uris(html, self.task)

        assert result is not None
        assert 's3://test-bucket/images/some directory/sub folder/img.jpg' not in result
        assert 'http://localhost:8080' in result


class TestExportStorageSaveAnnotationsStatus(TestCase):
    """ExportStorage.save_annotations should only mutate sync status when update_status is True."""

    @classmethod
    def setUpTestData(cls):
        cls.project = ProjectFactory()

    def _storage(self):
        return AzureBlobExportStorageFactory(project=self.project)

    def test_update_status_false_skips_sync_status(self):
        """A partial export (update_status=False) must not touch the storage sync status."""
        storage = self._storage()
        with (
            patch.object(type(storage), 'info_set_in_progress') as m_in_progress,
            patch.object(type(storage), 'info_update_progress') as m_update,
            patch.object(type(storage), 'info_set_completed') as m_completed,
            patch.object(type(storage), 'save_annotation'),
        ):
            storage.save_annotations(Annotation.objects.none(), update_status=False)

        m_in_progress.assert_not_called()
        m_update.assert_not_called()
        m_completed.assert_not_called()

    def test_update_status_true_updates_sync_status(self):
        """A full sync (default update_status=True) keeps updating the storage sync status."""
        storage = self._storage()
        with (
            patch.object(type(storage), 'info_set_in_progress') as m_in_progress,
            patch.object(type(storage), 'info_set_completed') as m_completed,
            patch.object(type(storage), 'save_annotation'),
        ):
            storage.save_annotations(Annotation.objects.none())

        m_in_progress.assert_called_once()
        m_completed.assert_called_once()

    def _annotation_queryset(self):
        # Create the annotation before any storage exists so creation does not trigger an export.
        task = TaskFactory(project=self.project)
        Annotation.objects.create(task=task, project=self.project, completed_by=self.project.created_by, result=[])
        return Annotation.objects.filter(task__project=self.project)

    def test_failed_export_partial_raises_and_keeps_status(self):
        """update_status=False: a failed annotation export raises and leaves the storage status untouched."""
        annotations = self._annotation_queryset()
        storage = self._storage()
        with (
            patch.object(type(storage), 'info_set_in_progress') as m_in_progress,
            patch.object(type(storage), 'info_update_progress') as m_update,
            patch.object(type(storage), 'info_set_completed') as m_completed,
            patch.object(type(storage), 'save_annotation', side_effect=RuntimeError('boom')),
        ):
            with self.assertRaises(RuntimeError):
                storage.save_annotations(annotations, update_status=False)

        m_in_progress.assert_not_called()
        m_update.assert_not_called()
        m_completed.assert_not_called()

    def test_failed_export_full_sync_raises_without_completing(self):
        """update_status=True: a failed annotation export raises and does not mark the sync completed.

        The storage is marked FAILED out-of-band by the RQ on_failure=storage_background_failure callback.
        """
        annotations = self._annotation_queryset()
        storage = self._storage()
        with (
            patch.object(type(storage), 'info_set_in_progress'),
            patch.object(type(storage), 'info_set_completed') as m_completed,
            patch.object(type(storage), 'save_annotation', side_effect=RuntimeError('boom')),
        ):
            with self.assertRaises(RuntimeError):
                storage.save_annotations(annotations)

        m_completed.assert_not_called()
