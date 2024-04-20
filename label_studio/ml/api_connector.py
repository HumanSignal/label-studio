"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import logging
import os
import urllib

import requests
from core.feature_flags import flag_set
from core.utils.common import load_func
from core.version import get_git_version
from data_export.serializers import ExportDataSerializer
from django.conf import settings
from django.contrib.auth.models import AnonymousUser
from django.db.models import Count
from requests.adapters import HTTPAdapter
from requests.auth import HTTPBasicAuth

from label_studio.core.utils.params import get_env

version = get_git_version()
logger = logging.getLogger(__name__)

CONNECTION_TIMEOUT = float(get_env('ML_CONNECTION_TIMEOUT', 1))  # seconds
TIMEOUT_DEFAULT = float(get_env('ML_TIMEOUT_DEFAULT', 100))  # seconds

TIMEOUT_TRAIN = float(get_env('ML_TIMEOUT_TRAIN', 30))
TIMEOUT_PREDICT = float(get_env('ML_TIMEOUT_PREDICT', 100))
TIMEOUT_HEALTH = float(get_env('ML_TIMEOUT_HEALTH', 1))
TIMEOUT_SETUP = float(get_env('ML_TIMEOUT_SETUP', 3))
TIMEOUT_DUPLICATE_MODEL = float(get_env('ML_TIMEOUT_DUPLICATE_MODEL', 1))
TIMEOUT_DELETE = float(get_env('ML_TIMEOUT_DELETE', 1))
TIMEOUT_TRAIN_JOB_STATUS = float(get_env('ML_TIMEOUT_TRAIN_JOB_STATUS', 1))

# TODO
# we would need to make it configurable on the ML backend side too
PREDICT_URL = 'predict'
HEALTH_URL = 'health'
VALIDATE_URL = 'validate'
SETUP_URL = 'setup'
DUPLICATE_URL = 'duplicate_model'
DELETE_URL = 'delete'
JOB_STATUS_URL = 'job_status'
VERSIONS_URL = 'versions'


class BaseHTTPAPI(object):
    MAX_RETRIES = 2
    HEADERS = {
        'User-Agent': 'heartex/' + (version or ''),
    }

    def __init__(
        self, url, timeout=None, connection_timeout=None, max_retries=None, headers=None, auth_method=None, **kwargs
    ):
        self._url = url
        self._timeout = timeout or TIMEOUT_DEFAULT
        self._connection_timeout = connection_timeout or CONNECTION_TIMEOUT
        self._headers = headers or {}
        self._auth_method = auth_method

        # TODO basic auth parameters must be required for auth_method == 'basic'
        self._basic_auth = (kwargs.get('basic_auth_user'), kwargs.get('basic_auth_pass'))

        self._max_retries = max_retries or self.MAX_RETRIES
        self._sessions = {self._session_key(): self.create_session()}

    def create_session(self):
        session = requests.Session()
        session.headers.update(self.HEADERS)
        session.headers.update(self._headers)
        session.mount('http://', HTTPAdapter(max_retries=self._max_retries))
        session.mount('https://', HTTPAdapter(max_retries=self._max_retries))
        return session

    def _session_key(self):
        return os.getpid()

    @property
    def http(self):
        key = self._session_key()
        if key in self._sessions:
            return self._sessions[key]
        else:
            session = self.create_session()
            self._sessions[key] = session
            return session

    def _prepare_kwargs(self, kwargs):
        # add timeout if it's not presented
        if 'timeout' not in kwargs:
            kwargs['timeout'] = self._connection_timeout, self._timeout

        if self._basic_auth[0] and self._basic_auth[1]:
            kwargs['auth'] = HTTPBasicAuth(*self._basic_auth)

        # add connection timeout if it's not presented
        elif isinstance(kwargs['timeout'], float) or isinstance(kwargs['timeout'], int):
            kwargs['timeout'] = (self._connection_timeout, kwargs['timeout'])

    def request(self, method, *args, **kwargs):
        self._prepare_kwargs(kwargs)
        return self.http.request(method, *args, **kwargs)

    def get(self, *args, **kwargs):
        return self.request('GET', *args, **kwargs)

    def post(self, *args, **kwargs):
        return self.request('POST', *args, **kwargs)


class MLApiResult:
    """
    Class for storing the result of ML API request
    """

    def __init__(self, url='', request='', response=None, headers=None, type='ok', status_code=200):
        self.url = url
        self.request = request
        self.response = {} if response is None else response
        self.headers = {} if headers is None else headers
        self.type = type
        self.status_code = status_code

    @property
    def is_error(self):
        return self.type == 'error'

    @property
    def error_message(self):
        return self.response.get('error')


