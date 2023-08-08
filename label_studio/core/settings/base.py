"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
"""
Django Base settings for Label Studio.

For more information on this file, see
https://docs.djangoproject.com/en/3.1/topics/settings/

For the full list of settings and their values, see
https://docs.djangoproject.com/en/3.1/ref/settings/
"""
from typing import TYPE_CHECKING

import os
import re
import logging
import json

from datetime import timedelta

if TYPE_CHECKING:
    from core.utils.params import get_bool_env, get_env
else:
    from label_studio.core.utils.params import get_bool_env, get_env

formatter = 'standard'
JSON_LOG = get_bool_env('JSON_LOG', False)  # type: ignore[no-untyped-call]
if JSON_LOG:
    formatter = 'json'

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'json': {
            '()': 'label_studio.core.utils.formatter.CustomJsonFormatter',
            'format': '[%(asctime)s] [%(name)s::%(funcName)s::%(lineno)d] [%(levelname)s] [%(user_id)s] %(message)s',
            'datefmt': '%d/%b/%Y:%H:%M:%S %z',
        },
        'standard': {
            'format': '[%(asctime)s] [%(name)s::%(funcName)s::%(lineno)d] [%(levelname)s] %(message)s',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': formatter,
        },
    },
    'root': {
        'handlers': ['console'],
        'level': os.environ.get('LOG_LEVEL', 'DEBUG'),
    },
    'loggers': {
        'pykwalify': {'level': 'ERROR', 'propagate': False},
        'tavern': {'level': 'ERROR', 'propagate': False},
        'asyncio': {'level': 'WARNING'},
        'rules': {'level': 'WARNING'},
        'django': {
            'handlers': ['console'],
            # 'propagate': True,
        },
        'django_auth_ldap': {'level': os.environ.get('LOG_LEVEL', 'DEBUG')},
        "rq.worker": {
            "handlers": ["console"],
            "level": os.environ.get('LOG_LEVEL', 'INFO'),
        },
        'ddtrace': {
            'handlers': ['console'],
            'level': 'WARNING',
        },
        'ldclient.util': {
            'handlers': ['console'],
            'level': 'ERROR',
        },
    },
}

# for printing messages before main logging config applied
if not logging.getLogger().hasHandlers():
    logging.basicConfig(level=logging.DEBUG, format='%(message)s')

if TYPE_CHECKING:
    from core.utils.io import get_data_dir
    from core.utils.params import get_bool_env, get_env
else:
    from label_studio.core.utils.io import get_data_dir
    from label_studio.core.utils.params import get_bool_env, get_env

logger = logging.getLogger(__name__)
SILENCED_SYSTEM_CHECKS = []

# Hostname is used for proper path generation to the resources, pages, etc
HOSTNAME = get_env('HOST', '')  # type: ignore[no-untyped-call]
if HOSTNAME:
    if not HOSTNAME.startswith('http://') and not HOSTNAME.startswith('https://'):
        logger.info(
            "! HOST variable found in environment, but it must start with http:// or https://, ignore it: %s", HOSTNAME
        )
        HOSTNAME = ''
    else:
        logger.info("=> Hostname correctly is set to: %s", HOSTNAME)
        if HOSTNAME.endswith('/'):
            HOSTNAME = HOSTNAME[0:-1]

        # for django url resolver
        if HOSTNAME:
            # http[s]://domain.com:8080/script_name => /script_name
            pattern = re.compile(r'^http[s]?:\/\/([^:\/\s]+(:\d*)?)(.*)?')
            match = pattern.match(HOSTNAME)
            FORCE_SCRIPT_NAME = match.group(3)  # type: ignore[union-attr]
            if FORCE_SCRIPT_NAME:
                logger.info("=> Django URL prefix is set to: %s", FORCE_SCRIPT_NAME)

INTERNAL_PORT = '8080'

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = '$(fefwefwef13;LFK{P!)@#*!)kdsjfWF2l+i5e3t(8a1n'

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = get_bool_env('DEBUG', True)  # type: ignore[no-untyped-call]
DEBUG_MODAL_EXCEPTIONS = get_bool_env('DEBUG_MODAL_EXCEPTIONS', True)  # type: ignore[no-untyped-call]

# Build paths inside the project like this: os.path.join(BASE_DIR, ...)
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Base path for media root and other uploaded files
BASE_DATA_DIR = get_env('BASE_DATA_DIR', get_data_dir())  # type: ignore[no-untyped-call, no-untyped-call]
os.makedirs(BASE_DATA_DIR, exist_ok=True)
logger.info('=> Database and media directory: %s', BASE_DATA_DIR)

