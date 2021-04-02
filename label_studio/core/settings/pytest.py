"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
# blog/ci.py
from core.settings.base import *

DJANGO_DB = get_env('DJANGO_DB', 'default')
DATABASES = {'default': DATABASES_ALL[DJANGO_DB]}

MIDDLEWARE.append('organizations.middleware.DummyGetSessionMiddleware')

ADD_DEFAULT_ML_BACKENDS = False

CACHES = {
    'default': {
        'BACKEND': 'redis_cache.RedisCache',
        'LOCATION': get_env('REDIS_LOCATION', 'localhost:6379'),
        'OPTIONS': {
            'SOCKET_TIMEOUT': int(get_env('REDIS_SOCKET_TIMEOUT', '36000')),
            'CONNECTION_POOL_CLASS': 'redis.ConnectionPool',
            'CONNECTION_POOL_CLASS_KWARGS': {}
        }
    }
}

RQ_QUEUES = {
    'default': {
        'USE_REDIS_CACHE': 'default'
    }
}
