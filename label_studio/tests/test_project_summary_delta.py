"""Task deletes decrement ProjectSummary after commit, via an atomic delta, without holding the row in the delete."""

from collections import Counter
from unittest import mock

import fakeredis
import pytest
from core.current_request import CurrentContext
from data_manager.actions import basic as basic_actions
from data_manager.actions.basic import async_project_summary_recalculation, delete_tasks_annotations_job
from django.db import OperationalError, connection, transaction
from django.test.utils import CaptureQueriesContext
from projects.functions import summary_delta
from projects.functions.summary_delta import SummaryDelta, apply_delta
from projects.functions.utils import recalculate_created_annotations_and_labels_from_scratch
from projects.models import ProjectSummary
from psycopg import errors as pg_errors
from tasks.models import AnnotationDraft, Task
from tests.conftest import project_choices
from tests.utils import make_annotation, make_project, make_task

pytestmark = [
    pytest.mark.django_db,
    pytest.mark.skipif(connection.vendor != 'postgresql', reason='the delta SQL is PostgreSQL-only'),
]


def _choice(from_name, value):
    return {'from_name': from_name, 'to_name': 'xxx', 'type': 'choices', 'value': {'choices': [value]}}


@pytest.fixture
def flag_on():
    with mock.patch.object(summary_delta, 'flag_set_for_org_id', return_value=True) as flag:
        yield flag


@pytest.fixture
def flag_off():
    with mock.patch.object(summary_delta, 'flag_set_for_org_id', return_value=False) as flag:
        yield flag


@pytest.fixture
def populated_project(business_client):
    project = make_project(project_choices(), business_client.user, use_ml_backend=False)
    tasks = [
        make_task({'data': {'text': 'a', 'meta': 1}}, project),
        make_task({'data': {'text': 'b', 'meta': 2}}, project),
        make_task({'data': {'text': 'c', 'extra': 3}}, project),
    ]
    make_annotation({'result': [_choice('animals', 'Cat')], 'completed_by': business_client.user}, tasks[0].id)
    make_annotation({'result': [_choice('animals', 'Dog')], 'completed_by': business_client.user}, tasks[1].id)
    make_annotation(
        {'result': [_choice('animals', 'Cat'), _choice('things', 'Car')], 'completed_by': business_client.user},
        tasks[2].id,
    )
    AnnotationDraft.objects.create(task=tasks[0], user=business_client.user, result=[_choice('animals', 'Mouse')])
    AnnotationDraft.objects.create(task=tasks[2], user=business_client.user, result=[_choice('things', 'Chair')])
    _recalculate(project)
    return project, tasks


def _recalculate(project):
    summary = ProjectSummary.objects.get(project=project)
    recalculate_created_annotations_and_labels_from_scratch(project, summary, project.organization_id)


def _summary_state(project):
    summary = ProjectSummary.objects.get(project=project)
    return {
        'all_data_columns': summary.all_data_columns,
        'common_data_columns': sorted(summary.common_data_columns),
        'created_annotations': summary.created_annotations,
        'created_labels': summary.created_labels,
        'created_labels_drafts': summary.created_labels_drafts,
    }


def _counters(state):
    # common_data_columns never grows back on delete (same as the legacy path), so it is not comparable
    return {k: v for k, v in state.items() if k != 'common_data_columns'}


def _expected_from_scratch(project):
    _recalculate(project)
    return _counters(_summary_state(project))


# =========== apply_delta ===========


def test_apply_delta_subtracts_and_drops_exhausted_keys(business_client):
    project = make_project(project_choices(), business_client.user, use_ml_backend=False)
    ProjectSummary.objects.filter(project=project).update(
        all_data_columns={'text': 3, 'meta': 1, 'untouched': 0},
        common_data_columns=['text', 'meta'],
        created_annotations={'animals|xxx|choices': 2, 'things|xxx|choices': 1, 'odd': 'x'},
        created_labels={'animals': {'Cat': 2, 'Dog': 1}, 'things': {'Car': 1}, 'empty': {}},
        created_labels_drafts={'animals': {'Mouse': 1}},
    )
    delta = SummaryDelta(
        all_data_columns=Counter({'text': 1, 'meta': 1, 'missing': 4}),
        created_annotations=Counter({'animals|xxx|choices': 1, 'things|xxx|choices': 5, 'odd': 1}),
        created_labels={'animals': Counter({'Cat': 1, 'Dog': 1}), 'things': Counter({'Car': 1}), 'nope': Counter(a=1)},
        created_labels_drafts={'animals': Counter({'Mouse': 1})},
    )

    apply_delta(project.id, delta)

    state = _summary_state(project)
    # untouched keys survive even at zero; keys that are not in the summary are ignored
    assert state['all_data_columns'] == {'text': 2, 'untouched': 0}
    assert state['common_data_columns'] == ['text']
    # negative remainders are dropped and non-numeric legacy values are left alone
    assert state['created_annotations'] == {'animals|xxx|choices': 1, 'odd': 'x'}
    assert state['created_labels'] == {'animals': {'Cat': 1}, 'empty': {}}
    assert state['created_labels_drafts'] == {}


