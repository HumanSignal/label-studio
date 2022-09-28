import logging
import psycopg2
import os
import redis
import sys

from redis import Redis

logger = logging.getLogger(__name__)


def get_env(name, default=None, is_bool=False):
    for env_key in ['LABEL_STUDIO_' + name, 'HEARTEX_' + name, name]:
        value = os.environ.get(env_key)
        if value is not None:
            if is_bool:
                return bool_from_request(os.environ, env_key, default)
            else:
                return value
    return default


def redis_healthcheck():
    redis_host = get_env("REDIS_LOCATION")
    _redis = Redis.from_url(redis_host)  # short timeout for the test
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
        logger.info('Redis client is alive!')
        return True


def db_check():
    try:
        conn = psycopg2.connect(f"dbname='{get_env('POSTGRE_NAME', 'postgres')}' "
                                f"user='{get_env('POSTGRE_USER', 'postgres')}' "
                                f"host='{get_env('POSTGRE_HOST', 'localhost')}' "
                                f"password='{get_env('POSTGRE_PASSWORD', 'postgres')}'")
        conn.close()
        return True
    except OperationalError:
        return False


def check_rqworker():
    logger.info(f"===> Start redis connection check.")
    redis_status = redis_healthcheck()
    logger.info(f"===> Redis check {'is successful' if redis_status else 'has failed'}.")
    logger.info(f"===> Start DB check.")
    db_status = db_check()
    logger.debug(f"===> DB check {'is successful' if db_status else 'has failed'}.")
    sys.exit(0 if db_status & redis_status else 1)


check_rqworker()
