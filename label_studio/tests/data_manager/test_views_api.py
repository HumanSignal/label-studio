"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license."""

import json
from unittest.mock import patch

import pytest
from data_manager.models import View
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
                        'child_filters': [],
                    },
                    {
                        'filter': 'filter:tasks:data.image',
                        'operator': 'equal',
                        'type': 'Image',
                        'value': {},
                        'child_filters': [],
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
                        'child_filters': [],
                    },
                    {
                        'filter': 'filter:tasks:data.text',
                        'operator': 'contains',
                        'type': 'Text',
                        'value': {},
                        'child_filters': [],
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


def _wire_filter(name):
    return {
        'filter': f'filter:tasks:data.{name}',
        'operator': 'equal',
        'type': 'String',
        'value': name,
    }


def test_views_api_accepts_legacy_singular_child_filter(business_client, project_id):
    """Legacy singular input is accepted but read responses use the canonical plural field."""
    child = _wire_filter('legacy-child')
    parent = {**_wire_filter('parent'), 'child_filter': child}
    payload = {
        'project': project_id,
        'data': {'filters': {'conjunction': 'and', 'items': [parent]}},
    }

    response = business_client.post('/api/dm/views/', data=json.dumps(payload), content_type='application/json')

    assert response.status_code == status.HTTP_201_CREATED, response.content
    response = business_client.get(f'/api/dm/views/{response.json()["id"]}/')
    assert response.status_code == status.HTTP_200_OK, response.content
    serialized_parent = response.json()['data']['filters']['items'][0]
    assert 'child_filter' not in serialized_parent
    assert serialized_parent['child_filters'] == [child]


def test_views_api_persists_ordered_child_filters(business_client, project_id):
    """Plural child filters persist as siblings and preserve wire order through read and runtime paths."""
    children = [_wire_filter('first-child'), _wire_filter('second-child')]
    parent = {**_wire_filter('parent'), 'child_filters': children}
    payload = {
        'project': project_id,
        'data': {'filters': {'conjunction': 'and', 'items': [parent]}},
    }

    response = business_client.post('/api/dm/views/', data=json.dumps(payload), content_type='application/json')

    assert response.status_code == status.HTTP_201_CREATED, response.content
    view = View.objects.get(pk=response.json()['id'])
    persisted_parent = view.filter_group.filters.get(parent__isnull=True)
    assert persisted_parent.children.count() == 2
    assert set(persisted_parent.children.values_list('column', flat=True)) == {child['filter'] for child in children}

    response = business_client.get(f'/api/dm/views/{view.id}/')
    assert response.status_code == status.HTTP_200_OK, response.content
    serialized_parent = response.json()['data']['filters']['items'][0]
    assert 'child_filter' not in serialized_parent
    assert serialized_parent['child_filters'] == children

    runtime_parent = view.get_prepare_tasks_params().filters.items[0]
    assert [child.filter for child in runtime_parent.child_filters] == [child['filter'] for child in children]


def test_views_api_emits_explicit_empty_child_filters(business_client, project_id):
    """An empty plural list must survive a round trip so legacy defaults are not resurrected."""
    parent = {**_wire_filter('parent'), 'child_filters': []}
    payload = {
        'project': project_id,
        'data': {'filters': {'conjunction': 'and', 'items': [parent]}},
    }

    response = business_client.post('/api/dm/views/', data=json.dumps(payload), content_type='application/json')

    assert response.status_code == status.HTTP_201_CREATED, response.content
    response = business_client.get(f'/api/dm/views/{response.json()["id"]}/')
    assert response.status_code == status.HTTP_200_OK, response.content
    serialized_parent = response.json()['data']['filters']['items'][0]
    assert 'child_filter' not in serialized_parent
    assert serialized_parent['child_filters'] == []


def test_persisted_invalid_user_filter_is_recovered_without_weakening_new_writes(business_client, project_id):
    """Historical ORM rows recover safely, while equivalent new API writes remain strict."""
    valid_filter = {
        'filter': 'filter:tasks:annotators',
        'operator': 'contains',
        'type': 'List',
        'value': [business_client.user.id],
        'child_filters': [],
    }
    payload = {
        'project': project_id,
        'data': {'filters': {'conjunction': 'and', 'items': [valid_filter]}},
    }
    response = business_client.post('/api/dm/views/', data=json.dumps(payload), content_type='application/json')
    assert response.status_code == status.HTTP_201_CREATED, response.content
    view = View.objects.get(pk=response.json()['id'])

    persisted_filter = view.filter_group.filters.get(parent__isnull=True)
    persisted_filter.value = ['yes']
    persisted_filter.save(update_fields=['value'])

    response = business_client.get(f'/api/dm/views/{view.id}/')
    assert response.status_code == status.HTTP_200_OK, response.content
    assert response.json()['data']['filters']['items'][0]['value'] == []

    response = business_client.get(f'/api/tasks?view={view.id}')
    assert response.status_code == status.HTTP_200_OK, response.content

    invalid_payload = {
        'project': project_id,
        'data': {
            'filters': {
                'conjunction': 'and',
                'items': [{**valid_filter, 'value': ['yes']}],
            }
        },
    }
    response = business_client.post(
        '/api/dm/views/',
        data=json.dumps(invalid_payload),
        content_type='application/json',
    )
    assert response.status_code == status.HTTP_400_BAD_REQUEST, response.content


def test_persisted_invalid_child_user_filter_is_recovered_recursively(business_client, project_id):
    """The same compatibility normalization applies to child rows without dropping the parent."""
    child = {
        'filter': 'filter:tasks:annotators',
        'operator': 'contains',
        'type': 'List',
        'value': [business_client.user.id],
    }
    parent = {**_wire_filter('parent'), 'child_filters': [child]}
    payload = {
        'project': project_id,
        'data': {'filters': {'conjunction': 'and', 'items': [parent]}},
    }
    response = business_client.post('/api/dm/views/', data=json.dumps(payload), content_type='application/json')
    assert response.status_code == status.HTTP_201_CREATED, response.content
    view = View.objects.get(pk=response.json()['id'])

    persisted_child = view.filter_group.filters.get(parent__isnull=False)
    persisted_child.value = {
        'items': [{'value': str(business_client.user.id), 'title': 'Current user'}],
        'multiple': True,
    }
    persisted_child.save(update_fields=['value'])

    response = business_client.get(f'/api/dm/views/{view.id}/')
    assert response.status_code == status.HTTP_200_OK, response.content
    serialized_parent = response.json()['data']['filters']['items'][0]
    assert serialized_parent['value'] == 'parent'
    assert serialized_parent['child_filters'][0]['value'] == [business_client.user.id]

    response = business_client.get(f'/api/tasks?view={view.id}')
    assert response.status_code == status.HTTP_200_OK, response.content


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

    # Legacy singular input is emitted in the canonical plural shape.
    assert 'child_filter' not in root_filter
    assert len(root_filter['child_filters']) == 1
    child_filter = root_filter['child_filters'][0]
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

    # Verify child filter was added using the canonical plural response shape.
    assert 'child_filter' not in root_filter
    assert len(root_filter['child_filters']) == 1
    child_filter = root_filter['child_filters'][0]
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
    child_filter = root_filter['child_filters'][0]
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
    assert response.status_code == status.HTTP_204_NO_CONTENT

    # Verify the new order
    response = business_client.get('/api/dm/views/')
    data = response.json()
    assert response.status_code == status.HTTP_200_OK

    returned_ids = [view['id'] for view in data]
    assert returned_ids == new_order['ids']


def test_manager_can_lock_and_unlock_view(business_client, project_id):
    response = business_client.post(
        '/api/dm/views/',
        data=json.dumps(dict(project=project_id, data={'title': 'Review queue'})),
        content_type='application/json',
    )
    assert response.status_code == status.HTTP_201_CREATED
    view_id = response.json()['id']

    response = business_client.patch(
        f'/api/dm/views/{view_id}/',
        data=json.dumps({'is_locked': True}),
        content_type='application/json',
    )

    assert response.status_code == status.HTTP_200_OK, response.content
    assert response.json()['is_locked'] is True
    assert response.json()['locked_by'] == {
        'id': business_client.user.id,
        'name': business_client.user.email,
        'email': business_client.user.email,
    }
    assert response.json()['locked_at'] is not None

    response = business_client.patch(
        f'/api/dm/views/{view_id}/',
        data=json.dumps({'is_locked': False}),
        content_type='application/json',
    )

    assert response.status_code == status.HTTP_200_OK, response.content
    assert response.json()['is_locked'] is False
    assert response.json()['locked_by'] is None
    assert response.json()['locked_at'] is None


def test_non_manager_cannot_lock_view(business_client, project_id):
    response = business_client.post(
        '/api/dm/views/',
        data=json.dumps(dict(project=project_id, data={'title': 'Review queue'})),
        content_type='application/json',
    )
    assert response.status_code == status.HTTP_201_CREATED
    view_id = response.json()['id']

    with patch('data_manager.serializers.user_can_manage_view_lock', return_value=False):
        response = business_client.patch(
            f'/api/dm/views/{view_id}/',
            data=json.dumps({'is_locked': True}),
            content_type='application/json',
        )

    assert response.status_code == status.HTTP_403_FORBIDDEN
    assert response.json()['detail'] == 'Only managers can lock or unlock tabs.'


def test_locked_view_ignores_configuration_update(business_client, project_id):
    response = business_client.post(
        '/api/dm/views/',
        data=json.dumps(dict(project=project_id, data={'title': 'Review queue'})),
        content_type='application/json',
    )
    assert response.status_code == status.HTTP_201_CREATED
    view_id = response.json()['id']

    response = business_client.patch(
        f'/api/dm/views/{view_id}/',
        data=json.dumps({'is_locked': True}),
        content_type='application/json',
    )
    assert response.status_code == status.HTTP_200_OK, response.content

    response = business_client.patch(
        f'/api/dm/views/{view_id}/',
        data=json.dumps({'data': {'title': 'Review queue', 'type': 'grid'}}),
        content_type='application/json',
    )

    # Locked views silently ignore non-allowed configuration changes and return 200.
    # The frontend always sends full snapshots, so silent-ignore avoids false 409s
    # when stale snapshot fields happen to differ from current DB state.
    assert response.status_code == status.HTTP_200_OK
    view = business_client.get(f'/api/dm/views/{view_id}/').json()
    assert view['data'].get('type') != 'grid'


def test_locked_view_can_still_be_reordered(business_client, project_id):
    view_ids = []
    for index in range(3):
        response = business_client.post(
            '/api/dm/views/',
            data=json.dumps(dict(project=project_id, data={'title': f'View {index}'})),
            content_type='application/json',
        )
        assert response.status_code == status.HTTP_201_CREATED
        view_ids.append(response.json()['id'])

    response = business_client.patch(
        f'/api/dm/views/{view_ids[0]}/',
        data=json.dumps({'is_locked': True}),
        content_type='application/json',
    )
    assert response.status_code == status.HTTP_200_OK, response.content

    new_order = {'project': project_id, 'ids': [view_ids[2], view_ids[0], view_ids[1]]}
    response = business_client.post(
        '/api/dm/views/order/',
        data=json.dumps(new_order),
        content_type='application/json',
    )

    assert response.status_code == status.HTTP_204_NO_CONTENT
    response = business_client.get('/api/dm/views/')
    assert [view['id'] for view in response.json()] == new_order['ids']


def test_locked_view_allows_column_width_update(business_client, project_id):
    response = business_client.post(
        '/api/dm/views/',
        data=json.dumps(dict(project=project_id, data={'title': 'Review queue'})),
        content_type='application/json',
    )
    assert response.status_code == status.HTTP_201_CREATED
    view_id = response.json()['id']

    response = business_client.patch(
        f'/api/dm/views/{view_id}/',
        data=json.dumps({'is_locked': True}),
        content_type='application/json',
    )
    assert response.status_code == status.HTTP_200_OK, response.content

    response = business_client.patch(
        f'/api/dm/views/{view_id}/',
        data=json.dumps({'data': {'title': 'Review queue', 'columnsWidth': {'tasks:id': 120}}}),
        content_type='application/json',
    )
    assert response.status_code == status.HTTP_200_OK, response.content
    assert response.json()['data']['columnsWidth'] == {'tasks:id': 120}


def test_locked_view_ignores_non_width_data_changes(business_client, project_id):
    response = business_client.post(
        '/api/dm/views/',
        data=json.dumps(dict(project=project_id, data={'title': 'Review queue'})),
        content_type='application/json',
    )
    assert response.status_code == status.HTTP_201_CREATED
    view_id = response.json()['id']

    response = business_client.patch(
        f'/api/dm/views/{view_id}/',
        data=json.dumps({'is_locked': True}),
        content_type='application/json',
    )
    assert response.status_code == status.HTTP_200_OK, response.content

    # Locked tab: columnsWidth is applied, non-allowlisted fields (type) are silently ignored
    response = business_client.patch(
        f'/api/dm/views/{view_id}/',
        data=json.dumps({'data': {'title': 'Review queue', 'columnsWidth': {'tasks:id': 120}, 'type': 'grid'}}),
        content_type='application/json',
    )
    assert response.status_code == status.HTTP_200_OK, response.content
    view_data = response.json().get('data', {})
    assert view_data.get('columnsWidth') == {'tasks:id': 120}, 'columnsWidth should be updated'
    assert 'type' not in view_data, 'non-allowlisted field should not be persisted'


def test_create_view_with_filters_uses_max_order_not_count(business_client, project_id):
    """Creating a filtered view must use Max(order)+1, not count(), when orders have gaps."""
    from data_manager.models import View

    response = business_client.post(
        '/api/dm/views/',
        data=json.dumps(dict(project=project_id, data={'title': 'First'})),
        content_type='application/json',
    )
    assert response.status_code == status.HTTP_201_CREATED
    first_id = response.json()['id']

    response = business_client.post(
        '/api/dm/views/',
        data=json.dumps(dict(project=project_id, data={'title': 'Second'})),
        content_type='application/json',
    )
    assert response.status_code == status.HTTP_201_CREATED
    second_id = response.json()['id']

    # Create a gap: two views remain but max order is 5 (count would be 2).
    View.objects.filter(id=first_id).update(order=0)
    View.objects.filter(id=second_id).update(order=5)

    payload = {
        'project': project_id,
        'data': {
            'title': 'Filtered',
            'filters': {
                'conjunction': 'and',
                'items': [
                    {
                        'filter': 'filter:tasks:id',
                        'operator': 'equal',
                        'type': 'Number',
                        'value': 1,
                    }
                ],
            },
        },
    }
    response = business_client.post(
        '/api/dm/views/',
        data=json.dumps(payload),
        content_type='application/json',
    )
    assert response.status_code == status.HTTP_201_CREATED, response.content
    assert response.json()['order'] == 6, 'order must be Max+1 (6), not count() (2)'