# Databases
# https://docs.djangoproject.com/en/2.1/ref/settings/#databases
DJANGO_DB_MYSQL = 'mysql'
DJANGO_DB_SQLITE = 'sqlite'
DJANGO_DB_POSTGRESQL = 'postgresql'
DJANGO_DB = 'default'
DATABASE_NAME_DEFAULT = os.path.join(BASE_DATA_DIR, 'label_studio.sqlite3')
DATABASE_NAME = get_env('DATABASE_NAME', DATABASE_NAME_DEFAULT)  # type: ignore[no-untyped-call]
DATABASES_ALL = {
    DJANGO_DB_POSTGRESQL: {
        'ENGINE': 'django.db.backends.postgresql',
        'USER': get_env('POSTGRE_USER', 'postgres'),  # type: ignore[no-untyped-call]
        'PASSWORD': get_env('POSTGRE_PASSWORD', 'postgres'),  # type: ignore[no-untyped-call]
        'NAME': get_env('POSTGRE_NAME', 'postgres'),  # type: ignore[no-untyped-call]
        'HOST': get_env('POSTGRE_HOST', 'localhost'),  # type: ignore[no-untyped-call]
        'PORT': int(get_env('POSTGRE_PORT', '5432')),  # type: ignore[no-untyped-call]
    },
    DJANGO_DB_MYSQL: {
        'ENGINE': 'django.db.backends.mysql',
        'USER': get_env('MYSQL_USER', 'root'),  # type: ignore[no-untyped-call]
        'PASSWORD': get_env('MYSQL_PASSWORD', ''),  # type: ignore[no-untyped-call]
        'NAME': get_env('MYSQL_NAME', 'labelstudio'),  # type: ignore[no-untyped-call]
        'HOST': get_env('MYSQL_HOST', 'localhost'),  # type: ignore[no-untyped-call]
        'PORT': int(get_env('MYSQL_PORT', '3306')),  # type: ignore[no-untyped-call]
    },
    DJANGO_DB_SQLITE: {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': DATABASE_NAME,
        'OPTIONS': {
            # 'timeout': 20,
        },
    },
}
DATABASES_ALL['default'] = DATABASES_ALL[DJANGO_DB_POSTGRESQL]
DATABASES = {'default': DATABASES_ALL.get(get_env('DJANGO_DB', 'default'))}  # type: ignore[no-untyped-call]

DEFAULT_AUTO_FIELD = 'django.db.models.AutoField'

if get_bool_env('GOOGLE_LOGGING_ENABLED', False):  # type: ignore[no-untyped-call]
    logging.info('Google Cloud Logging handler is enabled.')
    try:
        import google.cloud.logging
        from google.auth.exceptions import GoogleAuthError  # type: ignore[import]

        client = google.cloud.logging.Client()  # type: ignore[no-untyped-call]
        client.setup_logging()  # type: ignore[no-untyped-call]

        LOGGING['handlers']['google_cloud_logging'] = {  # type: ignore[index]
            'level': get_env('LOG_LEVEL', 'WARNING'),  # type: ignore[no-untyped-call]
            'class': 'google.cloud.logging.handlers.CloudLoggingHandler',
            'client': client,
        }
        LOGGING['root']['handlers'].append('google_cloud_logging')  # type: ignore[index]
    except GoogleAuthError as e:
        logger.exception('Google Cloud Logging handler could not be setup.')

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'django.contrib.humanize',
    'drf_yasg',
    'corsheaders',
    'django_extensions',
    'django_rq',
    'django_filters',
    'rules',
    'annoying',
    'rest_framework',
    'rest_framework_swagger',
    'rest_framework.authtoken',
    'drf_generators',
    'core',
    'users',
    'organizations',
    'data_import',
    'data_export',
    'projects',
    'tasks',
    'data_manager',
    'io_storages',
    'ml',
    'webhooks',
    'labels_manager',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.locale.LocaleMiddleware',
    'core.middleware.DisableCSRF',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'core.middleware.CommonMiddlewareAppendSlashWithoutRedirect',  # instead of 'CommonMiddleware'
    'core.middleware.CommonMiddleware',
    'django_user_agents.middleware.UserAgentMiddleware',
    'core.middleware.SetSessionUIDMiddleware',
    'core.middleware.ContextLogMiddleware',
    'core.middleware.DatabaseIsLockedRetryMiddleware',
    'core.current_request.ThreadLocalMiddleware',
]