def test_apply_delta_handles_null_columns(business_client):
    project = make_project(project_choices(), business_client.user, use_ml_backend=False)
    ProjectSummary.objects.filter(project=project).update(
        all_data_columns=None, common_data_columns=None, created_annotations=None, created_labels=None
    )
    apply_delta(
        project.id,
        SummaryDelta(
            all_data_columns=Counter(text=1),
            created_annotations=Counter(a=1),
            created_labels={'animals': Counter(Cat=1)},
        ),
    )
    summary = ProjectSummary.objects.get(project=project)
    assert summary.all_data_columns == {}
    assert summary.created_annotations == {}
    assert summary.created_labels == {}


def test_apply_delta_reset_clears_column(business_client):
    project = make_project(project_choices(), business_client.user, use_ml_backend=False)
    ProjectSummary.objects.filter(project=project).update(
        created_annotations={'garbled': 1}, created_labels={'animals': {'Cat': 2}}
    )
    apply_delta(
        project.id,
        SummaryDelta(created_labels={'animals': Counter(Cat=1)}, reset={'created_annotations'}),
    )
    summary = ProjectSummary.objects.get(project=project)
    assert summary.created_annotations == {}
    assert summary.created_labels == {'animals': {'Cat': 1}}


def test_apply_empty_delta_runs_no_sql(business_client):
    project = make_project(project_choices(), business_client.user, use_ml_backend=False)
    with CaptureQueriesContext(connection) as queries:
        apply_delta(project.id, SummaryDelta(created_labels={'animals': Counter()}))
    assert len(queries) == 0


def test_redis_fields_round_trip():
    delta = SummaryDelta(
        all_data_columns=Counter({'te|xt': 2}),
        created_annotations=Counter({'a|b|choices': 1}),
        created_labels={'an"imals': Counter({'Cat': 3})},
        created_labels_drafts={'things': Counter({'Car': 1})},
        reset={'created_labels_drafts'},
    )
    restored = SummaryDelta.from_redis_fields(
        {k.encode(): str(v).encode() for k, v in delta.to_redis_fields().items()}
    )
    assert restored == delta


# =========== task delete ===========


def test_task_delete_matches_recalculation_from_scratch(
    populated_project, flag_on, django_capture_on_commit_callbacks
):
    project, tasks = populated_project

    with django_capture_on_commit_callbacks(execute=True):
        Task.objects.get(id=tasks[2].id).delete()

    actual = _summary_state(project)
    assert _counters(actual) == _expected_from_scratch(project)
    assert actual['created_labels_drafts'] == {'animals': {'Mouse': 1}}
    assert 'extra' not in actual['all_data_columns']


def test_task_delete_does_not_touch_summary_inside_transaction(
    populated_project, flag_on, django_capture_on_commit_callbacks
):
    project, tasks = populated_project

    with django_capture_on_commit_callbacks(execute=False) as callbacks:
        with CaptureQueriesContext(connection) as queries:
            Task.objects.get(id=tasks[0].id).delete()

    assert not [q for q in queries.captured_queries if 'projects_projectsummary' in q['sql'] and 'UPDATE' in q['sql']]
    assert callbacks


def test_task_delete_rollback_applies_nothing(populated_project, flag_on, django_capture_on_commit_callbacks):
    project, tasks = populated_project
    before = _summary_state(project)

    with django_capture_on_commit_callbacks(execute=True) as callbacks:
        with pytest.raises(RuntimeError):
            with transaction.atomic():
                Task.objects.get(id=tasks[0].id).delete()
                raise RuntimeError('rollback')

    assert callbacks == []
    assert _summary_state(project) == before


