"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license."""

from unittest.mock import patch

from data_export.models import Export
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
