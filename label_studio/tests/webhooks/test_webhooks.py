import json
from unittest import TestCase

import pytest
import requests
import requests_mock
from django.urls import reverse
from projects.models import Project
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


@pytest.fixture
def ml_start_training_webhook(configured_project):
    organization = configured_project.organization
    uri = 'http://0.0.0.0:9090/webhook'
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
    project_title = 'Projects 1'
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
            content_type='application/json',
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
            content_type='application/json',
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

    IMPORT_CSV = 'tests/test_suites/samples/test_5.csv'

    with open(IMPORT_CSV, 'rb') as file_:
        data = SimpleUploadedFile('test_5.csv', file_.read(), content_type='multipart/form-data')
    with requests_mock.Mocker(real_http=True) as m:
        m.register_uri('POST', webhook.url)
        response = business_client.post(
            f'/api/projects/{configured_project.id}/import',
            data={'csv_1': data},
            format='multipart',
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
                    'result': [
                        {
                            'value': {'choices': ['class_A']},
                            'id': 'nJS76J03pi',
                            'from_name': 'text_class',
                            'to_name': 'text',
                            'type': 'choices',
                            'origin': 'manual',
                        }
                    ],
                    'draft_id': 0,
                    'parent_prediction': None,
                    'parent_annotation': None,
                    'project': configured_project.id,
                }
            ),
            content_type='application/json',
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
                    'result': [],
                }
            ),
            content_type='application/json',
        )
        assert response.status_code == 200

        response = business_client.patch(
            f'/api/annotations/{annotation_id}?project={configured_project.id}&taskId={task.id}',
            data=json.dumps(
                {
                    'result': [
                        {
                            'value': {'choices': ['class_B']},
                            'id': 'nJS76J03pi',
                            'from_name': 'text_class',
                            'to_name': 'text',
                            'type': 'choices',
                            'origin': 'manual',
                        }
                    ],
                }
            ),
            content_type='application/json',
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
            content_type='application/json',
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
            data=json.dumps({'result': [{'value': {'choices': ['class_B']}}]}),
            content_type='application/json',
        )
        assert response.status_code == 201

    with requests_mock.Mocker(real_http=True) as m:
        m.register_uri('POST', webhook.url)
        response = business_client.post(
            f'/api/dm/actions?id=delete_tasks_annotations&project={configured_project.id}',
            data=json.dumps(
                {
                    'project': str(configured_project.id),
                    'selectedItems': {'all': True},
                }
            ),
            content_type='application/json',
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
                    'project': str(configured_project.id),
                    'selectedItems': {'all': True},
                }
            ),
            content_type='application/json',
        )
    assert response.status_code == 200
    assert len(list(filter(lambda x: x.url == webhook.url, m.request_history))) == 1

    r = list(filter(lambda x: x.url == webhook.url, m.request_history))[0]
    assert r.json()['action'] == WebhookAction.TASKS_DELETED


# CREATE TASKS FROM STORAGES
@pytest.mark.django_db
def test_webhooks_for_tasks_from_storages(configured_project, business_client, organization_webhook):
    webhook = organization_webhook
    # CREATE
    with requests_mock.Mocker(real_http=True) as m:
        m.register_uri('POST', webhook.url)
        add_url = '/api/storages/s3'
        payload = {
            'bucket': 'pytest-s3-images',
            'project': configured_project.id,
            'title': 'Testing S3 storage (bucket from conftest.py)',
            'use_blob_urls': True,
            'presign_ttl': 3600,
        }
        add_response = business_client.post(add_url, data=json.dumps(payload), content_type='application/json')
        storage_pk = add_response.json()['id']

        # Sync S3 Storage
        sync_url = f'/api/storages/s3/{storage_pk}/sync'
        business_client.post(sync_url)
    # assert response.status_code == 201
    assert len(list(filter(lambda x: x.url == webhook.url, m.request_history))) == 1

    r = list(filter(lambda x: x.url == webhook.url, m.request_history))[0]
    assert r.json()['action'] == WebhookAction.TASKS_CREATED
    assert 'tasks' in r.json()
    assert 'project' in r.json()


@pytest.mark.django_db
def test_start_training_webhook(setup_project_dialog, ml_start_training_webhook, business_client):
    """
    1. Setup: The test uses the project_webhook fixture, which assumes that a webhook
    is already configured for the project.
    2. Mocking the POST Request: The requests_mock.Mocker is used to mock
    the POST request to the webhook URL. This is where you expect the START_TRAINING action to be sent.
    3. Making the Request: The test makes a POST request to the /api/ml/{id}/train endpoint.

    Assertions:
        - The response status code is checked to ensure the request was successful.
        - It verifies that exactly one request was made to the webhook URL.
        - It checks that the request method was POST.
        - The request URL and the JSON payload are validated against expected values.
    """
    from ml.models import MLBackend

    webhook = ml_start_training_webhook
    project = webhook.project
    ml = MLBackend.objects.create(project=project, url='http://0.0.0.0:9090')

    # Mock the POST request to the ML backend train endpoint
    with requests_mock.Mocker(real_http=True) as m:
        m.register_uri('POST', webhook.url)
        response = business_client.post(
            f'/api/ml/{ml.id}/train',
            data=json.dumps({'action': 'START_TRAINING'}),
            content_type='application/json',
        )

    assert response.status_code == 200
    request_history = m.request_history
    assert len(request_history) == 1
    assert request_history[0].method == 'POST'
    assert request_history[0].url == webhook.url
    assert 'project' in request_history[0].json()
    assert request_history[0].json()['action'] == 'START_TRAINING'
