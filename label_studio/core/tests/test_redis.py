import threading
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from core.current_request import CurrentContext
from django.test import override_settings

from label_studio.core.redis import (
    delete_job_by_id,
    get_jobs_by_meta,
    is_job_on_worker,
    start_job_async_or_sync,
    system_job_meta,
)


def _tenant_test_job(*args, **kwargs):
    return args, kwargs


def _migration_test_job():
    return None


_migration_test_job.__module__ = 'example.migrations.0001_test'


QUOTA_V2 = 'label_studio.core.redis.job_quota_defer_v2_enabled'


def _enqueued_meta(mock_get_queue):
    return mock_get_queue.return_value.enqueue.call_args.kwargs['meta']


@override_settings(RQ_FAILED_JOB_TTL=60)
@patch(QUOTA_V2, return_value=False)
@patch('label_studio.core.redis.flag_set_for_org_id', return_value=True)
@patch('label_studio.core.redis.django_rq.get_queue')
@patch('label_studio.core.redis.redis_connected', return_value=True)
def test_enqueue_stamps_explicit_tenant_under_separate_key(_mock_connected, mock_get_queue, mock_flag, _mock_v2):
    """An explicit tenant must win for tenancy while the legacy organization_id keeps its context value."""
    queue = mock_get_queue.return_value
    queued_job = queue.enqueue.return_value
    with patch('label_studio.core.redis._capture_context', return_value={'organization_id': 999}):
        result = start_job_async_or_sync(_tenant_test_job, 7, job_tenant=123)

    assert result is queued_job
    assert _enqueued_meta(mock_get_queue) == {
        'organization_id': 999,
        'tenant_organization_id': 123,
        'job_scope': 'tenant',
        'job_func': f'{_tenant_test_job.__module__}.{_tenant_test_job.__qualname__}',
        'tenant_v2_enrolled': True,
    }
    assert 'job_tenant' not in queue.enqueue.call_args.kwargs
    mock_flag.assert_called_once_with('fflag_feat_org_background_jobs_short', 123, override_system_default=False)


@override_settings(RQ_FAILED_JOB_TTL=60)
@patch(QUOTA_V2, return_value=False)
@patch('label_studio.core.redis.flag_set_for_org_id', return_value=False)
@patch('label_studio.core.redis.django_rq.get_queue')
@patch('label_studio.core.redis.redis_connected', return_value=True)
def test_dark_path_legacy_meta_is_unchanged_for_organization_alias(_mock_connected, mock_get_queue, _mock_flag, _v2):
    """With quota v2 dark, meta={'organization': 5} must not gain organization_id (keeps backfills uncounted)."""
    with patch('label_studio.core.redis._capture_context', return_value={}):
        start_job_async_or_sync(_tenant_test_job, meta={'organization': 5, 'job_type': 'fsm_backfill'})

    meta = _enqueued_meta(mock_get_queue)
    assert 'organization_id' not in meta
    assert meta['organization'] == 5
    assert meta['tenant_organization_id'] == 5


@override_settings(RQ_FAILED_JOB_TTL=60)
@patch(QUOTA_V2, return_value=False)
@patch('label_studio.core.redis.flag_set_for_org_id', return_value=False)
@patch('label_studio.core.redis.django_rq.get_queue')
@patch('label_studio.core.redis.redis_connected', return_value=True)
def test_dark_path_keeps_legacy_context_precedence(_mock_connected, mock_get_queue, _mock_flag, _mock_v2):
    """With quota v2 dark, context still overrides caller meta for organization_id; tenancy uses the caller."""
    with patch('label_studio.core.redis._capture_context', return_value={'organization_id': 7}):
        start_job_async_or_sync(_tenant_test_job, meta={'organization_id': 5})

    meta = _enqueued_meta(mock_get_queue)
    assert meta['organization_id'] == 7
    assert meta['tenant_organization_id'] == 5


@override_settings(RQ_FAILED_JOB_TTL=60)
@patch(QUOTA_V2, return_value=False)
@patch('label_studio.core.redis.django_rq.get_queue')
@patch('label_studio.core.redis.redis_connected', return_value=True)
def test_system_job_keeps_request_organization_for_limiter_and_metrics(_mock_connected, mock_get_queue, _mock_v2):
    """System scope clears only the tenancy key; the request's organization_id still reaches the worker."""
    with patch('label_studio.core.redis._capture_context', return_value={'organization_id': 7}):
        start_job_async_or_sync(_tenant_test_job, job_scope='system')

    meta = _enqueued_meta(mock_get_queue)
    assert meta['organization_id'] == 7
    assert meta['tenant_organization_id'] is None
    assert meta['job_scope'] == 'system'
    assert meta['tenant_v2_enrolled'] is False


