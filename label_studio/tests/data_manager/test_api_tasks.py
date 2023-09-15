"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import json

import pytest
from projects.models import Project

from ..utils import make_annotation, make_prediction, make_task, project_id  # noqa


@pytest.mark.django_db
def test_views_tasks_api(business_client, project_id):
    # create
    payload = dict(project=project_id, data={'test': 1})
    response = business_client.post(
        '/api/dm/views/',
        data=json.dumps(payload),
        content_type='application/json',
    )

    assert response.status_code == 201, response.content
    view_id = response.json()['id']

    # no tasks
    response = business_client.get(f'/api/tasks?fields=all&view={view_id}')

    assert response.status_code == 200, response.content
    assert response.json()['total'] == 0
    assert len(response.json()['tasks']) == 0

    project = Project.objects.get(pk=project_id)
    task_data = {'text': 'bbb'}
    task_id = make_task({'data': task_data}, project).id

    annotation_result = {'from_name': 'my_class', 'to_name': 'text', 'type': 'choices', 'value': {'choices': ['pos']}}
    make_annotation({'result': [annotation_result]}, task_id)
    make_annotation(
        {
            'result': [annotation_result],
            'was_cancelled': True,
        },
        task_id,
    )
    prediction_result = {'from_name': 'my_class', 'to_name': 'text', 'type': 'choices', 'value': {'choices': ['pos']}}
    make_prediction(
        {
            'result': [prediction_result],
        },
        task_id,
    )

    response = business_client.get(f'/api/tasks?fields=all&view={view_id}')

    assert response.status_code == 200, response.content
    response_data = response.json()
    assert response_data['total'] == 1
    assert len(response_data['tasks']) == 1
    assert response_data['tasks'][0]['id'] == task_id
    assert response_data['tasks'][0]['data'] == task_data
    assert response_data['tasks'][0]['total_annotations'] == 1
    assert 'annotations_results' in response_data['tasks'][0]
    assert response_data['tasks'][0]['cancelled_annotations'] == 1
    assert response_data['tasks'][0]['total_predictions'] == 1
    assert 'predictions_results' in response_data['tasks'][0]

    num_anno1 = response_data['tasks'][0]['annotations'][0]['id']
    num_anno2 = response_data['tasks'][0]['annotations'][1]['id']
    num_pred = response_data['tasks'][0]['predictions'][0]['id']

    # delete annotations and check counters

    business_client.delete(f'/api/annotations/{num_anno1}')
    business_client.delete(f'/api/annotations/{num_anno2}')

    response = business_client.get(f'/api/tasks?fields=all&view={view_id}')
    assert response.status_code == 200, response.content
    response_data = response.json()
    assert response_data['tasks'][0]['cancelled_annotations'] == 0
    assert response_data['tasks'][0]['total_annotations'] == 0

    # delete prediction and check counters
    business_client.delete(f'/api/predictions/{num_pred}')

    response = business_client.get(f'/api/tasks?fields=all&view={view_id}')
    assert response.status_code == 200, response.content
    response_data = response.json()
    assert response_data['tasks'][0]['cancelled_annotations'] == 0
    assert response_data['tasks'][0]['total_annotations'] == 0
    assert response_data['tasks'][0]['total_predictions'] == 0


@pytest.mark.parametrize(
    'tasks_count, annotations_count, predictions_count',
    [
        [0, 0, 0],
        [1, 0, 0],
        [1, 1, 1],
        [2, 2, 2],
    ],
)
@pytest.mark.django_db
def test_views_total_counters(tasks_count, annotations_count, predictions_count, business_client, project_id):
    # create
    payload = dict(project=project_id, data={'test': 1})
    response = business_client.post(
        '/api/dm/views/',
        data=json.dumps(payload),
        content_type='application/json',
    )

    assert response.status_code == 201, response.content
    view_id = response.json()['id']

    project = Project.objects.get(pk=project_id)
    for _ in range(0, tasks_count):
        task_id = make_task({'data': {}}, project).id
        print('TASK_ID: %s' % task_id)
        for _ in range(0, annotations_count):
            make_annotation({'result': []}, task_id)

        for _ in range(0, predictions_count):
            make_prediction({'result': []}, task_id)

    response = business_client.get(f'/api/tasks?fields=all&view={view_id}')

    response_data = response.json()

    assert response_data['total'] == tasks_count, response_data
    assert response_data['total_annotations'] == tasks_count * annotations_count, response_data
    assert response_data['total_predictions'] == tasks_count * predictions_count, response_data
