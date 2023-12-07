import pytest

from label_studio.tests.sdk.common import LABEL_CONFIG_AND_TASKS

pytestmark = pytest.mark.django_db
from label_studio_sdk import Client


def test_start_and_get_project(django_live_url, business_client):
    ls = Client(url=django_live_url, api_key=business_client.api_key)
    p = ls.start_project(title='New Project', label_config=LABEL_CONFIG_AND_TASKS['label_config'])

    project = ls.get_project(p.id)
    assert project
    assert project.title == 'New Project'


def test_delete_project(django_live_url, business_client):
    ls = Client(url=django_live_url, api_key=business_client.api_key)
    p = ls.start_project(title='New Project', label_config=LABEL_CONFIG_AND_TASKS['label_config'])

    project = ls.get_project(p.id)
    ls.delete_project(project.id)

    assert ls.list_projects() == []
