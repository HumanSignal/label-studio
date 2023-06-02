"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import os
import pathlib
import re

from core.settings.base import *
from label_studio.core.settings.apollo import ApolloBaseConfig

DJANGO_DB = get_env('DJANGO_DB', DJANGO_DB_MYSQL)

MIDDLEWARE.append('organizations.middleware.DummyGetSessionMiddleware')
MIDDLEWARE.append('core.middleware.UpdateLastActivityMiddleware')
if INACTIVITY_SESSION_TIMEOUT_ENABLED:
    MIDDLEWARE.append('core.middleware.InactivitySessionTimeoutMiddleWare')

ADD_DEFAULT_ML_BACKENDS = False

LOGGING['root']['level'] = get_env('LOG_LEVEL', 'WARNING')

DEBUG = get_bool_env('LABEL_STUDIO_DEBUG', True)

DEBUG_PROPAGATE_EXCEPTIONS = get_bool_env('DEBUG_PROPAGATE_EXCEPTIONS', False)

SESSION_COOKIE_SECURE = get_bool_env('SESSION_COOKIE_SECURE', False)

SESSION_ENGINE = "django.contrib.sessions.backends.signed_cookies"

RQ_QUEUES = {}

SENTRY_DSN = get_env(
    'SENTRY_DSN',
    'https://68b045ab408a4d32a910d339be8591a4@o227124.ingest.sentry.io/5820521'
)
SENTRY_ENVIRONMENT = get_env('SENTRY_ENVIRONMENT', 'opensource')

FRONTEND_SENTRY_DSN = get_env(
    'FRONTEND_SENTRY_DSN',
    'https://5f51920ff82a4675a495870244869c6b@o227124.ingest.sentry.io/5838868')
FRONTEND_SENTRY_ENVIRONMENT = get_env('FRONTEND_SENTRY_ENVIRONMENT', 'opensource')

EDITOR_KEYMAP = json.dumps(get_env("EDITOR_KEYMAP"))

from label_studio import __version__
from label_studio.core.utils import sentry
sentry.init_sentry(release_name='label-studio', release_version=__version__)

# we should do it after sentry init
from label_studio.core.utils.common import collect_versions
versions = collect_versions()

# in Label Studio Community version, feature flags are always ON
FEATURE_FLAGS_DEFAULT_VALUE = True
# or if file is not set, default is using offline mode
FEATURE_FLAGS_OFFLINE = get_bool_env('FEATURE_FLAGS_OFFLINE', True)

from core.utils.io import find_file
FEATURE_FLAGS_FILE = get_env('FEATURE_FLAGS_FILE', 'feature_flags.json')
FEATURE_FLAGS_FROM_FILE = True
try:
    from core.utils.io import find_node
    find_node('label_studio', FEATURE_FLAGS_FILE, 'file')
except IOError:
    FEATURE_FLAGS_FROM_FILE = False

STORAGE_PERSISTENCE = get_bool_env('STORAGE_PERSISTENCE', True)

# 开放账号密码登录
LOGIN_WITH_ACCOUNT = get_bool_env('LOGIN_WITH_ACCOUNT', True)

# 默认组
DEFAULT_GROUPS = get_env('DEFAULT_GROUPS', "annotator")

# 生成标注结果目录文件名
SYNC_ANNOTATION_DIR = get_env('SYNC_ANNOTATION_DIR', "result")

# 当前服务对外暴露域名
SERVER_HOST = ""

APOLLO_APPLICATION = "machine-learning"
APOLLO_NAMESPACE = "mlflow"

# MLFLOW_APOLLO_CONFIG_DICT = ApolloBaseConfig().get_apollo_configs(
#     app=APOLLO_APPLICATION, namespace=APOLLO_NAMESPACE
# )
MLFLOW_APOLLO_CONFIG_DICT = {}
# OSS config
MLFLOW_OSS_ENDPOINT_URL = MLFLOW_APOLLO_CONFIG_DICT.get("mlflow.oss.attaAiModel.ro.endPoint", "")
MLFLOW_OSS_KEY_ID = MLFLOW_APOLLO_CONFIG_DICT.get("mlflow.oss.attaAiModel.ro.accessKeyId", "")
MLFLOW_OSS_KEY_SECRET = MLFLOW_APOLLO_CONFIG_DICT.get("mlflow.oss.attaAiModel.ro.accessKeySecret", "")
MLFLOW_OSS_BUCKET_NAME = MLFLOW_APOLLO_CONFIG_DICT.get("mlflow.oss.attaAiModel.ro.bucketRoot", "")

# 标准话BUCKET NAME
if MLFLOW_OSS_BUCKET_NAME.startswith("oss://"):
    MLFLOW_OSS_BUCKET_NAME = MLFLOW_OSS_BUCKET_NAME.replace("oss://", "").strip("/")


DATABASES_ALL[DJANGO_DB_MYSQL] = {
    'ENGINE': 'django.db.backends.mysql',
    'USER': MLFLOW_APOLLO_CONFIG_DICT.get('label_studio.mysql.username', 'root'),
    'PASSWORD': MLFLOW_APOLLO_CONFIG_DICT.get('label_studio.mysql.password', '111111'),
    'NAME': MLFLOW_APOLLO_CONFIG_DICT.get('label_studio.mysql.database', 'label_studio2'),
    'HOST': MLFLOW_APOLLO_CONFIG_DICT.get('label_studio.mysql.host', '127.0.0.1'),
    'PORT': MLFLOW_APOLLO_CONFIG_DICT.get('label_studio.mysql.port', '3306'),
}

DATABASES = {'default': DATABASES_ALL[DJANGO_DB]}

# Boss登录校验权限
BOSS_PERMISSION_CODE = get_env('BOSS_PERMISSION_CODE', '')
# Boss配置
OAUTH_APP_CONFIG = {
    'boss': {
        'client_id': get_env('CLIENT_SECRET', 'label_studio'),
        'client_secret': get_env('CLIENT_SECRET', 'label_studio'),
        'access_token_url': get_env('BOSS_PERMISSION_CODE', 'https://dev8.xtrfr.cn/oauth/token'),
        'authorize_url': get_env('AUTHORIZE_URL', 'https://dev8.xtrfr.cn/oauth/authorize'),
        'api_base_url': get_env('API_BASE_URL', 'https://dev8.xtrfr.cn/oauth'),
    }
}

RQ_QUEUES = {
    'default': {
        'HOST': MLFLOW_APOLLO_CONFIG_DICT.get("mlflow.redis.uri", ""),
        'PORT': int(MLFLOW_APOLLO_CONFIG_DICT.get("mlflow.redis.port", 10033)),
        'DB': MLFLOW_APOLLO_CONFIG_DICT.get("mlflow.redis.database", ""),
        'PASSWORD': MLFLOW_APOLLO_CONFIG_DICT.get("mlflow.redis.password"),
        'DEFAULT_TIMEOUT': 360,
    }
}