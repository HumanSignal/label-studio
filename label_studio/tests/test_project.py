import json

import pytest
from tests.utils import make_project


@pytest.mark.django_db
def test_update_tasks_counters_and_task_states(business_client):
    project = make_project({}, business_client.user, use_ml_backend=False)

    # CHECK EMPTY LIST
    ids = []
    obj = project._update_tasks_counters_and_task_states(ids, True, True, True)
    assert obj == 0

    tasks = [{'data': {'location': 'London', 'text': 'text A'}}, {'data': {'location': 'London', 'text': 'text B'}}]
    # upload tasks with annotations
    r = business_client.post(
        f'/api/projects/{project.id}/tasks/bulk', data=json.dumps(tasks), content_type='application/json'
    )
    assert r.status_code == 201

    # CHECK LIST with IDS
    ids = list(project.tasks.all().values_list('id', flat=True))
    obj = project._update_tasks_counters_and_task_states(ids, True, True, True)
    assert obj == 0

    # CHECK SET with IDS
    ids = set(project.tasks.all().values_list('id', flat=True))
    obj = project._update_tasks_counters_and_task_states(ids, True, True, True)
    assert obj == 0
