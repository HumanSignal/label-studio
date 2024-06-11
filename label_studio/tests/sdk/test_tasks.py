import logging

import pytest

from label_studio.tests.sdk.common import LABEL_CONFIG_AND_TASKS

pytestmark = pytest.mark.django_db
from label_studio_sdk.client import LabelStudio
from label_studio_sdk.core.api_error import ApiError
from tests.sdk.utils import sdk_logs


def test_task_CRUD(django_live_url, business_client):
    ls = LabelStudio(base_url=django_live_url, api_key=business_client.api_key)
    p = ls.projects.create(title='New Project', label_config=LABEL_CONFIG_AND_TASKS['label_config'])

    task_data = [{'data': {'my_text': 'Test task'}}]
    for task in task_data:
        ls.tasks.create(project=p.id, data=task['data'])

    tasks = [task for task in ls.tasks.list(project=p.id)]

    assert len(tasks) == 1
    assert (task_id := tasks[0].id)
    assert tasks[0].data == task_data[0]['data']

    ls.tasks.update(id=task_id, data={'my_text': 'Updated task'})
    tasks = [task for task in ls.tasks.list(project=p.id)]
    assert len(tasks) == 1
    assert tasks[0].data == {'my_text': 'Updated task'}

    ls.tasks.delete(id=task_id)
    tasks = []
    for task in ls.tasks.list(project=p.id):
        tasks.append(task)
    assert len(tasks) == 0


def test_delete_multi_tasks(django_live_url, business_client):
    ls = LabelStudio(base_url=django_live_url, api_key=business_client.api_key)
    p = ls.projects.create(title='New Project', label_config=LABEL_CONFIG_AND_TASKS['label_config'])

    task_data = [{'data': {'my_text': 'Test task ' + str(i)}} for i in range(10)]
    for task in task_data:
        ls.tasks.create(project=p.id, data=task['data'])

    tasks = [task for task in ls.tasks.list(project=p.id)]
    assert len(tasks) == 10

    # TODO: RND-94 uncomment when delete_tasks action is implemented for projects.actions.create(id='delete_tasks')
    # tasks_ids_to_delete = [t.id for t in tasks[:5]]
    #
    # ls.actions.create(request_options={
    #     'additional_query_parameters': {
    #         'project': p.id,
    #         'id': 'delete_tasks'
    #     },
    #     'additional_body_parameters': {
    #         'selectedItems': {"all": False, "included": tasks_ids_to_delete},
    #     }
    # })
    # assert len(get_tasks()) == 5
    #
    # ls.actions.create(request_options={
    #     'additional_query_parameters': {
    #         'project': p.id,
    #         'id': 'delete_tasks'
    #     },
    #     'additional_body_parameters': {
    #         'selectedItems': {"all": True, "excluded": [tasks[5].id]},
    #     }
    # })
    #
    # remaining_tasks = get_tasks()
    # assert len(remaining_tasks) == 1
    # assert remaining_tasks[0].data['my_text'] == 'Test task 5'

    # remove all tasks
    # TODO: RND-93
    # ls.tasks.delete_all_tasks(id=p.id)
    # tasks = []
    # for task in ls.tasks.list(project=p.id):
    #     tasks.append(task)
    # assert len(tasks) == 0


def test_export_tasks(django_live_url, business_client):
    ls = LabelStudio(base_url=django_live_url, api_key=business_client.api_key)
    p = ls.projects.create(title='New Project', label_config=LABEL_CONFIG_AND_TASKS['label_config'])

    task_data = [{'data': {'my_text': 'Test task ' + str(i)}} for i in range(10)]
    ls.projects.import_tasks(id=p.id, request=task_data)

    task_id = None
    for i, task in enumerate(ls.tasks.list(project=p.id)):
        if i == 7:
            task_id = task.id
            break

    annotation_data = {
        'result': [{'from_name': 'label', 'to_name': 'my_text', 'type': 'choices', 'value': {'choices': ['Positive']}}]
    }
    ls.annotations.create(id=task_id, **annotation_data)

    # by default, only tasks with annotations are exported
    exported_tasks = [task for task in ls.tasks.list(project=p.id, fields='all') if task.annotations]
    assert len(exported_tasks) == 1
    assert exported_tasks[0].data['my_text'] == 'Test task 7'

    exported_tasks = [task for task in ls.tasks.list(project=p.id, fields='all')]
    assert len(exported_tasks) == 10


def test_upload_and_list_tasks_does_not_log_to_stderr(django_live_url, business_client, caplog):
    caplog.set_level(logging.ERROR)

    ls = LabelStudio(base_url=django_live_url, api_key=business_client.api_key)
    p = ls.projects.create(title='New Project', label_config=LABEL_CONFIG_AND_TASKS['label_config'])
    ls.projects.import_tasks(id=p.id, request=LABEL_CONFIG_AND_TASKS['tasks_for_import'])

    tasks = [task for task in ls.tasks.list(project=p.id, fields='all')]

    assert len(tasks) == 1
    assert len(tasks[0].annotations) == 1
    assert len(tasks[0].predictions) == 1
    assert not sdk_logs(caplog)


def test_get_empty_tasks_does_not_log_to_stderr(django_live_url, business_client, caplog):
    caplog.set_level(logging.ERROR)

    ls = LabelStudio(base_url=django_live_url, api_key=business_client.api_key)
    p = ls.projects.create(title='New Project', label_config=LABEL_CONFIG_AND_TASKS['label_config'])

    tasks = [task for task in ls.tasks.list(project=p.id)]

    assert not tasks
    assert not sdk_logs(caplog)
