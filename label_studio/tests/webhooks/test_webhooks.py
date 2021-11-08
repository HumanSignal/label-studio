from unittest import TestCase

import pytest
import json
import requests_mock
import requests
from django.urls import reverse
from organizations.models import Organization
from projects.models import Project
from io import BytesIO
from django.core.files.uploadedfile import SimpleUploadedFile

from webhooks.models import Webhook, WebhookAction
from webhooks.utils import emit_webhooks, emit_webhooks_for_instance, run_webhook


@pytest.fixture
def organization_webhook(configured_project):
    organization = configured_project.organization
    uri = 'http://127.0.0.1:8000/api/organization/'
    return Webhook.objects.create(
        organization=organization,
        project=None,
        url=uri,
    )


@pytest.fixture
def project_webhook(configured_project):
    organization = configured_project.organization
    uri = 'http://127.0.0.1:8000/api/project/'
    return Webhook.objects.create(
        organization=organization,
        project=configured_project,
        url=uri,
    )


@pytest.mark.django_db
def test_run_webhook(setup_project_dialog, organization_webhook):
    webhook = organization_webhook
    with requests_mock.Mocker(real_http=True) as m:
        m.register_uri('POST', webhook.url)
        run_webhook(organization_webhook, WebhookAction.PROJECT_CREATED, {'data': 'test'})

    request_history = m.request_history
    assert len(request_history) == 1
    assert request_history[0].method == 'POST'
    assert request_history[0].url == organization_webhook.url
    TestCase().assertDictEqual(request_history[0].json(), {'action': WebhookAction.PROJECT_CREATED, 'data': 'test'})


@pytest.mark.django_db
def test_emit_webhooks(setup_project_dialog, organization_webhook):
    webhook = organization_webhook
    with requests_mock.Mocker(real_http=True) as m:
        m.register_uri('POST', webhook.url)
        emit_webhooks(webhook.organization, webhook.project, WebhookAction.PROJECT_CREATED, {'data': 'test'})

    request_history = m.request_history
    assert len(request_history) == 1
    assert request_history[0].method == 'POST'
    assert request_history[0].url == webhook.url
    TestCase().assertDictEqual(request_history[0].json(), {'action': WebhookAction.PROJECT_CREATED, 'data': 'test'})


@pytest.mark.django_db
def test_emit_webhooks_for_instance(setup_project_dialog, organization_webhook):
    webhook = organization_webhook
    project_title = f'Projects 1'
    project = Project.objects.create(title=project_title)
    with requests_mock.Mocker(real_http=True) as m:
        m.register_uri('POST', webhook.url)
        emit_webhooks_for_instance(
            webhook.organization, webhook.project, WebhookAction.PROJECT_CREATED, instance=project
        )
    assert len(m.request_history) == 1
    assert m.request_history[0].method == 'POST'
    data = m.request_history[0].json()
    assert 'action' in data
    assert 'project' in data
    assert project_title == data['project']['title']


@pytest.mark.django_db
def test_exception_catch(organization_webhook):
    webhook = organization_webhook
    with requests_mock.Mocker(real_http=True) as m:
        m.register_uri('POST', webhook.url, exc=requests.exceptions.ConnectTimeout)
        result = run_webhook(webhook, WebhookAction.PROJECT_CREATED)
    assert result is None


# PROJECT CREATE/UPDATE/DELETE API
@pytest.mark.django_db
def test_webhooks_for_projects(configured_project, business_client, organization_webhook):
    webhook = organization_webhook

    # create/update/delete project through API
    # PROJECT_CREATED
    with requests_mock.Mocker(real_http=True) as m:
        m.register_uri('POST', webhook.url)
        response = business_client.post(reverse('projects:api:project-list'))

    assert response.status_code == 201
    assert len(list(filter(lambda x: x.url == webhook.url, m.request_history))) == 1

    r = list(filter(lambda x: x.url == webhook.url, m.request_history))[0]
    assert r.json()['action'] == WebhookAction.PROJECT_CREATED

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
    assert len(list(filter(lambda x: x.url == webhook.url, m.request_history))) == 1

    r = list(filter(lambda x: x.url == webhook.url, m.request_history))[0]
    assert r.json()['action'] == WebhookAction.PROJECT_UPDATED
    assert r.json()['project']['title'] == 'Test title'

    # PROJECT_DELETED
    with requests_mock.Mocker(real_http=True) as m:
        m.register_uri('POST', webhook.url)
        response = business_client.delete(
            reverse('projects:api:project-detail', kwargs={'pk': project_id}),
        )
    assert response.status_code == 204
    assert len(list(filter(lambda x: x.url == organization_webhook.url, m.request_history))) == 1

    r = list(filter(lambda x: x.url == organization_webhook.url, m.request_history))[0]
    assert r.json()['action'] == WebhookAction.PROJECT_DELETED
    assert r.json()['project']['id'] == project_id


