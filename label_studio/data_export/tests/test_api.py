from unittest.mock import ANY, patch

from data_export.api import async_convert
from data_export.models import ConvertedFormat, Export
from django.core.files.base import ContentFile
from django.test import override_settings
from projects.tests.factories import ProjectFactory
from rest_framework.test import APITestCase
from tests.utils import mock_feature_flag

ASYNC_EXPORT_FLAG = 'fflag_fix_all_lsdv_4813_async_export_conversion_22032023_short'


@patch('data_export.api.start_job_async_or_sync')
class TestExportConvertAPI(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.project = ProjectFactory()
        cls.user = cls.project.created_by
        cls.export = Export.objects.create(project=cls.project)

    def test_convert_export(self, mock_start_job_async_or_sync):
        self.client.force_authenticate(user=self.user)

        assert ConvertedFormat.objects.count() == 0

        response = self.client.post(
            f'/api/projects/{self.project.id}/exports/{self.export.id}/convert',
            {'export_type': 'CSV'},
        )
        assert response.status_code == 200
        cf = ConvertedFormat.objects.get(export=self.export, export_type='CSV', status=ConvertedFormat.Status.CREATED)

        mock_start_job_async_or_sync.assert_called_once_with(
            async_convert,
            cf.id,
            'CSV',
            self.project,
            ANY,
            download_resources=False,
            on_failure=ANY,
        )

    def test_convert_export_already_started(self, mock_start_job_async_or_sync):
        self.client.force_authenticate(user=self.user)

        ConvertedFormat.objects.create(export=self.export, export_type='CSV', status=ConvertedFormat.Status.CREATED)

        response = self.client.post(
            f'/api/projects/{self.project.id}/exports/{self.export.id}/convert',
            {'export_type': 'CSV'},
        )
        assert response.status_code == 400
        assert response.json()['validation_errors']['non_field_errors'] == ['Conversion to CSV already started']
        mock_start_job_async_or_sync.assert_not_called()

    def test_convert_export_previous_failed(self, mock_start_job_async_or_sync):
        self.client.force_authenticate(user=self.user)

        ConvertedFormat.objects.create(export=self.export, export_type='CSV', status=ConvertedFormat.Status.FAILED)

        response = self.client.post(
            f'/api/projects/{self.project.id}/exports/{self.export.id}/convert',
            {'export_type': 'CSV'},
        )
        assert response.status_code == 200
        mock_start_job_async_or_sync.assert_called_once_with(
            async_convert,
            ANY,
            'CSV',
            self.project,
            ANY,
            download_resources=False,
            on_failure=ANY,
        )


@override_settings(USE_NGINX_FOR_EXPORT_DOWNLOADS=False)
class TestExportDownloadFilename(APITestCase):
    """The download endpoint must use ``Export.title`` for the response
    filename when set, and fall back to the storage basename otherwise.
    See UTC-857 / TRIAG-1864."""

    @classmethod
    def setUpTestData(cls):
        cls.project = ProjectFactory()
        cls.user = cls.project.created_by

    def _create_completed_export(self, title, *, stored_basename, content=b'{}'):
        export = Export.objects.create(project=self.project, title=title, status=Export.Status.COMPLETED)
        export.file.save(f'{self.project.id}/{stored_basename}', ContentFile(content))
        # ``post_save`` may reset an empty title to a default; restore the
        # value the caller asked for so we test the legacy path explicitly.
        if export.title != title:
            Export.objects.filter(pk=export.pk).update(title=title)
            export.refresh_from_db()
        return export

    def _download(self, export, *, export_type=None):
        self.client.force_authenticate(user=self.user)
        url = f'/api/projects/{self.project.id}/exports/{export.id}/download'
        if export_type is not None:
            url += f'?exportType={export_type}'
        return self.client.get(url)

    @staticmethod
    def _md5_suffix(file_name):
        """Extract the 8-char-ish md5 fragment Django storage may have salted
        with a random suffix (``..._abc1234``)."""
        import os

        stem, _, _ = os.path.basename(file_name).rpartition('.')
        return stem.rsplit('-', 1)[-1] if '-' in stem else ''

    @mock_feature_flag(flag_name=ASYNC_EXPORT_FLAG, value=True, parent_module='data_export.api')
    def test_download_uses_slugified_title(self):
        export = self._create_completed_export(
            'Alec is cool', stored_basename='project-1-at-2026-01-23-16-16-48a6bac9.json'
        )
        suffix = self._md5_suffix(export.file.name)
        expected = f'alec-is-cool-{suffix}.json'

        response = self._download(export)

        assert response.status_code == 200
        assert response['Content-Disposition'] == f'attachment; filename="{expected}"'
        assert response['filename'] == expected

    @mock_feature_flag(flag_name=ASYNC_EXPORT_FLAG, value=True, parent_module='data_export.api')
    def test_download_converted_format_uses_title_with_correct_extension(self):
        export = self._create_completed_export(
            'My CSV Export', stored_basename='project-1-at-2026-01-23-16-16-48a6bac9.json'
        )
        converted = ConvertedFormat.objects.create(
            export=export, export_type='CSV', status=ConvertedFormat.Status.COMPLETED
        )
        converted.file.save(
            f'{self.project.id}/project-1-at-2026-01-23-16-16-deadbeef.csv',
            ContentFile(b'a,b\n1,2\n'),
        )
        suffix = self._md5_suffix(converted.file.name)
        expected = f'my-csv-export-{suffix}.csv'

        response = self._download(export, export_type='CSV')

        assert response.status_code == 200
        assert response['Content-Disposition'] == f'attachment; filename="{expected}"'
        assert response['filename'] == expected

    @mock_feature_flag(flag_name=ASYNC_EXPORT_FLAG, value=True, parent_module='data_export.api')
    def test_download_falls_back_to_storage_basename_when_title_empty(self):
        import os

        export = self._create_completed_export('', stored_basename='project-1-at-2026-01-23-16-16-48a6bac9.json')
        expected = os.path.basename(export.file.name)

        response = self._download(export)

        assert response.status_code == 200
        # Header must contain only the basename, not the ``{project_id}/`` directory prefix.
        assert response['Content-Disposition'] == f'attachment; filename="{expected}"'
        assert response['filename'] == expected
        assert f'{self.project.id}/' not in response['Content-Disposition']

    @mock_feature_flag(flag_name=ASYNC_EXPORT_FLAG, value=False, parent_module='data_export.api')
    def test_download_uses_title_in_legacy_branch(self):
        """Same behavior must apply when the async-conversion flag is off."""
        export = self._create_completed_export(
            'Alec is cool', stored_basename='project-1-at-2026-01-23-16-16-48a6bac9.json'
        )
        suffix = self._md5_suffix(export.file.name)
        expected = f'alec-is-cool-{suffix}.json'

        response = self._download(export)

        assert response.status_code == 200
        assert response['Content-Disposition'] == f'attachment; filename="{expected}"'
        assert response['filename'] == expected

    @override_settings(USE_NGINX_FOR_EXPORT_DOWNLOADS=True)
    @mock_feature_flag(flag_name=ASYNC_EXPORT_FLAG, value=True, parent_module='data_export.api')
    def test_download_nginx_path_uses_title(self):
        """NGINX-accelerated downloads must also use the slugified title and
        never leak the storage path into Content-Disposition."""
        export = self._create_completed_export(
            'Alec is cool', stored_basename='project-1-at-2026-01-23-16-16-48a6bac9.json'
        )
        suffix = self._md5_suffix(export.file.name)
        expected = f'alec-is-cool-{suffix}.json'

        response = self._download(export)

        assert response.status_code == 200
        assert response['Content-Disposition'] == f'attachment; filename="{expected}"'
        assert response['filename'] == expected
        assert 'X-Accel-Redirect' in response
        assert f'{self.project.id}/' not in response['Content-Disposition']
