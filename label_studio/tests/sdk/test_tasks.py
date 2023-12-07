import logging

import pytest

from label_studio.tests.sdk.common import LABEL_CONFIG_AND_TASKS

pytestmark = pytest.mark.django_db
from label_studio_sdk import Client
from tests.sdk.utils import sdk_logs


def test_task_CRUD(django_live_url, business_client):
    ls = Client(url=django_live_url, api_key=business_client.api_key)
    p = ls.start_project(title='New Project', label_config=LABEL_CONFIG_AND_TASKS['label_config'])

    task_data = [{'data': {'my_text': 'Test task'}}]
    p.import_tasks(task_data)

    tasks = p.get_tasks()
    assert len(tasks) == 1
    assert (task_id := tasks[0]['id'])
    assert tasks[0]['data'] == task_data[0]['data']

    p.update_task(task_id, data={'my_text': 'Updated task'})
    tasks = p.get_tasks()
    assert len(tasks) == 1
    assert tasks[0]['data'] == {'my_text': 'Updated task'}

    p.delete_task(task_id)
    assert not p.get_tasks()


def test_delete_multi_tasks(django_live_url, business_client):
    ls = Client(url=django_live_url, api_key=business_client.api_key)
    p = ls.start_project(title='New Project', label_config=LABEL_CONFIG_AND_TASKS['label_config'])

    task_data = [{'data': {'my_text': 'Test task ' + str(i)}} for i in range(10)]
    p.import_tasks(task_data)

    tasks = p.get_tasks()
    assert len(tasks) == 10

    p.delete_tasks([t['id'] for t in tasks[:5]])
    assert len(p.get_tasks()) == 5

    p.delete_all_tasks(excluded_ids=[tasks[5]['id']])
    remaining_tasks = p.get_tasks()
    assert len(remaining_tasks) == 1
    assert remaining_tasks[0]['data']['my_text'] == 'Test task 5'


def test_export_tasks(django_live_url, business_client):
    ls = Client(url=django_live_url, api_key=business_client.api_key)
    p = ls.start_project(title='New Project', label_config=LABEL_CONFIG_AND_TASKS['label_config'])

    task_data = [{'data': {'my_text': 'Test task ' + str(i)}} for i in range(10)]
    p.import_tasks(task_data)

    task_id = p.get_tasks()[0]['id']
    annotation_data = {
        'result': [{'from_name': 'label', 'to_name': 'my_text', 'type': 'choices', 'value': {'choices': ['Positive']}}]
    }
    p.create_annotation(task_id, **annotation_data)

    # by default, only tasks with annotations are exported
    exported_tasks = p.export_tasks()
    assert len(exported_tasks) == 1
    assert exported_tasks[0]['data']['my_text'] == 'Test task 0'

    exported_tasks = p.export_tasks(download_all_tasks=True)
    assert len(exported_tasks) == 10


def test_upload_and_list_tasks_does_not_log_to_stderr(django_live_url, business_client, caplog):
    caplog.set_level(logging.ERROR)

    ls = Client(url=django_live_url, api_key=business_client.api_key)
    p = ls.start_project(title='New Project', label_config=LABEL_CONFIG_AND_TASKS['label_config'])
    p.import_tasks(LABEL_CONFIG_AND_TASKS['tasks_for_import'])

    tasks = p.get_tasks()

    assert len(tasks) == 1
    assert len(tasks[0]['annotations']) == 1
    assert len(tasks[0]['predictions']) == 1
    assert not sdk_logs(caplog)


def test_get_empty_tasks_does_not_log_to_stderr(django_live_url, business_client, caplog):
    caplog.set_level(logging.ERROR)

    ls = Client(url=django_live_url, api_key=business_client.api_key)
    p = ls.start_project(title='New Project', label_config=LABEL_CONFIG_AND_TASKS['label_config'])

    tasks = p.get_tasks()

    assert not tasks
    assert not sdk_logs(caplog)
