import pytest
from unittest.mock import patch
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIRequestFactory, force_authenticate
from unittest.mock import MagicMock
from data_import.api import PresignStorageData
from users.models import User
from tasks.models import Task
from projects.models import Project


@pytest.mark.django_db
class TestPresignStorageData:

    @pytest.fixture
    def view(self):
        view = PresignStorageData.as_view()
        view.authentication_classes = []
        view.permission_classes = []
        return view

    @pytest.fixture
    def project(self):
        project = Project(pk=1, title="testproject")
        project.has_permission = MagicMock()
        return project

    @pytest.fixture
    def task(self, project):
        task = Task(pk=1, data={}, project=project)
        task.resolve_storage_uri = MagicMock()
        return task

    @pytest.fixture
    def user(self):
        user = User.objects.create_user(
            username="testuser", email="testuser@email.com", password="testpassword")
        return user

    def test_missing_parameters(self, view, user):
        request = APIRequestFactory().get(
            reverse("data_import:storage-data-presign", kwargs={"task_id": 1}))

        request.user = user
        force_authenticate(request, user)
        response = view(request)

        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_task_not_found(self, view, user):
        request = APIRequestFactory().get(reverse("data_import:storage-data-presign",
                                                  kwargs={"task_id": 2}) + "?fileuri=fileuri")
        request.user = user
        force_authenticate(request, user)
        response = view(request, task_id=2)

        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_file_not_found(self, view, task, project, user, monkeypatch):
        task.resolve_storage_uri.return_value = None
        project.has_permission.return_value = True
        task.project = project

        def mock_task_get(*args, **kwargs):
            if kwargs['pk'] == 1:
                return task
            else:
                raise Task.DoesNotExist

        obj = MagicMock()
        obj.get = mock_task_get
        monkeypatch.setattr('tasks.models.Task.objects', obj)

        request = APIRequestFactory().get(reverse("data_import:storage-data-presign",
                                                  kwargs={"task_id": 1}) + "?fileuri=fileuri")
        request.user = user
        force_authenticate(request, user)
        response = view(request, task_id=1)

        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_successful_request(self, view, task, project, user, monkeypatch):
        task.resolve_storage_uri.return_value = "https://presigned-url.com/file"
        project.has_permission.return_value = True
        task.project = project

        def mock_task_get(*args, **kwargs):
            if kwargs['pk'] == 1:
                return task
            else:
                raise Task.DoesNotExist

        obj = MagicMock()
        obj.get = mock_task_get
        monkeypatch.setattr('tasks.models.Task.objects', obj)

        request = APIRequestFactory().get(reverse("data_import:storage-data-presign",
                                                  kwargs={"task_id": 1}) + "?fileuri=fileuri")
        request.user = user
        force_authenticate(request, user)

        response = view(request, task_id=1)

        assert response.status_code == status.HTTP_303_SEE_OTHER
        assert response.url == "https://presigned-url.com/file"
