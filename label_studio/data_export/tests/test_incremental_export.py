"""Incremental export snapshots: since/until window, ephemeral list exclusion, TTL GC."""

from datetime import timedelta
from unittest.mock import patch

import pytest
from data_export.models import Export
from data_export.serializers import ExportCreateSerializer
from django.utils import timezone
from projects.tests.factories import ProjectFactory
from rest_framework.exceptions import ValidationError
from rest_framework.test import APITestCase
from tasks.models import Task
from tasks.tests.factories import AnnotationFactory, TaskFactory


@pytest.mark.django_db
class TestExportCreateSerializerWindowValidation:
    def test_until_without_since_rejected(self):
        serializer = ExportCreateSerializer(
            data={'until': timezone.now().isoformat()},
        )
        with pytest.raises(ValidationError):
            serializer.is_valid(raise_exception=True)

    def test_since_not_before_until_rejected(self):
        now = timezone.now()
        serializer = ExportCreateSerializer(
            data={
                'since': now.isoformat(),
                'until': (now - timedelta(hours=1)).isoformat(),
            },
        )
        with pytest.raises(ValidationError):
            serializer.is_valid(raise_exception=True)

    def test_valid_window_accepted(self):
        now = timezone.now()
        serializer = ExportCreateSerializer(
            data={
                'since': (now - timedelta(hours=1)).isoformat(),
                'until': now.isoformat(),
                'ephemeral': True,
            },
        )
        assert serializer.is_valid(), serializer.errors


@pytest.mark.django_db
class TestIncrementalTaskWindow:
    def test_half_open_updated_at_window(self):
        """Tasks with updated_at in [since, until) are included; boundary at until is excluded."""
        project = ProjectFactory()
        since = timezone.now() - timedelta(hours=2)
        until = timezone.now() - timedelta(hours=1)

        inside = TaskFactory(project=project)
        Task.objects.filter(pk=inside.pk).update(updated_at=since + timedelta(minutes=30))

        at_until = TaskFactory(project=project)
        Task.objects.filter(pk=at_until.pk).update(updated_at=until)

        before = TaskFactory(project=project)
        Task.objects.filter(pk=before.pk).update(updated_at=since - timedelta(minutes=1))

        export = Export(project=project, since=since, until=until)
        filtered = export._get_filtered_tasks(project.tasks.all())
        ids = set(filtered.values_list('id', flat=True))

        assert inside.id in ids
        assert at_until.id not in ids
        assert before.id not in ids


