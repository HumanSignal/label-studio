import pytest

from label_studio.tests.sdk.common import LABEL_CONFIG_AND_TASKS

pytestmark = pytest.mark.django_db
from label_studio_sdk import Client


def test_annotation_create_and_update(django_live_url, business_client):
    ls = Client(url=django_live_url, api_key=business_client.api_key)
    p = ls.start_project(title='New Project', label_config=LABEL_CONFIG_AND_TASKS['label_config'])

    task_data = [{'data': {'my_text': 'Test task'}}]
    p.import_tasks(task_data)

    tasks = p.get_tasks()
    assert tasks[0]['data'] == task_data[0]['data']

    task_id = tasks[0]['id']
    annotation_data = {
        'result': [{'from_name': 'label', 'to_name': 'my_text', 'type': 'choices', 'value': {'choices': ['Positive']}}]
    }
    new_annotation = p.create_annotation(task_id, **annotation_data)
    assert (annotation_id := new_annotation['id'])
    assert new_annotation['result'] == annotation_data['result']

    p.update_annotation(
        annotation_id,
        result=[{'from_name': 'label', 'to_name': 'my_text', 'type': 'choices', 'value': {'choices': ['Negative']}}],
    )

    updated_annotation = p.get_tasks()[0]['annotations'][0]
    assert updated_annotation['result'][0]['value'] == {'choices': ['Negative']}


def test_annotation_marks_task_as_labeled(django_live_url, business_client):
    ls = Client(url=django_live_url, api_key=business_client.api_key)
    p = ls.start_project(
        title='New Project',
        label_config=LABEL_CONFIG_AND_TASKS['label_config'],
    )

    task_data = [{'data': {'my_text': 'Test task'}}, {'data': {'my_text': 'Test task 2'}}]
    p.import_tasks(task_data)
    tasks = p.get_tasks()

    assert p.get_labeled_tasks() == []

    task_id = tasks[0]['id']
    annotation_data = {
        'result': [{'from_name': 'label', 'to_name': 'my_text', 'type': 'choices', 'value': {'choices': ['Positive']}}]
    }
    p.create_annotation(task_id, **annotation_data)

    assert len(labeled_tasks := p.get_labeled_tasks()) == 1
    assert labeled_tasks[0]['data'] == task_data[0]['data']
