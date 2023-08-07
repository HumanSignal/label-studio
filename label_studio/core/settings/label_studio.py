"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
from typing import TYPE_CHECKING

import os
import pathlib

from core.settings.base import *

DJANGO_DB = get_env('DJANGO_DB', DJANGO_DB_SQLITE)  # type: ignore[name-defined]
DATABASES = {'default': DATABASES_ALL[DJANGO_DB]}

MIDDLEWARE.append('organizations.middleware.DummyGetSessionMiddleware')
MIDDLEWARE.append('core.middleware.UpdateLastActivityMiddleware')
if INACTIVITY_SESSION_TIMEOUT_ENABLED:
    MIDDLEWARE.append('core.middleware.InactivitySessionTimeoutMiddleWare')

ADD_DEFAULT_ML_BACKENDS = False

LOGGING['root']['level'] = get_env('LOG_LEVEL', 'WARNING')  # type: ignore[name-defined, index]

DEBUG = get_bool_env('DEBUG', False)  # type: ignore[name-defined]

DEBUG_PROPAGATE_EXCEPTIONS = get_bool_env('DEBUG_PROPAGATE_EXCEPTIONS', False)  # type: ignore[name-defined]

SESSION_COOKIE_SECURE = get_bool_env('SESSION_COOKIE_SECURE', False)  # type: ignore[name-defined]

SESSION_ENGINE = "django.contrib.sessions.backends.signed_cookies"

RQ_QUEUES = {}

SENTRY_DSN = get_env(  # type: ignore[name-defined]
    'SENTRY_DSN',
    'https://68b045ab408a4d32a910d339be8591a4@o227124.ingest.sentry.io/5820521'
)
SENTRY_ENVIRONMENT = get_env('SENTRY_ENVIRONMENT', 'opensource')  # type: ignore[name-defined]

FRONTEND_SENTRY_DSN = get_env(  # type: ignore[name-defined]
    'FRONTEND_SENTRY_DSN',
    'https://5f51920ff82a4675a495870244869c6b@o227124.ingest.sentry.io/5838868')
FRONTEND_SENTRY_ENVIRONMENT = get_env('FRONTEND_SENTRY_ENVIRONMENT', 'opensource')  # type: ignore[name-defined]

EDITOR_KEYMAP = json.dumps(get_env("EDITOR_KEYMAP"))  # type: ignore[name-defined, name-defined]

if not TYPE_CHECKING:
    from label_studio import __version__
    from label_studio.core.utils import sentry
    sentry.init_sentry(release_name='label-studio', release_version=__version__)

    # we should do it after sentry init
    from label_studio.core.utils.common import collect_versions
    versions = collect_versions()

# in Label Studio Community version, feature flags are always ON
FEATURE_FLAGS_DEFAULT_VALUE = True
# or if file is not set, default is using offline mode
FEATURE_FLAGS_OFFLINE = get_bool_env('FEATURE_FLAGS_OFFLINE', True)  # type: ignore[name-defined]

from core.utils.io import find_file
FEATURE_FLAGS_FILE = get_env('FEATURE_FLAGS_FILE', 'feature_flags.json')  # type: ignore[name-defined]
FEATURE_FLAGS_FROM_FILE = True
try:
    from core.utils.io import find_node
    find_node('label_studio', FEATURE_FLAGS_FILE, 'file')  # type: ignore[no-untyped-call]
except IOError:
    FEATURE_FLAGS_FROM_FILE = False

STORAGE_PERSISTENCE = get_bool_env('STORAGE_PERSISTENCE', True)  # type: ignore[name-defined]