# TASK CREATE/DELETE API
# WE DON'T SUPPORT UPDATE FOR TASK
@pytest.mark.django_db
def test_webhooks_for_tasks(configured_project, business_client, organization_webhook):
    webhook = organization_webhook
    # CREATE
    with requests_mock.Mocker(real_http=True) as m:
        m.register_uri('POST', webhook.url)
        response = business_client.post(
            reverse('tasks:api:task-list'),
            data=json.dumps(
                {
                    'project': configured_project.id,
                    'data': {'meta_info': 'meta info A', 'text': 'text A'},
                }
            ),
            content_type="application/json",
        )
    assert response.status_code == 201
    assert len(list(filter(lambda x: x.url == webhook.url, m.request_history))) == 1

    r = list(filter(lambda x: x.url == webhook.url, m.request_history))[0]
    assert r.json()['action'] == WebhookAction.TASKS_CREATED
    assert 'tasks' in r.json()
    assert 'project' in r.json()

    # DELETE
    task_id = response.json()['id']
    url = webhook.url
    with requests_mock.Mocker(real_http=True) as m:
        m.register_uri('POST', url)
        response = business_client.delete(reverse('tasks:api:task-detail', kwargs={'pk': task_id}))

    assert response.status_code == 204
    assert len(list(filter(lambda x: x.url == webhook.url, m.request_history))) == 1

    r = list(filter(lambda x: x.url == webhook.url, m.request_history))[0]
    assert r.json()['action'] == WebhookAction.TASKS_DELETED
    assert 'tasks' in r.json()
    assert 'project' in r.json()


# TASK CREATE on IMPORT
@pytest.mark.django_db
def test_webhooks_for_tasks_import(configured_project, business_client, organization_webhook):
    from django.core.files.uploadedfile import SimpleUploadedFile

    webhook = organization_webhook

    IMPORT_CSV = "tests/test_suites/samples/test_5.csv"

    with open(IMPORT_CSV, 'rb') as file_:
        data = SimpleUploadedFile('test_5.csv', file_.read(), content_type='multipart/form-data')
    with requests_mock.Mocker(real_http=True) as m:
        m.register_uri('POST', webhook.url)
        response = business_client.post(
            f'/api/projects/{configured_project.id}/import',
            data={'csv_1': data},
            format="multipart",
        )
    assert response.status_code == 201
    assert response.json()['task_count'] == 3

    assert len(list(filter(lambda x: x.url == webhook.url, m.request_history))) == 1

    r = list(filter(lambda x: x.url == webhook.url, m.request_history))[0]
    assert r.json()['action'] == WebhookAction.TASKS_CREATED
    assert 'tasks' in r.json()
    assert 'project' in r.json()
    assert len(r.json()['tasks']) == response.json()['task_count'] == 3


