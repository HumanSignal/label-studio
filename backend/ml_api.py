import logging
import os
import requests
import urllib
import attr
import json

from collections import defaultdict
from requests.adapters import HTTPAdapter

logger = logging.getLogger(__name__)


class BaseHTTPAPI(object):
    MAX_RETRIES = 2
    HEADERS = {
        'User-Agent': 'label-studio/',
    }
    CONNECTION_TIMEOUT = 1.0  # seconds
    TIMEOUT = 100.0  # seconds

    def __init__(self, url, timeout=None, connection_timeout=None, max_retries=None, headers=None, **kwargs):
        self._url = url
        self._timeout = timeout or self.TIMEOUT
        self._connection_timeout = connection_timeout or self.CONNECTION_TIMEOUT
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
        #kwargs['timeout'] = self._connection_timeout, self._timeout
        kwargs['timeout'] = kwargs.get('timeout', None)

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

    def __init__(self, url, **kwargs):
        super(MLApi, self).__init__(url=url, **kwargs)
        self._validate_request_timeout = 10

    def is_ok(self):
        url_is_ok = self._url is not None and isinstance(self._url, str)
        return url_is_ok

    def _get_url(self, url_suffix):
        url = self._url
        if url[-1] != '/':
            url += '/'
        return urllib.parse.urljoin(url, url_suffix)

    def _post(self, url_suffix, request, verbose=True, *args, **kwargs):
        url = self._get_url(url_suffix)
        headers = dict(self.http.headers)
        if verbose:
            logger.info(f'Request to {url}: {json.dumps(request, indent=2)}')
        response = None
        try:
            response = self.post(url=url, json=request, *args, **kwargs)
            response.raise_for_status()
        except requests.exceptions.RequestException as e:
            logger.warning(f'Error getting response from {url}. ', exc_info=True)
            status_code = response.status_code if response is not None else 0
            return MLApiResult(url, request, {'error': str(e)}, headers, 'error', status_code=status_code)
        status_code = response.status_code
        try:
            response = response.json()
        except ValueError as e:
            logger.warning(f'Error parsing JSON response from {url}. Response: {response.content}', exc_info=True)
            return MLApiResult(
                url, request, {'error': str(e), 'response': response.content}, headers, 'error',
                status_code=status_code
            )
        if verbose:
            logger.info(f'Response from {url}: {json.dumps(response, indent=2)}')
        return MLApiResult(url, request, response, headers, status_code=status_code)

    def _create_project_uid(self, project):
        return f'{project.id}.{project.ml_backend.model_name}'

    def update(self, task, results, project, retrain=True):

        request = {
            'id': task['id'],
            'project': self._create_project_uid(project),
            'schema': project.schema,
            'data': task['data'],
            'meta': task.get('meta', {}),
            'result': results,
            'retrain': retrain,
            'params': {
                'login': project.task_data_login,
                'password': project.task_data_password
            }
        }
        return self._post('update', request)

    def predict(self, tasks, model_version, project):
        request = {
            'tasks': tasks,
            'model_version': model_version,
            'project': self._create_project_uid(project),
            'schema': project.schema,
            'params': {
                'login': project.task_data_login,
                'password': project.task_data_password
            }
        }
        return self._post('predict', request, verbose=False)

    def validate(self, config):
        return self._post('validate', request={'config': config}, timeout=self._validate_request_timeout)

    def setup(self, project):
        return self._post('setup', request={
            'project': self._create_project_uid(project),
            'schema': project.ml_backend_active_connection.schema
        })

    def delete(self, project):
        return self._post('delete', request={'project': self._create_project_uid(project)})

    def get_train_job_status(self, train_job):
        return self._post('job_status', request={'job': train_job})
