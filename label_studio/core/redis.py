"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license."""

import logging
import sys
from datetime import timedelta
from functools import partial
from typing import Any

import django_rq
import redis
from core.current_request import CurrentContext
from core.feature_flags import flag_set, flag_set_for_org_id
from django.conf import settings
from django.utils.module_loading import import_string
from django_rq import get_connection
from rq.command import send_stop_job_command
from rq.exceptions import InvalidJobOperation
from rq.registry import ScheduledJobRegistry, StartedJobRegistry

logger = logging.getLogger(__name__)

JOB_QUOTA_DEFER_V2_FLAG = 'fflag_feat_job_quota_defer_v2'
QUEUE_ORIGIN_META_KEY = '_queue_origin'
TENANT_V2_FLAG = 'fflag_feat_org_background_jobs_short'
# Tenancy is stamped under its own keys so quota accounting, metric tags and worker context restore keep reading
# the legacy ``organization_id`` exactly as before.
TENANT_ORGANIZATION_META_KEY = 'tenant_organization_id'
TENANCY_META_KEYS = frozenset({TENANT_ORGANIZATION_META_KEY, 'job_scope', 'job_func', 'tenant_v2_enrolled'})


def job_quota_defer_v2_enabled() -> bool:
    return flag_set(JOB_QUOTA_DEFER_V2_FLAG, user='auto')


def get_job_organization_id(meta: dict | None):
    """Resolve canonical and legacy organization metadata."""
    if not meta:
        return None
    return meta.get('organization_id') or meta.get('organization')


def get_job_queue_origin(job, fallback='default') -> str:
    """Return the queue recorded when the job was enqueued."""
    meta = getattr(job, 'meta', None) or {}
    return meta.get(QUEUE_ORIGIN_META_KEY) or getattr(job, 'origin', None) or fallback


def _truncate_args_for_logging(args, kwargs, max_length=30):
    try:

        def _truncate_scalar(value):
            v_repr = repr(value)
            return v_repr[:max_length] + ('...' if len(v_repr) > max_length else '')

        def _truncate_top_level(value):
            # If dict at the top level, expand only one level of keys
            if isinstance(value, dict):
                parts = []
                for dk, dv in value.items():
                    # Do NOT recurse: treat nested dicts as scalars
                    parts.append(f'{repr(dk)}: {_truncate_scalar(dv)}')
                return '{' + ', '.join(parts) + '}'
            return _truncate_scalar(value)

        truncated_args = [_truncate_top_level(arg) for arg in args]

        truncated_kwargs = {k: _truncate_top_level(v) for k, v in kwargs.items() if k != 'on_failure'}

        result = []
        if truncated_args:
            result.append(f'args: {truncated_args}')
        if truncated_kwargs:
            result.append(f'kwargs: {truncated_kwargs}')

        return ', '.join(result) if result else 'no arguments'
    except Exception:
        return 'failed to format arguments'


try:
    _redis = get_connection()
    _redis.ping()
    logger.debug('=> Redis is connected successfully.')
except:  # noqa: E722
    logger.debug('=> Redis is not connected.')
    _redis = None


def redis_healthcheck():
    if not _redis:
        return False
    try:
        _redis.ping()
    except redis.exceptions.ConnectionError as exc:
        logger.error(f'Redis healthcheck failed with ConnectionError: {exc}', exc_info=True)
        return False
    except redis.exceptions.TimeoutError as exc:
        logger.error(f'Redis healthcheck failed with TimeoutError: {exc}', exc_info=True)
        return False
    except redis.exceptions.RedisError as exc:
        logger.error(f'Redis healthcheck failed: {exc}', exc_info=True)
        return False
    else:
        logger.debug('Redis client is alive!')
        return True


def redis_connected():
    if settings.REDIS_ENABLED:
        return redis_healthcheck()
    return False


def _is_serializable(value: Any) -> bool:
    """Check if a value can be serialized for job context."""
    return isinstance(value, (str, int, float, bool, list, dict, type(None)))