class MLApi(BaseHTTPAPI):
    """
    Class for ML API connector
    """

    def __init__(self, **kwargs):
        super(MLApi, self).__init__(**kwargs)
        self._validate_request_timeout = 10

    def _get_url(self, url_suffix):
        url = self._url
        if url[-1] != '/':
            url += '/'
        return urllib.parse.urljoin(url, url_suffix)

    def _request(self, url_suffix, request=None, verbose=True, method='POST', *args, **kwargs):
        assert method in ('POST', 'GET')
        url = self._get_url(url_suffix)
        request = request or {}
        headers = dict(self.http.headers)

        response = None
        try:
            if method == 'POST':
                response = self.post(url=url, json=request, *args, **kwargs)
            else:
                response = self.get(url=url, *args, **kwargs)
            response.raise_for_status()
        except requests.exceptions.RequestException as e:
            # Extending error details in case of failed request
            if flag_set('fix_back_dev_3351_ml_validation_error_extension_short', AnonymousUser):
                error_string = str(e) + (' ' + str(response.text) if response else '')
            else:
                error_string = str(e)
            status_code = response.status_code if response is not None else 0
            return MLApiResult(url, request, {'error': error_string}, headers, 'error', status_code=status_code)
        status_code = response.status_code
        try:
            response = response.json()
        except ValueError as e:
            return MLApiResult(
                url=url,
                request=request,
                response={'error': str(e), 'response': response.content},
                headers=headers,
                type='error',
                status_code=status_code,
            )

        return MLApiResult(url=url, request=request, response=response, headers=headers, status_code=status_code)

    def _create_project_uid(self, project):
        time_id = int(project.created_at.timestamp())
        return f'{project.id}.{time_id}'

    def train(self, project, use_ground_truth=False):
        # TODO Replace AnonymousUser with real user from request
        user = AnonymousUser()
        # Identify if feature flag is turned on
        if flag_set('ff_back_dev_1417_start_training_mlbackend_webhooks_250122_long', user):
            request = {
                'action': 'START_TRAINING',
                'project': load_func(settings.WEBHOOK_SERIALIZERS['project'])(instance=project).data,
            }
            return self._request('webhook', request, verbose=False, timeout=TIMEOUT_PREDICT)
        else:
            # get only tasks with annotations
            tasks = project.tasks.annotate(num_annotations=Count('annotations')).filter(num_annotations__gt=0)
            # create serialized tasks with annotations: {"data": {...}, "annotations": [{...}], "predictions": [{...}]}
            tasks_ser = ExportDataSerializer(tasks, many=True).data
            logger.debug(f'{len(tasks_ser)} tasks with annotations are sent to ML backend for training.')
            request = {
                'annotations': tasks_ser,
                'project': self._create_project_uid(project),
                'label_config': project.label_config,
                'params': {'login': project.task_data_login, 'password': project.task_data_password},
            }
            return self._request('train', request, verbose=False, timeout=TIMEOUT_PREDICT)

    def _prep_prediction_req(self, tasks, project, context=None):
        request = {
            'tasks': tasks,
            'project': self._create_project_uid(project),
            'label_config': project.label_config,
            'params': {
                'login': project.task_data_login,
                'password': project.task_data_password,
                'context': context,
            },
        }

        return request

    def make_predictions(self, tasks, project, context=None):
        request = self._prep_prediction_req(tasks, project, context=context)
        return self._request(PREDICT_URL, request, verbose=False, timeout=TIMEOUT_PREDICT)

    def health(self):
        return self._request(HEALTH_URL, method='GET', timeout=TIMEOUT_HEALTH)

    def validate(self, config):
        return self._request(VALIDATE_URL, request={'config': config}, timeout=self._validate_request_timeout)

    def setup(self, project, extra_params=None, **kwargs):
        return self._request(
            SETUP_URL,
            request={
                'project': self._create_project_uid(project),
                'schema': project.label_config,
                'hostname': settings.HOSTNAME if settings.HOSTNAME else ('http://localhost:' + settings.INTERNAL_PORT),
                'access_token': project.created_by.auth_token.key,
                'extra_params': extra_params,
            },
            timeout=TIMEOUT_SETUP,
        )

    def duplicate_model(self, project_src, project_dst):
        return self._request(
            DUPLICATE_URL,
            request={
                'project_src': self._create_project_uid(project_src),
                'project_dst': self._create_project_uid(project_dst),
            },
            timeout=TIMEOUT_DUPLICATE_MODEL,
        )

    def delete(self, project):
        return self._request(
            DELETE_URL, request={'project': self._create_project_uid(project)}, timeout=TIMEOUT_DELETE
        )

    def get_train_job_status(self, train_job):
        return self._request(JOB_STATUS_URL, request={'job': train_job.job_id}, timeout=TIMEOUT_TRAIN_JOB_STATUS)

    def get_versions(self, project):
        return self._request(
            VERSIONS_URL, request={'project': self._create_project_uid(project)}, timeout=TIMEOUT_SETUP, method='GET'
        )


def get_ml_api(project):
    if project.ml_backend_active_connection is None:
        return None
    if project.ml_backend_active_connection.ml_backend is None:
        return None
    return MLApi(
        url=project.ml_backend_active_connection.ml_backend.url,
        timeout=project.ml_backend_active_connection.ml_backend.timeout,
    )
