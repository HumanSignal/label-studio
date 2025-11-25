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
    url = reverse('localfiles_data') + f'?d={relative_path}'

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
    url = reverse('localfiles_data') + f'?d={relative_path}'

    response = business_client.get(url)

    assert response.status_code == 200