REST_FRAMEWORK = {
    'DEFAULT_FILTER_BACKENDS': ['django_filters.rest_framework.DjangoFilterBackend'],
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework.authentication.TokenAuthentication',
        'rest_framework.authentication.SessionAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': [
        'core.api_permissions.HasObjectPermission',
        'rest_framework.permissions.IsAuthenticated',
    ],
    'EXCEPTION_HANDLER': 'core.utils.common.custom_exception_handler',
    'DEFAULT_RENDERER_CLASSES': ('rest_framework.renderers.JSONRenderer',),
    'DEFAULT_VERSIONING_CLASS': 'rest_framework.versioning.NamespaceVersioning',
    'PAGE_SIZE': 100,
    # 'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination'
}
SILENCED_SYSTEM_CHECKS += ["rest_framework.W001"]

# CORS & Host settings
INTERNAL_IPS = [  # django debug toolbar for django==2.2 requirement
    '127.0.0.1',
    'localhost',
]
CORS_ORIGIN_ALLOW_ALL = True
CORS_ALLOW_METHODS = [
    'DELETE',
    'GET',
    'OPTIONS',
    'PATCH',
    'POST',
    'PUT',
]
ALLOWED_HOSTS = ['*']

# Auth modules
AUTH_USER_MODEL = 'users.User'
AUTHENTICATION_BACKENDS = ['rules.permissions.ObjectPermissionBackend', 'django.contrib.auth.backends.ModelBackend', ]
USE_USERNAME_FOR_LOGIN = False

DISABLE_SIGNUP_WITHOUT_LINK = get_bool_env('DISABLE_SIGNUP_WITHOUT_LINK', False)  # type: ignore[no-untyped-call]

# Password validation:
# https://docs.djangoproject.com/en/2.1/ref/settings/#auth-password-validators
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# Django templates
TEMPLATES_DIR = os.path.join(os.path.dirname(BASE_DIR), 'templates')  # ../../from_this = 'web' dir
TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [TEMPLATES_DIR],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
                'core.context_processors.settings',
            ],
            'builtins': ['django.templatetags.i18n'],
        },
    }
]

# RQ
RQ_QUEUES = {
    'critical': {
        'HOST': 'localhost',
        'PORT': 6379,
        'DB': 0,
        'DEFAULT_TIMEOUT': 180,
    },
    'high': {
        'HOST': 'localhost',
        'PORT': 6379,
        'DB': 0,
        'DEFAULT_TIMEOUT': 180,
    },
    'default': {
        'HOST': 'localhost',
        'PORT': 6379,
        'DB': 0,
        'DEFAULT_TIMEOUT': 180,
    },
    'low': {
        'HOST': 'localhost',
        'PORT': 6379,
        'DB': 0,
        'DEFAULT_TIMEOUT': 180,
    },
}

# Swagger: automatic API documentation
SWAGGER_SETTINGS = {
    'SECURITY_DEFINITIONS': {
        'Token': {
            'type': 'apiKey',
            'name': 'Authorization',
            'in': 'header',
            'description':
                'The token (or API key) must be passed as a request header. '
                'You can find your user token on the User Account page in Label Studio. Example: '
                '<br><pre><code class="language-bash">'
                'curl https://label-studio-host/api/projects -H "Authorization: Token [your-token]"'
                '</code></pre>'
        }
    },
    'APIS_SORTER': 'alpha',
    'SUPPORTED_SUBMIT_METHODS': ['get', 'post', 'put', 'delete', 'patch'],
    'OPERATIONS_SORTER': 'alpha',

}

SENTRY_DSN = get_env('SENTRY_DSN', None)  # type: ignore[no-untyped-call]
SENTRY_RATE = float(get_env('SENTRY_RATE', 0.25))  # type: ignore[no-untyped-call]
SENTRY_ENVIRONMENT = get_env('SENTRY_ENVIRONMENT', 'stage.opensource')  # type: ignore[no-untyped-call]
SENTRY_REDIS_ENABLED = False
FRONTEND_SENTRY_DSN = get_env('FRONTEND_SENTRY_DSN', None)  # type: ignore[no-untyped-call]
FRONTEND_SENTRY_RATE = get_env('FRONTEND_SENTRY_RATE', 0.1)  # type: ignore[no-untyped-call]
FRONTEND_SENTRY_ENVIRONMENT = get_env('FRONTEND_SENTRY_ENVIRONMENT', 'stage.opensource')  # type: ignore[no-untyped-call]

