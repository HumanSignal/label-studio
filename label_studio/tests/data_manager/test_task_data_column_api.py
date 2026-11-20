"""POST /api/projects/<id>/tasks/data-column/: one task.data key, a different value per task."""

import json
from datetime import timedelta
from unittest.mock import patch

import pytest
from data_manager.actions.data_columns import _json_value, _record_data_column_in_summary
from django.db import connection
from django.test import override_settings
from django.test.utils import CaptureQueriesContext
from django.utils import timezone
from projects.models import Project
from tasks.models import Task

pytestmark = pytest.mark.django_db


@pytest.fixture
def columns_enabled():
    with patch('data_manager.actions.data_columns.flag_set', return_value=True):
        yield


@pytest.fixture
def project(business_client):
    return Project.objects.create(
        title='Per-task column', created_by=business_client.user, organization=business_client.organization
    )


def _post(client, project, payload):
    return client.post(
        f'/api/projects/{project.id}/tasks/data-column/', data=json.dumps(payload), content_type='application/json'
    )


def _data(*tasks):
    return [Task.objects.get(id=task.id).data for task in tasks]


def test_new_column_sets_each_value_on_listed_tasks_only(business_client, project, columns_enabled):
    """A new column gets each listed task's own value; other keys and unlisted tasks are left as they were."""
    first = Task.objects.create(project=project, data={'text': 'a'})
    second = Task.objects.create(project=project, data={'text': 'b'})
    third = Task.objects.create(project=project, data={'text': 'c'})
    untouched = Task.objects.create(project=project, data={'text': 'd'})
    week_ago = timezone.now() - timedelta(days=7)
    Task.objects.filter(project=project).update(updated_at=week_ago)

    response = _post(
        business_client,
        project,
        {
            'column_name': 'feedback',
            'values': {str(first.id): 'Box 3 is missing', str(second.id): '  indented\n', str(third.id): ''},
        },
    )

    assert response.status_code == 200, response.content
    assert response.json() == {'updated_task_ids': [first.id, second.id, third.id], 'not_found_task_ids': []}
    assert _data(first, second, third, untouched) == [
        {'text': 'a', 'feedback': 'Box 3 is missing'},
        {'text': 'b', 'feedback': '  indented\n'},
        {'text': 'c', 'feedback': ''},
        {'text': 'd'},
    ]
    assert Task.objects.get(id=first.id).updated_at > week_ago
    assert Task.objects.get(id=untouched.id).updated_at == week_ago
    project.summary.refresh_from_db()
    assert project.summary.all_data_columns['feedback'] == 3
    assert 'feedback' not in project.summary.common_data_columns


def test_ids_outside_the_project_are_reported_and_untouched(business_client, project, columns_enabled):
    """Ids of another project's tasks and ids that do not exist come back as not found."""
    other_project = Project.objects.create(
        title='Other', created_by=business_client.user, organization=business_client.organization
    )
    foreign = Task.objects.create(project=other_project, data={'text': 'x'})
    mine = Task.objects.create(project=project, data={'text': 'y'})
    missing_id = foreign.id + 1000
    beyond_id_range = 2**31  # above the 32-bit task id column: not found, not a database error

    response = _post(
        business_client,
        project,
        {
            'column_name': 'feedback',
            'values': {str(mine.id): 'ok', str(foreign.id): 'no', str(missing_id): 'no', str(beyond_id_range): 'no'},
        },
    )

    assert response.status_code == 200, response.content
    assert response.json() == {
        'updated_task_ids': [mine.id],
        'not_found_task_ids': sorted([foreign.id, missing_id, beyond_id_range]),
    }
    assert _data(mine, foreign) == [{'text': 'y', 'feedback': 'ok'}, {'text': 'x'}]


