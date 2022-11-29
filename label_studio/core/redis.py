"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
from datetime import timedelta
from functools import partial

import redis
import logging
import django_rq

from django_rq import get_connection
from rq.registry import StartedJobRegistry
from rq.command import send_stop_job_command
from rq.exceptions import InvalidJobOperation

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


def start_job_async_or_sync(job, *args, in_seconds=0, **kwargs):
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
        logger.info(f"Start async job {job.__name__} on queue {queue_name}.")
        queue = django_rq.get_queue(queue_name)
        enqueue_method = queue.enqueue
        if in_seconds > 0:
            enqueue_method = partial(queue.enqueue_in, time_delta=timedelta(in_seconds))
        job = enqueue_method(
            job,
            *args,
            **kwargs,
            job_timeout=job_timeout
        )
        return job
    else:
        return job(*args, **kwargs)


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
        logger.info(f"Stopping job {id} from queue {queue.name}.")
        try:
            job.cancel()
            job.delete()
            logger.debug(f"Fetched job {id} and stopped.")
        except InvalidJobOperation:
            logger.debug(f"Job {id} was already cancelled.")
    else:
        # try to stop job on worker (job started)
        logger.info(f"Stopping job {id} on worker from queue {queue.name}.")
        try:
            send_stop_job_command(_redis, id)
            logger.debug(f"Send stop job {id} to redis worker.")
        except Exception as e:
            logger.debug(f"Redis job {id} was not found: {str(e)}")


def get_jobs_by_meta(queue, func_name, meta):
    """
    Get jobs from queue by func_name and meta data
    :param queue: Queue on redis to check in
    :param func_name: Started function name
    :param meta: meta dict
    :return: Job list
    """
    # get all jobs from Queue
    jobs = (job
            for job in queue.get_jobs()
            if job.func.__name__ == func_name
            )
    # return only with same meta data
    return [job for job in jobs if hasattr(job, 'meta') and job.meta == meta]