@pytest.mark.django_db
class TestEphemeralExportCleanup:
    def test_cleanup_deletes_expired_ephemeral_only(self):
        project = ProjectFactory()
        old = Export.objects.create(project=project, ephemeral=True)
        Export.objects.filter(pk=old.pk).update(created_at=timezone.now() - timedelta(hours=25))

        fresh = Export.objects.create(project=project, ephemeral=True)
        listed = Export.objects.create(project=project, ephemeral=False)
        Export.objects.filter(pk=listed.pk).update(created_at=timezone.now() - timedelta(hours=25))

        deleted = Export.cleanup_expired_ephemeral(ttl_hours=24)

        assert deleted == 1
        assert not Export.objects.filter(pk=old.pk).exists()
        assert Export.objects.filter(pk=fresh.pk).exists()
        assert Export.objects.filter(pk=listed.pk).exists()

    def test_cleanup_deletes_stored_files(self, django_capture_on_commit_callbacks):
        """TTL GC must remove Export.file and ConvertedFormat.file blobs, not only DB rows."""
        from data_export.models import ConvertedFormat
        from django.core.files.base import ContentFile
        from django.core.files.storage import default_storage

        project = ProjectFactory()
        export = Export.objects.create(project=project, ephemeral=True)
        export.file.save('ephemeral-gc.json', ContentFile(b'[]'), save=True)
        converted = ConvertedFormat.objects.create(export=export, project=project, export_type='CSV')
        converted.file.save('ephemeral-gc.csv', ContentFile(b'a,b\n'), save=True)
        export_name = export.file.name
        converted_name = converted.file.name
        assert default_storage.exists(export_name)
        assert default_storage.exists(converted_name)

        Export.objects.filter(pk=export.pk).update(created_at=timezone.now() - timedelta(hours=25))
        with django_capture_on_commit_callbacks(execute=True):
            deleted = Export.cleanup_expired_ephemeral(ttl_hours=24)

        assert deleted == 1
        assert not Export.objects.filter(pk=export.pk).exists()
        assert not default_storage.exists(export_name)
        assert not default_storage.exists(converted_name)

    def test_cleanup_keeps_blob_shared_with_listed_export(self, django_capture_on_commit_callbacks):
        """Same-minute, same-content exports share a blob key; the sweep must not delete a listed export's file
        (including through the post_delete receiver that removes files on commit)."""
        from data_export.models import ConvertedFormat
        from django.core.files.base import ContentFile
        from django.core.files.storage import default_storage

        project = ProjectFactory()
        listed = Export.objects.create(project=project, ephemeral=False)
        listed.file.save('shared-gc.json', ContentFile(b'[]'), save=True)
        listed_converted = ConvertedFormat.objects.create(export=listed, project=project, export_type='CSV')
        listed_converted.file.save('shared-gc.csv', ContentFile(b'a,b\n'), save=True)
        ephemeral = Export.objects.create(project=project, ephemeral=True, file=listed.file.name)
        ConvertedFormat.objects.create(
            export=ephemeral, project=project, export_type='CSV', file=listed_converted.file.name
        )

        Export.objects.filter(pk=ephemeral.pk).update(created_at=timezone.now() - timedelta(hours=25))
        with django_capture_on_commit_callbacks(execute=True):
            assert Export.cleanup_expired_ephemeral(ttl_hours=24) == 1

        assert not Export.objects.filter(pk=ephemeral.pk).exists()
        assert default_storage.exists(listed.file.name)
        assert default_storage.exists(listed_converted.file.name)

    def test_cleanup_continues_after_one_export_fails(self):
        """One export's delete failure is logged and rolled back; the sweep still removes the others."""
        project = ProjectFactory()
        exports = []
        for _ in range(3):
            export = Export.objects.create(project=project, ephemeral=True)
            Export.objects.filter(pk=export.pk).update(created_at=timezone.now() - timedelta(hours=25))
            exports.append(export)

        failing_id = exports[0].id
        original_delete = Export.delete

        def flaky_delete(self, *args, **kwargs):
            if self.id == failing_id:
                raise OSError('storage unavailable')
            return original_delete(self, *args, **kwargs)

        with patch.object(Export, 'delete', flaky_delete):
            deleted = Export.cleanup_expired_ephemeral(ttl_hours=24)

        assert deleted == 2
        assert list(Export.objects.filter(pk__in=[e.id for e in exports]).values_list('id', flat=True)) == [failing_id]