def test_task_delete_flag_off_keeps_legacy_path(populated_project, flag_off, django_capture_on_commit_callbacks):
    project, tasks = populated_project

    with mock.patch.object(summary_delta, 'schedule_summary_delta') as schedule:
        with django_capture_on_commit_callbacks(execute=True):
            Task.objects.get(id=tasks[2].id).delete()

    schedule.assert_not_called()
    # legacy path only drops data columns; annotation counters stay as they were
    assert 'extra' not in _summary_state(project)['all_data_columns']
    assert _summary_state(project)['created_labels']['things'] == {'Car': 1}


def test_tasks_states_job_is_deduplicated_per_project(populated_project, flag_on, django_capture_on_commit_callbacks):
    project, tasks = populated_project
    redis = fakeredis.FakeStrictRedis()

    with (
        mock.patch('core.job_deduplication._get_redis_connection', return_value=redis),
        mock.patch('core.redis.start_job_async_or_sync') as start_job,
    ):
        with django_capture_on_commit_callbacks(execute=True):
            Task.objects.filter(id__in=[tasks[0].id, tasks[1].id]).delete()

    states_jobs = [c for c in start_job.call_args_list if c.args[0] is summary_delta.update_tasks_states_after_delete]
    assert len(states_jobs) == 1
    assert states_jobs[0].args[1] == project.id
    # the second delete is folded into a follow-up of the running job
    assert redis.exists(summary_delta._tasks_states_keys(project.id).pending)


# =========== lock timeout and background job ===========


def _lock_not_available():
    exc = OperationalError('canceling statement due to lock timeout')
    exc.__cause__ = pg_errors.LockNotAvailable()
    return exc


def test_lock_timeout_defers_delta_to_job(populated_project, flag_on, django_capture_on_commit_callbacks):
    project, tasks = populated_project
    redis = fakeredis.FakeStrictRedis()

    with (
        mock.patch.object(summary_delta, '_get_redis_connection', return_value=redis),
        mock.patch.object(summary_delta, '_apply_with_lock_timeout', side_effect=_lock_not_available()),
        mock.patch.object(summary_delta, 'enqueue_pending_summary_deltas') as enqueue,
    ):
        with django_capture_on_commit_callbacks(execute=True):
            Task.objects.get(id=tasks[0].id).delete()
        with django_capture_on_commit_callbacks(execute=True):
            Task.objects.get(id=tasks[1].id).delete()

        assert enqueue.call_count == 2
        assert redis.exists(summary_delta._pending_delta_key(project.id))

        summary_delta.apply_pending_summary_deltas(project.id, project.organization_id)

    assert not redis.exists(summary_delta._pending_delta_key(project.id))
    assert _counters(_summary_state(project)) == _expected_from_scratch(project)


def test_job_puts_delta_back_when_apply_fails(business_client):
    project = make_project(project_choices(), business_client.user, use_ml_backend=False)
    redis = fakeredis.FakeStrictRedis()
    delta = SummaryDelta(created_labels={'animals': Counter(Cat=2)})
    summary_delta._store_pending_delta(redis, project.id, delta)

    with (
        mock.patch.object(summary_delta, '_get_redis_connection', return_value=redis),
        mock.patch.object(summary_delta, 'apply_delta', side_effect=OperationalError('boom')),
    ):
        with pytest.raises(OperationalError):
            summary_delta.apply_pending_summary_deltas(project.id, project.organization_id)

    raw = redis.hgetall(summary_delta._pending_delta_key(project.id))
    assert SummaryDelta.from_redis_fields(raw) == delta


def test_defer_without_redis_applies_synchronously(business_client):
    project = make_project(project_choices(), business_client.user, use_ml_backend=False)
    ProjectSummary.objects.filter(project=project).update(created_labels={'animals': {'Cat': 2}})

    with mock.patch.object(summary_delta, '_get_redis_connection', return_value=None):
        summary_delta.defer_summary_delta(
            project.id, project.organization_id, SummaryDelta(created_labels={'animals': Counter(Cat=1)})
        )

    assert ProjectSummary.objects.get(project=project).created_labels == {'animals': {'Cat': 1}}


# =========== Data Manager actions ===========


def test_dm_partial_delete_matches_recalculation_from_scratch(
    populated_project, flag_on, django_capture_on_commit_callbacks
):
    project, tasks = populated_project
    ids = [tasks[0].id, tasks[2].id]
    Task.objects.filter(id__in=ids).update(project=None)

    with django_capture_on_commit_callbacks(execute=True):
        async_project_summary_recalculation(ids, project.id)

    assert not Task.objects.filter(id__in=ids).exists()
    assert _counters(_summary_state(project)) == _expected_from_scratch(project)


