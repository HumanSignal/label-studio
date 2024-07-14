import pytest

from label_studio.tests.sdk.common import LABEL_CONFIG_AND_TASKS

pytestmark = pytest.mark.django_db
from label_studio_sdk.client import LabelStudio


def test_start_and_get_project(django_live_url, business_client):
    ls = LabelStudio(base_url=django_live_url, api_key=business_client.api_key)
    p = ls.projects.create(title='New Project', label_config=LABEL_CONFIG_AND_TASKS['label_config'])

    project = ls.projects.get(id=p.id)
    assert project
    assert project.title == 'New Project'

    ls.projects.update(id=project.id, title='Updated Project')
    project = ls.projects.get(id=p.id)
    assert project.title == 'Updated Project'


def test_delete_project(django_live_url, business_client):
    ls = LabelStudio(base_url=django_live_url, api_key=business_client.api_key)
    p = ls.projects.create(title='New Project', label_config=LABEL_CONFIG_AND_TASKS['label_config'])

    project = ls.projects.get(id=p.id)
    ls.projects.delete(id=project.id)

    any_project_found = False
    for project in ls.projects.list():
        any_project_found = True

    assert not any_project_found