ROOT_URLCONF = 'core.urls'
WSGI_APPLICATION = 'core.wsgi.application'
GRAPHIQL = True

# Internationalization
# https://docs.djangoproject.com/en/2.1/topics/i18n/
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = False
USE_L10N = True
USE_TZ = True

# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/2.1/howto/static-files/
STATIC_URL = '/static/'
# if FORCE_SCRIPT_NAME:
#    STATIC_URL = FORCE_SCRIPT_NAME + STATIC_URL
logger.info(f'=> Static URL is set to: {STATIC_URL}')

STATIC_ROOT = os.path.join(BASE_DIR, 'static_build')
STATICFILES_DIRS = [os.path.join(BASE_DIR, 'static')]
STATICFILES_FINDERS = (
    'django.contrib.staticfiles.finders.FileSystemFinder',
    'django.contrib.staticfiles.finders.AppDirectoriesFinder',
)
STATICFILES_STORAGE = 'core.storage.SkipMissedManifestStaticFilesStorage'

# Sessions and CSRF
SESSION_COOKIE_SECURE = bool(int(get_env('SESSION_COOKIE_SECURE', False)))  # type: ignore[no-untyped-call]
SESSION_COOKIE_SAMESITE = get_env('SESSION_COOKIE_SAMESITE', 'Lax')  # type: ignore[no-untyped-call]

CSRF_COOKIE_SECURE = bool(int(get_env('CSRF_COOKIE_SECURE', SESSION_COOKIE_SECURE)))  # type: ignore[no-untyped-call]
CSRF_COOKIE_HTTPONLY = bool(int(get_env('CSRF_COOKIE_HTTPONLY', SESSION_COOKIE_SECURE)))  # type: ignore[no-untyped-call]
CSRF_COOKIE_SAMESITE = get_env('CSRF_COOKIE_SAMESITE', 'Lax')  # type: ignore[no-untyped-call]

# Inactivity user sessions
INACTIVITY_SESSION_TIMEOUT_ENABLED = bool(int(get_env('INACTIVITY_SESSION_TIMEOUT_ENABLED', True)))  # type: ignore[no-untyped-call]
# The most time a login will last, regardless of activity
MAX_SESSION_AGE = int(get_env('MAX_SESSION_AGE', timedelta(days=14).total_seconds()))  # type: ignore[no-untyped-call]
# The most time that can elapse between activity with the server before the user is logged out
MAX_TIME_BETWEEN_ACTIVITY = int(get_env('MAX_TIME_BETWEEN_ACTIVITY', timedelta(days=5).total_seconds()))  # type: ignore[no-untyped-call]

SSRF_PROTECTION_ENABLED = get_bool_env('SSRF_PROTECTION_ENABLED', False)  # type: ignore[no-untyped-call]

# user media files
MEDIA_ROOT = os.path.join(BASE_DATA_DIR, 'media')
os.makedirs(MEDIA_ROOT, exist_ok=True)
MEDIA_URL = '/data/'
UPLOAD_DIR = 'upload'
AVATAR_PATH = 'avatars'

SUPPORTED_EXTENSIONS = set(
    [
        '.bmp',
        '.csv',
        '.flac',
        '.gif',
        '.htm',
        '.html',
        '.jpg',
        '.jpeg',
        '.json',
        '.m4a',
        '.mp3',
        '.ogg',
        '.png',
        '.svg',
        '.tsv',
        '.txt',
        '.wav',
        '.xml',
        '.mp4',
        '.webm',
        '.webp',
    ]
)

# directory for files created during unit tests
TEST_DATA_ROOT = os.path.join(BASE_DATA_DIR, 'test_data')
os.makedirs(TEST_DATA_ROOT, exist_ok=True)

# project exports
EXPORT_DIR = os.path.join(BASE_DATA_DIR, 'export')
EXPORT_URL_ROOT = '/export/'
EXPORT_MIXIN = 'data_export.mixins.ExportMixin'
# old export dir
os.makedirs(EXPORT_DIR, exist_ok=True)
# dir for delayed export
DELAYED_EXPORT_DIR = 'export'
os.makedirs(os.path.join(BASE_DATA_DIR, MEDIA_ROOT, DELAYED_EXPORT_DIR), exist_ok=True)

