import base64
from unittest.mock import MagicMock

import pytest
from data_import.api import ProjectPresignStorageData, TaskPresignStorageData
from django.urls import reverse
from projects.models import Project
from rest_framework import status
from rest_framework.test import APIRequestFactory, force_authenticate
from tasks.models import Task
from users.models import User


@pytest.mark.django_db
class TestTaskPresignStorageData:
    @pytest.fixture
    def view(self):
        view = TaskPresignStorageData.as_view()
        view.authentication_classes = []
        view.permission_classes = []
        return view

    @pytest.fixture
    def project(self):
        project = Project(pk=1, title='testproject')
        project.has_permission = MagicMock()
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
        request = APIRequestFactory().get(reverse('data_import:task-storage-data-presign', kwargs={'task_id': 1}))

        request.user = user
        force_authenticate(request, user)
        response = view(request)

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_task_not_found(self, view, user):
        request = APIRequestFactory().get(
            reverse('data_import:task-storage-data-presign', kwargs={'task_id': 2}) + '?fileuri=fileuri'
        )
        request.user = user
        force_authenticate(request, user)
        response = view(request, task_id=2)

        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_task_not_found(self, view, task, project, user, monkeypatch):
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

        request = APIRequestFactory().get(
            reverse('data_import:task-storage-data-presign', kwargs={'task_id': 1}) + '?fileuri=fileuri'
        )
        request.user = user
        force_authenticate(request, user)
        response = view(request, task_id=1)

        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_file_uri_not_hashed(self, view, task, project, user, monkeypatch):
        task.resolve_storage_uri.return_value = dict(
            url='https://presigned-url.com/fileuri',
            presign_ttl=3600,
        )
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

        request = APIRequestFactory().get(
            reverse('data_import:task-storage-data-presign', kwargs={'task_id': 1}) + '?fileuri=fileuri'
        )
        request.user = user
        force_authenticate(request, user)

        response = view(request, task_id=1)

        assert response.status_code == status.HTTP_303_SEE_OTHER
        assert response.url == 'https://presigned-url.com/fileuri'

    def test_successful_request(self, view, task, project, user, monkeypatch):
        task.resolve_storage_uri.return_value = dict(
            url='https://presigned-url.com/fileuri',
            presign_ttl=3600,
        )
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

        request = APIRequestFactory().get(
            reverse('data_import:task-storage-data-presign', kwargs={'task_id': 1})
            + '?fileuri=czM6Ly9oeXBlcnRleHQtYnVja2V0L2ZpbGUgd2l0aCAvc3BhY2VzIGFuZCcgLyAnIC8gcXVvdGVzLmpwZw=='
        )
        request.user = user
        force_authenticate(request, user)

        response = view(request, task_id=1)

        assert response.status_code == status.HTTP_303_SEE_OTHER
        assert response.url == 'https://presigned-url.com/fileuri'

    def test_successful_request_with_long_fileuri(self, view, task, project, user, monkeypatch):
        task.resolve_storage_uri.return_value = dict(
            url='https://presigned-url.com/fileuri',
            presign_ttl=3600,
        )
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

        # This is a long fileuri that will be hashed
        # The total length of the fileuri can not be more than 1024 characters
        # The length of the fileuri below is 1024 characters including the extension
        longest_allowable_cloud_storage_path = 'is/a/long/path/that/needs/to/be/1024/characters/long/so/that/it/gets/hashedis/a/long/path/that/needs/to/be/1024/characters/long/so/that/it/gets/hashedis/a/long/path/that/needs/to/be/1024/characters/long/so/that/it/gets/hashedis/a/long/path/that/needs/to/be/1024/characters/long/so/that/it/gets/hashedis/a/long/path/that/needs/to/be/1024/characters/long/so/that/it/gets/hashedis/a/long/path/that/needs/to/be/1024/characters/long/so/that/it/gets/hashedis/a/long/path/that/needs/to/be/1024/characters/long/so/that/it/gets/hashedis/a/long/path/that/needs/to/be/1024/characters/long/so/that/it/gets/hashedis/a/long/path/that/needs/to/be/1024/characters/long/so/that/it/gets/hashedis/a/long/path/that/needs/to/be/1024/characters/long/so/that/it/gets/hashedis/a/long/path/that/needs/to/be/1024/characters/long/so/that/it/gets/hashedis/a/long/path/that/needs/to/be/1024/characters/long/so/that/it/gets/hashedis/a/long/path/that/needs/to/be/1024/characters/long/so/that/it/gets/hashedis/long/path/that/needs/to/be/1024/characters.png'
        longest_uri = f'aaaaa-bbbb://{longest_allowable_cloud_storage_path}'

        base64_encoded_uri = base64.urlsafe_b64encode(longest_uri.encode()).decode()

        # Determining the absolute upper bounds which could be possible, and ensuring it resolves and is supported
        longest_allowable_url_length = (
            2000  # This is the maximum length of a url in most browsers, and is the absolute upper bound
        )
        largest_allowable_task_key = 9223372036854775807
        longest_presign_path = f'/tasks/{largest_allowable_task_key}/presign/?fileuri='
        scheme_length = len('https://')
        longest_presign_path_length = len(longest_presign_path)
        longest_allowable_fileuri_hash_length = len(base64_encoded_uri)
        remaining_url_origin_length = (
            longest_allowable_url_length
            - scheme_length
            + longest_presign_path_length
            + longest_allowable_fileuri_hash_length
        )

        # The user domain should be the shortest part of the url, but factoring lengthy subdomains with nested levels in staging and dev environments this is a safe allowance
        assert remaining_url_origin_length >= 512

        # Check this resolves correctly on the server
        request = APIRequestFactory().get(
            reverse('data_import:task-storage-data-presign', kwargs={'task_id': 1}) + f'?fileuri={base64_encoded_uri}'
        )

        request.user = user
        force_authenticate(request, user)

        response = view(request, task_id=1)

        # And that the response is correct
        assert response.status_code == status.HTTP_303_SEE_OTHER
        assert response.url == 'https://presigned-url.com/fileuri'


