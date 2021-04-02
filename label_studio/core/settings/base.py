"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
"""
Django Base settings for Label Studio.

For more information on this file, see
https://docs.djangoproject.com/en/3.1/topics/settings/

For the full list of settings and their values, see
https://docs.djangoproject.com/en/3.1/ref/settings/
"""
import os
import re

from core.utils.io import get_data_dir
from core.utils.params import get_bool_env, get_env

# Hostname is used for proper path generation to the resources, pages, etc
HOSTNAME = get_env('HOST', '')
if HOSTNAME:
    if not HOSTNAME.startswith('http://') and not HOSTNAME.startswith('https://'):
        print("! HOST variable found in environment, but it must start with http:// or https://, ignore it:", HOSTNAME)
        HOSTNAME = ''
    else:
        print("=> Hostname correctly is set to:", HOSTNAME)
        if HOSTNAME.endswith('/'):
            HOSTNAME = HOSTNAME[0:-1]

        # for django url resolver
        if HOSTNAME:
            # http[s]://domain.com:8080/script_name => /script_name
            pattern = re.compile(r'^http[s]?:\/\/([^:\/\s]+(:\d*)?)(.*)?')
            match = pattern.match(HOSTNAME)
            FORCE_SCRIPT_NAME = match.group(3)
            if FORCE_SCRIPT_NAME:
                print("=> Django URL prefix is set to:", FORCE_SCRIPT_NAME)

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = '$(fefwefwef13;LFK{P!)@#*!)kdsjfWF2l+i5e3t(8a1n'

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = get_bool_env('DEBUG', True)

# Build paths inside the project like this: os.path.join(BASE_DIR, ...)
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Base path for media root and other uploaded files
BASE_DATA_DIR = get_env('BASE_DATA_DIR', get_data_dir())
os.makedirs(BASE_DATA_DIR, exist_ok=True)
print('=> Database and media directory:', BASE_DATA_DIR)

# Databases
# https://docs.djangoproject.com/en/2.1/ref/settings/#databases
DJANGO_DB_SQLITE = 'sqlite'
DJANGO_DB = 'default'
DATABASE_NAME_DEFAULT = os.path.join(BASE_DATA_DIR, 'label_studio.sqlite3')
DATABASE_NAME = get_env('DATABASE_NAME', DATABASE_NAME_DEFAULT)
DATABASES_ALL = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'USER': get_env('POSTGRE_USER', 'postgres'),
        'PASSWORD': get_env('POSTGRE_PASSWORD', 'postgres'),
        'NAME': get_env('POSTGRE_NAME', 'postgres'),
        'HOST': get_env('POSTGRE_HOST', 'localhost'),
        'PORT': int(get_env('POSTGRE_PORT', '5432')),
    },
    DJANGO_DB_SQLITE: {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': DATABASE_NAME,
        'OPTIONS': {
            # 'timeout': 20,
        }
    }
}
DATABASES = {'default': DATABASES_ALL.get(get_env('DJANGO_DB', 'default'))}

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'standard': {
            'format': '[%(asctime)s] [%(name)s::%(funcName)s::%(lineno)d] [%(levelname)s] %(message)s',
        },
        'message_only': {
            'format': '%(message)s',
        },
        'rq_console': {
            'format': '%(asctime)s %(message)s',
            'datefmt': '%H:%M:%S',
        },
    },
    'handlers': {
        'console_raw': {
            'level': get_env('LOG_LEVEL', 'DEBUG'),
            'class': 'logging.StreamHandler',
        },
        'console': {
            'level': get_env('LOG_LEVEL', 'DEBUG'),
            'class': 'logging.StreamHandler',
            'formatter': 'standard'
        },
        'rq_console': {
            'level': 'DEBUG',
            'class': 'rq.utils.ColorizingStreamHandler',
            'formatter': 'rq_console',
            'exclude': ['%(asctime)s'],
        }
    },
    'root': {
        'handlers': ['console'],
        'level': 'DEBUG',
    }
}

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

    'projects',
    'tasks',
    'data_manager',
    'io_storages',
    'ml'
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.locale.LocaleMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'core.middleware.DisableCSRF',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'core.middleware.CommonMiddlewareAppendSlashWithoutRedirect',  # instead of 'CommonMiddleware'
    'core.middleware.CommonMiddleware',
    'core.middleware.DRFResponseFormatter',
    'django_user_agents.middleware.UserAgentMiddleware',
    'core.middleware.SetSessionUIDMiddleware',
    'core.middleware.ContextLogMiddleware',
    'core.middleware.DatabaseIsLockedRetryMiddleware',
]

