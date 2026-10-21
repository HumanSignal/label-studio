"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license."""

from unittest.mock import patch

import io
import os

from data_export.models import ConvertedFormat, Export
from django.conf import settings
from django.core.files.base import ContentFile
from django.test import override_settings
from django.urls import reverse
from projects.tests.access_setup import make_access_world
from ranged_fileresponse import RangedFileResponse
from rest_framework.test import APITestCase


def _export_list_url(project):
    return reverse('data_export:api-projects:project-exports-list', kwargs={'pk': project.id})


def _export_download_url(project, export):
    return reverse(
        'data_export:api-projects:project-exports-download',
        kwargs={'pk': project.id, 'export_pk': export.id},
    )


def _auth_export(client, project):
    return client.get(
        reverse('data_export:project-export-files-auth-check'),
        HTTP_X_ORIGINAL_URI=f'/export/{project.id}-snapshot.json',
    )


def _complete_export(export):
    export.status = Export.Status.COMPLETED
    export.file.save('snapshot.json', ContentFile(b'[]'), save=False)
    export.save(update_fields=['status', 'file'])


@override_settings(USE_NGINX_FOR_EXPORT_DOWNLOADS=False)
class ExportAccessTests(APITestCase):
    def test_member_cannot_create_download_or_authorize_export(self):
        world = make_access_world()
        existing = Export.objects.create(project=world.project_1, created_by=world.creator)
        _complete_export(existing)
        hidden = Export.objects.create(project=world.project_2, created_by=world.owner)
        _complete_export(hidden)
        exports_before = Export.objects.count()
        self.client.force_authenticate(world.member_a)

        opened = []

        def track_open(*args, **kwargs):
            opened.append(args)
            return RangedFileResponse(*args, **kwargs)

        with patch('data_export.models.Export.run_file_exporting') as export_job, patch(
            'data_export.api.RangedFileResponse', side_effect=track_open
        ):
            created = self.client.post(_export_list_url(world.project_1), {}, format='json')
            downloaded = self.client.get(_export_download_url(world.project_1, existing))
            hidden_create = self.client.post(_export_list_url(world.project_2), {}, format='json')
            hidden_download = self.client.get(_export_download_url(world.project_2, hidden))
            authorized = _auth_export(self.client, world.project_1)
            hidden_auth = _auth_export(self.client, world.project_2)

        self.assertEqual(created.status_code, 403, created.content)
        self.assertEqual(downloaded.status_code, 403)
        self.assertEqual(hidden_create.status_code, 404, hidden_create.content)
        self.assertEqual(hidden_download.status_code, 404, hidden_download.content)
        self.assertEqual(authorized.status_code, 403, authorized.content)
        self.assertEqual(hidden_auth.status_code, 404, hidden_auth.content)
        self.assertEqual(Export.objects.count(), exports_before)
        export_job.assert_not_called()
        self.assertEqual(opened, [])

    def test_creator_can_create_export(self):
        world = make_access_world()
        self.client.force_authenticate(world.creator)
        with patch('data_export.models.Export.run_file_exporting'):
            created = self.client.post(_export_list_url(world.project_1), {}, format='json')
        self.assertEqual(created.status_code, 201, created.content)
        self.assertTrue(Export.objects.filter(project=world.project_1, created_by=world.creator).exists())
        authorized = _auth_export(self.client, world.project_1)
        self.assertEqual(authorized.status_code, 200, authorized.content)

    def test_revoked_manager_cannot_open_an_export_created_earlier(self):
        world = make_access_world()
        world.project_1.created_by = world.member_a
        world.project_1.save(update_fields=['created_by'])
        self.client.force_authenticate(world.member_a)

        with patch('data_export.models.Export.run_file_exporting'):
            created = self.client.post(_export_list_url(world.project_1), {}, format='json')
        self.assertEqual(created.status_code, 201, created.content)
        export = Export.objects.get(project=world.project_1, created_by=world.member_a)
        _complete_export(export)

        world.project_1.created_by = world.creator
        world.project_1.save(update_fields=['created_by'])

        opened = []

        def track_open(*args, **kwargs):
            opened.append(args)
            return RangedFileResponse(*args, **kwargs)

        with patch('data_export.api.RangedFileResponse', side_effect=track_open):
            downloaded = self.client.get(_export_download_url(world.project_1, export))

        self.assertEqual(downloaded.status_code, 403)
        self.assertEqual(opened, [])
        self.assertTrue(Export.objects.filter(id=export.id).exists())

    def test_member_cannot_list_delete_or_convert_exports(self):
        world = make_access_world()
        existing = Export.objects.create(project=world.project_1, created_by=world.creator)
        hidden = Export.objects.create(project=world.project_2, created_by=world.owner)
        exports_before = Export.objects.count()
        conversions_before = ConvertedFormat.objects.count()
        self.client.force_authenticate(world.member_a)
        own_detail = reverse(
            'data_export:api-projects:project-exports-detail',
            kwargs={'pk': world.project_1.id, 'export_pk': existing.id},
        )
        hidden_detail = reverse(
            'data_export:api-projects:project-exports-detail',
            kwargs={'pk': world.project_2.id, 'export_pk': hidden.id},
        )
        own_convert = reverse(
            'data_export:api-projects:project-exports-convert',
            kwargs={'pk': world.project_1.id, 'export_pk': existing.id},
        )
        hidden_convert = reverse(
            'data_export:api-projects:project-exports-convert',
            kwargs={'pk': world.project_2.id, 'export_pk': hidden.id},
        )

        with patch('data_export.api.start_job_async_or_sync') as enqueue:
            listed = self.client.get(_export_list_url(world.project_1))
            hidden_list = self.client.get(_export_list_url(world.project_2))
            detail = self.client.get(own_detail)
            deleted = self.client.delete(own_detail)
            hidden_detail_response = self.client.get(hidden_detail)
            hidden_delete = self.client.delete(hidden_detail)
            converted = self.client.post(own_convert, {'export_type': 'CSV'}, format='json')
            hidden_converted = self.client.post(hidden_convert, {'export_type': 'CSV'}, format='json')

        self.assertEqual(listed.status_code, 403, listed.content)
        self.assertEqual(hidden_list.status_code, 404, hidden_list.content)
        self.assertEqual(detail.status_code, 403, detail.content)
        self.assertEqual(deleted.status_code, 403, getattr(deleted, 'content', b''))
        self.assertEqual(hidden_detail_response.status_code, 404, hidden_detail_response.content)
        self.assertEqual(hidden_delete.status_code, 404, getattr(hidden_delete, 'content', b''))
        self.assertEqual(converted.status_code, 403, converted.content)
        self.assertEqual(hidden_converted.status_code, 404, hidden_converted.content)
        self.assertEqual(Export.objects.count(), exports_before)
        self.assertTrue(Export.objects.filter(id=existing.id).exists())
        self.assertTrue(Export.objects.filter(id=hidden.id).exists())
        self.assertEqual(ConvertedFormat.objects.count(), conversions_before)
        enqueue.assert_not_called()

    def test_member_cannot_sync_export_or_list_export_files(self):
        world = make_access_world()
        self.client.force_authenticate(world.member_a)
        exports_before = Export.objects.count()
        generated = []
        listed_dirs = []
        real_listdir = os.listdir

        def fake_generate(*args, **kwargs):
            generated.append(args)
            return io.BytesIO(b'[]'), 'application/json', 'export.json'

        def track_listdir(path):
            if os.path.abspath(path) == os.path.abspath(settings.EXPORT_DIR):
                listed_dirs.append(path)
                return []
            return real_listdir(path)

        with patch('data_export.api.DataExport.generate_export_file', side_effect=fake_generate), patch(
            'data_export.api.os.listdir', side_effect=track_listdir
        ):
            sync_export = self.client.get(
                reverse('data_export:api-projects:project-export', kwargs={'pk': world.project_1.id})
            )
            hidden_sync = self.client.get(
                reverse('data_export:api-projects:project-export', kwargs={'pk': world.project_2.id})
            )
            files = self.client.get(
                reverse('data_export:api-projects:project-export-files', kwargs={'pk': world.project_1.id})
            )
            hidden_files = self.client.get(
                reverse('data_export:api-projects:project-export-files', kwargs={'pk': world.project_2.id})
            )

        self.assertEqual(sync_export.status_code, 403)
        self.assertEqual(hidden_sync.status_code, 404)
        self.assertEqual(files.status_code, 403, getattr(files, 'content', b''))
        self.assertEqual(hidden_files.status_code, 404, getattr(hidden_files, 'content', b''))
        self.assertEqual(generated, [])
        self.assertEqual(listed_dirs, [])
        self.assertEqual(Export.objects.count(), exports_before)
