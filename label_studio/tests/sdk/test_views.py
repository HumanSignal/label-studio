import pytest

from label_studio.tests.sdk.common import LABEL_CONFIG_AND_TASKS

pytestmark = pytest.mark.django_db
from label_studio_sdk.client import LabelStudio
from label_studio_sdk.data_manager import Column, Filters, Operator, Type


def test_create_view(django_live_url, business_client):
    ls = LabelStudio(base_url=django_live_url, api_key=business_client.api_key)
    p = ls.projects.create(title='New Project', label_config=LABEL_CONFIG_AND_TASKS['label_config'])

    project = ls.projects.get(id=p.id)

    filters = Filters.create(
        Filters.AND,
        [
            Filters.item(Column.id, Operator.GREATER_OR_EQUAL, Type.Number, Filters.value(1)),
            Filters.item(Column.id, Operator.LESS_OR_EQUAL, Type.Number, Filters.value(100)),
        ],
    )

    view = ls.views.create(project=project.id, data=dict(title='Test View', filters=filters))

    assert view.data['filters'] == {
        'conjunction': 'and',
        'items': [
            {'filter': 'filter:tasks:id', 'operator': 'greater_or_equal', 'type': 'Number', 'value': 1},
            {'filter': 'filter:tasks:id', 'operator': 'less_or_equal', 'type': 'Number', 'value': 100},
        ],
    }


def test_get_tasks_from_view(django_live_url, business_client):
    ls = LabelStudio(base_url=django_live_url, api_key=business_client.api_key)
    p = ls.projects.create(title='New Project', label_config=LABEL_CONFIG_AND_TASKS['label_config'])

    project = ls.projects.get(id=p.id)

    task_data = [{'data': {'my_text': 'Test task ' + str(i)}} for i in range(10)]
    ls.projects.import_tasks(id=project.id, request=task_data)
    orig_tasks = []
    for task in ls.tasks.list(project=project.id):
        orig_tasks.append(task)

    filters = Filters.create(
        Filters.OR,
        [Filters.item(Column.id, Operator.EQUAL, Type.Number, Filters.value(t.id)) for t in orig_tasks[::2]],
    )

    ls.views.create(project=project.id, data=dict(title='Test View', filters=filters, ordering=['-' + Column.id]))
    views = ls.views.list(project=project.id)
    assert len(views) == 1
    view = views[0]
    tasks = []
    for task in ls.tasks.list(view=view.id):
        tasks.append(task)
    assert len(tasks) == 5
    assert tasks == sorted(orig_tasks[::2], key=lambda t: t.id, reverse=True)