def test_dm_delete_annotations_matches_recalculation_from_scratch(
    populated_project, flag_on, business_client, django_capture_on_commit_callbacks
):
    project, tasks = populated_project

    with django_capture_on_commit_callbacks(execute=True):
        delete_tasks_annotations_job(project.id, [tasks[0].id, tasks[2].id], None, business_client.user.id)

    actual = _summary_state(project)
    assert _counters(actual) == _expected_from_scratch(project)
    assert actual['created_labels'] == {'animals': {'Dog': 1}}
    assert actual['created_labels_drafts'] == {}


def test_dm_delete_all_annotations_keeps_increments_made_during_delete(
    populated_project, flag_on, business_client, django_capture_on_commit_callbacks
):
    project, tasks = populated_project
    real_delete = basic_actions.delete_annotations_queryset_with_retry

    def delete_then_annotate_elsewhere(queryset):
        real_delete(queryset)
        other = make_task({'data': {'text': 'd'}}, project)
        make_annotation({'result': [_choice('animals', 'Mouse')], 'completed_by': business_client.user}, other.id)
        AnnotationDraft.objects.create(task=other, user=business_client.user, result=[_choice('things', 'Bike')])

    with mock.patch.object(basic_actions, 'delete_annotations_queryset_with_retry', delete_then_annotate_elsewhere):
        with django_capture_on_commit_callbacks(execute=True):
            delete_tasks_annotations_job(project.id, [t.id for t in tasks], None, business_client.user.id)

    actual = _summary_state(project)
    assert actual['created_labels'] == {'animals': {'Mouse': 1}}
    assert actual['created_labels_drafts'] == {'things': {'Bike': 1}}
    assert _counters(actual) == _expected_from_scratch(project)


@pytest.mark.django_db(transaction=True)
def test_locked_summary_row_defers_instead_of_waiting(business_client, settings):
    import time

    import psycopg

    settings.PROJECT_SUMMARY_LOCK_TIMEOUT = '200ms'
    project = make_project(project_choices(), business_client.user, use_ml_backend=False)
    ProjectSummary.objects.filter(project=project).update(created_labels={'animals': {'Cat': 2}})
    delta = SummaryDelta(created_labels={'animals': Counter(Cat=1)})

    db = connection.settings_dict
    with psycopg.connect(
        host=db['HOST'], port=db['PORT'], user=db['USER'], password=db['PASSWORD'], dbname=db['NAME']
    ) as holder:
        holder.execute('SELECT 1 FROM projects_projectsummary WHERE project_id = %s FOR UPDATE', [project.id])
        with mock.patch.object(summary_delta, 'defer_summary_delta') as defer:
            started = time.monotonic()
            summary_delta._flush(project.id, project.organization_id, delta, wait_for_lock=False)
            elapsed = time.monotonic() - started
        holder.rollback()

    defer.assert_called_once_with(project.id, project.organization_id, delta)
    assert elapsed < 2
    assert ProjectSummary.objects.get(project=project).created_labels == {'animals': {'Cat': 2}}


def _row_holder(project):
    import psycopg

    db = connection.settings_dict
    holder = psycopg.connect(
        host=db['HOST'], port=db['PORT'], user=db['USER'], password=db['PASSWORD'], dbname=db['NAME']
    )
    holder.execute('SELECT 1 FROM projects_projectsummary WHERE project_id = %s FOR UPDATE', [project.id])
    return holder


