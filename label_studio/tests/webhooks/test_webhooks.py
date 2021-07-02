from unittest import TestCase

import pytest
import json
import requests_mock
import requests
from django.urls import reverse
from organizations.models import Organization
from projects.models import Project

from webhooks.models import Webhook, WebhookAction
from webhooks.utils import emit_webhooks, emit_webhooks_for_instanses, run_webhook


@pytest.fixture
def webhook(configured_project):
    organization = configured_project.organization
    uri = 'http://127.0.0.1:8000/api/webhook/'
    return Webhook.objects.create(
        organization=organization,
        url=uri,
    )


@pytest.mark.django_db
def test_run_webhook(setup_project_dialog, webhook):
    with requests_mock.Mocker(real_http=True) as m:
        m.register_uri('POST', webhook.url)
        run_webhook(webhook, WebhookAction.PROJECT_CREATED, {'data': 'test'})

    request_history = m.request_history
    assert len(request_history) == 1
    assert request_history[0].method == 'POST'
    assert request_history[0].url == webhook.url
    TestCase().assertDictEqual(
        request_history[0].json(),
        {
            'action': WebhookAction.PROJECT_CREATED,
            'data': 'test'
        }
    )

@pytest.mark.django_db
def test_emit_webhooks(setup_project_dialog, webhook):
    with requests_mock.Mocker(real_http=True) as m:
        m.register_uri('POST', webhook.url)
        emit_webhooks(webhook.organization, WebhookAction.PROJECT_CREATED, {'data': 'test'})

    request_history = m.request_history
    assert len(request_history) == 1
    assert request_history[0].method == 'POST'
    assert request_history[0].url == webhook.url
    TestCase().assertDictEqual(
        request_history[0].json(),
        {
            'action': WebhookAction.PROJECT_CREATED,
            'data': 'test'
        }
    )


@pytest.mark.django_db
def test_emit_webhooks_for_instanses(setup_project_dialog, webhook):
    project_titles = [f'Projects {i}' for i in range(1, 10)]
    projects = [
        Project.objects.create(title=title)
        for title in project_titles
    ]
    with requests_mock.Mocker(real_http=True) as m:
        m.register_uri('POST', webhook.url)
        emit_webhooks_for_instanses(webhook.organization, WebhookAction.PROJECT_CREATED, instanses=projects)
    assert len(m.request_history) == 1
    assert m.request_history[0].method == 'POST'
    data = m.request_history[0].json()
    assert 'action' in data
    assert 'projects' in data
    assert set(project_titles) == set([project['title'] for project in data['projects']])


@pytest.mark.django_db
def test_exception_catch(webhook):
    with requests_mock.Mocker(real_http=True) as m:
        m.register_uri('POST', webhook.url, exc=requests.exceptions.ConnectTimeout)
        result = run_webhook(webhook, WebhookAction.PROJECT_CREATED)
    assert result is None


# PROJECT
@pytest.mark.django_db
def test_webhooks_for_projects(configured_project, business_client, webhook):
    # create/update/delete project thrught API
    # PROJECT_CREATED
    with requests_mock.Mocker(real_http=True) as m:
        m.register_uri('POST', webhook.url)
        response = business_client.post(reverse('projects:api:project-list'))

    assert response.status_code == 201
    assert len(m.request_history) == 1
    assert m.request_history[0].json()['action'] == WebhookAction.PROJECT_CREATED

    project_id = response.json()['id']
    # PROJECT_UPDATED
    with requests_mock.Mocker(real_http=True) as m:
        m.register_uri('POST', webhook.url)
        response = business_client.patch(
            reverse('projects:api:project-detail', kwargs={'pk': project_id}),
            data=json.dumps({'title': 'Test title'}),
            content_type="application/json",
        )

    assert response.status_code == 200
    assert len(m.request_history) == 1
    assert m.request_history[0].json()['action'] == WebhookAction.PROJECT_UPDATED
    assert m.request_history[0].json()['projects'][0]['title'] == 'Test title'

    # PROJECT_DELETED
    with requests_mock.Mocker(real_http=True) as m:
        m.register_uri('POST', webhook.url)
        response = business_client.delete(
            reverse('projects:api:project-detail', kwargs={'pk': project_id}),
        )
    assert response.status_code == 204
    assert len(m.request_history) == 1
    assert m.request_history[0].json()['action'] == WebhookAction.PROJECT_DELETED
    assert m.request_history[0].json()['projects'][0]['id'] == project_id


@pytest.mark.django_db
def test_webhooks_for_tasks(configured_project, business_client, webhook):
    # create/update/delete
    # CREATE
    with requests_mock.Mocker(real_http=True) as m:
        m.register_uri('POST', webhook.url)
        response = business_client.post(
            reverse('tasks:api:task-list'),
            data=json.dumps(
                {'project': configured_project.id,
                 'data': {'meta_info': 'meta info A', 'text': 'text A'}, }
            ),
            content_type="application/json",)
    assert response.status_code == 201
    assert len(m.request_history) == 1
    assert m.request_history[0].json()['action'] == WebhookAction.TASK_CREATED

    # UPDATE WITHOUT PAYLOAD
    task_id = response.json()['id']
    webhook.send_payload = False
    webhook.save()
    with requests_mock.Mocker(real_http=True) as m:
        m.register_uri('POST', webhook.url)
        response = business_client.put(reverse('tasks:api:task-detail', kwargs={'pk': task_id}),
                                       data=json.dumps({'data': {'meta_info': 'meta info B', 'text': 'text B'}},),
                                       content_type="application/json",)

    assert response.status_code == 200
    assert len(m.request_history) == 1
    assert m.request_history[0].json()['action'] == WebhookAction.TASK_UPDATED
    assert 'tasks' not in m.request_history[0].json()

    # DELETE WITHOUT WEBHOOK
    url = webhook.url
    webhook.delete()
    with requests_mock.Mocker(real_http=True) as m:
        m.register_uri('POST', url)
        response = business_client.delete(reverse('tasks:api:task-detail', kwargs={'pk': task_id}))

    assert response.status_code == 204
    assert len(m.request_history) == 0


# TODO
# CRUD for annotations
# create through import
# delete through actions