def test_existing_column_counts_only_tasks_that_gain_it(business_client, project, columns_enabled):
    """Updating an existing column keeps unlisted values and grows the summary count only by new keys."""
    has_it = Task.objects.create(project=project, data={'priority': 'low'})
    lacks_it = Task.objects.create(project=project, data={'text': 'x'})
    unlisted = Task.objects.create(project=project, data={'priority': 'medium'})
    project.summary.refresh_from_db()  # creating tasks already counted their keys
    assert project.summary.all_data_columns['priority'] == 2
    project.summary.common_data_columns = []  # no key is on every task yet
    project.summary.save(update_fields=['common_data_columns'])

    response = _post(
        business_client,
        project,
        {'column_name': 'priority', 'values': {str(has_it.id): 'high', str(lacks_it.id): 'top'}},
    )

    assert response.status_code == 200, response.content
    assert _data(has_it, lacks_it, unlisted) == [
        {'priority': 'high'},
        {'text': 'x', 'priority': 'top'},
        {'priority': 'medium'},
    ]
    project.summary.refresh_from_db()
    assert project.summary.all_data_columns['priority'] == 3
    # Every task of the project now has the column, so it becomes a common column.
    assert 'priority' in project.summary.common_data_columns


def test_column_missing_from_a_stale_summary_is_restored(business_client, project, columns_enabled):
    """Tasks already have the key but the summary lost it: the column is listed again with its real count."""
    first = Task.objects.create(project=project, data={'priority': 'low'})
    Task.objects.create(project=project, data={'priority': 'medium'})
    Task.objects.create(project=project, data={'text': 'x'})
    project.summary.all_data_columns = {}
    project.summary.save(update_fields=['all_data_columns'])

    response = _post(business_client, project, {'column_name': 'priority', 'values': {str(first.id): 'high'}})

    assert response.status_code == 200, response.content
    project.summary.refresh_from_db()
    assert project.summary.all_data_columns == {'priority': 2}


def test_number_values_are_stored_as_numbers(business_client, project, columns_enabled):
    first = Task.objects.create(project=project, data={'text': 'a'})
    second = Task.objects.create(project=project, data={'text': 'b'})

    response = _post(
        business_client,
        project,
        {'column_name': 'score', 'value_type': 'Number', 'values': {str(first.id): 3, str(second.id): '2.5'}},
    )

    assert response.status_code == 200, response.content
    assert _data(first, second) == [{'text': 'a', 'score': 3.0}, {'text': 'b', 'score': 2.5}]


@pytest.mark.parametrize('bad_value', ['abc', True, None, 'NaN', 'Infinity', [1]])
def test_invalid_number_rejects_the_whole_request(business_client, project, columns_enabled, bad_value):
    good = Task.objects.create(project=project, data={'text': 'a'})
    bad = Task.objects.create(project=project, data={'text': 'b'})

    response = _post(
        business_client,
        project,
        {'column_name': 'score', 'value_type': 'Number', 'values': {str(good.id): 1, str(bad.id): bad_value}},
    )

    assert response.status_code == 400, response.content
    assert list(response.json()['validation_errors']['values']) == [str(bad.id)]
    assert _data(good, bad) == [{'text': 'a'}, {'text': 'b'}]


