import base64
from unittest.mock import MagicMock

import pytest
from django.urls import reverse
from io_storages.proxy_api import ProjectResolveStorageUri, TaskResolveStorageUri
from projects.models import Project
from rest_framework import status
from rest_framework.test import APIRequestFactory, force_authenticate
from tasks.models import Task
from users.models import User


@pytest.mark.django_db
class TestTaskResolveStorageUri:
    @pytest.fixture
    def view(self):
        view = TaskResolveStorageUri.as_view()
        view.authentication_classes = []
        view.permission_classes = []
        return view

    @pytest.fixture
    def project(self):
        project = Project(pk=1, title='testproject')
        project.has_permission = MagicMock()
        project.get_all_import_storage_objects = []
        return project

    @pytest.fixture
    def task(self, project):
        task = Task(pk=1, data={}, project=project)
        task.resolve_storage_uri = MagicMock()
        task.has_permission = MagicMock()
        return task

    @pytest.fixture
    def user(self):
        user = User.objects.create_user(username='testuser', email='testuser@email.com', password='testpassword')
        return user

    def test_missing_parameters(self, view, user):
        request = APIRequestFactory().get(reverse('storages:task-storage-data-resolve', kwargs={'task_id': 1}))

        request.user = user
        force_authenticate(request, user)
        response = view(request)

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_task_not_found(self, view, user):
        # Test case where task doesn't exist in database
        request = APIRequestFactory().get(
            reverse('storages:task-storage-data-resolve', kwargs={'task_id': 2}) + '?fileuri=fileuri'
        )
        request.user = user
        force_authenticate(request, user)
        response = view(request, task_id=2)

        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_task_resolve_returns_none(self, view, task, project, user, monkeypatch):
        # Test case where task exists but resolve_storage_uri returns None
        task.resolve_storage_uri.return_value = None
        task.has_permission.return_value = True
        task.project = project

        def mock_task_get(*args, **kwargs):
            if kwargs['pk'] == 1:
                return task
            else:
                raise Task.DoesNotExist

        obj = MagicMock()
        obj.get = mock_task_get
        monkeypatch.setattr('tasks.models.Task.objects', obj)

        # Add a mock storage that will match the URI
        mock_storage = MagicMock()
        mock_storage.presign = True
        # the authorized storage signs the URL itself; here it yields nothing
        mock_storage.generate_http_url.return_value = None

        def mock_can_resolve(url):
            return True  # Match any URL

        mock_storage.can_resolve_url = MagicMock(side_effect=mock_can_resolve)
        project.get_all_import_storage_objects = [mock_storage]

        request = APIRequestFactory().get(
            reverse('storages:task-storage-data-resolve', kwargs={'task_id': 1}) + '?fileuri=fileuri'
        )
        request.user = user
        force_authenticate(request, user)
        response = view(request, task_id=1)

        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_storage_resolution_fails(self, view, task, project, user, monkeypatch):
        task.resolve_storage_uri.return_value = None
        task.has_permission.return_value = True
        project.get_all_import_storage_objects = []
        task.project = project

        def mock_task_get(*args, **kwargs):
            if kwargs['pk'] == 1:
                return task
            else:
                raise Task.DoesNotExist

        obj = MagicMock()
        obj.get = mock_task_get
        monkeypatch.setattr('tasks.models.Task.objects', obj)

        encoded_fileuri = base64.urlsafe_b64encode(b's3://valid/uri').decode()
        request = APIRequestFactory().get(
            reverse('storages:task-storage-data-resolve', kwargs={'task_id': 1}) + f'?fileuri={encoded_fileuri}'
        )
        request.user = user
        force_authenticate(request, user)
        response = view(request, task_id=1)

        assert response.status_code == status.HTTP_404_NOT_FOUND
        task.resolve_storage_uri.assert_not_called()

    def test_file_uri_not_hashed(self, view, task, project, user, monkeypatch):
        task.has_permission.return_value = True
        project.get_all_import_storage_objects = []
        task.project = project

        def mock_task_get(*args, **kwargs):
            if kwargs['pk'] == 1:
                return task
            else:
                raise Task.DoesNotExist

        obj = MagicMock()
        obj.get = mock_task_get
        monkeypatch.setattr('tasks.models.Task.objects', obj)

        request = APIRequestFactory().get(
            reverse('storages:task-storage-data-resolve', kwargs={'task_id': 1}) + '?fileuri=fileuri'
        )
        request.user = user
        force_authenticate(request, user)

        response = view(request, task_id=1)

        assert response.status_code == status.HTTP_404_NOT_FOUND
        task.resolve_storage_uri.assert_not_called()

    def test_successful_request(self, view, task, project, user, monkeypatch):
        valid_decoded_uri = "s3://hypertext-bucket/file with /spaces and' / ' / quotes.jpg"
        encoded_fileuri = base64.urlsafe_b64encode(valid_decoded_uri.encode()).decode()

        mock_storage = MagicMock()
        mock_storage.presign = True
        # the authorized storage signs the URL itself
        mock_storage.generate_http_url.return_value = 'https://presigned-url.com/fileuri'
        mock_storage.presign_ttl = 3600

        def mock_can_resolve(url):
            return url == valid_decoded_uri

        mock_storage.can_resolve_url = MagicMock(side_effect=mock_can_resolve)

        project.get_all_import_storage_objects = [mock_storage]
        task.project = project

        task.resolve_storage_uri.return_value = dict(
            url='https://presigned-url.com/fileuri',
            presign_ttl=3600,
        )
        task.has_permission.return_value = True

        def mock_task_get(*args, **kwargs):
            if kwargs['pk'] == 1:
                return task
            else:
                raise Task.DoesNotExist

        obj = MagicMock()
        obj.get = mock_task_get
        monkeypatch.setattr('tasks.models.Task.objects', obj)

        request = APIRequestFactory().get(
            reverse('storages:task-storage-data-resolve', kwargs={'task_id': 1}) + f'?fileuri={encoded_fileuri}'
        )
        request.user = user
        force_authenticate(request, user)

        response = view(request, task_id=1)

        assert response.status_code == status.HTTP_303_SEE_OTHER
        assert response.url == 'https://presigned-url.com/fileuri'
        mock_storage.can_resolve_url.assert_called_with(valid_decoded_uri)
        mock_storage.generate_http_url.assert_called_once_with(valid_decoded_uri)

    def test_successful_request_with_long_fileuri(self, view, task, project, user, monkeypatch):
        longest_allowable_cloud_storage_path = 'is/a/long/path/that/needs/to/be/1024/characters/long/so/that/it/gets/hashedis/a/long/path/that/needs/to/be/1024/characters/long/so/that/it/gets/hashedis/a/long/path/that/needs/to/be/1024/characters/long/so/that/it/gets/hashedis/a/long/path/that/needs/to/be/1024/characters/long/so/that/it/gets/hashedis/a/long/path/that/needs/to/be/1024/characters/long/so/that/it/gets/hashedis/a/long/path/that/needs/to/be/1024/characters/long/so/that/it/gets/hashedis/a/long/path/that/needs/to/be/1024/characters/long/so/that/it/gets/hashedis/a/long/path/that/needs/to/be/1024/characters/long/so/that/it/gets/hashedis/a/long/path/that/needs/to/be/1024/characters/long/so/that/it/gets/hashedis/a/long/path/that/needs/to/be/1024/characters/long/so/that/it/gets/hashedis/a/long/path/that/needs/to/be/1024/characters/long/so/that/it/gets/hashedis/a/long/path/that/needs/to/be/1024/characters/long/so/that/it/gets/hashedis/a/long/path/that/needs/to/be/1024/characters/long/so/that/it/gets/hashedis/long/path/that/needs/to/be/1024/characters.png'
        longest_uri = f'aaaaa-bbbb://{longest_allowable_cloud_storage_path}'
        base64_encoded_uri = base64.urlsafe_b64encode(longest_uri.encode()).decode()

        mock_storage = MagicMock()
        mock_storage.presign = True
        # the authorized storage signs the URL itself
        mock_storage.generate_http_url.return_value = 'https://presigned-url.com/fileuri'
        mock_storage.presign_ttl = 3600

        def mock_can_resolve(url):
            return url == longest_uri

        mock_storage.can_resolve_url = MagicMock(side_effect=mock_can_resolve)

        project.get_all_import_storage_objects = [mock_storage]
        task.project = project

        task.resolve_storage_uri.return_value = dict(
            url='https://presigned-url.com/fileuri',
            presign_ttl=3600,
        )
        task.has_permission.return_value = True

        def mock_task_get(*args, **kwargs):
            if kwargs['pk'] == 1:
                return task
            else:
                raise Task.DoesNotExist

        obj = MagicMock()
        obj.get = mock_task_get
        monkeypatch.setattr('tasks.models.Task.objects', obj)

        longest_allowable_url_length = 2000
        largest_allowable_task_key = 9223372036854775807
        longest_resolve_path = f'/tasks/{largest_allowable_task_key}/resolve/?fileuri='
        scheme_length = len('https://')
        longest_resolve_path_length = len(longest_resolve_path)
        longest_allowable_fileuri_hash_length = len(base64_encoded_uri)
        remaining_url_origin_length = (
            longest_allowable_url_length
            - scheme_length
            - longest_resolve_path_length
            - longest_allowable_fileuri_hash_length
        )
        assert remaining_url_origin_length >= 512

        request = APIRequestFactory().get(
            reverse('storages:task-storage-data-resolve', kwargs={'task_id': 1}) + f'?fileuri={base64_encoded_uri}'
        )
        request.user = user
        force_authenticate(request, user)
        response = view(request, task_id=1)

        assert response.status_code == status.HTTP_303_SEE_OTHER
        assert response.url == 'https://presigned-url.com/fileuri'
        mock_storage.can_resolve_url.assert_called_with(longest_uri)
        mock_storage.generate_http_url.assert_called_once_with(longest_uri)