@patch('data_export.mixins.redis_connected', return_value=False)
class TestIncrementalExportAPI(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.project = ProjectFactory()
        cls.user = cls.project.created_by

    def setUp(self):
        self.client.force_authenticate(user=self.user)

    def test_create_defaults_until_and_persists_window(self, _redis):
        from django.conf import settings

        since = timezone.now() - timedelta(hours=1)
        lag = timedelta(seconds=getattr(settings, 'INCREMENTAL_EXPORT_UNTIL_LAG_SECONDS', 5))
        before = timezone.now()
        response = self.client.post(
            f'/api/projects/{self.project.id}/exports/',
            {
                'since': since.isoformat().replace('+00:00', 'Z'),
                'ephemeral': True,
            },
            format='json',
        )
        after = timezone.now()

        assert response.status_code == 201, response.content
        data = response.json()
        assert data['ephemeral'] is True
        assert data['since'] is not None
        assert data['until'] is not None
        until = timezone.datetime.fromisoformat(data['until'].replace('Z', '+00:00'))
        # Server-defaulted until is wall-clock now minus safety lag.
        assert before - lag <= until <= after - lag + timedelta(seconds=1)

        export = Export.objects.get(pk=data['id'])
        assert export.ephemeral is True
        assert export.since is not None
        assert export.until is not None

    def test_create_until_lag_does_not_invert_recent_since(self, _redis):
        """When since is within INCREMENTAL_EXPORT_UNTIL_LAG_SECONDS, until must stay after since."""
        from django.conf import settings

        lag_seconds = getattr(settings, 'INCREMENTAL_EXPORT_UNTIL_LAG_SECONDS', 5)
        since = timezone.now() - timedelta(seconds=max(lag_seconds - 2, 0))
        response = self.client.post(
            f'/api/projects/{self.project.id}/exports/',
            {
                'since': since.isoformat().replace('+00:00', 'Z'),
                'ephemeral': True,
            },
            format='json',
        )
        assert response.status_code == 201, response.content
        data = response.json()
        until = timezone.datetime.fromisoformat(data['until'].replace('Z', '+00:00'))
        since_parsed = timezone.datetime.fromisoformat(data['since'].replace('Z', '+00:00'))
        assert until > since_parsed

    def test_create_rejects_future_since_without_until(self, _redis):
        """A future since with a server-defaulted until would invert the window: reject it."""
        since = timezone.now() + timedelta(minutes=5)
        response = self.client.post(
            f'/api/projects/{self.project.id}/exports/',
            {'since': since.isoformat().replace('+00:00', 'Z')},
            format='json',
        )
        assert response.status_code == 400, response.content
        assert not Export.objects.filter(project=self.project).exists()

    def test_create_caps_future_until_at_server_time(self, _redis):
        """An explicit future until (e.g. client clock ahead) is capped, so chaining the returned until loses nothing."""
        from django.conf import settings

        since = timezone.now() - timedelta(hours=1)
        before = timezone.now()
        response = self.client.post(
            f'/api/projects/{self.project.id}/exports/',
            {
                'since': since.isoformat().replace('+00:00', 'Z'),
                'until': (timezone.now() + timedelta(hours=1)).isoformat().replace('+00:00', 'Z'),
                'ephemeral': True,
            },
            format='json',
        )
        after = timezone.now()

        assert response.status_code == 201, response.content
        until = timezone.datetime.fromisoformat(response.json()['until'].replace('Z', '+00:00'))
        lag = timedelta(seconds=settings.INCREMENTAL_EXPORT_UNTIL_LAG_SECONDS)
        assert before - lag <= until <= after - lag + timedelta(seconds=1)

    def test_create_keeps_past_until(self, _redis):
        since = timezone.now() - timedelta(hours=2)
        until = timezone.now() - timedelta(hours=1)
        response = self.client.post(
            f'/api/projects/{self.project.id}/exports/',
            {
                'since': since.isoformat().replace('+00:00', 'Z'),
                'until': until.isoformat().replace('+00:00', 'Z'),
            },
            format='json',
        )
        assert response.status_code == 201, response.content
        returned = timezone.datetime.fromisoformat(response.json()['until'].replace('Z', '+00:00'))
        assert abs(returned - until) < timedelta(seconds=1)

    def test_create_rejects_future_since_with_until(self, _redis):
        now = timezone.now()
        response = self.client.post(
            f'/api/projects/{self.project.id}/exports/',
            {
                'since': (now + timedelta(minutes=5)).isoformat().replace('+00:00', 'Z'),
                'until': (now + timedelta(minutes=10)).isoformat().replace('+00:00', 'Z'),
            },
            format='json',
        )
        assert response.status_code == 400, response.content

    def test_list_excludes_ephemeral(self, _redis):
        Export.objects.create(project=self.project, title='visible', ephemeral=False)
        Export.objects.create(project=self.project, title='hidden', ephemeral=True)

        response = self.client.get(f'/api/projects/{self.project.id}/exports/')
        assert response.status_code == 200
        titles = {row['title'] for row in response.json()}
        assert 'visible' in titles
        assert 'hidden' not in titles

    def test_detail_returns_ephemeral(self, _redis):
        export = Export.objects.create(project=self.project, title='hidden', ephemeral=True)
        response = self.client.get(f'/api/projects/{self.project.id}/exports/{export.id}')
        assert response.status_code == 200
        assert response.json()['ephemeral'] is True

    def test_create_exports_only_tasks_in_window(self, _redis):
        since = timezone.now() - timedelta(hours=2)
        until = timezone.now() - timedelta(hours=1)

        included = TaskFactory(project=self.project, data={'text': 'in'})
        AnnotationFactory(task=included, project=self.project, completed_by=self.user)
        Task.objects.filter(pk=included.pk).update(updated_at=since + timedelta(minutes=10))

        excluded = TaskFactory(project=self.project, data={'text': 'out'})
        AnnotationFactory(task=excluded, project=self.project, completed_by=self.user)
        Task.objects.filter(pk=excluded.pk).update(updated_at=until + timedelta(minutes=10))

        response = self.client.post(
            f'/api/projects/{self.project.id}/exports/',
            {
                'since': since.isoformat().replace('+00:00', 'Z'),
                'until': until.isoformat().replace('+00:00', 'Z'),
            },
            format='json',
        )
        assert response.status_code == 201, response.content
        export = Export.objects.get(pk=response.json()['id'])
        export.refresh_from_db()
        assert export.status == Export.Status.COMPLETED
        assert export.counters.get('task_number') == 1