@pytest.mark.django_db
class TestProjectPresignStorageData:
    @pytest.fixture
    def view(self):
        view = ProjectPresignStorageData.as_view()
        view.authentication_classes = []
        view.permission_classes = []
        return view

    @pytest.fixture
    def project(self):
        project = Project(pk=1, title='testproject')
        project.resolve_storage_uri = MagicMock()
        project.has_permission = MagicMock()
        return project

    @pytest.fixture
    def user(self):
        user = User.objects.create_user(username='testuser', email='testuser@email.com', password='testpassword')
        return user

    def test_missing_parameters(self, view, user):
        request = APIRequestFactory().get(
            reverse('data_import:project-storage-data-presign', kwargs={'project_id': 1})
        )

        request.user = user
        force_authenticate(request, user)
        response = view(request)

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_project_not_found(self, view, user):
        request = APIRequestFactory().get(
            reverse('data_import:project-storage-data-presign', kwargs={'project_id': 2}) + '?fileuri=fileuri'
        )
        request.user = user
        force_authenticate(request, user)
        response = view(request, project_id=2)

        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_task_not_found(self, view, project, user, monkeypatch):
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

        request = APIRequestFactory().get(
            reverse('data_import:project-storage-data-presign', kwargs={'project_id': 1}) + '?fileuri=fileuri'
        )
        request.user = user
        force_authenticate(request, user)
        response = view(request, project_id=1)

        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_file_uri_not_hashed(self, view, project, user, monkeypatch):
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
            reverse('data_import:project-storage-data-presign', kwargs={'project_id': 1}) + '?fileuri=fileuri'
        )
        request.user = user
        force_authenticate(request, user)

        response = view(request, project_id=1)

        assert response.status_code == status.HTTP_303_SEE_OTHER
        assert response.url == 'https://presigned-url.com/fileuri'

    def test_successful_request(self, view, project, user, monkeypatch):
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
            reverse('data_import:project-storage-data-presign', kwargs={'project_id': 1})
            + '?fileuri=czM6Ly9oeXBlcnRleHQtYnVja2V0L2ZpbGUgd2l0aCAvc3BhY2VzIGFuZCcgLyAnIC8gcXVvdGVzLmpwZw=='
        )
        request.user = user
        force_authenticate(request, user)

        response = view(request, project_id=1)

        assert response.status_code == status.HTTP_303_SEE_OTHER
        assert response.url == 'https://presigned-url.com/fileuri'

    def test_successful_request_with_long_fileuri(self, view, project, user, monkeypatch):
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

        # This is a long fileuri that will be hashed
        # The total length of the fileuri can not be more than 1024 characters
        # The length of the fileuri below is 1024 characters including the extension
        longest_allowable_cloud_storage_path = 'is/a/long/path/that/needs/to/be/1024/characters/long/so/that/it/gets/hashedis/a/long/path/that/needs/to/be/1024/characters/long/so/that/it/gets/hashedis/a/long/path/that/needs/to/be/1024/characters/long/so/that/it/gets/hashedis/a/long/path/that/needs/to/be/1024/characters/long/so/that/it/gets/hashedis/a/long/path/that/needs/to/be/1024/characters/long/so/that/it/gets/hashedis/a/long/path/that/needs/to/be/1024/characters/long/so/that/it/gets/hashedis/a/long/path/that/needs/to/be/1024/characters/long/so/that/it/gets/hashedis/a/long/path/that/needs/to/be/1024/characters/long/so/that/it/gets/hashedis/a/long/path/that/needs/to/be/1024/characters/long/so/that/it/gets/hashedis/a/long/path/that/needs/to/be/1024/characters/long/so/that/it/gets/hashedis/a/long/path/that/needs/to/be/1024/characters/long/so/that/it/gets/hashedis/a/long/path/that/needs/to/be/1024/characters/long/so/that/it/gets/hashedis/a/long/path/that/needs/to/be/1024/characters/long/so/that/it/gets/hashedis/long/path/that/needs/to/be/1024/characters.png'
        longest_uri = f'aaaaa-bbbb://{longest_allowable_cloud_storage_path}'

        base64_encoded_uri = base64.urlsafe_b64encode(longest_uri.encode()).decode()

        # Determining the absolute upper bounds which could be possible, and ensuring it resolves and is supported
        longest_allowable_url_length = (
            2000  # This is the maximum length of a url in most browsers, and is the absolute upper bound
        )
        largest_allowable_project_key = 9223372036854775807
        longest_presign_path = f'/projects/{largest_allowable_project_key}/presign/?fileuri='
        scheme_length = len('https://')
        longest_presign_path_length = len(longest_presign_path)
        longest_allowable_fileuri_hash_length = len(base64_encoded_uri)
        remaining_url_origin_length = (
            longest_allowable_url_length
            - scheme_length
            + longest_presign_path_length
            + longest_allowable_fileuri_hash_length
        )

        # The user domain should be the shortest part of the url, but factoring lengthy subdomains with nested levels in staging and dev environments this is a safe allowance
        assert remaining_url_origin_length >= 512

        # Check this resolves correctly on the server
        request = APIRequestFactory().get(
            reverse('data_import:project-storage-data-presign', kwargs={'project_id': 1})
            + f'?fileuri={base64_encoded_uri}'
        )

        request.user = user
        force_authenticate(request, user)

        response = view(request, project_id=1)

        # And that the response is correct
        assert response.status_code == status.HTTP_303_SEE_OTHER
        assert response.url == 'https://presigned-url.com/fileuri'
