import json

import pytest

from label_studio.tests.sdk.common import LABEL_CONFIG_AND_TASKS

pytestmark = pytest.mark.django_db
from label_studio_sdk.client import LabelStudio
from label_studio_sdk.data_manager import Column, Filters, Operator, Type


def test_annotation_create_and_update(django_live_url, business_client):
    ls = LabelStudio(base_url=django_live_url, api_key=business_client.api_key)
    p = ls.projects.create(title='New Project', label_config=LABEL_CONFIG_AND_TASKS['label_config'])

    task_data = [{'data': {'my_text': 'Test task'}}]
    ls.projects.import_tasks(id=p.id, request=task_data)

    for task in ls.tasks.list(project=p.id):
        assert task.data == task_data[0]['data']

    task_id = task.id
    annotation_data = {
        'result': [{'from_name': 'label', 'to_name': 'my_text', 'type': 'choices', 'value': {'choices': ['Positive']}}]
    }
    new_annotation = ls.annotations.create(task_id, **annotation_data)
    assert (annotation_id := new_annotation.id)
    assert new_annotation.result == annotation_data['result']

    ls.annotations.update(
        id=annotation_id,
        result=[{'from_name': 'label', 'to_name': 'my_text', 'type': 'choices', 'value': {'choices': ['Negative']}}],
    )
    for task_with_annotation in ls.tasks.list(project=p.id, fields='all'):
        updated_annotation = task_with_annotation.annotations[0]
    assert updated_annotation['result'][0]['value'] == {'choices': ['Negative']}


def test_annotation_marks_task_as_labeled(django_live_url, business_client):
    ls = LabelStudio(base_url=django_live_url, api_key=business_client.api_key)
    p = ls.projects.create(
        title='New Project',
        label_config=LABEL_CONFIG_AND_TASKS['label_config'],
    )

    task_data = [{'data': {'my_text': 'Test task'}}, {'data': {'my_text': 'Test task 2'}}]
    ls.projects.import_tasks(id=p.id, request=task_data)

    filters = Filters.create(
        Filters.OR,
        [
            Filters.item(Column.completed_at, Operator.EMPTY, Type.Datetime, Filters.value(False)),
        ],
    )
    query = json.dumps({'filters': filters})

    labeled_tasks = []
    for task in ls.tasks.list(project=p.id, query=query, fields='all'):
        labeled_tasks.append(task)
    assert labeled_tasks == []

    tasks = []
    for task in ls.tasks.list(project=p.id):
        tasks.append(task)

    assert len(tasks) == 2

    task_id = tasks[0].id
    annotation_data = {
        'result': [{'from_name': 'label', 'to_name': 'my_text', 'type': 'choices', 'value': {'choices': ['Positive']}}]
    }
    ls.annotations.create(id=task_id, **annotation_data)

    labeled_tasks = []
    for task in ls.tasks.list(project=p.id, query=query, fields='all'):
        labeled_tasks.append(task)

    assert len(labeled_tasks) == 1
    assert labeled_tasks[0].data == task_data[0]['data']
