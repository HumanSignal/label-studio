"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license."""

from unittest.mock import patch

from data_import.models import FileUpload
from django.conf import settings
from django.core.files.base import ContentFile
from django.test import override_settings
from django.urls import reverse
from projects.models import ProjectImport, ProjectReimport
from projects.tests.access_setup import make_access_world
from ranged_fileresponse import RangedFileResponse
from rest_framework.test import APITestCase
from tasks.models import Prediction, Task
from tasks.tests.factories import TaskFactory


def _save_upload(project, user, name='tasks.json'):
    upload = FileUpload(user=user, project=project)
    upload.file.save(name, ContentFile(b'[{"data": {"text": "one"}}]'), save=True)
    return upload


def _uploaded_file_url(upload):
    prefix = settings.UPLOAD_DIR.rstrip('/') + '/'
    filename = upload.file.name
    if filename.startswith(prefix):
        filename = filename[len(prefix) :]
    return reverse('data_import:data-upload', kwargs={'filename': filename})


class ImportAccessTests(APITestCase):
    def test_member_import_and_reimport_do_not_enqueue(self):
        world = make_access_world()
        upload = _save_upload(world.project_1, world.creator)
        hidden = _save_upload(world.project_2, world.owner)
        self.client.force_authenticate(world.member_a)
        imports_before = ProjectImport.objects.count()
        reimports_before = ProjectReimport.objects.count()
        tasks_before = Task.objects.count()

        with (
            patch('data_import.api.start_job_async_or_sync') as enqueue,
            patch('projects.mixins.start_job_async_or_sync') as counters,
        ):
            imported = self.client.post(
                reverse('data_import:api-projects:project-import', kwargs={'pk': world.project_1.id}),
                [{'data': {'text': 'member-import'}}],
                format='json',
            )
            reimported = self.client.post(
                reverse('data_import:api-projects:project-reimport', kwargs={'pk': world.project_1.id}),
                {'file_upload_ids': [upload.id]},
                format='json',
            )
            hidden_import = self.client.post(
                reverse('data_import:api-projects:project-import', kwargs={'pk': world.project_2.id}),
                [{'data': {'text': 'hidden-import'}}],
                format='json',
            )
            hidden_reimport = self.client.post(
                reverse('data_import:api-projects:project-reimport', kwargs={'pk': world.project_2.id}),
                {'file_upload_ids': [hidden.id]},
                format='json',
            )

        self.assertEqual(imported.status_code, 403, imported.content)
        self.assertEqual(reimported.status_code, 403, reimported.content)
        self.assertEqual(hidden_import.status_code, 404, hidden_import.content)
        self.assertEqual(hidden_reimport.status_code, 404, hidden_reimport.content)
        self.assertEqual(ProjectImport.objects.count(), imports_before)
        self.assertEqual(ProjectReimport.objects.count(), reimports_before)
        self.assertEqual(Task.objects.count(), tasks_before)
        enqueue.assert_not_called()
        counters.assert_not_called()

    def test_member_cannot_list_or_delete_uploads(self):
        world = make_access_world()
        own = _save_upload(world.project_1, world.creator, name='own.json')
        hidden = _save_upload(world.project_2, world.owner, name='hidden.json')
        self.client.force_authenticate(world.member_a)

        listed = self.client.get(
            reverse('data_import:api-projects:project-file-upload-list', kwargs={'pk': world.project_1.id})
        )
        deleted = self.client.delete(
            reverse('data_import:api-projects:project-file-upload-list', kwargs={'pk': world.project_1.id}),
            {'file_upload_ids': [own.id]},
            format='json',
        )
        hidden_list = self.client.get(
            reverse('data_import:api-projects:project-file-upload-list', kwargs={'pk': world.project_2.id})
        )
        hidden_delete = self.client.delete(
            reverse('data_import:api-projects:project-file-upload-list', kwargs={'pk': world.project_2.id}),
            {'file_upload_ids': [hidden.id]},
            format='json',
        )

        self.assertEqual(listed.status_code, 403, listed.content)
        self.assertEqual(deleted.status_code, 403, deleted.content)
        self.assertEqual(hidden_list.status_code, 404, hidden_list.content)
        self.assertEqual(hidden_delete.status_code, 404, hidden_delete.content)
        self.assertTrue(FileUpload.objects.filter(id=own.id).exists())
        self.assertTrue(FileUpload.objects.filter(id=hidden.id).exists())

    @override_settings(USE_NGINX_FOR_UPLOADS=False)
    def test_member_cannot_open_uploaded_or_storage_files(self):
        world = make_access_world()
        own = _save_upload(world.project_1, world.creator, name='open.json')
        hidden = _save_upload(world.project_2, world.owner, name='closed.json')
        self.client.force_authenticate(world.member_a)
        opened = []

        def track_open(*args, **kwargs):
            opened.append(args)
            return RangedFileResponse(*args, **kwargs)

        with patch('data_import.api.RangedFileResponse', side_effect=track_open):
            storage = self.client.get(
                reverse('data_import:storage-data-upload'),
                {'filepath': own.file.name},
            )
            uploaded = self.client.get(_uploaded_file_url(own))
            hidden_storage = self.client.get(
                reverse('data_import:storage-data-upload'),
                {'filepath': hidden.file.name},
            )
            hidden_uploaded = self.client.get(_uploaded_file_url(hidden))

        self.assertEqual(storage.status_code, 403)
        self.assertEqual(uploaded.status_code, 403)
        self.assertEqual(hidden_storage.status_code, 404)
        self.assertEqual(hidden_uploaded.status_code, 404)
        self.assertEqual(opened, [])

    def test_member_cannot_read_import_task_lists_or_details(self):
        world = make_access_world()
        own_import = ProjectImport.objects.create(project=world.project_1)
        own_reimport = ProjectReimport.objects.create(project=world.project_1)
        hidden_import = ProjectImport.objects.create(project=world.project_2)
        hidden_reimport = ProjectReimport.objects.create(project=world.project_2)
        self.client.force_authenticate(world.member_a)

        listed = self.client.get(reverse('projects:api:project-import-list', kwargs={'pk': world.project_1.id}))
        detail = self.client.get(
            reverse(
                'projects:api:project-imports',
                kwargs={'pk': world.project_1.id, 'import_pk': own_import.id},
            )
        )
        reimport_list = self.client.get(
            reverse('projects:api:project-reimport-list', kwargs={'pk': world.project_1.id})
        )
        reimport_detail = self.client.get(
            reverse(
                'projects:api:project-reimports',
                kwargs={'pk': world.project_1.id, 'reimport_pk': own_reimport.id},
            )
        )
        hidden_list = self.client.get(reverse('projects:api:project-import-list', kwargs={'pk': world.project_2.id}))
        hidden_detail = self.client.get(
            reverse(
                'projects:api:project-imports',
                kwargs={'pk': world.project_2.id, 'import_pk': hidden_import.id},
            )
        )
        hidden_reimport_list = self.client.get(
            reverse('projects:api:project-reimport-list', kwargs={'pk': world.project_2.id})
        )
        hidden_reimport_detail = self.client.get(
            reverse(
                'projects:api:project-reimports',
                kwargs={'pk': world.project_2.id, 'reimport_pk': hidden_reimport.id},
            )
        )

        self.assertEqual(listed.status_code, 403, listed.content)
        self.assertEqual(detail.status_code, 403, detail.content)
        self.assertEqual(reimport_list.status_code, 403, reimport_list.content)
        self.assertEqual(reimport_detail.status_code, 403, reimport_detail.content)
        self.assertEqual(hidden_list.status_code, 404, hidden_list.content)
        self.assertEqual(hidden_detail.status_code, 404, hidden_detail.content)
        self.assertEqual(hidden_reimport_list.status_code, 404, hidden_reimport_list.content)
        self.assertEqual(hidden_reimport_detail.status_code, 404, hidden_reimport_detail.content)
        self.assertEqual(ProjectImport.objects.count(), 2)

    def test_member_cannot_read_or_delete_one_upload(self):
        world = make_access_world()
        own = _save_upload(world.project_1, world.creator, name='one.json')
        hidden = _save_upload(world.project_2, world.owner, name='other.json')
        self.client.force_authenticate(world.member_a)
        own_url = reverse('data_import:api:file-upload-detail', kwargs={'pk': own.id})
        hidden_url = reverse('data_import:api:file-upload-detail', kwargs={'pk': hidden.id})

        fetched = self.client.get(own_url)
        deleted = self.client.delete(own_url)
        hidden_fetch = self.client.get(hidden_url)
        hidden_delete = self.client.delete(hidden_url)

        self.assertEqual(fetched.status_code, 403, fetched.content)
        self.assertEqual(deleted.status_code, 403, getattr(deleted, 'content', b''))
        self.assertEqual(hidden_fetch.status_code, 404, hidden_fetch.content)
        self.assertEqual(hidden_delete.status_code, 404, getattr(hidden_delete, 'content', b''))
        self.assertTrue(FileUpload.objects.filter(id=own.id).exists())
        self.assertTrue(FileUpload.objects.filter(id=hidden.id).exists())

    def test_member_cannot_import_predictions(self):
        world = make_access_world()
        task = TaskFactory(project=world.project_1, data={'text': 'visible'})
        hidden_task = TaskFactory(project=world.project_2, data={'text': 'hidden'})
        self.client.force_authenticate(world.member_a)
        predictions_before = Prediction.objects.count()
        imports_before = ProjectImport.objects.count()
        payload = [{'result': [], 'score': 0.5, 'model_version': 'member', 'task': task.id}]
        hidden_payload = [{'result': [], 'score': 0.5, 'model_version': 'member', 'task': hidden_task.id}]

        with patch('data_import.api.start_job_async_or_sync') as enqueue:
            imported = self.client.post(
                reverse('data_import:api-projects:project-import-predictions', kwargs={'pk': world.project_1.id}),
                payload,
                format='json',
            )
            hidden = self.client.post(
                reverse('data_import:api-projects:project-import-predictions', kwargs={'pk': world.project_2.id}),
                hidden_payload,
                format='json',
            )

        self.assertEqual(imported.status_code, 403, imported.content)
        self.assertEqual(hidden.status_code, 404, hidden.content)
        self.assertEqual(Prediction.objects.count(), predictions_before)
        self.assertEqual(ProjectImport.objects.count(), imports_before)
        enqueue.assert_not_called()
