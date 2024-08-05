import json

import pytest
from django.db.models.query import QuerySet
from tests.utils import make_project
from users.models import User


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


@pytest.mark.django_db
def test_project_all_members(business_client):
    project = make_project({}, business_client.user, use_ml_backend=False)
    members = project.all_members

    assert isinstance(members, QuerySet)
    assert isinstance(members.first(), User)
