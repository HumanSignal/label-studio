import json

import pytest
from tests.utils import make_project


@pytest.mark.django_db
def test_has_lock(business_client):
    project = make_project({}, business_client.user, use_ml_backend=False)

    tasks = [
        {'data': {'location': 'London', 'text': 'text A'}},
    ]
    r = business_client.post(
        f'/api/projects/{project.id}/tasks/bulk', data=json.dumps(tasks), content_type='application/json'
    )
    assert r.status_code == 201

    task = project.tasks.first()

    annotation_data = {
        'task': task.id,
        'result': json.dumps(
            [{'from_name': 'text_class', 'to_name': 'text', 'value': {'labels': ['class_A'], 'start': 0, 'end': 1}}]
        ),
    }
    r = business_client.post('/api/tasks/{}/annotations/'.format(task.id), data=annotation_data)
    assert r.status_code == 201
    r = business_client.post('/api/tasks/{}/annotations/'.format(task.id), data=annotation_data)
    assert r.status_code == 201

    task.refresh_from_db()

    assert task.is_labeled is True

    task.is_labeled = False
    task.save()

    task.has_lock()
    task.refresh_from_db()

    assert task.is_labeled is True