@override_settings(RQ_FAILED_JOB_TTL=60)
@patch('label_studio.core.redis.flag_set_for_org_id', return_value=False)
@patch('label_studio.core.redis.django_rq.get_queue')
@patch('label_studio.core.redis.redis_connected', return_value=True)
def test_enqueue_uses_request_or_worker_context_organization(_mock_connected, mock_get_queue, _mock_flag):
    """Without an explicit tenant, the organization already carried by CurrentContext is stamped."""
    CurrentContext.set_organization_id(123)
    try:
        start_job_async_or_sync(_tenant_test_job, SimpleNamespace(id=456, organization_id=999))
    finally:
        CurrentContext.clear()

    meta = _enqueued_meta(mock_get_queue)
    assert meta['tenant_organization_id'] == 123
    assert meta['job_scope'] == 'tenant'
    assert 'project_id' not in meta


@override_settings(RQ_FAILED_JOB_TTL=60)
@patch('label_studio.core.redis.flag_set_for_org_id', return_value=False)
@patch('label_studio.core.redis.django_rq.get_queue')
@patch('label_studio.core.redis.redis_connected', return_value=True)
def test_chained_job_inherits_tenant_from_worker_context(_mock_connected, mock_get_queue, _mock_flag):
    """Workers restore job meta into CurrentContext, so a follow-up job keeps the parent's tenant."""
    CurrentContext.set('tenant_organization_id', 123)
    try:
        with patch('label_studio.core.redis._capture_context', return_value={'tenant_organization_id': 123}):
            start_job_async_or_sync(_tenant_test_job)
    finally:
        CurrentContext.clear()

    assert _enqueued_meta(mock_get_queue)['tenant_organization_id'] == 123


@override_settings(RQ_FAILED_JOB_TTL=60)
@patch('label_studio.core.redis.flag_set_for_org_id', return_value=False)
@patch('label_studio.core.redis.django_rq.get_queue')
@patch('label_studio.core.redis.redis_connected', return_value=True)
def test_enqueue_prefers_caller_meta_then_kwarg_organization(_mock_connected, mock_get_queue, _mock_flag):
    """Caller meta and an organization_id kwarg outrank ambient context, in that order."""
    with patch('label_studio.core.redis._capture_context', return_value={'organization_id': 999}):
        start_job_async_or_sync(_tenant_test_job, organization_id=456, meta={'organization_id': 123})
        meta_wins = _enqueued_meta(mock_get_queue)
        start_job_async_or_sync(_tenant_test_job, organization_id=456)
        kwarg_wins = _enqueued_meta(mock_get_queue)

    assert meta_wins['tenant_organization_id'] == 123
    assert kwarg_wins['tenant_organization_id'] == 456


@override_settings(RQ_FAILED_JOB_TTL=60)
@patch('label_studio.core.redis.flag_set_for_org_id', side_effect=RuntimeError('LaunchDarkly unavailable'))
@patch('label_studio.core.redis.django_rq.get_queue')
@patch('label_studio.core.redis.redis_connected', return_value=True)
def test_enqueue_fails_open_when_tenant_enrollment_lookup_fails(_mock_connected, mock_get_queue, _mock_flag):
    """LaunchDarkly failures must preserve enqueue behavior with enrollment disabled."""
    start_job_async_or_sync(_tenant_test_job, job_tenant=123)

    meta = _enqueued_meta(mock_get_queue)
    assert meta['tenant_organization_id'] == 123
    assert meta['tenant_v2_enrolled'] is False


@override_settings(RQ_FAILED_JOB_TTL=60)
@patch(QUOTA_V2, return_value=False)
@patch('label_studio.core.redis.django_rq.get_queue')
@patch('label_studio.core.redis.redis_connected', return_value=True)
def test_tenancy_failure_falls_back_without_touching_caller_meta(_mock_connected, mock_get_queue, _mock_v2):
    """An invalid explicit tenant enqueues as unknown and leaves the caller's organization_id intact."""
    with patch('label_studio.core.redis._capture_context', return_value={}):
        start_job_async_or_sync(_tenant_test_job, job_tenant=(123, 456), meta={'organization_id': 5})

    meta = _enqueued_meta(mock_get_queue)
    assert meta['organization_id'] == 5
    assert meta['tenant_organization_id'] is None
    assert meta['job_scope'] == 'unknown'
    assert meta['job_func'] == f'{_tenant_test_job.__module__}.{_tenant_test_job.__qualname__}'
    assert meta['tenant_v2_enrolled'] is False