# file / task size limits
DATA_UPLOAD_MAX_MEMORY_SIZE = int(get_env('DATA_UPLOAD_MAX_MEMORY_SIZE', 250 * 1024 * 1024))  # type: ignore[no-untyped-call]
TASKS_MAX_NUMBER = 1000000
TASKS_MAX_FILE_SIZE = DATA_UPLOAD_MAX_MEMORY_SIZE

TASK_LOCK_TTL = int(get_env('TASK_LOCK_TTL', default=86400))  # type: ignore[no-untyped-call]

LABEL_STREAM_HISTORY_LIMIT = int(get_env('LABEL_STREAM_HISTORY_LIMIT', default=100))  # type: ignore[no-untyped-call]

RANDOM_NEXT_TASK_SAMPLE_SIZE = int(get_env('RANDOM_NEXT_TASK_SAMPLE_SIZE', 50))  # type: ignore[no-untyped-call]

TASK_API_PAGE_SIZE_MAX = int(get_env('TASK_API_PAGE_SIZE_MAX', 0)) or None  # type: ignore[no-untyped-call]

# Email backend
FROM_EMAIL = get_env('FROM_EMAIL', 'Label Studio <hello@labelstud.io>')  # type: ignore[no-untyped-call]
EMAIL_BACKEND = get_env('EMAIL_BACKEND', 'django.core.mail.backends.dummy.EmailBackend')  # type: ignore[no-untyped-call]

ENABLE_LOCAL_FILES_STORAGE = get_bool_env('ENABLE_LOCAL_FILES_STORAGE', default=True)  # type: ignore[no-untyped-call]
LOCAL_FILES_SERVING_ENABLED = get_bool_env('LOCAL_FILES_SERVING_ENABLED', default=False)  # type: ignore[no-untyped-call]
LOCAL_FILES_DOCUMENT_ROOT = get_env('LOCAL_FILES_DOCUMENT_ROOT', default=os.path.abspath(os.sep))  # type: ignore[no-untyped-call]

SYNC_ON_TARGET_STORAGE_CREATION = get_bool_env('SYNC_ON_TARGET_STORAGE_CREATION', default=True)  # type: ignore[no-untyped-call]

ALLOW_IMPORT_TASKS_WITH_UNKNOWN_EMAILS = get_bool_env('ALLOW_IMPORT_TASKS_WITH_UNKNOWN_EMAILS', default=False)  # type: ignore[no-untyped-call]

""" React Libraries: do not forget to change this dir in /etc/nginx/nginx.conf """
# EDITOR = label-studio-frontend repository
EDITOR_ROOT = os.path.join(BASE_DIR, '../frontend/dist/lsf')
# DM = data manager (included into FRONTEND due npm building, we need only version.json file from there)
DM_ROOT = os.path.join(BASE_DIR, '../frontend/dist/dm')
# FRONTEND = GUI for django backend
REACT_APP_ROOT = os.path.join(BASE_DIR, '../frontend/dist/react-app')

# per project settings
BATCH_SIZE = 1000
PROJECT_TITLE_MIN_LEN = 3
PROJECT_TITLE_MAX_LEN = 50
LOGIN_REDIRECT_URL = '/'
LOGIN_URL = '/'
MIN_GROUND_TRUTH = 10
DATA_UNDEFINED_NAME = '$undefined$'
LICENSE = {}  # type: ignore[var-annotated]
VERSIONS = {}  # type: ignore[var-annotated]
VERSION_EDITION = 'Community'
LATEST_VERSION_CHECK = True
VERSIONS_CHECK_TIME = 0
ALLOW_ORGANIZATION_WEBHOOKS = get_bool_env('ALLOW_ORGANIZATION_WEBHOOKS', False)  # type: ignore[no-untyped-call]
CONVERTER_DOWNLOAD_RESOURCES = get_bool_env('CONVERTER_DOWNLOAD_RESOURCES', True)  # type: ignore[no-untyped-call]
EXPERIMENTAL_FEATURES = get_bool_env('EXPERIMENTAL_FEATURES', False)  # type: ignore[no-untyped-call]
USE_ENFORCE_CSRF_CHECKS = get_bool_env('USE_ENFORCE_CSRF_CHECKS', True)    # type: ignore[no-untyped-call] # False is for tests
CLOUD_FILE_STORAGE_ENABLED = False