@pytest.mark.django_db(transaction=True)
def test_bulk_delete_under_locked_row_waits_once(business_client, flag_on, settings):
    import time

    settings.PROJECT_SUMMARY_LOCK_TIMEOUT = '300ms'
    project = make_project(project_choices(), business_client.user, use_ml_backend=False)
    tasks = [make_task({'data': {'text': str(i), f'col{i}': i}}, project) for i in range(5)]
    for task in tasks:
        make_annotation({'result': [_choice('animals', 'Cat')], 'completed_by': business_client.user}, task.id)
    _recalculate(project)
    redis = fakeredis.FakeStrictRedis()

    with (
        mock.patch.object(summary_delta, '_get_redis_connection', return_value=redis),
        mock.patch.object(summary_delta, 'enqueue_pending_summary_deltas'),
        mock.patch.object(summary_delta, 'enqueue_tasks_states_after_delete'),
        mock.patch.object(
            summary_delta, '_apply_with_lock_timeout', wraps=summary_delta._apply_with_lock_timeout
        ) as attempt,
    ):
        holder = _row_holder(project)
        try:
            started = time.monotonic()
            Task.objects.filter(id__in=[t.id for t in tasks]).delete()
            elapsed = time.monotonic() - started
        finally:
            holder.rollback()
            holder.close()

        # one bounded wait for the whole bulk delete, the rest goes straight to Redis
        assert attempt.call_count == 1
        assert elapsed < 5 * 0.3
        summary_delta.apply_pending_summary_deltas(project.id, project.organization_id)

    assert _counters(_summary_state(project)) == _expected_from_scratch(project)


@pytest.mark.django_db(transaction=True)
def test_reset_delta_waits_for_lock_instead_of_deferring(business_client, settings):
    import threading

    settings.PROJECT_SUMMARY_LOCK_TIMEOUT = '50ms'
    project = make_project(project_choices(), business_client.user, use_ml_backend=False)
    ProjectSummary.objects.filter(project=project).update(created_annotations={'a|b|choices': 3})
    delta = SummaryDelta(reset={'created_annotations'})

    holder = _row_holder(project)
    release = threading.Timer(0.3, holder.rollback)
    release.start()
    try:
        with mock.patch.object(summary_delta, 'defer_summary_delta') as defer:
            summary_delta._flush(project.id, project.organization_id, delta, wait_for_lock=False)
    finally:
        release.join()
        holder.close()

    defer.assert_not_called()
    assert ProjectSummary.objects.get(project=project).created_annotations == {}


def test_failed_reset_is_not_deferred(business_client):
    project = make_project(project_choices(), business_client.user, use_ml_backend=False)

    with (
        mock.patch.object(summary_delta, 'apply_delta', side_effect=OperationalError('boom')),
        mock.patch.object(summary_delta, 'defer_summary_delta') as defer,
    ):
        summary_delta._flush(
            project.id, project.organization_id, SummaryDelta(reset={'created_labels'}), wait_for_lock=True
        )

    defer.assert_not_called()


def test_dm_jobs_wait_for_lock(populated_project, flag_on, business_client):
    project, tasks = populated_project

    with mock.patch('data_manager.actions.basic.schedule_summary_delta') as schedule:
        delete_tasks_annotations_job(project.id, [tasks[0].id], None, business_client.user.id)
        async_project_summary_recalculation([tasks[1].id], project.id)

    assert schedule.call_count == 2
    assert all(c.kwargs == {'wait_for_lock': True} for c in schedule.call_args_list)


def test_failure_after_commit_does_not_fail_the_delete(populated_project, flag_on, django_capture_on_commit_callbacks):
    project, tasks = populated_project

    with (
        mock.patch.object(summary_delta, '_apply_with_lock_timeout', side_effect=_lock_not_available()),
        mock.patch.object(summary_delta, 'defer_summary_delta', side_effect=RuntimeError('redis down')),
    ):
        with django_capture_on_commit_callbacks(execute=True) as callbacks:
            Task.objects.get(id=tasks[0].id).delete()

    assert callbacks
    assert not Task.objects.filter(id=tasks[0].id).exists()


def test_tasks_states_enqueue_failure_does_not_fail_the_delete(
    populated_project, flag_on, django_capture_on_commit_callbacks
):
    project, tasks = populated_project

    with mock.patch.object(
        summary_delta, 'enqueue_tasks_states_after_delete', side_effect=RuntimeError('redis down')
    ) as enqueue:
        with django_capture_on_commit_callbacks(execute=True):
            Task.objects.get(id=tasks[0].id).delete()

    enqueue.assert_called_once_with(project.id, project.organization_id)
    assert not Task.objects.filter(id=tasks[0].id).exists()


def test_flag_is_read_once_per_request(business_client):
    request = mock.Mock(user=None)
    CurrentContext.set_request(request)
    try:
        with mock.patch.object(summary_delta, 'flag_set_for_org_id', return_value=True) as flag:
            assert summary_delta.use_summary_delta(1)
            assert summary_delta.use_summary_delta(1)
            assert summary_delta.use_summary_delta(2)
    finally:
        CurrentContext.clear()

    assert flag.call_count == 2
