"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import pytest
import json

from ..utils import make_task, make_annotation, make_prediction, project_id
from projects.models import Project


@pytest.mark.parametrize(
    "tasks_count, annotations_count, predictions_count",
    [
        [10, 2, 2],
    ],
)
@pytest.mark.django_db
def test_action_delete_all_tasks(tasks_count, annotations_count, predictions_count, business_client, project_id):
    # create
    payload = dict(project=project_id, data={"test": 1})
    response = business_client.post(
        "/api/dm/views/",
        data=json.dumps(payload),
        content_type="application/json",
    )

    assert response.status_code == 201, response.content
    view_id = response.json()["id"]

    project = Project.objects.get(pk=project_id)
    for _ in range(0, tasks_count):
        task_id = make_task({"data": {}}, project).id
        print('TASK_ID: %s' % task_id)
        for _ in range(0, annotations_count):
            print('COMPLETION')
            make_annotation({"result": []}, task_id)

        for _ in range(0, predictions_count):
            make_prediction({"result": []}, task_id)

    business_client.post(f"/api/dm/actions?project={project_id}&id=delete_tasks",
                         json={'selectedItems': {"all": True, "excluded": []}})
    assert project.tasks.count() == 0


