import pytest

from label_studio.tests.sdk.common import LABEL_CONFIG_AND_TASKS

pytestmark = pytest.mark.django_db
from label_studio_sdk import Client


def test_connect_and_sync_s3(django_live_url, business_client):
    ls = Client(url=django_live_url, api_key=business_client.api_key)
    p = ls.start_project(title='New Project', label_config=LABEL_CONFIG_AND_TASKS['label_config'])

    project = ls.get_project(p.id)
    storage_resp = project.connect_s3_import_storage('pytest-s3-images')

    storage_id = storage_resp['id']
    ls.sync_storage('s3', storage_id)

    assert set(t['storage_filename'] for t in p.get_tasks()) == {
        'subdir/another/image2.jpg',
        'subdir/image1.jpg',
        'subdir/image2.jpg',
        'image1.jpg',
    }
