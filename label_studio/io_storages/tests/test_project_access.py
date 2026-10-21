"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license."""

import base64
import tempfile
from pathlib import Path
from unittest.mock import patch

from django.test import override_settings
from django.urls import reverse
from io_storages.localfiles.models import LocalFilesImportStorage
from io_storages.s3.models import S3ImportStorage
from io_storages.tests.factories import S3ImportStorageFactory
from projects.tests.access_setup import make_access_world
from rest_framework.test import APITestCase

SECRET_ACCESS_KEY_ID = 'AKIA_MEMBER_SHOULD_NOT_SEE'
LOCAL_PATH_A = '/data/project-a'
LOCAL_PATH_A_CHILD = '/data/project-a/images'


def _fileuri(value):
    return base64.urlsafe_b64encode(value.encode()).decode()


class StorageAccessTests(APITestCase):
    def test_annotator_storage_sync_does_not_construct_client(self):
        world = make_access_world()
        storage = S3ImportStorageFactory(project=world.project_1)
        self.client.force_authenticate(world.member_a)
        url = reverse('storages:api:storage-s3-sync', kwargs={'pk': storage.id})
        with patch('io_storages.s3.models.S3ImportStorage.get_client') as get_client:
            response = self.client.post(url)
        self.assertEqual(response.status_code, 403)
        get_client.assert_not_called()

    def test_member_cannot_read_storage_configuration(self):
        world = make_access_world()
        storage = S3ImportStorageFactory(
            project=world.project_1,
            bucket='project-a',
            prefix='project-a/',
            aws_access_key_id=SECRET_ACCESS_KEY_ID,
            aws_secret_access_key='aws-secret-should-not-leak',
        )
        self.client.force_authenticate(world.member_a)
        listed = self.client.get(reverse('storages:api:storage-s3-list') + f'?project={world.project_1.id}')
        detail = self.client.get(reverse('storages:api:storage-s3-detail', kwargs={'pk': storage.id}))
        hidden = self.client.get(reverse('storages:api:storage-s3-list') + f'?project={world.project_2.id}')
        self.assertEqual(listed.status_code, 403, listed.content)
        self.assertEqual(detail.status_code, 403, detail.content)
        self.assertEqual(hidden.status_code, 404, hidden.content)
        for response in (listed, detail, hidden):
            self.assertNotIn(SECRET_ACCESS_KEY_ID, response.content.decode())
            self.assertNotIn('aws-secret-should-not-leak', response.content.decode())

    def test_member_validate_does_not_construct_client(self):
        world = make_access_world()
        self.client.force_authenticate(world.member_a)
        with patch('io_storages.s3.models.S3ImportStorage.get_client') as get_client:
            response = self.client.post(
                reverse('storages:api:storage-s3-validate'),
                {
                    'project': world.project_1.id,
                    'bucket': 'project-a',
                    'prefix': 'project-a/',
                    'aws_access_key_id': SECRET_ACCESS_KEY_ID,
                    'aws_secret_access_key': 'aws-secret-should-not-leak',
                },
                format='json',
            )
        self.assertEqual(response.status_code, 403, response.content)
        self.assertNotIn(SECRET_ACCESS_KEY_ID, response.content.decode())
        get_client.assert_not_called()

    def test_update_cannot_move_storage_to_another_project(self):
        world = make_access_world()
        storage = S3ImportStorageFactory(
            project=world.project_1,
            bucket='project-a',
            prefix='project-a/',
            aws_access_key_id=SECRET_ACCESS_KEY_ID,
        )
        self.client.force_authenticate(world.creator)
        response = self.client.patch(
            reverse('storages:api:storage-s3-detail', kwargs={'pk': storage.id}),
            {'project': world.project_2.id},
            format='json',
        )
        self.assertEqual(response.status_code, 400, response.content)
        storage.refresh_from_db()
        self.assertEqual(storage.project_id, world.project_1.id)
        self.assertNotIn(SECRET_ACCESS_KEY_ID, response.content.decode())

    def test_validate_cannot_move_storage_to_another_project(self):
        world = make_access_world()
        storage = S3ImportStorageFactory(
            project=world.project_1,
            bucket='project-a',
            prefix='project-a/',
            aws_access_key_id=SECRET_ACCESS_KEY_ID,
        )
        payload = {
            'id': storage.id,
            'project': world.project_2.id,
            'bucket': 'project-a',
            'prefix': 'project-a/',
        }
        self.client.force_authenticate(world.owner)
        for url in (
            reverse('storages:api:storage-s3-validate'),
            reverse('storages:api:storage-s3-list-files'),
        ):
            with (
                patch('io_storages.s3.models.S3ImportStorage.get_client') as get_client,
                patch('io_storages.s3.models.S3ImportStorage.iter_objects') as iter_objects,
            ):
                response = self.client.post(url, payload, format='json')
            self.assertEqual(response.status_code, 400, response.content)
            storage.refresh_from_db()
            self.assertEqual(storage.project_id, world.project_1.id)
            get_client.assert_not_called()
            iter_objects.assert_not_called()
            self.assertNotIn(SECRET_ACCESS_KEY_ID, response.content.decode())

    def test_overlapping_local_directories_are_rejected(self):
        world = make_access_world()
        LocalFilesImportStorage.objects.create(project=world.project_1, path=LOCAL_PATH_A)
        self.client.force_authenticate(world.owner)
        with patch('io_storages.localfiles.models.LocalFilesImportStorage.validate_connection'):
            response = self.client.post(
                reverse('storages:api:storage-localfiles-list'),
                {'project': world.project_2.id, 'path': LOCAL_PATH_A_CHILD},
                format='json',
            )
        self.assertEqual(response.status_code, 400, response.content)
        self.assertFalse(LocalFilesImportStorage.objects.filter(path=LOCAL_PATH_A_CHILD).exists())
        self.assertTrue(LocalFilesImportStorage.objects.filter(project=world.project_1, path=LOCAL_PATH_A).exists())

    def test_separate_local_directories_can_be_saved(self):
        world = make_access_world()
        self.client.force_authenticate(world.owner)
        with patch('io_storages.localfiles.models.LocalFilesImportStorage.validate_connection'):
            response = self.client.post(
                reverse('storages:api:storage-localfiles-list'),
                {'project': world.project_1.id, 'path': '/data/project-b'},
                format='json',
            )
        self.assertEqual(response.status_code, 201, response.content)
        self.assertTrue(LocalFilesImportStorage.objects.filter(project=world.project_1, path='/data/project-b').exists())

    def test_storage_directory_and_key_boundaries(self):
        from io_storages.localfiles.functions import key_within_prefix, storage_directories_overlap

        self.assertTrue(storage_directories_overlap(LOCAL_PATH_A, LOCAL_PATH_A_CHILD))
        self.assertTrue(storage_directories_overlap(LOCAL_PATH_A_CHILD, LOCAL_PATH_A))
        self.assertTrue(storage_directories_overlap(LOCAL_PATH_A + '/', LOCAL_PATH_A))
        self.assertFalse(storage_directories_overlap(LOCAL_PATH_A, '/data/project-a-private'))
        self.assertFalse(key_within_prefix('project-b/file.png', 'project-a/'))
        self.assertTrue(key_within_prefix('project-a/file.png', 'project-a/'))
        self.assertFalse(key_within_prefix('project-a/file.png', ''))
        self.assertFalse(key_within_prefix('project-a/../project-b/file.png', 'project-a/'))
        self.assertFalse(key_within_prefix('/etc/passwd', 'project-a/'))
        self.assertFalse(key_within_prefix('project-a-private/file.png', 'project-a'))

    def test_proxy_rejects_keys_outside_prefix_before_signing(self):
        world = make_access_world()
        S3ImportStorageFactory(
            project=world.project_1,
            bucket='shared-bucket',
            prefix='project-a/',
            aws_access_key_id=SECRET_ACCESS_KEY_ID,
            aws_secret_access_key='aws-secret-should-not-leak',
        )
        self.client.force_authenticate(world.member_a)
        url = reverse('storages:project-storage-data-resolve', kwargs={'project_id': world.project_1.id})
        with patch('io_storages.s3.models.S3ImportStorage.generate_http_url') as generate_http_url:
            outside = self.client.get(url, {'fileuri': _fileuri('s3://shared-bucket/project-b/file.png')})
            traversal = self.client.get(url, {'fileuri': _fileuri('s3://shared-bucket/../secret')})
            absolute = self.client.get(url, {'fileuri': _fileuri('s3://shared-bucket//etc/passwd')})
        self.assertEqual(outside.status_code, 404, outside.content)
        self.assertEqual(traversal.status_code, 400, traversal.content)
        self.assertEqual(absolute.status_code, 400, absolute.content)
        generate_http_url.assert_not_called()
        for response in (outside, traversal, absolute):
            self.assertNotIn(SECRET_ACCESS_KEY_ID, response.content.decode())

    def test_local_file_requires_project_access(self):
        world = make_access_world()
        with tempfile.TemporaryDirectory() as root:
            dataset = Path(root) / 'project-a'
            dataset.mkdir()
            target = dataset / 'image.txt'
            target.write_text('local-secret-bytes', encoding='utf-8')
            LocalFilesImportStorage.objects.create(project=world.project_1, path=str(dataset), use_blob_urls=True)
            relative = target.relative_to(root).as_posix()
            url = reverse('storages:localfiles_data') + f'?d={relative}'
            with override_settings(LOCAL_FILES_SERVING_ENABLED=True, LOCAL_FILES_DOCUMENT_ROOT=root):
                self.client.force_authenticate(world.member_a)
                allowed = self.client.get(url)
                self.client.force_authenticate(world.member_b)
                hidden = self.client.get(url)
        self.assertEqual(allowed.status_code, 200)
        self.assertIn(b'local-secret-bytes', b''.join(allowed.streaming_content))
        self.assertEqual(hidden.status_code, 404)
        self.assertNotIn(b'local-secret-bytes', hidden.content)

    def test_manager_can_read_storage_configuration(self):
        world = make_access_world()
        S3ImportStorage.objects.create(
            project=world.project_1,
            bucket='project-a',
            prefix='project-a/',
            aws_access_key_id=SECRET_ACCESS_KEY_ID,
        )
        self.client.force_authenticate(world.creator)
        response = self.client.get(reverse('storages:api:storage-s3-list') + f'?project={world.project_1.id}')
        self.assertEqual(response.status_code, 200, response.content)
        self.assertNotIn(SECRET_ACCESS_KEY_ID, response.content.decode())