def _capture_context() -> dict:
    """
    Capture the current context for passing to a job.
    Returns a dictionary of context data that can be serialized.
    """
    context_data = {}

    # Get user information
    if user := CurrentContext.get_user():
        context_data['user_id'] = user.id

    # Get organization if set separately
    if org_id := CurrentContext.get_organization_id():
        context_data['organization_id'] = org_id

    # If organization_id is not set, try to get it from the user, this ensures that we have an organization_id for the job
    # And it prefers the original requesting user's organization_id over the current active organization_id of the user which could change during async jobs
    if not org_id and user and hasattr(user, 'active_organization_id') and user.active_organization_id:
        context_data['organization_id'] = user.active_organization_id

    # Get any custom context values (exclude non-serializable objects)
    job_data = CurrentContext.get_job_data()
    for key, value in job_data.items():
        if key not in ['user', 'request'] and _is_serializable(value):
            context_data[key] = value

    return context_data


def _canonical_job_func(job) -> str:
    while isinstance(job, partial):
        job = job.func
    module = getattr(job, '__module__', job.__class__.__module__)
    name = getattr(job, '__qualname__', getattr(job, '__name__', job.__class__.__qualname__))
    return f'{module}.{name}'


def _is_system_job(job) -> bool:
    module = getattr(job, '__module__', '')
    return '.migrations.' in module or module.endswith('.migrations')


def _resolve_job_organization_id(job_tenant, kwargs, caller_meta, context_data) -> int | None:
    """Resolve the owning organization: explicit ``job_tenant`` → caller meta → ``organization_id`` kwarg →
    request/worker context (workers restore job meta into CurrentContext, so chained jobs inherit it)."""
    if job_tenant is not None:
        if isinstance(job_tenant, bool) or not isinstance(job_tenant, int):
            raise TypeError(f'job_tenant must be an organization id, got {type(job_tenant).__name__}')
        return job_tenant
    return (
        get_job_organization_id(caller_meta)
        or kwargs.get('organization_id')
        or context_data.get(TENANT_ORGANIZATION_META_KEY)
        or context_data.get('organization_id')
    )


def _tenant_v2_enrolled(organization_id) -> bool:
    if organization_id is None:
        return False
    try:
        return flag_set_for_org_id(TENANT_V2_FLAG, organization_id, override_system_default=False)
    except Exception:
        logger.warning('Failed to resolve tenant v2 enrollment for organization %s', organization_id, exc_info=True)
        return False


def _build_tenancy_meta(job, kwargs, caller_meta, context_data, job_tenant=None, job_scope=None) -> dict:
    if job_scope is None and _is_system_job(job):
        job_scope = 'system'
    organization_id = None
    if job_scope in (None, 'tenant'):
        organization_id = _resolve_job_organization_id(job_tenant, kwargs, caller_meta, context_data)
    if job_scope is None:
        job_scope = 'tenant' if organization_id is not None else 'unknown'
    if job_scope not in {'tenant', 'system', 'unknown'}:
        raise ValueError(f'Unsupported job_scope: {job_scope}')
    if job_scope != 'tenant':
        organization_id = None
    return {
        TENANT_ORGANIZATION_META_KEY: organization_id,
        'job_scope': job_scope,
        'job_func': _canonical_job_func(job),
        'tenant_v2_enrolled': _tenant_v2_enrolled(organization_id),
    }


def _fallback_tenancy_meta(job, job_scope=None) -> dict:
    return {
        TENANT_ORGANIZATION_META_KEY: None,
        'job_scope': 'system' if job_scope == 'system' or _is_system_job(job) else 'unknown',
        'job_func': _canonical_job_func(job),
        'tenant_v2_enrolled': False,
    }


def system_job_meta(job) -> dict:
    """Tenancy metadata for system jobs enqueued outside ``start_job_async_or_sync`` (e.g. rq cron)."""
    return _fallback_tenancy_meta(job, job_scope='system')


def _without_tenancy_meta(meta: dict) -> dict:
    return {key: value for key, value in meta.items() if key not in TENANCY_META_KEYS}


def _run_job_enqueued_hook(job) -> None:
    hook_path = getattr(settings, 'JOB_TENANCY_ENQUEUED_HOOK', None)
    if not hook_path:
        return
    try:
        import_string(hook_path)(job)
    except Exception:
        logger.warning('Failed to update tenant job index for job %s', getattr(job, 'id', None), exc_info=True)


