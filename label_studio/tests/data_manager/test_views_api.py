"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license."""

import json

import pytest
from rest_framework import status

from ..utils import project_id  # noqa

pytestmark = pytest.mark.django_db


def test_views_api(business_client, project_id):
    # create
    payload = dict(project=project_id, data={'test': 1})
    response = business_client.post(
        '/api/dm/views/',
        data=json.dumps(payload),
        content_type='application/json',
    )

    assert response.status_code == 201, response.content

    # list
    response = business_client.get(
        '/api/dm/views/',
    )

    assert response.status_code == 200, response.content
    assert response.json()[0]['project'] == project_id
    view_id = response.json()[0]['id']

    # partial update
    updated_payload = dict(data={'test': 2})
    response = business_client.patch(
        f'/api/dm/views/{view_id}/',
        data=json.dumps(updated_payload),
        content_type='application/json',
    )
    assert response.status_code == 200, response.content

    # retrieve
    response = business_client.get(
        f'/api/dm/views/{view_id}/',
    )

    assert response.status_code == 200, response.content
    assert response.json()['data'] == updated_payload['data']

    # reset
    response = business_client.delete(
        '/api/dm/views/reset',
        data=json.dumps(dict(project=project_id)),
        content_type='application/json',
    )

    assert response.status_code == 204, response.content
    response = business_client.get('/api/dm/views/')
    assert response.json() == []


def test_views_api_filter_project(business_client):
    # create project
    response = business_client.post(
        '/api/projects/',
        data=json.dumps(dict(title='test_project1')),
        content_type='application/json',
    )
    project1_id = response.json()['id']
    business_client.post(
        '/api/dm/views/',
        data=json.dumps(dict(project=project1_id)),
        content_type='application/json',
    )

    response = business_client.post(
        '/api/projects/',
        data=json.dumps(dict(title='test_project2')),
        content_type='application/json',
    )
    project2_id = response.json()['id']
    business_client.post(
        '/api/dm/views/',
        data=json.dumps(dict(project=project2_id)),
        content_type='application/json',
    )

    # list all
    response = business_client.get('/api/dm/views/')
    assert response.status_code == 200, response.content
    assert len(response.json()) == 2

    # filtered list
    response = business_client.get(f'/api/dm/views/?project={project1_id}')
    assert response.status_code == 200, response.content
    assert response.json()[0]['project'] == project1_id

    # filtered reset
    response = business_client.delete(
        '/api/dm/views/reset/',
        data=json.dumps(dict(project=project1_id)),
        content_type='application/json',
    )
    assert response.status_code == 204, response.content

    # filtered list
    response = business_client.get(f'/api/dm/views/?project={project2_id}')
    assert len(response.json()) == 1
    assert response.json()[0]['project'] == project2_id


def test_views_api_filters(business_client, project_id):
    # create
    payload = dict(
        project=project_id,
        data={
            'filters': {
                'conjunction': 'or',
                'items': [
                    {
                        'filter': 'filter:tasks:data.image',
                        'operator': 'contains',
                        'type': 'Image',
                        'value': {},
                    },
                    {
                        'filter': 'filter:tasks:data.image',
                        'operator': 'equal',
                        'type': 'Image',
                        'value': {},
                    },
                ],
            }
        },
    )

    response = business_client.post(
        '/api/dm/views/',
        data=json.dumps(payload),
        content_type='application/json',
    )

    assert response.status_code == 201, response.content
    view_id = response.json()['id']

    # retrieve
    response = business_client.get(
        f'/api/dm/views/{view_id}/',
    )

    assert response.status_code == 200, response.content
    assert response.json()['data'] == payload['data']

    updated_payload = dict(
        project=project_id,
        data={
            'filters': {
                'conjunction': 'and',
                'items': [
                    {
                        'filter': 'filter:tasks:data.text',
                        'operator': 'equal',
                        'type': 'Text',
                        'value': {},
                    },
                    {
                        'filter': 'filter:tasks:data.text',
                        'operator': 'contains',
                        'type': 'Text',
                        'value': {},
                    },
                ],
            }
        },
    )

    response = business_client.put(
        f'/api/dm/views/{view_id}/',
        data=json.dumps(updated_payload),
        content_type='application/json',
    )
    assert response.status_code == 200, response.content

    # check after update
    response = business_client.get(
        f'/api/dm/views/{view_id}/',
    )

    assert response.status_code == 200, response.content
    assert response.json()['data'] == updated_payload['data']