IO_STORAGES_IMPORT_LINK_NAMES = [
    'io_storages_s3importstoragelink',
    'io_storages_gcsimportstoragelink',
    'io_storages_azureblobimportstoragelink',
    'io_storages_localfilesimportstoragelink',
    'io_storages_redisimportstoragelink',
]

CREATE_ORGANIZATION = 'organizations.functions.create_organization'
SAVE_USER = 'users.functions.save_user'
POST_PROCESS_REIMPORT = 'core.utils.common.empty'
USER_SERIALIZER = 'users.serializers.BaseUserSerializer'
USER_SERIALIZER_UPDATE = 'users.serializers.BaseUserSerializerUpdate'
TASK_SERIALIZER = 'tasks.serializers.BaseTaskSerializer'
EXPORT_DATA_SERIALIZER = 'data_export.serializers.BaseExportDataSerializer'
DATA_MANAGER_GET_ALL_COLUMNS = 'data_manager.functions.get_all_columns'
DATA_MANAGER_ANNOTATIONS_MAP = {}  # type: ignore[var-annotated]
DATA_MANAGER_ACTIONS = {}  # type: ignore[var-annotated]
DATA_MANAGER_CUSTOM_FILTER_EXPRESSIONS = 'data_manager.functions.custom_filter_expressions'
DATA_MANAGER_PREPROCESS_FILTER = 'data_manager.functions.preprocess_filter'
USER_LOGIN_FORM = 'users.forms.LoginForm'
PROJECT_MIXIN = 'projects.mixins.ProjectMixin'
TASK_MIXIN = 'tasks.mixins.TaskMixin'
ANNOTATION_MIXIN = 'tasks.mixins.AnnotationMixin'
ORGANIZATION_MIXIN = 'organizations.mixins.OrganizationMixin'
USER_MIXIN = 'users.mixins.UserMixin'
GET_STORAGE_LIST = 'io_storages.functions.get_storage_list'
STORAGE_ANNOTATION_SERIALIZER = 'io_storages.serializers.StorageAnnotationSerializer'
TASK_SERIALIZER_BULK = 'tasks.serializers.BaseTaskSerializerBulk'
PREPROCESS_FIELD_NAME = 'data_manager.functions.preprocess_field_name'
INTERACTIVE_DATA_SERIALIZER = 'data_export.serializers.BaseExportDataSerializerForInteractive'
DELETE_TASKS_ANNOTATIONS_POSTPROCESS = None


def project_delete(project):  # type: ignore[no-untyped-def]
    project.delete()


def user_auth(user_model, email, password):  # type: ignore[no-untyped-def]
    return None


def collect_versions_dummy(**kwargs):  # type: ignore[no-untyped-def]
    return {}


PROJECT_DELETE = project_delete
USER_AUTH = user_auth
COLLECT_VERSIONS = collect_versions_dummy

WEBHOOK_TIMEOUT = float(get_env('WEBHOOK_TIMEOUT', 1.0))  # type: ignore[no-untyped-call]
WEBHOOK_SERIALIZERS = {
    'project': 'webhooks.serializers_for_hooks.ProjectWebhookSerializer',
    'task': 'webhooks.serializers_for_hooks.TaskWebhookSerializer',
    'annotation': 'webhooks.serializers_for_hooks.AnnotationWebhookSerializer',
    'label': 'labels_manager.serializers.LabelSerializer',
    'label_link': 'labels_manager.serializers.LabelLinkSerializer',
}

EDITOR_KEYMAP = json.dumps(get_env("EDITOR_KEYMAP"))  # type: ignore[no-untyped-call]

# fix a problem with Windows mimetypes for JS and PNG
import mimetypes

mimetypes.add_type("application/javascript", ".js", True)
mimetypes.add_type("image/png", ".png", True)

# fields name was used in DM api before
REST_FLEX_FIELDS = {"FIELDS_PARAM": "include"}

INTERPOLATE_KEY_FRAMES = get_env('INTERPOLATE_KEY_FRAMES', False)  # type: ignore[no-untyped-call]

# Feature Flags
FEATURE_FLAGS_API_KEY = get_env('FEATURE_FLAGS_API_KEY', default='any key')  # type: ignore[no-untyped-call]