@pytest.mark.parametrize(
    'payload_values',
    [
        pytest.param({}, id='empty'),
        pytest.param({'abc': 'x'}, id='key-not-a-number'),
        pytest.param({'0': 'x'}, id='key-zero'),
        pytest.param({'-1': 'x'}, id='key-negative'),
        pytest.param({'01': 'x'}, id='key-leading-zero'),
        pytest.param({'1.5': 'x'}, id='key-decimal'),
        pytest.param({'1' * 30: 'x'}, id='key-too-long'),
        pytest.param({'{task}': None}, id='string-null'),
        pytest.param({'{task}': True}, id='string-bool'),
        pytest.param({'{task}': ['a']}, id='string-list'),
        pytest.param({'{task}': {'a': 1}}, id='string-dict'),
        pytest.param({'{task}': 'nul\x00char'}, id='string-nul-char'),
        pytest.param({'{task}': 'lone \ud800 surrogate'}, id='string-surrogate'),
        pytest.param({'{task}': 'x' * 6}, id='string-too-long'),
        pytest.param({'{task}': 'a', '{other}': 'b', '{third}': 'c'}, id='too-many-tasks'),
    ],
)
@override_settings(TASK_DATA_COLUMN_MAX_TASKS=2, TASK_DATA_COLUMN_MAX_VALUE_LENGTH=5)
def test_invalid_values_are_rejected_and_nothing_is_written(business_client, project, columns_enabled, payload_values):
    tasks = [Task.objects.create(project=project, data={'text': str(index)}) for index in range(3)]
    ids = {'{task}': str(tasks[0].id), '{other}': str(tasks[1].id), '{third}': str(tasks[2].id)}
    values = {ids.get(key, key): value for key, value in payload_values.items()}

    response = _post(business_client, project, {'column_name': 'feedback', 'values': values})

    assert response.status_code == 400, response.content
    assert 'values' in response.json()['validation_errors']
    assert all('feedback' not in data for data in _data(*tasks))


def test_new_column_name_must_be_queryable(business_client, project, columns_enabled):
    task = Task.objects.create(project=project, data={'text': 'a'})

    response = _post(business_client, project, {'column_name': 'my column', 'values': {str(task.id): 'x'}})

    assert response.status_code == 400, response.content
    assert 'column_name' in response.json()['validation_errors']
    assert _data(task) == [{'text': 'a'}]
    project.summary.refresh_from_db()
    assert 'my column' not in project.summary.all_data_columns


def test_existing_column_with_legacy_name_stays_writable(business_client, project, columns_enabled):
    """Imported spreadsheet headers with spaces remain editable, as in the Add or Update Columns action."""
    task = Task.objects.create(project=project, data={'my column': 'old'})

    response = _post(business_client, project, {'column_name': 'my column', 'values': {str(task.id): 'new'}})

    assert response.status_code == 200, response.content
    assert _data(task) == [{'my column': 'new'}]


def test_disabled_feature_flag_rejects_the_request(business_client, project):
    task = Task.objects.create(project=project, data={'text': 'a'})

    with patch('data_manager.actions.data_columns.flag_set', return_value=False):
        response = _post(business_client, project, {'column_name': 'feedback', 'values': {str(task.id): 'x'}})

    assert response.status_code == 403, response.content
    assert _data(task) == [{'text': 'a'}]


def test_other_organization_cannot_see_the_project(annotator_client, business_client, project, columns_enabled):
    task = Task.objects.create(project=project, data={'text': 'a'})

    response = _post(annotator_client, project, {'column_name': 'feedback', 'values': {str(task.id): 'x'}})

    assert response.status_code == 404, response.content
    assert _data(task) == [{'text': 'a'}]


@override_settings(ADD_OR_MODIFY_COLUMNS_ASYNC_THRESHOLD=1)
def test_large_project_is_written_synchronously_without_a_null_fill(business_client, project, columns_enabled):
    """Above the action's background threshold the endpoint still writes only the listed tasks, right away."""
    listed = Task.objects.create(project=project, data={'text': 'a'})
    unlisted = [Task.objects.create(project=project, data={'text': str(index)}) for index in range(3)]

    with patch('data_manager.actions.data_columns.start_job_async_or_sync') as start_job:
        response = _post(business_client, project, {'column_name': 'feedback', 'values': {str(listed.id): 'x'}})

    assert response.status_code == 200, response.content
    start_job.assert_not_called()
    assert _data(listed) == [{'text': 'a', 'feedback': 'x'}]
    assert all('feedback' not in data for data in _data(*unlisted))


@override_settings(UPDATE_COLUMN_BATCH_SIZE=2)
def test_values_stay_with_their_tasks_across_write_batches(business_client, project, columns_enabled):
    tasks = [Task.objects.create(project=project, data={'text': str(index)}) for index in range(5)]

    response = _post(
        business_client,
        project,
        {'column_name': 'feedback', 'values': {str(task.id): f'value {task.id}' for task in tasks}},
    )

    assert response.status_code == 200, response.content
    assert [data['feedback'] for data in _data(*tasks)] == [f'value {task.id}' for task in tasks]


