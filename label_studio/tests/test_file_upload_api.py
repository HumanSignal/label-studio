import pytest
from data_import.models import FileUpload
from django.core.files.base import ContentFile
from organizations.tests.factories import OrganizationFactory
from projects.tests.factories import ProjectFactory
from rest_framework.test import APIClient


def _upload(organization):
    project = ProjectFactory(organization=organization, created_by=organization.created_by)
    upload = FileUpload(user=organization.created_by, project=project)
    upload.file.save('file.txt', ContentFile(b'data'), save=True)
    return upload


@pytest.mark.django_db
def test_file_upload_detail_is_available_to_project_organization():
    organization = OrganizationFactory()
    upload = _upload(organization)
    client = APIClient()
    client.force_authenticate(organization.created_by)

    assert client.get(f'/api/import/file-upload/{upload.id}').status_code == 200
    assert client.delete(f'/api/import/file-upload/{upload.id}').status_code == 204
    assert not FileUpload.objects.filter(id=upload.id).exists()
