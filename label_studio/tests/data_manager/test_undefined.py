"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license."""

import json

import pytest
from django.conf import settings
from projects.functions.utils import recalculate_created_annotations_and_labels_from_scratch
from projects.models import Project, ProjectSummary

from ..utils import make_task, project_id  # noqa


def get_filtered_task_ids(business_client, view_id):
    response = business_client.get(f'/api/tasks/?view={view_id}')
    response_data = response.json()
    assert 'tasks' in response_data, response_data
    return [task['id'] for task in response_data['tasks']]


def apply_filter_and_get_view_id(business_client, project_id, filters):
    payload = {
        'project': project_id,
        'data': {'filters': filters},
    }
    response = business_client.post(
        '/api/dm/views/',
        data=json.dumps(payload),
        content_type='application/json',
    )
    assert response.status_code == 201, response.content
    return response.json()['id']


@pytest.mark.django_db
def test_views_filters_with_undefined(business_client, project_id):
    """
    1. Import task 1: {"$undefined$": "photo1.jpg"}
    2. Filter by `data` with value `photo`
    3. It should return task 1

    4. Set labeling config <View> <Image value="$image" name="img"/> </View>
    5. Filter by `image` with value `photo`
    6. It should return task 1

    7. Add task 2: {"$undefined$": "photo2.jpg", "extra": "123"}
    8. Filter by "extra": "123"
    9. It should return task 2
    10. Filter by "image" with value `photo`
    11. It should return task 1 and task 2

    12. Update task 1 with {"extra": "456"}
    13. Check project.summary.common_data_columns, there should be ["$undefined$", "extra"]

    14. Filter by "image" with "photo" should return task 1 and task 2
    """
    project = Project.objects.get(pk=project_id)
    project.label_config = '<View></View>'
    project.save()

    # Step 1: Import task 1: {"$undefined$": "photo1.jpg"}
    task_data_field_name = settings.DATA_UNDEFINED_NAME  # "$undefined$"
    task_1 = make_task({'data': {task_data_field_name: 'photo1.jpg'}}, project)
    task_id_1 = task_1.id

    # Step 2-3: Filter by `data` with value `photo`, should return task 1
    filters = {
        'conjunction': 'and',
        'items': [
            {
                # data default name when label config is not yet set
                # and a file is uploaded directly
                'filter': 'filter:tasks:data.data',
                'operator': 'contains',
                'type': 'String',
                'value': 'photo',
            }
        ],
    }
    view_id = apply_filter_and_get_view_id(business_client, project_id, filters)
    response_ids = get_filtered_task_ids(business_client, view_id)
    assert set(response_ids) == {task_id_1}, f'Expected {[task_id_1]}, got {response_ids}'

    # Step 4: Set labeling config <View> <Image value="$image" name="img"/> </View>
    project.label_config = '<View> <Image value="$image" name="img"/> </View>'
    project.save()

    # Step 5-6: Filter by `image` with value `photo`, should return task 1
    filters['items'][0]['filter'] = 'filter:tasks:data.image'
    view_id = apply_filter_and_get_view_id(business_client, project_id, filters)
    response_ids = get_filtered_task_ids(business_client, view_id)
    assert set(response_ids) == {task_id_1}, f'Expected {[task_id_1]}, got {response_ids}'

    # Step 7: Add task 2: {"$undefined$": "photo2.jpg", "extra": "123"}
    task_2 = make_task({'data': {task_data_field_name: 'photo2.jpg', 'extra': '123'}}, project)
    task_id_2 = task_2.id

    # Step 8-9: Filter by "extra": "123", should return task 2
    filters['items'][0]['filter'] = 'filter:tasks:data.extra'
    filters['items'][0]['value'] = '123'
    view_id = apply_filter_and_get_view_id(business_client, project_id, filters)
    response_ids = get_filtered_task_ids(business_client, view_id)
    assert set(response_ids) == {task_id_2}, f'Expected {[task_id_2]}, got {response_ids}'

    # Step 10-11: Filter by "image" with value `photo`, should return task 1 and task 2
    filters['items'][0]['filter'] = 'filter:tasks:data.image'
    filters['items'][0]['value'] = 'photo'
    view_id = apply_filter_and_get_view_id(business_client, project_id, filters)
    response_ids = get_filtered_task_ids(business_client, view_id)
    assert set(response_ids) == {task_id_1, task_id_2}, f'Expected {[task_id_1, task_id_2]}, got {response_ids}'

    # Step 12: Update task 1 with {"extra": "456"}
    task_1.data['extra'] = '456'
    task_1.save()

    # we need to fully reset cache, because summary.update_data_columns()
    # can't work incrementally
    recalculate_created_annotations_and_labels_from_scratch(project, project.summary, 1)

    # Step 13: Check project.summary.common_data_columns, there should be ["$undefined$", "extra"]
    project.refresh_from_db()
    summary = ProjectSummary.objects.get(project=project)
    assert set(summary.common_data_columns) == {
        task_data_field_name,
        'extra',
    }, f'Expected {[task_data_field_name, "extra"]}, got {summary.common_data_columns}'

    # Step 14: Filter by "image" with "photo" should return task 1 and task 2
    # The filter is already set to 'photo' for 'data.image' from previous steps
    view_id = apply_filter_and_get_view_id(business_client, project_id, filters)
    response_ids = get_filtered_task_ids(business_client, view_id)
    assert set(response_ids) == {task_id_1, task_id_2}, f'Expected {[task_id_1, task_id_2]}, got {response_ids}'