@override_settings(UPDATE_COLUMN_BATCH_SIZE=1)
def test_failure_in_a_later_batch_writes_nothing(business_client, project, columns_enabled):
    """The listed tasks are written in one transaction: an error in the second batch undoes the first."""
    first = Task.objects.create(project=project, data={'text': 'a'})
    second = Task.objects.create(project=project, data={'text': 'b'})

    with patch('data_manager.actions.data_columns._json_value', side_effect=[_json_value('x'), RuntimeError('boom')]):
        response = _post(
            business_client, project, {'column_name': 'feedback', 'values': {str(first.id): 'x', str(second.id): 'y'}}
        )

    assert response.status_code == 500
    assert _data(first, second) == [{'text': 'a'}, {'text': 'b'}]


@pytest.mark.skipif(not connection.features.has_select_for_update, reason='row locks need PostgreSQL')
def test_listed_tasks_are_locked_in_id_order_before_writing(business_client, project, columns_enabled):
    """Row locks taken in id order decide the updated ids, so concurrent writers and deletes cannot skew them."""
    tasks = [Task.objects.create(project=project, data={'text': str(index)}) for index in range(2)]

    with CaptureQueriesContext(connection) as queries:
        response = _post(
            business_client, project, {'column_name': 'feedback', 'values': {str(task.id): 'x' for task in tasks}}
        )

    assert response.status_code == 200, response.content
    task_locks = [
        query['sql'] for query in queries.captured_queries if 'FOR UPDATE' in query['sql'] and '"task"' in query['sql']
    ]
    assert len(task_locks) == 1
    assert 'ORDER BY 1 ASC FOR UPDATE' in task_locks[0]


def test_column_name_is_used_exactly_as_sent(business_client, project, columns_enabled):
    """A padded legacy key is written as is (not trimmed onto another key); a new padded name is rejected."""
    task = Task.objects.create(project=project, data={' feedback ': 'old padded', 'feedback': 'old plain'})

    response = _post(business_client, project, {'column_name': ' feedback ', 'values': {str(task.id): 'new'}})
    assert response.status_code == 200, response.content
    assert _data(task) == [{' feedback ': 'new', 'feedback': 'old plain'}]

    response = _post(business_client, project, {'column_name': ' comment ', 'values': {str(task.id): 'x'}})
    assert response.status_code == 400, response.content
    assert 'column_name' in response.json()['validation_errors']


def test_parallel_batches_that_complete_coverage_make_the_column_common(business_client, project):
    """Two requests that each wrote half of the project still list the column as common when coverage is complete.

    Each request read the summary before the other one wrote, as when an integration sends batches in parallel.
    """
    first = Task.objects.create(project=project, data={'text': 'a'})
    second = Task.objects.create(project=project, data={'text': 'b'})
    project.summary.common_data_columns = ['text']
    project.summary.save(update_fields=['common_data_columns'])
    request_a, request_b = Project.objects.get(id=project.id), Project.objects.get(id=project.id)
    assert request_a.summary.all_data_columns == request_b.summary.all_data_columns == {'text': 2}
    Task.objects.filter(id=first.id).update(data={'text': 'a', 'feedback': 'x'})
    Task.objects.filter(id=second.id).update(data={'text': 'b', 'feedback': 'y'})

    _record_data_column_in_summary(request_a, 'feedback', newly_keyed=1, updated_count=1, mode='add')
    _record_data_column_in_summary(request_b, 'feedback', newly_keyed=1, updated_count=1, mode='add')

    project.summary.refresh_from_db()
    assert project.summary.all_data_columns['feedback'] == 2
    assert project.summary.common_data_columns == ['feedback', 'text']