def test_views_api_nested_filters(business_client, project_id):
    """Test creating views with nested filters using child filters.

    This test validates the nested filter structure where a parent filter
    can have child filters that are AND-merged with the parent. This is
    similar to the enterprise annotations_results_json filters but uses
    regular task data filters.
    """
    # Create a project with specific label config for testing
    project_response = business_client.post(
        '/api/projects/',
        data=json.dumps(
            {
                'title': 'test_nested_filters',
                'label_config': """
                <View>
                  <Text name="text" value="$text"></Text>
                  <Choices name="choice" toName="text">
                    <Choice value="A" />
                    <Choice value="B" />
                  </Choices>
                  <Labels name="labels" toName="text">
                    <Label value="Label 1" />
                    <Label value="Label 2" />
                  </Labels>
                </View>
            """,
            }
        ),
        content_type='application/json',
    )
    assert project_response.status_code == 201
    project = project_response.json()

    # Create tasks with different data
    task1_data = {'text': 'task1', 'category': 'A'}
    task1_response = business_client.post(
        f'/api/projects/{project["id"]}/tasks',
        data=json.dumps({'data': task1_data}),
        content_type='application/json',
    )
    assert task1_response.status_code == 201
    task1 = task1_response.json()

    task2_data = {'text': 'task2', 'category': 'B'}
    task2_response = business_client.post(
        f'/api/projects/{project["id"]}/tasks',
        data=json.dumps({'data': task2_data}),
        content_type='application/json',
    )
    assert task2_response.status_code == 201
    task2 = task2_response.json()

    task3_data = {'text': 'task3', 'category': 'A'}
    task3_response = business_client.post(
        f'/api/projects/{project["id"]}/tasks',
        data=json.dumps({'data': task3_data}),
        content_type='application/json',
    )
    assert task3_response.status_code == 201
    task3 = task3_response.json()

    # Create a view with nested filters
    # Parent filter: tasks with category 'A'
    # Child filter: tasks with text containing 'task1'
    nested_filter_payload = {
        'project': project['id'],
        'data': {
            'filters': {
                'conjunction': 'and',
                'items': [
                    {
                        'filter': 'filter:tasks:data.category',
                        'operator': 'equal',
                        'type': 'String',
                        'value': 'A',
                        'child_filter': {
                            'filter': 'filter:tasks:data.text',
                            'operator': 'contains',
                            'type': 'String',
                            'value': 'task1',
                        },
                    }
                ],
            }
        },
    }

    response = business_client.post(
        '/api/dm/views/',
        data=json.dumps(nested_filter_payload),
        content_type='application/json',
    )
    assert response.status_code == 201, response.content
    view_id = response.json()['id']

    # Retrieve the created view and verify the nested structure
    response = business_client.get(f'/api/dm/views/{view_id}/')
    assert response.status_code == 200, response.content

    view_data = response.json()['data']
    filter_data = view_data['filters']

    # Verify the filter structure
    assert filter_data['conjunction'] == 'and'
    assert len(filter_data['items']) == 1

    root_filter = filter_data['items'][0]
    assert root_filter['filter'] == 'filter:tasks:data.category'
    assert root_filter['operator'] == 'equal'
    assert root_filter['type'] == 'String'
    assert root_filter['value'] == 'A'

    # Verify child filter structure
    assert 'child_filter' in root_filter
    child_filter = root_filter['child_filter']
    assert child_filter['filter'] == 'filter:tasks:data.text'
    assert child_filter['operator'] == 'contains'
    assert child_filter['type'] == 'String'
    assert child_filter['value'] == 'task1'

    # Test that the view filters tasks correctly
    # Only task1 should match: category='A' AND text contains 'task1'
    response = business_client.get(f'/api/tasks?view={view_id}')
    assert response.status_code == 200, response.content

    tasks = response.json()['tasks']
    assert len(tasks) == 1
    assert tasks[0]['id'] == task1['id']

    # Test with a different nested filter structure
    # Parent filter: tasks with category 'A' or 'B'
    # Child filter: tasks with text containing 'task'
    complex_nested_payload = {
        'project': project['id'],
        'data': {
            'filters': {
                'conjunction': 'or',
                'items': [
                    {
                        'filter': 'filter:tasks:data.category',
                        'operator': 'equal',
                        'type': 'String',
                        'value': 'A',
                        'child_filter': {
                            'filter': 'filter:tasks:data.text',
                            'operator': 'contains',
                            'type': 'String',
                            'value': 'task',
                        },
                    },
                    {
                        'filter': 'filter:tasks:data.category',
                        'operator': 'equal',
                        'type': 'String',
                        'value': 'B',
                        'child_filter': {
                            'filter': 'filter:tasks:data.text',
                            'operator': 'contains',
                            'type': 'String',
                            'value': 'task',
                        },
                    },
                ],
            }
        },
    }

    response = business_client.post(
        '/api/dm/views/',
        data=json.dumps(complex_nested_payload),
        content_type='application/json',
    )
    assert response.status_code == 201, response.content
    complex_view_id = response.json()['id']

    # Test the complex nested filter
    response = business_client.get(f'/api/tasks?view={complex_view_id}')
    assert response.status_code == 200, response.content

    tasks = response.json()['tasks']
    # Should match all tasks: (category='A' AND text contains 'task') OR (category='B' AND text contains 'task')
    assert len(tasks) == 3
    task_ids = [task['id'] for task in tasks]
    assert task1['id'] in task_ids
    assert task2['id'] in task_ids
    assert task3['id'] in task_ids