@override_settings(RQ_FAILED_JOB_TTL=60)
@patch('label_studio.core.redis.django_rq.get_queue')
@patch('label_studio.core.redis.redis_connected', return_value=True)
def test_enqueue_stamps_unknown_scope_without_organization(_mock_connected, mock_get_queue):
    """Unresolved work must be stamped unknown."""
    with patch('label_studio.core.redis._capture_context', return_value={}):
        start_job_async_or_sync(_tenant_test_job)

    meta = _enqueued_meta(mock_get_queue)
    assert meta['job_scope'] == 'unknown'
    assert meta['tenant_organization_id'] is None
    assert meta['tenant_v2_enrolled'] is False


@override_settings(RQ_FAILED_JOB_TTL=60)
@patch('label_studio.core.redis.django_rq.get_queue')
@patch('label_studio.core.redis.redis_connected', return_value=True)
def test_migration_module_is_automatically_stamped_as_system(_mock_connected, mock_get_queue):
    """Migration functions must be system-scoped without editing every migration."""
    start_job_async_or_sync(_migration_test_job)

    assert _enqueued_meta(mock_get_queue)['job_scope'] == 'system'


def test_system_job_meta_is_public_and_owner_free():
    """Cron producers use the public helper and get system tenancy metadata only."""
    assert system_job_meta(_tenant_test_job) == {
        'tenant_organization_id': None,
        'job_scope': 'system',
        'job_func': f'{_tenant_test_job.__module__}.{_tenant_test_job.__qualname__}',
        'tenant_v2_enrolled': False,
    }


@patch(QUOTA_V2, return_value=False)
def test_get_jobs_by_meta_dark_path_exact_match_ignores_tenancy_keys(_mock_v2):
    """With quota v2 dark, exact-match dedup lookups must still find jobs that carry tenancy keys."""
    job = MagicMock()
    job.func.__name__ = 'job_func'
    job.meta = {
        'job_type': 'fsm_backfill',
        'organization': 123,
        'tenant_organization_id': 123,
        'job_scope': 'tenant',
        'job_func': 'example.job_func',
        'tenant_v2_enrolled': False,
    }
    extra_job = MagicMock()
    extra_job.func.__name__ = 'job_func'
    extra_job.meta = {'job_type': 'fsm_backfill', 'organization': 123, 'extra': True}
    queue = MagicMock()
    queue.get_jobs.return_value = [job, extra_job]

    assert get_jobs_by_meta(queue, 'job_func', {'job_type': 'fsm_backfill', 'organization': 123}) == [job]


@patch('label_studio.core.redis.ScheduledJobRegistry')
def test_get_jobs_by_meta_matches_legacy_subset_after_tenant_stamping(mock_scheduled):
    """Legacy metadata lookups must tolerate the newly added tenant fields."""
    mock_scheduled.return_value.get_job_ids.return_value = []
    matching_job = MagicMock()
    matching_job.func.__name__ = 'job_func'
    matching_job.meta = {
        'job_type': 'fsm_backfill',
        'organization': 123,
        'organization_id': 123,
        'job_scope': 'tenant',
        'job_func': 'example.job_func',
    }
    other_job = MagicMock()
    other_job.func.__name__ = 'job_func'
    other_job.meta = {'job_type': 'other'}
    queue = MagicMock()
    queue.get_jobs.return_value = [matching_job, other_job]

    jobs = get_jobs_by_meta(queue, 'job_func', {'job_type': 'fsm_backfill', 'organization': 123})

    assert jobs == [matching_job]


