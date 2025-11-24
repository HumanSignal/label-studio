import threading
from unittest.mock import MagicMock, patch

from label_studio.core.redis import is_job_on_worker


def test_is_job_on_worker_does_not_call_get_job_ids():
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


def test_is_job_on_worker_safe_from_non_main_thread(monkeypatch):
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
