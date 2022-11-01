"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import logging
import os
import requests
import urllib
import attr
from django.contrib.auth.models import AnonymousUser

from django.db.models import Q, F, Count
from django.conf import settings
from requests.adapters import HTTPAdapter
from core.version import get_git_version
from data_export.serializers import ExportDataSerializer
from label_studio.core.utils.params import get_env
from core.feature_flags import flag_set
from core.utils.common import load_func

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


class BaseHTTPAPI(object):
    MAX_RETRIES = 2
    HEADERS = {
        'User-Agent': 'heartex/' + (version or ''),
    }

    def __init__(self, url, timeout=None, connection_timeout=None, max_retries=None, headers=None, **kwargs):
        self._url = url
        self._timeout = timeout or TIMEOUT_DEFAULT
        self._connection_timeout = connection_timeout or CONNECTION_TIMEOUT
        self._headers = headers or {}
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


@attr.s
class MLApiResult(object):
    url = attr.ib(default='')
    request = attr.ib(default='')
    response = attr.ib(default=attr.Factory(dict))
    headers = attr.ib(default=attr.Factory(dict))
    type = attr.ib(default='ok')
    status_code = attr.ib(default=200)

    @property
    def is_error(self):
        return self.type == 'error'

    @property
    def error_message(self):
        return self.response.get('error')


@attr.s
class MLApiScheme(object):
    tag_name = attr.ib()
    tag_type = attr.ib()
    source_name = attr.ib()
    source_type = attr.ib()
    source_value = attr.ib()

    def to_dict(self):
        return attr.asdict(self)


class MLApi(BaseHTTPAPI):

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
        # if verbose:
        #     logger.info(f'Request to {url}: {json.dumps(request, indent=2)}')
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
                error_string = str(e) + (" " + str(response.text) if response else "")
            else:
                error_string = str(e)
            status_code = response.status_code if response is not None else 0
            return MLApiResult(url, request, {'error': error_string}, headers, 'error', status_code=status_code)
        status_code = response.status_code
        try:
            response = response.json()
        except ValueError as e:
            # logger.warning(f'Error parsing JSON response from {url}. Response: {response.content}', exc_info=True)
            return MLApiResult(
                url, request, {'error': str(e), 'response': response.content}, headers, 'error',
                status_code=status_code
            )
        # if verbose:
        #     logger.info(f'Response from {url}: {json.dumps(response, indent=2)}')
        return MLApiResult(url, request, response, headers, status_code=status_code)

    def _create_project_uid(self, project):
        time_id = int(project.created_at.timestamp())
        return f'{project.id}.{time_id}'

    def train(self, project, use_ground_truth=False):
        # TODO Replace AnonymousUser with real user from request
        user = AnonymousUser()
        # Identify if feature flag is turned on
        if flag_set('ff_back_dev_1417_start_training_mlbackend_webhooks_250122_long', user):
            request = {
                'action': 'PROJECT_UPDATED',
                'project': load_func(settings.WEBHOOK_SERIALIZERS['project'])(instance=project).data
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
                'params': {
                    'login': project.task_data_login,
                    'password': project.task_data_password
                }
            }
            return self._request('train', request, verbose=False, timeout=TIMEOUT_PREDICT)

    def make_predictions(self, tasks, model_version, project, context=None):
        request = {
            'tasks': tasks,
            'model_version': model_version,
            'project': self._create_project_uid(project),
            'label_config': project.label_config,
            'params': {
                'login': project.task_data_login,
                'password': project.task_data_password,
                'context': context,
            },
        }
        return self._request('predict', request, verbose=False, timeout=TIMEOUT_PREDICT)

    def health(self):
        return self._request('health', method='GET', timeout=TIMEOUT_HEALTH)

    def validate(self, config):
        return self._request('validate', request={'config': config}, timeout=self._validate_request_timeout)

    def setup(self, project, model_version=None):
        return self._request('setup', request={
            'project': self._create_project_uid(project),
            'schema': project.label_config,
            'hostname': settings.HOSTNAME if settings.HOSTNAME else ('http://localhost:' + settings.INTERNAL_PORT),
            'access_token': project.created_by.auth_token.key,
            'model_version': model_version
        }, timeout=TIMEOUT_SETUP)

    def duplicate_model(self, project_src, project_dst):
        return self._request('duplicate_model', request={
            'project_src': self._create_project_uid(project_src),
            'project_dst': self._create_project_uid(project_dst)
        }, timeout=TIMEOUT_DUPLICATE_MODEL)

    def delete(self, project):
        return self._request('delete', request={'project': self._create_project_uid(project)}, timeout=TIMEOUT_DELETE)

    def get_train_job_status(self, train_job):
        return self._request('job_status', request={'job': train_job.job_id}, timeout=TIMEOUT_TRAIN_JOB_STATUS)

    def get_versions(self, project):
        return self._request('versions', request={
            'project': self._create_project_uid(project)
        }, timeout=TIMEOUT_SETUP, method='POST')


def get_ml_api(project):
    if project.ml_backend_active_connection is None:
        return None
    if project.ml_backend_active_connection.ml_backend is None:
        return None
    return MLApi(
        url=project.ml_backend_active_connection.ml_backend.url,
        timeout=project.ml_backend_active_connection.ml_backend.timeout
    )