@override_settings(RQ_FAILED_JOB_TTL=60, JOB_TENANCY_ENQUEUED_HOOK='example.record_enqueued')
@patch('label_studio.core.redis.flag_set_for_org_id', return_value=False)
@patch('label_studio.core.redis.import_string')
@patch('label_studio.core.redis.django_rq.get_queue')
@patch('label_studio.core.redis.redis_connected', return_value=True)
def test_enqueue_calls_configured_index_hook_after_rq_enqueue(
    _mock_connected,
    mock_get_queue,
    mock_import_string,
    _mock_flag,
):
    """The configured LSE hook must receive the fully enqueued RQ job."""
    hook = mock_import_string.return_value
    queued_job = mock_get_queue.return_value.enqueue.return_value

    start_job_async_or_sync(_tenant_test_job, job_tenant=123)

    mock_import_string.assert_called_once_with('example.record_enqueued')
    hook.assert_called_once_with(queued_job)


@patch('label_studio.core.redis.flag_set', return_value=False)
def test_is_job_on_worker_does_not_call_get_job_ids(_mock_flag):
    """Ensure membership check avoids StartedJobRegistry.get_job_ids, preventing signal usage in threads."""
    fake_connection = MagicMock()
    fake_connection.zscore.return_value = None

    with patch('label_studio.core.redis.StartedJobRegistry') as registry_cls:
        registry = registry_cls.return_value
        registry.connection = fake_connection
        registry.key = 'rq:started:low'
        registry.get_job_ids.side_effect = ValueError('should not be called')

        assert is_job_on_worker('job123', 'low') is False

        fake_connection.zscore.assert_called_once_with('rq:started:low', b'job123')

        # Ensure None job IDs short-circuit without touching Redis.
        fake_connection.zscore.reset_mock()
        assert is_job_on_worker(None, 'low') is False
        fake_connection.zscore.assert_not_called()


@patch('label_studio.core.redis.flag_set', return_value=False)
def test_is_job_on_worker_safe_from_non_main_thread(_mock_flag, monkeypatch):
    """Simulate the original failure: registry.get_job_ids would raise when used from non-main threads."""
    import signal

    original_signal = signal.signal

    def fake_signal(sig, handler):
        if threading.current_thread() is not threading.main_thread():
            raise ValueError('signal only works in main thread of the main interpreter')
        return original_signal(sig, handler)

    monkeypatch.setattr(signal, 'signal', fake_signal)

    fake_connection = MagicMock()
    fake_connection.zscore.return_value = None

    class DummyRegistry:
        def __init__(self, queue_name, connection):
            self.connection = fake_connection
            self.key = f'rq:started:{queue_name}'

        def get_job_ids(self):
            # The old implementation would call this, which uses signal and fails in threads
            signal.signal(signal.SIGALRM, lambda *args: None)
            return []

    with patch('label_studio.core.redis.StartedJobRegistry', DummyRegistry):
        result: dict[str, object] = {}

        def runner():
            try:
                result['value'] = is_job_on_worker('job123', 'low')
            except Exception as exc:  # pragma: no cover - used for regression verification
                result['error'] = exc

        t = threading.Thread(target=runner)
        t.start()
        t.join()

        if 'error' in result:
            raise result['error']  # type: ignore[misc]

        assert result['value'] is False


@patch('label_studio.core.redis._capture_context', return_value={'organization_id': 1, 'request_id': 'captured'})
@patch('label_studio.core.redis.redis_connected', return_value=True)
@patch('label_studio.core.redis.flag_set', return_value=True)
@patch('label_studio.core.redis.django_rq.get_queue')
def test_caller_meta_wins_over_captured_context(mock_get_queue, _mock_flag, _mock_connected, _mock_context):
    """V2 preserves explicit caller metadata and fills only missing context fields."""
    queue = mock_get_queue.return_value
    queue.enqueue.return_value = MagicMock()

    def job_function():
        pass

    start_job_async_or_sync(
        job_function,
        meta={'organization_id': 2, 'request_id': 'caller'},
        queue_name='high',
    )

    meta = queue.enqueue.call_args.kwargs['meta']
    assert meta['organization_id'] == 2
    assert meta['request_id'] == 'caller'
    assert meta['_queue_origin'] == 'high'


@patch('label_studio.core.redis._capture_context', return_value={'organization_id': 1})
@patch('label_studio.core.redis.redis_connected', return_value=True)
@patch('label_studio.core.redis.flag_set', return_value=True)
@patch('label_studio.core.redis.django_rq.get_queue')
def test_legacy_organization_meta_is_normalized(mock_get_queue, _mock_flag, _mock_connected, _mock_context):
    """The legacy organization key remains a supported alias for organization_id."""
    queue = mock_get_queue.return_value
    queue.enqueue.return_value = MagicMock()

    def job_function():
        pass

    start_job_async_or_sync(job_function, meta={'organization': 7})

    assert queue.enqueue.call_args.kwargs['meta']['organization'] == 7
    assert queue.enqueue.call_args.kwargs['meta']['organization_id'] == 7


