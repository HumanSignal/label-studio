"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import pytest
import json
import requests_mock

from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient
from .utils import ml_backend_mock

from projects.models import Project
from ml.models import MLBackendTrainJob
from tasks.models import Annotation, Task


@pytest.fixture
def client_and_token(business_client):
    token = Token.objects.get(user=business_client.business.admin)
    client = APIClient()
    client.credentials(HTTP_AUTHORIZATION='Token ' + token.key)
    client.organization_pk = business_client.organization.pk
    return client, token


@pytest.fixture(params=['business_authorized', 'user_with_token'])
def any_api_client(request, client_and_token, business_client):
    client, token = client_and_token
    result = {
        'type': request.param,
        'token': token
    }
    if request.param == 'business_authorized':
        result['client'] = business_client
    elif request.param == 'user_with_token':
        result['client'] = client
    return result


@pytest.mark.parametrize('payload, response, status_code', [
    # status OK
    (
        {"title": "111", "label_config": "<View><Text name=\"my_text\" value=\"$text\"/><Choices name=\"my_class\" toName=\"my_text\"><Choice value=\"pos\"/><Choice value=\"neg\"/></Choices></View>"},  # noqa
        None,
        201
    ),
    # invalid label config: unexisted toName
    (
        {"title": "111", "label_config": "<View><Text name=\"my_text\" value=\"$text\"/><Choices name=\"my_class\" toName=\"unexisted\"><Choice value=\"pos\"/><Choice value=\"neg\"/></Choices></View>"},  # noqa
        {"label_config": ["toName=\"unexisted\" not found in names: ['my_class', 'my_text']"]},
        400
    ),
    # invalid label config: missed toName
    (
        {"title": "111", "label_config": "<View><Text name=\"my_text\" value=\"$text\"/><Choices name=\"my_class\"><Choice value=\"pos\"/><Choice value=\"neg\"/></Choices></View>"},  # noqa
        {'label_config': ["Validation failed on : 'toName' is a required property"]},  # noqa
        400
    ),
    # empty label config
    (
        {"title": "111", "label_config": None},
        {'label_config': ['can only parse strings']},
        400
    )
])
@pytest.mark.django_db
def test_create_project(client_and_token, payload, response, status_code):
    client, token = client_and_token
    payload['organization_pk'] = client.organization_pk
    with ml_backend_mock():
        r = client.post(
            '/api/projects/',
            data=json.dumps(payload),
            content_type='application/json',
            headers={'Authorization': f'Token {token}'}
        )
    assert r.status_code == status_code
    if response:
        response_data = r.json()
        if r.status_code == 400:
            assert response_data['validation_errors'] == response
        else:
            assert response_data == response


@pytest.mark.parametrize('payload, response, status_code', [
    # status OK
    (
        {"label_config": "<View><Text name=\"my_text\" value=\"$text\"/><Choices name=\"my_class\" toName=\"my_text\"><Choice value=\"pos\"/><Choice value=\"neg\"/></Choices></View>"},  # noqa
        None,
        200
    ),
    # TODO: this should instead of next one, but "configured_project" fixture doesn't update project.summary with data columns
    # invalid column
    # (
    #     {"label_config": "<View><Text name=\"my_text\" value=\"$text\"/><Choices name=\"my_class\" toName=\"my_text\"><Choice value=\"pos\"/><Choice value=\"neg\"/></Choices></View>"},
    #     # noqa
    #     {'label_config': ['These fields are not found in data: text']},
    #     400
    # ),
    # invalid label config: unexisted toName
    (
        {"label_config": "<View><Text name=\"my_text\" value=\"$text\"/><Choices name=\"my_class\" toName=\"unexisted\"><Choice value=\"pos\"/><Choice value=\"neg\"/></Choices></View>"},  # noqa
        {"label_config": ["toName=\"unexisted\" not found in names: ['my_class', 'my_text']"]},
        400
    ),
    # invalid label config: missed toName
    (
        {"label_config": "<View><Text name=\"my_text\" value=\"$text\"/><Choices name=\"my_class\"><Choice value=\"pos\"/><Choice value=\"neg\"/></Choices></View>"}, # noqa
        {'label_config': ["Validation failed on : 'toName' is a required property"]},  # noqa
        400
    )
])
@pytest.mark.django_db
def test_patch_project(client_and_token, configured_project, payload, response, status_code):
    client, token = client_and_token
    payload['organization_pk'] = client.organization_pk
    r = client.patch(
        f'/api/projects/{configured_project.id}/',
        data=json.dumps(payload),
        content_type='application/json',
        headers={'Authorization': f'Token {token}'}
    )
    assert r.status_code == status_code
    if response:
        response_data = r.json()
        if r.status_code == 400:
            assert response_data['validation_errors'] == response
        else:
            assert response_data == response