def redis_get(key):
    if not redis_healthcheck():
        return
    return _redis.get(key)


def redis_hget(key1, key2):
    if not redis_healthcheck():
        return
    return _redis.hget(key1, key2)


def redis_set(key, value, ttl=None):
    if not redis_healthcheck():
        return
    return _redis.set(key, value, ex=ttl)


def redis_hset(key1, key2, value):
    if not redis_healthcheck():
        return
    return _redis.hset(key1, key2, value)


def redis_delete(key):
    if not redis_healthcheck():
        return
    return _redis.delete(key)


def start_job_async_or_sync(job, *args, in_seconds=0, **kwargs):
    """
    Start job async with redis or sync if redis is not connected.
    Automatically preserves context for async jobs and clears it after completion.

    :param job: Job function
    :param args: Function arguments
    :param in_seconds: Job will be delayed for in_seconds
    :param retry: RQ Retry object or int (max retries). Only used in async mode.
    :param kwargs: Function keywords arguments
    :return: Job or function result
    """
    from rq import Retry

    redis = redis_connected() and kwargs.get('redis', True)
    queue_name = kwargs.get('queue_name', 'default')

    if 'queue_name' in kwargs:
        del kwargs['queue_name']
    if 'redis' in kwargs:
        del kwargs['redis']

    job_timeout = None
    if 'job_timeout' in kwargs:
        job_timeout = kwargs['job_timeout']
        del kwargs['job_timeout']

    retry = None
    if 'retry' in kwargs:
        retry = kwargs['retry']
        del kwargs['retry']
        if isinstance(retry, int):
            retry = Retry(max=retry)

    on_failure = kwargs.pop('on_failure', None)
    job_tenant = kwargs.pop('job_tenant', None)
    job_scope = kwargs.pop('job_scope', None)

    if redis:
        # Snapshot before the legacy block below mutates the caller's dict in place.
        tenancy_caller_meta = dict(kwargs.get('meta') or {})
        context_data = {}
        # Async execution with Redis - wrap job for context management
        try:
            context_data = _capture_context()

            caller_meta = kwargs.get('meta', {})
            if job_quota_defer_v2_enabled():
                # Captured context supplies defaults; explicit caller metadata is authoritative.
                meta = {**context_data, **caller_meta}
                if 'organization_id' not in caller_meta and 'organization' in caller_meta:
                    meta['organization_id'] = caller_meta['organization']
                elif 'organization_id' not in meta and 'organization' in meta:
                    meta['organization_id'] = meta['organization']
                meta[QUEUE_ORIGIN_META_KEY] = queue_name
            else:
                meta = caller_meta
                # Preserve legacy precedence while the v2 flag is dark.
                meta.update(context_data)
            kwargs['meta'] = meta
        except Exception:
            logger.info(f'Failed to capture context for job {job.__name__} on queue {queue_name}')

        try:
            tenancy_meta = _build_tenancy_meta(job, kwargs, tenancy_caller_meta, context_data, job_tenant, job_scope)
        except Exception:
            logger.warning('Failed to stamp tenant metadata for job %s on queue %s', job, queue_name, exc_info=True)
            tenancy_meta = _fallback_tenancy_meta(job, job_scope)
        kwargs['meta'] = {**(kwargs.get('meta') or {}), **tenancy_meta}

        try:
            args_info = _truncate_args_for_logging(args, kwargs)
            logger.info(f'Start async job {job.__name__} on queue {queue_name} with {args_info}.')
        except Exception:
            logger.info(f'Start async job {job.__name__} on queue {queue_name}.')
        queue = django_rq.get_queue(queue_name)
        enqueue_method = queue.enqueue
        if in_seconds > 0:
            enqueue_method = partial(queue.enqueue_in, timedelta(seconds=in_seconds))

        job = enqueue_method(
            job,
            *args,
            **kwargs,
            job_timeout=job_timeout,
            failure_ttl=settings.RQ_FAILED_JOB_TTL,
            retry=retry,
            on_failure=on_failure,
        )
        _run_job_enqueued_hook(job)
        return job
    else:
        try:
            result = job(*args, **kwargs)
            return result
        except Exception:
            exc_info = sys.exc_info()
            if on_failure:
                on_failure(job, *exc_info)
            raise


