"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import pytest
import yaml
import json
import io
import os
import time

from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient
from operator import itemgetter


@pytest.fixture
@pytest.mark.django_db
def client_and_token(business_client):
    token = Token.objects.get(user=business_client.business.admin)
    client = APIClient()
    client.credentials(HTTP_AUTHORIZATION='Token ' + token.key)
    client.team_id = business_client.team.id
    client.organization_pk = business_client.organization.pk
    return client, token


@pytest.mark.django_db
def pytest_generate_tests(metafunc):
    if 'test_suite' in metafunc.fixturenames:
        with io.open(os.path.join(os.path.dirname(__file__), 'test_data/full_steps.yml'), encoding='utf-8') as f:
            test_suites = yaml.load(f)
            metafunc.parametrize('test_name, test_suite', list(test_suites.items()))


@pytest.fixture(autouse=True)
def delete_projects_at_the_end(db, request):
    from projects.models import Project

    def delete_projects():
        p = Project.objects.all()
        print(f'Deleting {p.count()} projects')
        p.delete()

    request.addfinalizer(delete_projects)


@pytest.mark.integration_tests
@pytest.mark.django_db
def test_full_steps(client_and_token, test_name, test_suite):
    print(f'Start {test_name}')
    client, token = client_and_token

    project_config = test_suite['project_config']
    project_config['team_id'] = client.team_id
    chosen_ml_backend = test_suite['ml_backend']
    upload_tasks = test_suite['upload_tasks']
    annotations = test_suite['annotations']
    prediction_tasks = test_suite.get('prediction_tasks', upload_tasks)
    wait_model = test_suite.get('wait_model', 10)
    expected_predictions = test_suite['expected_predictions']

    def get(url, code=200):
        r = client.get(url)
        assert r.status_code == code
        return r.json()

    def post(url, payload, code=(200, 201)):
        r = client.post(url, data=json.dumps(payload), content_type='application/json', headers={'Authorization': f'Token {token}'})  # noqa
        assert r.status_code in code
        return r.json()

    def patch(url, payload, code=200):
        r = client.patch(url, data=json.dumps(payload), content_type='application/json', headers={'Authorization': f'Token {token}'})  # noqa
        assert r.status_code == code
        return r.json()

    # create project
    project_id = post('/api/projects/', project_config)['id']

    # activate ML backend
    connections_list = get(f'/api/projects/{project_id}/backends/connections')
    chosen_connection = None
    for connection in connections_list:
        print(f'Test connection {connection}...')
        if connection['ml_backend']['name'] == chosen_ml_backend:
            chosen_connection = connection
            break
    assert chosen_connection, f'Connection to {chosen_ml_backend} not found'

    patch(f'/api/projects/{project_id}/', {
        'ml_backend_active_connection': chosen_connection['id'],
        'active_learning_enabled': True
    })

    # upload data
    post(f'/api/projects/{project_id}/tasks/bulk/', upload_tasks)

    # get tasks list
    tasks_list = get(f'/api/projects/{project_id}/tasks/')

    tasks_list = sorted(tasks_list, key=itemgetter('id'))

    for task, annotation in zip(tasks_list, annotations):
        # make annotation
        post(f'/api/tasks/{task["id"]}/annotations/', annotation)
        time.sleep(1)

    # get predictions
    time.sleep(wait_model)
    predictions = post(f'/api/projects/{project_id}/predict', prediction_tasks)
    # assert len(predictions['model_version']) > 0, predictions
    for prediction, expected_prediction in zip(predictions['results'], expected_predictions):
        assert prediction['result'] == expected_prediction['result']
        assert prediction['score'] > expected_prediction['score_above']

    # delete project and check whether model is deleted too
    r = client.post(f'/projects/{project_id}/delete/', content_type='text/html; charset=utf-8')
    assert r.status_code == 302

    print('Trying to get final predictions after model removing fails...')
    # TODO: check why this works but should fail
    post(f'/api/projects/{project_id}/predict', prediction_tasks)
