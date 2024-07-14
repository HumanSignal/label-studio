"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""

import json

import pytest
from django.db import transaction
from io_storages.azure_blob.models import (
    AzureBlobImportStorage,
    AzureBlobImportStorageLink,
)
from io_storages.gcs.models import GCSImportStorage, GCSImportStorageLink
from io_storages.localfiles.models import (
    LocalFilesImportStorage,
    LocalFilesImportStorageLink,
)
from io_storages.redis.models import RedisImportStorage, RedisImportStorageLink
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
@pytest.mark.parametrize(
    'storage_model, link_model',
    [
        (AzureBlobImportStorage, AzureBlobImportStorageLink),
        (GCSImportStorage, GCSImportStorageLink),
        (S3ImportStorage, S3ImportStorageLink),
        (LocalFilesImportStorage, LocalFilesImportStorageLink),
        (RedisImportStorage, RedisImportStorageLink),
    ],
)
def test_action_remove_duplicates(business_client, project_id, storage_model, link_model):
    # Setup
    project = Project.objects.get(pk=project_id)
    storage = storage_model.objects.create(project=project)

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
    link_model.objects.create(task=task4, key='duplicated.jpg', storage=storage)

    # call the "remove duplicated tasks" action
    status = business_client.post(
        f'/api/dm/actions?project={project_id}&id=remove_duplicates',
        json={'selectedItems': {'all': True, 'excluded': []}},
    )

    # As the result, we should have only 2 tasks left:
    # task 1 and task 3 with storage link copied from task 4
    assert list(project.tasks.order_by('id').values_list('id', flat=True)) == [
        task1.id,
        task3.id,
    ]
    assert status.status_code == 200
    assert link_model.objects.count() == 1
    assert project.annotations.count() == 4
    assert project.tasks.count() == 2


@pytest.mark.django_db
def test_action_remove_duplicates_with_annotations(business_client, project_id):
    """This test checks that the "remove_duplicates" action works correctly
    when there are annotations distributed among multiple duplicated tasks.
    Remove duplicates should keep the task with the first task with annotations,
    link other annotations to the first task and remove the excess tasks.
    """
    # Setup
    project = Project.objects.get(pk=project_id)
    storage = S3ImportStorage.objects.create(project=project)

    # task 1: add not a duplicated task
    task_data = {'data': {'image': 'normal.jpg'}}
    task1 = make_task(task_data, project)

    # task 2: add duplicated task, no annotations
    task_data = {'data': {'image': 'duplicated.jpg'}}
    task2 = make_task(task_data, project)
    make_annotation({'result': []}, task2.id)
    make_annotation({'result': [], 'was_cancelled': True}, task2.id)

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
        task2.id,
    ], 'tasks ids wrong'
    assert status.status_code == 200, 'status code wrong'
    assert S3ImportStorageLink.objects.count() == 1, 'storage links count wrong'
    assert project.annotations.count() == 6, 'annotations count wrong'
    assert project.annotations.filter(was_cancelled=True).count() == 1, 'was_cancelled counter wrong'
    assert project.tasks.count() == 2, 'tasks count wrong'
    assert task1.annotations.count() == 0, 'task1 annotations count wrong'
    assert task2.annotations.count() == 6, 'task2 annotations count wrong'
    assert task2.annotations.filter(was_cancelled=True).count() == 1, 'was_cancelled counter wrong'


@pytest.mark.django_db
def test_action_cache_labels(business_client, project_id):
    """This test checks that the "cache_labels" action works correctly
    when there are annotations distributed among multiple tasks.
    """
    # Setup
    project = Project.objects.get(pk=project_id)

    # task 1: add a task with specific labels
    task_data = {'data': {'image': 'image1.jpg'}}
    task1 = make_task(task_data, project)
    make_annotation(
        {
            'result': [
                {
                    'from_name': 'label1',
                    'to_name': 'image',
                    'type': 'labels',
                    'value': {'labels': ['Car']},
                }
            ]
        },
        task1.id,
    )

    # task 2: add a task with different labels
    task_data = {'data': {'image': 'image2.jpg'}}
    task2 = make_task(task_data, project)
    make_annotation(
        {
            'result': [
                {
                    'from_name': 'label1',
                    'to_name': 'image',
                    'type': 'labels',
                    'value': {'labels': ['Car']},
                },
                {
                    'from_name': 'label1',
                    'to_name': 'image',
                    'type': 'labels',
                    'value': {'labels': ['Car', 'Airplane']},
                },
            ]
        },
        task2.id,
    )

    # call the "cache_labels" action with counters
    status = business_client.post(
        f'/api/dm/actions?project={project_id}&id=cache_labels',
        data=json.dumps(
            {
                'selectedItems': {'all': True, 'excluded': []},
                'control_tag': 'label1',
                'with_counters': 'yes',
            }
        ),
        content_type='application/json',
    )

    # Assertions
    # Replace these with the actual assertions for your cache_labels function
    tasks = project.tasks
    assert status.status_code == 200, 'status code wrong'
    assert tasks.count() == 2, 'tasks count wrong'
    assert tasks.get(id=task1.id).data.get('cache_label1') == 'Car: 1', 'cache_label1 wrong for task 1'
    assert tasks.get(id=task2.id).data.get('cache_label1') == 'Airplane: 1, Car: 2', 'cache_label1 wrong for task 2'

    # call the "cache_labels" action without counters
    status = business_client.post(
        f'/api/dm/actions?project={project_id}&id=cache_labels',
        data=json.dumps(
            {
                'selectedItems': {'all': True, 'excluded': []},
                'control_tag': 'label1',
                'with_counters': 'no',
            }
        ),
        content_type='application/json',
    )

    # Assertions
    # Replace these with the actual assertions for your cache_labels function
    assert status.status_code == 200, 'status code wrong'
    assert tasks.get(id=task1.id).data.get('cache_label1') == 'Car', 'cache_label1 wrong for task 1'
    assert tasks.get(id=task2.id).data.get('cache_label1') == 'Airplane, Car', 'cache_label1 wrong for task 2'