@pytest.mark.parametrize('external_status_code, current_active_ml_backend_url, ml_backend_call_count', [
    (201, 'http://my.super.ai', 4),
])
@pytest.mark.django_db
def test_creating_activating_new_ml_backend(
    client_and_token, configured_project, external_status_code, current_active_ml_backend_url,
    ml_backend_call_count
):
    business_client, token = client_and_token
    with requests_mock.Mocker() as m:
        my_url = 'http://my.super.ai'
        m.post(f'{my_url}/setup', text=json.dumps({'model_version': 'Version from My Super AI'}))
        m.get(f'{my_url}/health', text=json.dumps({'status': 'UP'}))
        r = business_client.post(
            '/api/ml',
            data=json.dumps({
                'project': configured_project.id,
                'title': 'My Super AI',
                'url': my_url
            }),
            content_type='application/json',
            headers={'Authorization': f'Token {token}'}
        )
        assert r.status_code == external_status_code
        assert m.called
        assert m.call_count == ml_backend_call_count
        project = Project.objects.get(id=configured_project.id)
        all_urls = [m.url for m in project.ml_backends.all()]
        connected_ml = [url for url in all_urls if url == current_active_ml_backend_url]
        assert len(connected_ml) == 1, '\n'.join(all_urls)


@pytest.mark.django_db
def test_delete_annotations(business_client, configured_project):
    business_client.delete(f'/api/projects/{configured_project.id}/annotations/')
    assert not Annotation.objects.filter(task__project=configured_project.id).exists()


# --- TaskAPI ---

@pytest.mark.parametrize('response, status_code', [
    # status OK
    (
        {"annotations": [], 'predictions': [], 'drafts': [],
         "data": {"text": "text B", "meta_info": "meta info B"}, "meta": {},
         "created_at": "", "updated_at": "", "is_labeled": False, "project": 0,
         'overlap': 1, 'file_upload': None},
        200
    )
])
@pytest.mark.django_db
def test_get_task(client_and_token, configured_project, response, status_code):
    client, token = client_and_token
    task = configured_project.tasks.all()[0]
    response['project'] = configured_project.id
    response['created_at'] = task.created_at.isoformat().replace('+00:00', 'Z')
    response['updated_at'] = task.updated_at.isoformat().replace('+00:00', 'Z')
    response['id'] = task.id
    r = client.get(
        f'/api/tasks/{task.id}/',
        content_type='application/json',
        headers={'Authorization': f'Token {token}'}
    )
    assert r.status_code == status_code
    if response:
        assert r.json() == response


@pytest.mark.parametrize('payload, response, status_code', [
    # status OK
    (
        {"annotations": [], 'predictions': [],
         "data": {"text": "TEST1", "meta_info": "TEST2"}, "meta": {},
         "created_at": "", "updated_at": "", "is_labeled": False, "project": 0, 'file_upload': None},
        {"id": 0, "annotations": [], 'predictions': [],
         "data": {"text": "TEST1", "meta_info": "TEST2"}, "meta": {},
         "created_at": "", "updated_at": "", "is_labeled": False, "project": 0,
         'overlap': 1, 'file_upload': None},
        200
    )
])
@pytest.mark.django_db
def test_patch_task(client_and_token, configured_project, payload, response, status_code):
    client, token = client_and_token
    task = configured_project.tasks.all()[0]
    payload['project'] = configured_project.id

    r = client.patch(
        f'/api/tasks/{task.id}/',
        data=json.dumps(payload),
        content_type='application/json',
        headers={'Authorization': f'Token {token}'}
    )

    task = configured_project.tasks.all()[0]  # call DB again after update
    response['project'] = configured_project.id
    response['created_at'] = task.created_at.isoformat().replace('+00:00', 'Z')
    response['updated_at'] = task.updated_at.isoformat().replace('+00:00', 'Z')
    response['id'] = task.id

    assert r.status_code == status_code
    if response:
        assert r.json() == response
