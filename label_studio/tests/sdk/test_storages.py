import pytest

from label_studio.tests.sdk.common import LABEL_CONFIG_AND_TASKS

pytestmark = pytest.mark.django_db
from label_studio_sdk.client import LabelStudio


@pytest.mark.parametrize('recursive_scan', [True, False])
def test_connect_and_sync_s3(django_live_url, business_client, recursive_scan):
    """Test S3 storage connection and sync with recursive scan parameter.

    This test validates step by step:
    - Creating a project with labeling configuration
    - Setting up S3 import storage with recursive_scan parameter
    - Verifying storage configuration and updates
    - Triggering sync operation
    - Validating task creation based on recursive_scan setting

    Critical validation: When recursive_scan=False, only files in the root
    directory should be imported (image1.jpg), while recursive_scan=True
    imports all files including subdirectories.
    """
    ls = LabelStudio(base_url=django_live_url, api_key=business_client.api_key)
    p = ls.projects.create(title='New Project', label_config=LABEL_CONFIG_AND_TASKS['label_config'])

    storage_resp = ls.import_storage.s3.create(
        project=p.id, bucket='pytest-s3-images', regex_filter='.*', use_blob_urls=False, recursive_scan=recursive_scan
    )

    storage_id = storage_resp.id

    storage = ls.import_storage.s3.get(id=storage_id)
    assert storage.project == p.id
    assert storage.bucket == 'pytest-s3-images'
    assert storage.use_blob_urls is False
    assert storage.recursive_scan == recursive_scan

    ls.import_storage.s3.update(id=storage_id, use_blob_urls=True)
    storage = ls.import_storage.s3.get(id=storage_id)
    assert storage.use_blob_urls is True

    resp = ls.import_storage.s3.sync(id=storage_id)
    assert resp.status in ('initialized', 'queued', 'completed')

    tasks = []
    for task in ls.tasks.list(project=p.id):
        tasks.append(task)

    # Expected results based on recursive_scan parameter
    if recursive_scan:
        # Recursive scan should find all files including subdirectories
        expected_files = {
            'subdir/another/image2.jpg',
            'subdir/image1.jpg',
            'subdir/image2.jpg',
            'image1.jpg',
        }
    else:
        # Non-recursive scan should only find files in root directory
        expected_files = {'image1.jpg'}

    assert {t.storage_filename for t in tasks} == expected_files
