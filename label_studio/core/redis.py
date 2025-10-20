"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import logging
import sys
from datetime import timedelta
from functools import partial

import django_rq
import redis
from django.conf import settings
from django_rq import get_connection
from rq.command import send_stop_job_command
from rq.exceptions import InvalidJobOperation
from rq.registry import StartedJobRegistry

logger = logging.getLogger(__name__)


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
    return redis_healthcheck()


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
    Start job async with redis or sync if redis is not connected
    :param job: Job function
    :param args: Function arguments
    :param in_seconds: Job will be delayed for in_seconds
    :param kwargs: Function keywords arguments
    :return: Job or function result
    """

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
    if redis:
        # Auto-capture request_id from thread local and pass it via job meta
        try:
            from label_studio.core.current_request import _thread_locals

            request_id = getattr(_thread_locals, 'request_id', None)
            if request_id:
                # Store in job meta for worker access
                meta = kwargs.get('meta', {})
                meta['request_id'] = request_id
                kwargs['meta'] = meta
        except Exception:
            # Fail silently if no request context
            pass

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
        )
        return job
    else:
        on_failure = kwargs.pop('on_failure', None)
        try:
            return job(*args, **kwargs)
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
    registry = StartedJobRegistry(queue_name, connection=_redis)
    ids = registry.get_job_ids()
    return job_id in ids


def delete_job_by_id(queue, id):
    """
    Delete job by id from queue
    @param queue: Queue on redis to delete from
    @param id: Job id
    """
    job = queue.fetch_job(id)
    if job is not None:
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
    jobs = (job for job in queue.get_jobs() if job.func.__name__ == func_name)
    # return only with same meta data
    return [job for job in jobs if hasattr(job, 'meta') and job.meta == meta]