REST_FRAMEWORK = {
    'DEFAULT_FILTER_BACKENDS': ['django_filters.rest_framework.DjangoFilterBackend'],
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework.authentication.BasicAuthentication',
        'rest_framework.authentication.SessionAuthentication',
        'rest_framework.authentication.TokenAuthentication'
    ),

    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.DjangoModelPermissionsOrAnonReadOnly'
    ],
    'EXCEPTION_HANDLER': 'core.utils.common.custom_exception_handler',
    'DEFAULT_RENDERER_CLASSES': (
        'rest_framework.renderers.JSONRenderer',
    ),
    'DEFAULT_VERSIONING_CLASS': 'rest_framework.versioning.NamespaceVersioning'
}

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
AUTHENTICATION_BACKENDS = [
    'rules.permissions.ObjectPermissionBackend',
    'django.contrib.auth.backends.ModelBackend'
]
USE_USERNAME_FOR_LOGIN = False

DISABLE_SIGNUP_WITHOUT_LINK = get_bool_env('DISABLE_SIGNUP_WITHOUT_LINK', False)

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
                'core.context_processors.settings'
            ],
            'builtins': ['django.templatetags.i18n'],
        },
    }
]

# RQ
RQ_QUEUES = {
    'default': {
        'HOST': 'localhost',
        'PORT': 6379,
        'DB': 0,
        'DEFAULT_TIMEOUT': 180
    }
}

# Swagger: automatic API documentation
SWAGGER_SETTINGS = {
    'SECURITY_DEFINITIONS': {
        'token': {
            'type': 'token',
            'url': '/business/account/#/token'
        }
    },
    'APIS_SORTER': 'alpha',
    'SUPPORTED_SUBMIT_METHODS': ['get', 'post', 'put', 'delete', 'patch'],
    # "DEFAULT_AUTO_SCHEMA_CLASS": "core.utils.CustomAutoSchema",
    'OPERATIONS_SORTER': 'alpha'
}

SENTRY_FE = None

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
if HOSTNAME:
    STATIC_URL = HOSTNAME + STATIC_URL
print(f'=> Static URL is set to: {STATIC_URL}')

STATIC_ROOT = os.path.join(BASE_DIR, 'static_build')
STATICFILES_DIRS = [os.path.join(BASE_DIR, 'static')]
STATICFILES_FINDERS = (
    'django.contrib.staticfiles.finders.FileSystemFinder',
    'django.contrib.staticfiles.finders.AppDirectoriesFinder'
)
STATICFILES_STORAGE = 'core.storage.SkipMissedManifestStaticFilesStorage'

# Sessions and CSRF
SESSION_COOKIE_SECURE = bool(int(get_env('SESSION_COOKIE_SECURE', True)))
CSRF_COOKIE_SECURE = bool(int(get_env('CSRF_COOKIE_SECURE', SESSION_COOKIE_SECURE)))
CSRF_COOKIE_HTTPONLY = bool(int(get_env('CSRF_COOKIE_HTTPONLY', SESSION_COOKIE_SECURE)))

# user media files
MEDIA_ROOT = os.path.join(BASE_DATA_DIR, 'media')
MEDIA_URL = '/data/'
UPLOAD_DIR = 'upload'
AVATAR_PATH = 'avatars'

# project exports
EXPORT_DIR = os.path.join(BASE_DATA_DIR, 'export')
EXPORT_URL_ROOT = '/export/'
os.makedirs(EXPORT_DIR, exist_ok=True)

# file / task size limits
DATA_UPLOAD_MAX_MEMORY_SIZE = int(get_env('DATA_UPLOAD_MAX_MEMORY_SIZE', 50 * 1024 * 1024))
TASKS_MAX_NUMBER = 250000
TASKS_MAX_FILE_SIZE = DATA_UPLOAD_MAX_MEMORY_SIZE

TASK_LOCK_TTL = int(get_env('TASK_LOCK_TTL')) if get_env('TASK_LOCK_TTL') else None
TASK_LOCK_DEFAULT_TTL = int(get_env('TASK_LOCK_DEFAULT_TTL', 3600))

# Email backend
FROM_EMAIL = 'Label Studio <hello@labelstud.io>'
EMAIL_BACKEND = 'django.core.mail.backends.dummy.EmailBackend'

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
LICENSE = {}
VERSIONS = {}


def project_delete(project):
    project.delete()


def user_auth(user_model, email, password):
    return None


PROJECT_DELETE = project_delete
USER_AUTH = user_auth
CREATE_ORGANIZATION = 'organizations.functions.create_organization'
GET_OBJECT_WITH_CHECK_AND_LOG = 'core.utils.get_object.get_object_with_check_and_log'
SAVE_USER = 'users.functions.save_user'


# fix a problem with Windows mimetypes for JS and PNG
import mimetypes
mimetypes.add_type("application/javascript", ".js", True)
mimetypes.add_type("image/png", ".png", True)

print()  # just empty line