def test_views_api_patch_add_child_filter(business_client, project_id):
    """Test creating a view with a non-nested filter, then PATCHing it to add a child filter.

    This test validates the behavior of updating a view's filter structure by adding
    child filters to existing filters through PATCH requests.
    """
    # Create a project with specific label config for testing
    project_response = business_client.post(
        '/api/projects/',
        data=json.dumps(
            {
                'title': 'test_patch_child_filter',
                'label_config': """
                <View>
                  <Text name="text" value="$text"></Text>
                  <Choices name="choice" toName="text">
                    <Choice value="A" />
                    <Choice value="B" />
                  </Choices>
                  <Labels name="labels" toName="text">
                    <Label value="Label 1" />
                    <Label value="Label 2" />
                  </Labels>
                </View>
            """,
            }
        ),
        content_type='application/json',
    )
    assert project_response.status_code == 201
    project = project_response.json()

    # Create tasks with different data
    task1_data = {'text': 'task1', 'category': 'A'}
    task1_response = business_client.post(
        f'/api/projects/{project["id"]}/tasks',
        data=json.dumps({'data': task1_data}),
        content_type='application/json',
    )
    assert task1_response.status_code == 201
    task1 = task1_response.json()

    task2_data = {'text': 'task2', 'category': 'A'}
    task2_response = business_client.post(
        f'/api/projects/{project["id"]}/tasks',
        data=json.dumps({'data': task2_data}),
        content_type='application/json',
    )
    assert task2_response.status_code == 201
    task2 = task2_response.json()

    task3_data = {'text': 'task3', 'category': 'B'}
    task3_response = business_client.post(
        f'/api/projects/{project["id"]}/tasks',
        data=json.dumps({'data': task3_data}),
        content_type='application/json',
    )
    assert task3_response.status_code == 201
    task3 = task3_response.json()

    # Step 1: Create a view with a non-nested filter
    # Filter: tasks with category 'A'
    simple_filter_payload = {
        'project': project['id'],
        'data': {
            'filters': {
                'conjunction': 'and',
                'items': [
                    {
                        'filter': 'filter:tasks:data.category',
                        'operator': 'equal',
                        'type': 'String',
                        'value': 'A',
                    }
                ],
            }
        },
    }

    response = business_client.post(
        '/api/dm/views/',
        data=json.dumps(simple_filter_payload),
        content_type='application/json',
    )
    assert response.status_code == 201, response.content
    view_id = response.json()['id']

    # Verify the initial view has no child filters
    response = business_client.get(f'/api/dm/views/{view_id}/')
    assert response.status_code == 200, response.content

    view_data = response.json()['data']
    filter_data = view_data['filters']

    # Verify the initial filter structure (no child filters)
    assert filter_data['conjunction'] == 'and'
    assert len(filter_data['items']) == 1

    root_filter = filter_data['items'][0]
    assert root_filter['filter'] == 'filter:tasks:data.category'
    assert root_filter['operator'] == 'equal'
    assert root_filter['type'] == 'String'
    assert root_filter['value'] == 'A'

    # Verify no child filter exists initially
    assert 'child_filter' not in root_filter

    # Test that the initial view filters tasks correctly
    # Should match task1 and task2 (both have category='A')
    response = business_client.get(f'/api/tasks?view={view_id}')
    assert response.status_code == 200, response.content

    tasks = response.json()['tasks']
    assert len(tasks) == 2
    task_ids = [task['id'] for task in tasks]
    assert task1['id'] in task_ids
    assert task2['id'] in task_ids
    assert task3['id'] not in task_ids

    # Step 2: PATCH the view to add a child filter
    # Add child filter: tasks with text containing 'task1'
    patch_payload = {
        'data': {
            'filters': {
                'conjunction': 'and',
                'items': [
                    {
                        'filter': 'filter:tasks:data.category',
                        'operator': 'equal',
                        'type': 'String',
                        'value': 'A',
                        'child_filter': {
                            'filter': 'filter:tasks:data.text',
                            'operator': 'contains',
                            'type': 'String',
                            'value': 'task1',
                        },
                    }
                ],
            }
        },
    }

    response = business_client.patch(
        f'/api/dm/views/{view_id}/',
        data=json.dumps(patch_payload),
        content_type='application/json',
    )
    assert response.status_code == 200, response.content

    # Step 3: Verify the PATCHed view has the child filter
    response = business_client.get(f'/api/dm/views/{view_id}/')
    assert response.status_code == 200, response.content

    view_data = response.json()['data']
    filter_data = view_data['filters']

    # Verify the updated filter structure (now has child filter)
    assert filter_data['conjunction'] == 'and'
    assert len(filter_data['items']) == 1

    root_filter = filter_data['items'][0]
    assert root_filter['filter'] == 'filter:tasks:data.category'
    assert root_filter['operator'] == 'equal'
    assert root_filter['type'] == 'String'
    assert root_filter['value'] == 'A'

    # Verify child filter was added
    assert 'child_filter' in root_filter
    child_filter = root_filter['child_filter']
    assert child_filter['filter'] == 'filter:tasks:data.text'
    assert child_filter['operator'] == 'contains'
    assert child_filter['type'] == 'String'
    assert child_filter['value'] == 'task1'

    # Step 4: Test that the PATCHed view filters tasks correctly
    # Should now only match task1: category='A' AND text contains 'task1'
    response = business_client.get(f'/api/tasks?view={view_id}')
    assert response.status_code == 200, response.content

    tasks = response.json()['tasks']
    assert len(tasks) == 1
    assert tasks[0]['id'] == task1['id']

    # Step 5: PATCH again to modify the child filter
    # Change child filter to: tasks with text containing 'task'
    patch_payload_2 = {
        'data': {
            'filters': {
                'conjunction': 'and',
                'items': [
                    {
                        'filter': 'filter:tasks:data.category',
                        'operator': 'equal',
                        'type': 'String',
                        'value': 'A',
                        'child_filter': {
                            'filter': 'filter:tasks:data.text',
                            'operator': 'contains',
                            'type': 'String',
                            'value': 'task',
                        },
                    }
                ],
            }
        },
    }

    response = business_client.patch(
        f'/api/dm/views/{view_id}/',
        data=json.dumps(patch_payload_2),
        content_type='application/json',
    )
    assert response.status_code == 200, response.content

    # Step 6: Verify the child filter was updated
    response = business_client.get(f'/api/dm/views/{view_id}/')
    assert response.status_code == 200, response.content

    view_data = response.json()['data']
    filter_data = view_data['filters']

    root_filter = filter_data['items'][0]
    child_filter = root_filter['child_filter']
    assert child_filter['value'] == 'task'  # Updated value

    # Test that the updated view filters tasks correctly
    # Should now match task1 and task2: category='A' AND text contains 'task'
    response = business_client.get(f'/api/tasks?view={view_id}')
    assert response.status_code == 200, response.content

    tasks = response.json()['tasks']
    assert len(tasks) == 2
    task_ids = [task['id'] for task in tasks]
    assert task1['id'] in task_ids
    assert task2['id'] in task_ids
    assert task3['id'] not in task_ids


