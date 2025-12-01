"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for
copyright information and LICENSE for a copy of the license.
"""

import os
from pathlib import Path

import pytest
from django.urls import reverse
from io_storages.localfiles.models import LocalFilesImportStorage
from projects.models import Project


def _create_storage(project, path):
    return LocalFilesImportStorage.objects.create(
        project=project,
        path=path,
        use_blob_urls=True,
    )


def _create_dataset_file(settings, tmp_path, filename, content):
    dataset_dir = tmp_path / 'test_upload_data'
    dataset_dir.mkdir(exist_ok=True)
    test_file = dataset_dir / filename
    test_file.write_text(content, encoding='utf-8')
    relative_path = test_file.relative_to(Path(settings.LOCAL_FILES_DOCUMENT_ROOT)).as_posix()
    return dataset_dir, relative_path, content.encode('utf-8')


@pytest.mark.django_db
def test_localfiles_data_allows_trailing_slash_in_storage_path(
    business_client,
    project_id,
    settings,
    tmp_path,
):
    """Ensure /data/local-files/ works when LocalFilesImportStorage.path has a trailing slash.

    This test validates step by step:
    - Creating a temporary LOCAL_FILES_DOCUMENT_ROOT with a nested dataset directory
    - Saving LocalFilesImportStorage.path with a trailing slash pointing to that dataset
    - Requesting a file from /data/local-files/?d= using a path relative to the document root
    - Verifying that the endpoint returns 200 instead of 404 and serves the file correctly

    Critical validation: users should be able to configure "Absolute local path" with or without a trailing
    slash in Local Storage settings without breaking media loading in the labeling UI.
    """
    # Setup: enable local files and point document root to a temporary directory
    settings.LOCAL_FILES_SERVING_ENABLED = True
    settings.LOCAL_FILES_DOCUMENT_ROOT = str(tmp_path)

    project = Project.objects.get(pk=project_id)

    dataset_dir = tmp_path / 'test_upload_data'
    dataset_dir.mkdir()
    test_file = dataset_dir / 'test_image.txt'
    test_file.write_text('content', encoding='utf-8')

    # Store path with a trailing slash to mirror common user configuration
    storage_path_with_slash = str(dataset_dir) + os.sep
    _create_storage(project, storage_path_with_slash)

    relative_path = test_file.relative_to(Path(settings.LOCAL_FILES_DOCUMENT_ROOT)).as_posix()
    url = reverse('storages:localfiles_data') + f'?d={relative_path}'

    response = business_client.get(url)

    assert response.status_code == 200


@pytest.mark.django_db
def test_localfiles_data_allows_backslash_paths(
    business_client,
    project_id,
    settings,
    tmp_path,
):
    """Ensure storages saved with Windows-style separators keep working."""
    settings.LOCAL_FILES_SERVING_ENABLED = True
    settings.LOCAL_FILES_DOCUMENT_ROOT = str(tmp_path)

    project = Project.objects.get(pk=project_id)

    dataset_dir = tmp_path / 'test_upload_data'
    dataset_dir.mkdir()
    test_file = dataset_dir / 'test_image.txt'
    test_file.write_text('content', encoding='utf-8')

    windows_style_path = str(dataset_dir).replace('/', '\\') + '\\'
    _create_storage(project, windows_style_path)

    relative_path = test_file.relative_to(Path(settings.LOCAL_FILES_DOCUMENT_ROOT)).as_posix()
    url = reverse('storages:localfiles_data') + f'?d={relative_path}'

    response = business_client.get(url)

    assert response.status_code == 200


@pytest.mark.django_db
def test_localfiles_data_sets_weak_etag_header(
    business_client,
    project_id,
    settings,
    tmp_path,
):
    """Verify first download emits weak ETag along with file payload.

    This test validates step by step:
    - Enabling local file serving and writing a sample file under the doc root
    - Linking the project to that directory via LocalFilesImportStorage
    - Requesting the file through /data/local-files and capturing the response
    - Confirming a 200 status, the presence of a weak ETag header, and that the streamed bytes match disk

    Critical validation: clients must receive a deterministic weak ETag so they
    can re-use cached media without hitting the server again.
    """
    settings.LOCAL_FILES_SERVING_ENABLED = True
    settings.LOCAL_FILES_DOCUMENT_ROOT = str(tmp_path)

    project = Project.objects.get(pk=project_id)
    dataset_dir, relative_path, expected_bytes = _create_dataset_file(
        settings=settings,
        tmp_path=tmp_path,
        filename='etag.txt',
        content='etag-content',
    )
    _create_storage(project, str(dataset_dir))

    url = reverse('storages:localfiles_data') + f'?d={relative_path}'
    response = business_client.get(url)

    body = b''.join(response.streaming_content)
    assert response.status_code == 200
    assert response.has_header('ETag')
    assert response['ETag'].startswith('W/"')
    assert body == expected_bytes


@pytest.mark.django_db
def test_localfiles_data_returns_not_modified_for_matching_etag(
    business_client,
    project_id,
    settings,
    tmp_path,
):
    """Ensure cached clients receive 304 when sending a matching If-None-Match.

    This test validates step by step:
    - Serving a file once to obtain the server-generated weak ETag
    - Issuing a follow-up request that includes the same ETag in If-None-Match
    - Verifying the server returns 304 Not Modified with the original ETag header

    Critical validation: prevents redundant file reads and bandwidth usage when
    assets remain unchanged.
    """
    settings.LOCAL_FILES_SERVING_ENABLED = True
    settings.LOCAL_FILES_DOCUMENT_ROOT = str(tmp_path)

    project = Project.objects.get(pk=project_id)
    dataset_dir, relative_path, _ = _create_dataset_file(
        settings=settings,
        tmp_path=tmp_path,
        filename='etag-304.txt',
        content='etag-304-content',
    )
    _create_storage(project, str(dataset_dir))

    url = reverse('storages:localfiles_data') + f'?d={relative_path}'
    first_response = business_client.get(url)
    etag = first_response['ETag']

    cached_response = business_client.get(url, HTTP_IF_NONE_MATCH=etag)

    assert cached_response.status_code == 304
    assert cached_response['ETag'] == etag