def is_job_in_queue(queue, func_name, meta):
    """
    Checks if func_name with kwargs[meta] is in queue (doesn't check workers)
    :param queue: queue object
    :param func_name: function name
    :param meta: job meta information
    :return: True if job in queue
    """
    # get all jobs from Queue
    jobs = get_jobs_by_meta(queue, func_name, meta)
    # check if there is job with meta in list
    return any(jobs)


def is_job_on_worker(job_id, queue_name):
    """
    Checks if job id is on workers
    :param job_id: Job ID
    :param queue_name: Queue name
    :return: True if job on worker
    """
    if not job_id:
        return False
    registry = StartedJobRegistry(queue_name, connection=_redis)
    member = job_id.encode() if isinstance(job_id, str) else job_id
    # Use Redis ZSET membership check (ZSCORE) instead of registry.get_job_ids(),
    # because the latter calls registry.cleanup(), which installs SIGALRM timers and
    # crashes when executed outside the interpreter's main thread (e.g., inside WSGI).
    # ZSCORE simply looks up the score of the member in the sorted set: if it returns
    # None, the member/job ID is not present; otherwise it is currently marked as running.
    if registry.connection.zscore(registry.key, member) is not None:
        return True
    if not job_quota_defer_v2_enabled():
        return False

    # RQ 2 stores active executions as "<job-id>:<execution-id>" members.
    composite_members = registry.connection.zscan_iter(registry.key, match=f'{job_id}:*', count=1)
    return next(composite_members, None) is not None


def delete_job_by_id(queue, id):
    """
    Delete job by id from queue
    @param queue: Queue on redis to delete from
    @param id: Job id
    """
    job = queue.fetch_job(id)
    if job is not None:
        if job_quota_defer_v2_enabled():
            queue_origin = get_job_queue_origin(job, fallback=queue.name)
            if queue_origin != queue.name:
                queue = django_rq.get_queue(queue_origin)
                job = queue.fetch_job(id) or job
        # stop job if it is in master redis node (in the queue)
        logger.info(f'Stopping job {id} from queue {queue.name}.')
        try:
            job.cancel()
            job.delete()
            logger.debug(f'Fetched job {id} and stopped.')
        except InvalidJobOperation:
            logger.debug(f'Job {id} was already cancelled.')
    else:
        # try to stop job on worker (job started)
        logger.info(f'Stopping job {id} on worker from queue {queue.name}.')
        try:
            send_stop_job_command(_redis, id)
            logger.debug(f'Send stop job {id} to redis worker.')
        except Exception as e:
            logger.debug(f'Redis job {id} was not found: {str(e)}')


def get_jobs_by_meta(queue, func_name, meta):
    """
    Get jobs from queue by func_name and meta data
    :param queue: Queue on redis to check in
    :param func_name: Started function name
    :param meta: meta dict
    :return: Job list
    """
    # get all jobs from Queue
    jobs = [job for job in queue.get_jobs() if job.func.__name__ == func_name]
    if not job_quota_defer_v2_enabled():
        return [job for job in jobs if hasattr(job, 'meta') and _without_tenancy_meta(job.meta) == meta]

    # Quota-deferred jobs live in the scheduled registry, not the live queue list.
    scheduled_ids = ScheduledJobRegistry(queue=queue).get_job_ids(cleanup=False)
    known_ids = {getattr(job, 'id', None) for job in jobs}
    for job_id in scheduled_ids:
        if job_id in known_ids:
            continue
        job = queue.fetch_job(job_id)
        if job is not None and getattr(getattr(job, 'func', None), '__name__', None) == func_name:
            jobs.append(job)

    # V2 appends queue/concurrency bookkeeping, so caller metadata is a lookup subset.
    return [
        job for job in jobs if hasattr(job, 'meta') and all(job.meta.get(key) == value for key, value in meta.items())
    ]