def test_views_ordered_by_id(business_client, project_id):
    views = [{'view_data': 1}, {'view_data': 2}, {'view_data': 3}]

    for view in views:
        payload = dict(project=project_id, data=view)

        business_client.post(
            '/api/dm/views/',
            data=json.dumps(payload),
            content_type='application/json',
        )

    response = business_client.get('/api/dm/views/')
    data = response.json()
    assert response.status_code == status.HTTP_200_OK

    ids = [view['id'] for view in data]
    assert ids == sorted(ids)


def test_update_views_order(business_client, project_id):
    # Create views
    views = [{'view_data': 1}, {'view_data': 2}, {'view_data': 3}]

    view_ids = []
    for view in views:
        payload = dict(project=project_id, data=view)
        response = business_client.post(
            '/api/dm/views/',
            data=json.dumps(payload),
            content_type='application/json',
        )
        assert response.status_code == status.HTTP_201_CREATED
        view_ids.append(response.json()['id'])

    # Update the order of views
    new_order = {'project': project_id, 'ids': [view_ids[2], view_ids[0], view_ids[1]]}
    response = business_client.post(
        '/api/dm/views/order/',
        data=json.dumps(new_order),
        content_type='application/json',
    )
    assert response.status_code == status.HTTP_200_OK

    # Verify the new order
    response = business_client.get('/api/dm/views/')
    data = response.json()
    assert response.status_code == status.HTTP_200_OK

    returned_ids = [view['id'] for view in data]
    assert returned_ids == new_order['ids']