# we may set feature flags from file
FEATURE_FLAGS_FROM_FILE = get_bool_env('FEATURE_FLAGS_FROM_FILE', False)  # type: ignore[no-untyped-call]
FEATURE_FLAGS_FILE = get_env('FEATURE_FLAGS_FILE', 'feature_flags.json')  # type: ignore[no-untyped-call]
# or if file is not set, default is using offline mode
FEATURE_FLAGS_OFFLINE = get_bool_env('FEATURE_FLAGS_OFFLINE', True)  # type: ignore[no-untyped-call]
# default value for feature flags (if not overridden by environment or client)
FEATURE_FLAGS_DEFAULT_VALUE = False

# Whether to send analytics telemetry data
COLLECT_ANALYTICS = get_bool_env('collect_analytics', True)  # type: ignore[no-untyped-call]

# Strip harmful content from SVG files by default
SVG_SECURITY_CLEANUP = get_bool_env('SVG_SECURITY_CLEANUP', False)  # type: ignore[no-untyped-call]

ML_BLOCK_LOCAL_IP = get_bool_env('ML_BLOCK_LOCAL_IP', False)  # type: ignore[no-untyped-call]

RQ_LONG_JOB_TIMEOUT = int(get_env('RQ_LONG_JOB_TIMEOUT', 36000))  # type: ignore[no-untyped-call]

APP_WEBSERVER = get_env('APP_WEBSERVER', 'django')  # type: ignore[no-untyped-call]

BATCH_JOB_RETRY_TIMEOUT = int(get_env('BATCH_JOB_RETRY_TIMEOUT', 60))  # type: ignore[no-untyped-call]

FUTURE_SAVE_TASK_TO_STORAGE = get_bool_env('FUTURE_SAVE_TASK_TO_STORAGE', default=False)  # type: ignore[no-untyped-call]
FUTURE_SAVE_TASK_TO_STORAGE_JSON_EXT = get_bool_env('FUTURE_SAVE_TASK_TO_STORAGE_JSON_EXT', default=True)  # type: ignore[no-untyped-call]
STORAGE_IN_PROGRESS_TIMER = get_env('STORAGE_IN_PROGRESS_TIMER', 5.0)  # type: ignore[no-untyped-call]

USE_NGINX_FOR_EXPORT_DOWNLOADS = get_bool_env('USE_NGINX_FOR_EXPORT_DOWNLOADS', False)  # type: ignore[no-untyped-call]

if get_env('MINIO_STORAGE_ENDPOINT') and not get_bool_env('MINIO_SKIP', False):  # type: ignore[no-untyped-call, no-untyped-call]
    CLOUD_FILE_STORAGE_ENABLED = True
    DEFAULT_FILE_STORAGE = 'storages.backends.s3boto3.S3Boto3Storage'
    AWS_STORAGE_BUCKET_NAME = get_env('MINIO_STORAGE_BUCKET_NAME')  # type: ignore[no-untyped-call]
    AWS_ACCESS_KEY_ID = get_env('MINIO_STORAGE_ACCESS_KEY')  # type: ignore[no-untyped-call]
    AWS_SECRET_ACCESS_KEY = get_env('MINIO_STORAGE_SECRET_KEY')  # type: ignore[no-untyped-call]
    AWS_S3_ENDPOINT_URL = get_env('MINIO_STORAGE_ENDPOINT')  # type: ignore[no-untyped-call]
    AWS_QUERYSTRING_AUTH = False
    # make domain for FileUpload.file
    AWS_S3_SECURE_URLS = False
    AWS_S3_URL_PROTOCOL = 'http:' if HOSTNAME.startswith('http://') else 'https:'
    AWS_S3_CUSTOM_DOMAIN = HOSTNAME.replace('http://', '').replace('https://', '') + '/data'

