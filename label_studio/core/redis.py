"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import redis
import logging
import django_rq

from django_rq import get_connection
from django.conf import settings
from rq import Worker

logger = logging.getLogger(__name__)

try:
    _redis = get_connection()
    _redis.ping()
    logger.debug('=> Redis is connected successfully.')
except:
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


def start_job_async_or_sync(job, *args, **kwargs):
    """
    Start job async with redis or sync if redis is not connected
    :param job: Job function
    :param args: Function arguments
    :param kwargs: Function keywords arguments
    :return: Job or function result
    """
    redis = redis_connected() and kwargs.get('redis', True)
    queue_name = kwargs.get("queue_name", "default")
    if 'queue_name' in kwargs:
        del kwargs['queue_name']
    if 'redis' in kwargs:
        del kwargs['redis']
    job_timeout = None
    if 'job_timeout' in kwargs:
        job_timeout = kwargs['job_timeout']
        del kwargs['job_timeout']

    if redis:
        queue = django_rq.get_queue(queue_name)
        job = queue.enqueue(
            job,
            *args,
            **kwargs,
            job_timeout=job_timeout
        )
        return job
    else:
        return job(*args, **kwargs)


def rqworker_healthcheck():
    RATIO = 100
    error_text = ""
    # check redis connection
    if not redis_healthcheck():
        return False, "Redis health check has failed."
    # check queues
    total_jobs = 0
    for queue_name in settings.RQ_QUEUES:
        try:
            queue = django_rq.get_queue(queue_name)
        except KeyError:
            return False, f"No queue {queue_name} on redis."
        total_jobs += len(queue)
    # check workers
    workers = Worker.all(connection=_redis)
    workers_count = len(workers)
    if workers_count == 0:
        return False, "No workers found. Start several workers."
    if workers_count * RATIO < total_jobs:
        error_text = f"Workers seems to be overloaded. {total_jobs} jobs in the queues."
    # check if workers in correct state
    if all([worker.state not in ['started', 'idle'] for worker in workers]):
        return False, "No free workers found. Start more workers."
    return True, error_text
