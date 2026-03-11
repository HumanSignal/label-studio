import base64

import pytest
from io_storages.azure_blob.models import AzureBlobImportStorage
from io_storages.gcs.models import GCSImportStorage
from io_storages.s3.models import S3ImportStorage
from projects.models import Project
from tasks.models import Task


@pytest.mark.django_db
def test_resolve_multiple_uris_in_task_data(mocker):
    # Need to mock reverse since it builds the internal url
    mocker.patch('io_storages.base_models.reverse', return_value='/api/storages/proxy')

    project = Project.objects.create(title='Test Project')

    S3ImportStorage.objects.create(project=project, bucket='s3-bucket')
    GCSImportStorage.objects.create(project=project, bucket='gcs-bucket')

    # Test 1: Multiple URIs of the SAME scheme
    task1 = Task.objects.create(
        project=project, data={'html': "<img src='s3://s3-bucket/1.jpg'> <img src='s3://s3-bucket/2.jpg'>"}
    )
    resolved_data1 = task1.resolve_uri(task1.data, project)

    html1 = resolved_data1['html']
    assert 's3://s3-bucket' not in html1
    assert html1.count('/api/storages/proxy') == 2

    uri_encoded_1 = base64.urlsafe_b64encode(b's3://s3-bucket/1.jpg').decode()
    uri_encoded_2 = base64.urlsafe_b64encode(b's3://s3-bucket/2.jpg').decode()
    assert uri_encoded_1 in html1
    assert uri_encoded_2 in html1

    # Test 2: Multiple URIs of DIFFERENT schemes
    task2 = Task.objects.create(
        project=project, data={'html': "<img src='s3://s3-bucket/3.jpg'> <img src='gs://gcs-bucket/4.jpg'>"}
    )
    resolved_data2 = task2.resolve_uri(task2.data, project)

    html2 = resolved_data2['html']
    assert 's3://s3-bucket' not in html2
    assert 'gs://gcs-bucket' not in html2
    assert html2.count('/api/storages/proxy') == 2

    # Test 3: Multiple URIs including Azure
    AzureBlobImportStorage.objects.create(project=project, container='azure-container')

    # Clear the cached property on the project so it picks up the new storage
    if 'get_all_import_storage_objects' in project.__dict__:
        del project.__dict__['get_all_import_storage_objects']

    task3 = Task.objects.create(
        project=project,
        data={'html': "<img src='s3://s3-bucket/5.jpg'> <img src='azure-blob://azure-container/6.jpg'>"},
    )
    resolved_data3 = task3.resolve_uri(task3.data, project)

    html3 = resolved_data3['html']
    assert 's3://s3-bucket' not in html3
    assert 'azure-blob://azure-container' not in html3
    assert html3.count('/api/storages/proxy') == 2
