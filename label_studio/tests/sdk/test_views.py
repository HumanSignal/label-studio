import pytest

from label_studio.tests.sdk.common import LABEL_CONFIG_AND_TASKS

pytestmark = pytest.mark.django_db
from label_studio_sdk import Client
from label_studio_sdk.data_manager import Column, Filters, Operator, Type


def test_create_view(django_live_url, business_client):
    ls = Client(url=django_live_url, api_key=business_client.api_key)
    p = ls.start_project(title='New Project', label_config=LABEL_CONFIG_AND_TASKS['label_config'])

    project = ls.get_project(p.id)

    filters = Filters.create(
        Filters.AND,
        [
            Filters.item(Column.id, Operator.GREATER_OR_EQUAL, Type.Number, Filters.value(1)),
            Filters.item(Column.id, Operator.LESS_OR_EQUAL, Type.Number, Filters.value(100)),
        ],
    )

    view = project.create_view(title='Test View', filters=filters)

    assert view['data']['filters'] == {
        'conjunction': 'and',
        'items': [
            {'filter': 'filter:tasks:id', 'operator': 'greater_or_equal', 'type': 'Number', 'value': 1},
            {'filter': 'filter:tasks:id', 'operator': 'less_or_equal', 'type': 'Number', 'value': 100},
        ],
    }


def test_get_tasks_from_view(django_live_url, business_client):
    ls = Client(url=django_live_url, api_key=business_client.api_key)
    p = ls.start_project(title='New Project', label_config=LABEL_CONFIG_AND_TASKS['label_config'])

    project = ls.get_project(p.id)

    task_data = [{'data': {'my_text': 'Test task ' + str(i)}} for i in range(10)]
    p.import_tasks(task_data)
    tasks = p.get_tasks()

    filters = Filters.create(
        Filters.OR,
        [Filters.item(Column.id, Operator.EQUAL, Type.Number, Filters.value(t['id'])) for t in tasks[::2]],
    )

    project.create_view(title='Test View', filters=filters, ordering=['-' + Column.id])
    views = project.get_views()
    assert len(views) == 1
    view = views[0]
    tasks_from_view = project.get_tasks(view_id=view['id'])
    assert len(tasks_from_view) == 5
    assert tasks_from_view == sorted(tasks[::2], key=lambda t: t['id'], reverse=True)