# ANNOTATION CREATE/UPDATE/DELETE
@pytest.mark.django_db
def test_webhooks_for_annotation(configured_project, business_client, organization_webhook):

    webhook = organization_webhook
    task = configured_project.tasks.all().first()
    # CREATE
    with requests_mock.Mocker(real_http=True) as m:
        m.register_uri('POST', webhook.url)
        response = business_client.post(
            f'/api/tasks/{task.id}/annotations?project={configured_project.id}',
            data=json.dumps(
                {
                    "result": [
                        {
                            "value": {"choices": ["class_A"]},
                            "id": "nJS76J03pi",
                            "from_name": "text_class",
                            "to_name": "text",
                            "type": "choices",
                            "origin": "manual",
                        }
                    ],
                    "draft_id": 0,
                    "parent_prediction": None,
                    "parent_annotation": None,
                    "project": configured_project.id,
                }
            ),
            content_type="application/json",
        )

    assert response.status_code == 201
    assert len(list(filter(lambda x: x.url == webhook.url, m.request_history))) == 1

    r = list(filter(lambda x: x.url == webhook.url, m.request_history))[0]
    assert r.json()['action'] == WebhookAction.ANNOTATION_CREATED
    annotation_id = response.json()['id']

    # UPDATE POST
    with requests_mock.Mocker(real_http=True) as m:
        m.register_uri('POST', webhook.url)
        response = business_client.put(
            f'/api/annotations/{annotation_id}?project={configured_project.id}&taskId={task.id}',
            data=json.dumps(
                {
                    "result": [],
                }
            ),
            content_type="application/json",
        )
        assert response.status_code == 200

        response = business_client.patch(
            f'/api/annotations/{annotation_id}?project={configured_project.id}&taskId={task.id}',
            data=json.dumps(
                {
                    "result": [
                        {
                            "value": {"choices": ["class_B"]},
                            "id": "nJS76J03pi",
                            "from_name": "text_class",
                            "to_name": "text",
                            "type": "choices",
                            "origin": "manual",
                        }
                    ],
                }
            ),
            content_type="application/json",
        )
        assert response.status_code == 200

    assert len(list(filter(lambda x: x.url == webhook.url, m.request_history))) == 2

    for r in list(filter(lambda x: x.url == webhook.url, m.request_history)):
        assert r.json()['action'] == WebhookAction.ANNOTATION_UPDATED

        assert 'task' in r.json()
        assert 'annotation' in r.json()
        assert 'project' in r.json()

    # DELETE
    with requests_mock.Mocker(real_http=True) as m:
        m.register_uri('POST', webhook.url)
        response = business_client.delete(
            f'/api/annotations/{annotation_id}',
            content_type="application/json",
        )
    assert response.status_code == 204
    assert len(list(filter(lambda x: x.url == webhook.url, m.request_history))) == 1

    r = list(filter(lambda x: x.url == webhook.url, m.request_history))[0]
    assert r.json()['action'] == WebhookAction.ANNOTATIONS_DELETED
    assert 'annotations' in r.json()
    assert annotation_id == r.json()['annotations'][0]['id']


# ACTION: DELETE ANNOTATIONS
@pytest.mark.django_db
def test_webhooks_for_action_delete_tasks_annotations(configured_project, business_client, organization_webhook):
    webhook = organization_webhook

    # create annotations for tasks
    for task in configured_project.tasks.all():
        response = business_client.post(
            f'/api/tasks/{task.id}/annotations?project={configured_project.id}',
            data=json.dumps({"result": [{"value": {"choices": ["class_B"]}}]}),
            content_type="application/json",
        )
        assert response.status_code == 201

    with requests_mock.Mocker(real_http=True) as m:
        m.register_uri('POST', webhook.url)
        response = business_client.post(
            f'/api/dm/actions?id=delete_tasks_annotations&project={configured_project.id}',
            data=json.dumps(
                {
                    "project": str(configured_project.id),
                    "selectedItems": {"all": True},
                }
            ),
            content_type="application/json",
        )

    assert response.status_code == 200
    assert len(list(filter(lambda x: x.url == webhook.url, m.request_history))) == 1

    r = list(filter(lambda x: x.url == webhook.url, m.request_history))[0]
    assert r.json()['action'] == WebhookAction.ANNOTATIONS_DELETED


# ACTION: DELETE TASKS
@pytest.mark.django_db
def test_webhooks_for_action_delete_tasks_annotations(configured_project, business_client, organization_webhook):
    webhook = organization_webhook
    with requests_mock.Mocker(real_http=True) as m:
        m.register_uri('POST', webhook.url)
        response = business_client.post(
            f'/api/dm/actions?id=delete_tasks&project={configured_project.id}',
            data=json.dumps(
                {
                    "project": str(configured_project.id),
                    "selectedItems": {"all": True},
                }
            ),
            content_type="application/json",
        )
    assert response.status_code == 200
    assert len(list(filter(lambda x: x.url == webhook.url, m.request_history))) == 1

    r = list(filter(lambda x: x.url == webhook.url, m.request_history))[0]
    assert r.json()['action'] == WebhookAction.TASKS_DELETED
