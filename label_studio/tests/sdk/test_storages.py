import pytest

from label_studio.tests.sdk.common import LABEL_CONFIG_AND_TASKS

pytestmark = pytest.mark.django_db
from label_studio_sdk.client import LabelStudio


def test_connect_and_sync_s3(django_live_url, business_client):
    ls = LabelStudio(base_url=django_live_url, api_key=business_client.api_key)
    p = ls.projects.create(title='New Project', label_config=LABEL_CONFIG_AND_TASKS['label_config'])

    storage_resp = ls.import_storage.s3.create(
        project=p.id, bucket='pytest-s3-images', regex_filter='.*', use_blob_urls=False
    )

    storage_id = storage_resp.id

    storage = ls.import_storage.s3.get(id=storage_id)
    assert storage.project == p.id
    assert storage.bucket == 'pytest-s3-images'
    assert storage.use_blob_urls is False
    ls.import_storage.s3.update(id=storage_id, use_blob_urls=True)
    storage = ls.import_storage.s3.get(id=storage_id)
    assert storage.use_blob_urls is True

    resp = ls.import_storage.s3.sync(id=storage_id)
    assert resp.status in ('initialized', 'queued', 'completed')

    tasks = []
    for task in ls.tasks.list(project=p.id):
        tasks.append(task)

    assert set(t.storage_filename for t in tasks) == {
        'subdir/another/image2.jpg',
        'subdir/image1.jpg',
        'subdir/image2.jpg',
        'image1.jpg',
    }