@pytest.mark.django_db
class TestProjectResolveStorageUri:
    @pytest.fixture
    def view(self):
        view = ProjectResolveStorageUri.as_view()
        view.authentication_classes = []
        view.permission_classes = []
        return view

    @pytest.fixture
    def project(self):
        project = Project(pk=1, title='testproject')
        project.resolve_storage_uri = MagicMock()
        project.has_permission = MagicMock()
        project.get_all_import_storage_objects = []
        return project

    @pytest.fixture
    def user(self):
        user = User.objects.create_user(username='testuser', email='testuser@email.com', password='testpassword')
        return user

    def test_missing_parameters(self, view, user):
        request = APIRequestFactory().get(reverse('storages:project-storage-data-resolve', kwargs={'project_id': 1}))

        request.user = user
        force_authenticate(request, user)
        response = view(request)

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_project_not_found(self, view, user):
        # Test case where project doesn't exist in database
        request = APIRequestFactory().get(
            reverse('storages:project-storage-data-resolve', kwargs={'project_id': 2}) + '?fileuri=fileuri'
        )
        request.user = user
        force_authenticate(request, user)
        response = view(request, project_id=2)

        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_project_resolve_returns_none(self, view, project, user, monkeypatch):
        # Test case where project exists but resolve_storage_uri returns None
        project.resolve_storage_uri.return_value = None
        project.has_permission.return_value = True

        def mock_project_get(*args, **kwargs):
            if kwargs['pk'] == 1:
                return project
            else:
                raise Project.DoesNotExist

        obj = MagicMock()
        obj.get = mock_project_get
        monkeypatch.setattr('projects.models.Project.objects', obj)

        # Add a mock storage that will match the URI
        mock_storage = MagicMock()
        mock_storage.presign = True
        # the authorized storage signs the URL itself; here it yields nothing
        mock_storage.generate_http_url.return_value = None

        def mock_can_resolve(url):
            return True  # Match any URL

        mock_storage.can_resolve_url = MagicMock(side_effect=mock_can_resolve)
        project.get_all_import_storage_objects = [mock_storage]

        request = APIRequestFactory().get(
            reverse('storages:project-storage-data-resolve', kwargs={'project_id': 1}) + '?fileuri=fileuri'
        )
        request.user = user
        force_authenticate(request, user)
        response = view(request, project_id=1)

        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_storage_resolution_fails(self, view, project, user, monkeypatch):
        project.resolve_storage_uri.return_value = None
        project.has_permission.return_value = True

        def mock_project_get(*args, **kwargs):
            if kwargs['pk'] == 1:
                return project
            else:
                raise Project.DoesNotExist

        obj = MagicMock()
        obj.get = mock_project_get
        monkeypatch.setattr('projects.models.Project.objects', obj)

        encoded_fileuri = base64.urlsafe_b64encode(b's3://valid/uri').decode()
        request = APIRequestFactory().get(
            reverse('storages:project-storage-data-resolve', kwargs={'project_id': 1}) + f'?fileuri={encoded_fileuri}'
        )
        request.user = user
        force_authenticate(request, user)
        response = view(request, project_id=1)

        assert response.status_code == status.HTTP_404_NOT_FOUND
        project.resolve_storage_uri.assert_not_called()

    def test_file_uri_not_hashed(self, view, project, user, monkeypatch):
        project.has_permission.return_value = True

        def mock_project_get(*args, **kwargs):
            if kwargs['pk'] == 1:
                return project
            else:
                raise Project.DoesNotExist

        obj = MagicMock()
        obj.get = mock_project_get
        monkeypatch.setattr('projects.models.Project.objects', obj)

        request = APIRequestFactory().get(
            reverse('storages:project-storage-data-resolve', kwargs={'project_id': 1}) + '?fileuri=fileuri'
        )
        request.user = user
        force_authenticate(request, user)

        response = view(request, project_id=1)

        assert response.status_code == status.HTTP_404_NOT_FOUND
        project.resolve_storage_uri.assert_not_called()

    def test_successful_request(self, view, project, user, monkeypatch):
        valid_decoded_uri = "s3://hypertext-bucket/file with /spaces and' / ' / quotes.jpg"
        encoded_fileuri = base64.urlsafe_b64encode(valid_decoded_uri.encode()).decode()

        mock_storage = MagicMock()
        mock_storage.presign = True
        # the authorized storage signs the URL itself
        mock_storage.generate_http_url.return_value = 'https://presigned-url.com/fileuri'
        mock_storage.presign_ttl = 3600

        def mock_can_resolve(url):
            return url == valid_decoded_uri

        mock_storage.can_resolve_url = MagicMock(side_effect=mock_can_resolve)

        project.get_all_import_storage_objects = [mock_storage]

        project.resolve_storage_uri.return_value = dict(
            url='https://presigned-url.com/fileuri',
            presign_ttl=3600,
        )
        project.has_permission.return_value = True

        def mock_project_get(*args, **kwargs):
            if kwargs['pk'] == 1:
                return project
            else:
                raise Project.DoesNotExist

        obj = MagicMock()
        obj.get = mock_project_get
        monkeypatch.setattr('projects.models.Project.objects', obj)

        request = APIRequestFactory().get(
            reverse('storages:project-storage-data-resolve', kwargs={'project_id': 1}) + f'?fileuri={encoded_fileuri}'
        )
        request.user = user
        force_authenticate(request, user)
        response = view(request, project_id=1)

        assert response.status_code == status.HTTP_303_SEE_OTHER
        assert response.url == 'https://presigned-url.com/fileuri'
        mock_storage.can_resolve_url.assert_called_with(valid_decoded_uri)
        mock_storage.generate_http_url.assert_called_once_with(valid_decoded_uri)

    def test_successful_request_with_long_fileuri(self, view, project, user, monkeypatch):
        longest_allowable_cloud_storage_path = 'is/a/long/path/that/needs/to/be/1024/characters/long/so/that/it/gets/hashedis/a/long/path/that/needs/to/be/1024/characters/long/so/that/it/gets/hashedis/a/long/path/that/needs/to/be/1024/characters/long/so/that/it/gets/hashedis/a/long/path/that/needs/to/be/1024/characters/long/so/that/it/gets/hashedis/a/long/path/that/needs/to/be/1024/characters/long/so/that/it/gets/hashedis/a/long/path/that/needs/to/be/1024/characters/long/so/that/it/gets/hashedis/a/long/path/that/needs/to/be/1024/characters/long/so/that/it/gets/hashedis/a/long/path/that/needs/to/be/1024/characters/long/so/that/it/gets/hashedis/a/long/path/that/needs/to/be/1024/characters/long/so/that/it/gets/hashedis/a/long/path/that/needs/to/be/1024/characters/long/so/that/it/gets/hashedis/a/long/path/that/needs/to/be/1024/characters/long/so/that/it/gets/hashedis/a/long/path/that/needs/to/be/1024/characters/long/so/that/it/gets/hashedis/a/long/path/that/needs/to/be/1024/characters/long/so/that/it/gets/hashedis/long/path/that/needs/to/be/1024/characters.png'
        longest_uri = f'aaaaa-bbbb://{longest_allowable_cloud_storage_path}'
        base64_encoded_uri = base64.urlsafe_b64encode(longest_uri.encode()).decode()

        mock_storage = MagicMock()
        mock_storage.presign = True
        # the authorized storage signs the URL itself
        mock_storage.generate_http_url.return_value = 'https://presigned-url.com/fileuri'
        mock_storage.presign_ttl = 3600

        def mock_can_resolve(url):
            return url == longest_uri

        mock_storage.can_resolve_url = MagicMock(side_effect=mock_can_resolve)

        project.get_all_import_storage_objects = [mock_storage]

        project.resolve_storage_uri.return_value = dict(
            url='https://presigned-url.com/fileuri',
            presign_ttl=3600,
        )
        project.has_permission.return_value = True

        def mock_project_get(*args, **kwargs):
            if kwargs['pk'] == 1:
                return project
            else:
                raise Project.DoesNotExist

        obj = MagicMock()
        obj.get = mock_project_get
        monkeypatch.setattr('projects.models.Project.objects', obj)

        longest_allowable_url_length = 2000
        largest_allowable_project_key = 9223372036854775807
        longest_resolve_path = f'/projects/{largest_allowable_project_key}/resolve/?fileuri='
        scheme_length = len('https://')
        longest_resolve_path_length = len(longest_resolve_path)
        longest_allowable_fileuri_hash_length = len(base64_encoded_uri)
        remaining_url_origin_length = (
            longest_allowable_url_length
            - scheme_length
            - longest_resolve_path_length
            - longest_allowable_fileuri_hash_length
        )
        assert remaining_url_origin_length >= 512

        request = APIRequestFactory().get(
            reverse('storages:project-storage-data-resolve', kwargs={'project_id': 1})
            + f'?fileuri={base64_encoded_uri}'
        )
        request.user = user
        force_authenticate(request, user)
        response = view(request, project_id=1)

        assert response.status_code == status.HTTP_303_SEE_OTHER
        assert response.url == 'https://presigned-url.com/fileuri'
        mock_storage.can_resolve_url.assert_called_with(longest_uri)
        mock_storage.generate_http_url.assert_called_once_with(longest_uri)