if get_env('STORAGE_TYPE') == "s3":  # type: ignore[no-untyped-call]
    CLOUD_FILE_STORAGE_ENABLED = True
    DEFAULT_FILE_STORAGE = 'core.storage.CustomS3Boto3Storage'
    if get_env('STORAGE_AWS_ACCESS_KEY_ID'):  # type: ignore[no-untyped-call]
        AWS_ACCESS_KEY_ID = get_env('STORAGE_AWS_ACCESS_KEY_ID')  # type: ignore[no-untyped-call]
    if get_env('STORAGE_AWS_SECRET_ACCESS_KEY'):  # type: ignore[no-untyped-call]
        AWS_SECRET_ACCESS_KEY = get_env('STORAGE_AWS_SECRET_ACCESS_KEY')  # type: ignore[no-untyped-call]
    AWS_STORAGE_BUCKET_NAME = get_env('STORAGE_AWS_BUCKET_NAME')  # type: ignore[no-untyped-call]
    AWS_S3_REGION_NAME = get_env('STORAGE_AWS_REGION_NAME', None)  # type: ignore[no-untyped-call]
    AWS_S3_ENDPOINT_URL = get_env('STORAGE_AWS_ENDPOINT_URL', None)  # type: ignore[no-untyped-call]
    if get_env('STORAGE_AWS_OBJECT_PARAMETERS'):  # type: ignore[no-untyped-call]
        AWS_S3_OBJECT_PARAMETERS = json.loads(get_env('STORAGE_AWS_OBJECT_PARAMETERS'))  # type: ignore[no-untyped-call]
    AWS_QUERYSTRING_EXPIRE = int(get_env('STORAGE_AWS_X_AMZ_EXPIRES', '86400'))  # type: ignore[no-untyped-call]
    AWS_LOCATION = get_env('STORAGE_AWS_FOLDER', default='')  # type: ignore[no-untyped-call]
    AWS_S3_USE_SSL = get_bool_env('STORAGE_AWS_S3_USE_SSL', True)  # type: ignore[no-untyped-call]
    AWS_S3_VERIFY = get_env('STORAGE_AWS_S3_VERIFY', None)  # type: ignore[no-untyped-call]
    if AWS_S3_VERIFY == 'false' or AWS_S3_VERIFY == 'False' or AWS_S3_VERIFY == '0':
        AWS_S3_VERIFY = False

if get_env('STORAGE_TYPE') == "azure":  # type: ignore[no-untyped-call]
    CLOUD_FILE_STORAGE_ENABLED = True
    DEFAULT_FILE_STORAGE = 'core.storage.CustomAzureStorage'
    AZURE_ACCOUNT_NAME = get_env('STORAGE_AZURE_ACCOUNT_NAME')  # type: ignore[no-untyped-call]
    AZURE_ACCOUNT_KEY = get_env('STORAGE_AZURE_ACCOUNT_KEY')  # type: ignore[no-untyped-call]
    AZURE_CONTAINER = get_env('STORAGE_AZURE_CONTAINER_NAME')  # type: ignore[no-untyped-call]
    AZURE_URL_EXPIRATION_SECS = int(get_env('STORAGE_AZURE_URL_EXPIRATION_SECS', '86400'))  # type: ignore[no-untyped-call]
    AZURE_LOCATION = get_env('STORAGE_AZURE_FOLDER', default='')  # type: ignore[no-untyped-call]

if get_env('STORAGE_TYPE') == "gcs":  # type: ignore[no-untyped-call]
    CLOUD_FILE_STORAGE_ENABLED = True
    # DEFAULT_FILE_STORAGE = 'storages.backends.gcloud.GoogleCloudStorage'
    DEFAULT_FILE_STORAGE = 'core.storage.AlternativeGoogleCloudStorage'
    GS_PROJECT_ID = get_env('STORAGE_GCS_PROJECT_ID')  # type: ignore[no-untyped-call]
    GS_BUCKET_NAME = get_env('STORAGE_GCS_BUCKET_NAME')  # type: ignore[no-untyped-call]
    GS_EXPIRATION = timedelta(seconds=int(get_env('STORAGE_GCS_EXPIRATION_SECS', '86400')))  # type: ignore[no-untyped-call]
    GS_LOCATION = get_env('STORAGE_GCS_FOLDER', default='')  # type: ignore[no-untyped-call]
    GS_CUSTOM_ENDPOINT = get_env('STORAGE_GCS_ENDPOINT')  # type: ignore[no-untyped-call]

CSRF_TRUSTED_ORIGINS = get_env('CSRF_TRUSTED_ORIGINS', [])  # type: ignore[no-untyped-call]
if CSRF_TRUSTED_ORIGINS:
    CSRF_TRUSTED_ORIGINS = CSRF_TRUSTED_ORIGINS.split(",")

REAL_HOSTNAME = os.getenv('HOSTNAME')  # we have to use getenv, because we don't use LABEL_STUDIO_ prefix
GCS_CLOUD_STORAGE_FORCE_DEFAULT_CREDENTIALS = get_bool_env('GCS_CLOUD_STORAGE_FORCE_DEFAULT_CREDENTIALS', False)  # type: ignore[no-untyped-call]
