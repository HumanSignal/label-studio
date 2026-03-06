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


def test_list_projects_with_params(django_live_url, business_client):
    ls = LabelStudio(base_url=django_live_url, api_key=business_client.api_key)
    ls.projects.create(title='Project 1', label_config=LABEL_CONFIG_AND_TASKS['label_config'])
    ls.projects.create(title='Project 2', label_config=LABEL_CONFIG_AND_TASKS['label_config'])

    projects = list(ls.projects.list())
    assert len(projects) == 2
    assert projects[0].title == 'Project 2'
    assert projects[1].title == 'Project 1'

    projects = list(ls.projects.list(filter='pinned_only'))
    assert not projects

    projects = list(ls.projects.list(include='id,title,pinned_at,created_at,created_by'))
    assert projects[0].pinned_at is None
    assert projects[0].created_at is not None
    assert projects[0].created_by.email == business_client.user.email
