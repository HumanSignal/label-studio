import threading
from unittest.mock import MagicMock, patch

from label_studio.core.redis import delete_job_by_id, get_jobs_by_meta, is_job_on_worker, start_job_async_or_sync


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

    assert queue.enqueue.call_args.kwargs['meta'] == {
        'organization_id': 2,
        'request_id': 'caller',
        '_queue_origin': 'high',
    }


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