@patch('label_studio.core.redis.flag_set', return_value=True)
def test_is_job_on_worker_recognizes_composite_execution_key(_mock_flag):
    """RQ 2 execution members use <job-id>:<execution-id> and still identify the job as running."""
    fake_connection = MagicMock()
    fake_connection.zscore.return_value = None
    fake_connection.zscan_iter.return_value = iter([(b'job123:execution456', 1.0)])

    with patch('label_studio.core.redis.StartedJobRegistry') as registry_cls:
        registry = registry_cls.return_value
        registry.connection = fake_connection
        registry.key = 'rq:started:low'

        assert is_job_on_worker('job123', 'low') is True

    fake_connection.zscan_iter.assert_called_once_with('rq:started:low', match='job123:*', count=1)


@patch('label_studio.core.redis.flag_set', return_value=True)
@patch('label_studio.core.redis.django_rq.get_queue')
def test_delete_job_uses_recorded_queue_origin(mock_get_queue, _mock_flag):
    """Cancellation follows the queue recorded at enqueue time instead of the caller's default."""
    job = MagicMock(meta={'_queue_origin': 'high'}, origin='default')
    default_queue = MagicMock(name='default')
    default_queue.name = 'default'
    default_queue.fetch_job.return_value = job
    high_queue = MagicMock(name='high')
    high_queue.name = 'high'
    high_queue.fetch_job.return_value = job
    mock_get_queue.return_value = high_queue

    delete_job_by_id(default_queue, 'job123')

    mock_get_queue.assert_called_once_with('high')
    high_queue.fetch_job.assert_called_once_with('job123')
    job.cancel.assert_called_once()
    job.delete.assert_called_once()


@patch('label_studio.core.redis.ScheduledJobRegistry')
@patch('label_studio.core.redis.flag_set', return_value=True)
def test_get_jobs_by_meta_ignores_v2_bookkeeping_keys(_mock_flag, mock_scheduled):
    """Metadata-based dedup still finds jobs enriched with v2 identity bookkeeping."""

    def job_function():
        pass

    job = MagicMock(
        func=job_function,
        meta={
            'project': 3,
            'job_type': 'SR',
            'organization_id': 7,
            '_queue_origin': 'high',
            '_concurrency_attempts': 2,
        },
    )
    queue = MagicMock()
    queue.get_jobs.return_value = [job]
    mock_scheduled.return_value.get_job_ids.return_value = []

    assert get_jobs_by_meta(queue, 'job_function', {'project': 3, 'job_type': 'SR'}) == [job]


@patch('label_studio.core.redis.ScheduledJobRegistry')
@patch('label_studio.core.redis.flag_set', return_value=True)
def test_get_jobs_by_meta_includes_scheduled_registry(_mock_flag, mock_scheduled):
    """Quota-deferred jobs sit in the scheduled registry and must still match by meta."""

    def job_function():
        pass

    queued_job = MagicMock(id='queued', func=job_function, meta={'project': 3})
    scheduled_job = MagicMock(id='scheduled', func=job_function, meta={'project': 3, '_concurrency_attempts': 1})
    queue = MagicMock()
    queue.get_jobs.return_value = [queued_job]
    queue.fetch_job.return_value = scheduled_job
    mock_scheduled.return_value.get_job_ids.return_value = ['scheduled']

    assert get_jobs_by_meta(queue, 'job_function', {'project': 3}) == [queued_job, scheduled_job]
    mock_scheduled.return_value.get_job_ids.assert_called_once_with(cleanup=False)
    queue.fetch_job.assert_called_once_with('scheduled')


@patch('label_studio.core.redis.flag_set', return_value=False)
def test_get_jobs_by_meta_preserves_legacy_exact_match(_mock_flag):
    """Flag-off lookup keeps the pre-v2 exact metadata contract."""

    def job_function():
        pass

    job = MagicMock(func=job_function, meta={'project': 3, 'extra': True})
    queue = MagicMock()
    queue.get_jobs.return_value = [job]

    assert get_jobs_by_meta(queue, 'job_function', {'project': 3}) == []
