"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""

import json

import pytest
from django.db import transaction
from io_storages.s3.models import S3ImportStorage, S3ImportStorageLink
from projects.models import Project

from ..utils import make_annotation, make_prediction, make_task, project_id  # noqa


@pytest.mark.parametrize(
    'tasks_count, annotations_count, predictions_count',
    [
        [10, 2, 2],
    ],
)
@pytest.mark.django_db
def test_action_delete_all_tasks(tasks_count, annotations_count, predictions_count, business_client, project_id):
    # create
    payload = dict(project=project_id, data={'test': 1})
    response = business_client.post(
        '/api/dm/views/',
        data=json.dumps(payload),
        content_type='application/json',
    )

    assert response.status_code == 201, response.content
    response.json()['id']

    project = Project.objects.get(pk=project_id)
    for _ in range(0, tasks_count):
        task_id = make_task({'data': {}}, project).id
        print('TASK_ID: %s' % task_id)
        for _ in range(0, annotations_count):
            print('COMPLETION')
            make_annotation({'result': []}, task_id)

        for _ in range(0, predictions_count):
            make_prediction({'result': []}, task_id)
    with transaction.atomic():
        business_client.post(
            f'/api/dm/actions?project={project_id}&id=delete_tasks',
            json={'selectedItems': {'all': True, 'excluded': []}},
        )
    assert project.tasks.count() == 0


@pytest.mark.parametrize(
    'tasks_count, annotations_count, predictions_count',
    [
        [10, 2, 2],
    ],
)
@pytest.mark.django_db
def test_action_delete_all_annotations(tasks_count, annotations_count, predictions_count, business_client, project_id):
    # create
    payload = dict(project=project_id, data={'test': 1})
    response = business_client.post(
        '/api/dm/views/',
        data=json.dumps(payload),
        content_type='application/json',
    )

    assert response.status_code == 201, response.content
    response.json()['id']

    project = Project.objects.get(pk=project_id)
    for _ in range(0, tasks_count):
        task_id = make_task({'data': {}}, project).id
        print('TASK_ID: %s' % task_id)
        for _ in range(0, annotations_count):
            print('COMPLETION')
            make_annotation({'result': []}, task_id)

        for _ in range(0, predictions_count):
            make_prediction({'result': []}, task_id)
    # get next task - should be 0
    status = business_client.post(
        f'/api/dm/actions?project={project_id}&id=next_task',
        json={'selectedItems': {'all': True, 'excluded': []}},
    )
    assert status.status_code == 404
    business_client.post(
        f'/api/dm/actions?project={project_id}&id=delete_tasks_annotations',
        json={'selectedItems': {'all': True, 'excluded': []}},
    )
    # get next task - should be 1
    status = business_client.post(
        f'/api/dm/actions?project={project_id}&id=next_task',
        json={'selectedItems': {'all': True, 'excluded': []}},
    )
    assert status.status_code == 200


@pytest.mark.django_db
def test_action_remove_duplicates(business_client, project_id):
    # Setup
    project = Project.objects.get(pk=project_id)
    storage = S3ImportStorage.objects.create(project=project)

    # task 1: add not a duplicated task
    task_data = {'data': {'image': 'normal.jpg'}}
    task1 = make_task(task_data, project)

    # task 2: add duplicated task, no annotations
    task_data = {'data': {'image': 'duplicated.jpg'}}
    make_task(task_data, project)

    # task 3: add duplicated task, with annotations
    task3 = make_task(task_data, project)
    for _ in range(3):
        make_annotation({'result': []}, task3.id)

    # task 4: add duplicated task, with storage link and one annotation
    task4 = make_task(task_data, project)
    make_annotation({'result': []}, task4.id)
    S3ImportStorageLink.objects.create(task=task4, key='duplicated.jpg', storage=storage)

    # call the "remove duplicated tasks" action
    status = business_client.post(
        f'/api/dm/actions?project={project_id}&id=remove_duplicates',
        json={'selectedItems': {'all': True, 'excluded': []}},
    )

    # as the result, we should have only 2 tasks left:
    # task 1 and task 3 with storage link copied from task 4
    assert list(project.tasks.order_by('id').values_list('id', flat=True)) == [
        task1.id,
        task3.id,
    ]
    assert status.status_code == 200
    assert S3ImportStorageLink.objects.count() == 1
    assert project.annotations.count() == 4
    assert project.tasks.count() == 2
