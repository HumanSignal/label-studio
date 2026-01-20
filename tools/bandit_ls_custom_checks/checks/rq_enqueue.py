import bandit
from bandit.core import test_properties as test

FORBIDDEN_METHODS = frozenset(
    {
        'enqueue',
        'enqueue_in',
        'enqueue_at',
        'enqueue_call',
        'enqueue_many',
        'enqueue_job',
    }
)


@test.checks('Call')
@test.test_id('B901')
def direct_rq_enqueue(context):
    """Detect direct RQ queue.enqueue() calls.

    Use start_job_async_or_sync() from core.redis instead of calling
    queue.enqueue() directly to ensure proper job handling.
    """
    if context.call_function_name in FORBIDDEN_METHODS:
        return bandit.Issue(
            severity=bandit.MEDIUM,
            confidence=bandit.HIGH,
            text=f'Direct RQ {context.call_function_name}() detected. '
            'Use start_job_async_or_sync() from core.redis instead.',
        )
