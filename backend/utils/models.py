import urllib
import logging
import os
import requests
import attr
import json
import io

from datetime import datetime
from requests.adapters import HTTPAdapter
from utils.misc import get_data_dir

DEFAULT_PROJECT_ID = 1


logger = logging.getLogger(__name__)


@attr.s
class Project(object):
    """
    Project object holds general labeling project settings
    """
    # project ID
    id = attr.ib(default=DEFAULT_PROJECT_ID)
    # project creation time
    created_at = attr.ib(factory=lambda: datetime.now())
    # Input source / output tags schema exposed for connected ML backend
    schema = attr.ib(default='')
    # label config
    label_config = attr.ib(default='')
    # credentials for restricted data access
    task_data_login = attr.ib(default='')
    task_data_password = attr.ib(default='')
    # connected machine learning backend
    ml_backend = attr.ib(default=None)

    def connect(self, ml_backend):
        self.ml_backend = ml_backend
        self.schema = ml_backend.get_schema(self.label_config, self)

    @property
    def train_job(self):
        if self.ml_backend is not None:
            return self.ml_backend.train_job


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
    """
    Response returned form ML API
    """
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
    """
    Input source / output tags schema exposed for connected ML backend
    """
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

    def _post(self, url_suffix, request, *args, **kwargs):
        url = self._get_url(url_suffix)
        headers = dict(self.http.headers)
        logger.debug(f'Request to {url}: {json.dumps(request, indent=2)}')
        response = None
        try:
            response = self.post(url=url, json=request, *args, **kwargs)
            response.raise_for_status()
        except requests.exceptions.RequestException as e:
            logger.debug(f'Error getting response from {url}. ', exc_info=True)
            status_code = response.status_code if response is not None else 0
            return MLApiResult(url, request, {'error': str(e)}, headers, 'error', status_code=status_code)
        status_code = response.status_code
        try:
            response = response.json()
        except ValueError as e:
            logger.debug(f'Error parsing JSON response from {url}. Response: {response.content}', exc_info=True)
            return MLApiResult(
                url, request, {'error': str(e), 'response': response.content}, headers, 'error',
                status_code=status_code
            )
        logger.debug(f'Response from {url}: {json.dumps(response, indent=2)}')
        return MLApiResult(url, request, response, headers, status_code=status_code)

    def _create_project_uid(self, project):
        return f'{project.id}.{project.ml_backend.model_name}'

    def update(self, task, results, project, retrain=True):
        """
        Upload new task results and update model when necessary
        :param task:
        :param results:
        :param project:
        :param retrain:
        :return:
        """

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
        """
        Predict batch of tasks for the given project and model version
        :param tasks:
        :param model_version:
        :param project:
        :return:
        """
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
        return self._post('predict', request)

    def validate(self, config):
        """
        Validate if current ML backend accept config, and return exposed schema
        :param config:
        :return:
        """
        return self._post('validate', request={'config': config}, timeout=self._validate_request_timeout)

    def setup(self, project):
        """
        Setup ML backend for a given project
        :param project:
        :return:
        """
        return self._post('setup', request={
            'project': self._create_project_uid(project),
            'schema': project.ml_backend_active_connection.schema
        })

    def delete(self, project):
        """
        Delete all resources from existing ML backend
        :param project:
        :return:
        """
        return self._post('delete', request={'project': self._create_project_uid(project)})

    def get_train_job_status(self, train_job):
        """
        Get current train job status
        :param train_job:
        :return:
        """
        return self._post('job_status', request={'job': train_job})


@attr.s
class MLBackend(object):
    """
    Machine learning backend settings
    """
    # connected ML API object
    api = attr.ib()
    # model name
    model_name = attr.ib(default=None)
    # model version
    model_version = attr.ib(default=None)
    # train job running on ML backend
    train_job = attr.ib(default=None)

    _TRAIN_JOBS_FILE = os.path.join(get_data_dir(), 'train_jobs.json')

    def restore_train_job(self):
        """
        Restore train job for the given model name
        :return:
        """
        if not os.path.exists(self._TRAIN_JOBS_FILE):
            logger.warning(f'Can\'t restore train job because {self._TRAIN_JOBS_FILE} not found')
            return
        with io.open(self._TRAIN_JOBS_FILE) as f:
            train_jobs = json.load(f)
            if self.model_name not in train_jobs:
                logger.warning(
                    f'Can\'t restore train job because {self.model_name} key not found in {self._TRAIN_JOBS_FILE}')
            else:
                train_job = train_jobs[self.model_name]
                logger.debug(
                    f'Train job {train_job} for model name {self.model_name} restored from {self._TRAIN_JOBS_FILE}')

    def save_train_job(self):
        """
        Save current train job
        :return:
        """
        train_jobs = {}
        if os.path.exists(self._TRAIN_JOBS_FILE):
            with io.open(self._TRAIN_JOBS_FILE) as f:
                train_jobs = json.load(f)
        train_jobs[self.model_name] = self.train_job
        with io.open(self._TRAIN_JOBS_FILE, mode='w') as f:
            json.dump(train_jobs, f, indent=2)

    @classmethod
    def from_params(cls, params):
        ml_api = MLApi(params['url'])
        m = MLBackend(api=ml_api, model_name=params['model_name'])
        m.restore_train_job()
        return m

    def train_job_is_running(self, project):
        if self._api_exists() and project.train_job is not None:
            response = self.api.get_train_job_status(project.train_job)
            if response.is_error:
                logger.error(f'Can\'t fetch train job status for job {project.train_job}: '
                             f'ML backend returns error: {response.error_message}')
            else:
                return response.response['job_status'] in ('queued', 'started')
        return False

    def _api_exists(self):
        if self.api is None or not self.api.is_ok():
            logger.debug(f'Can\'t make predictions because ML backend was not specified: '
                         f'add "ml_backend" option with URL in your config file')
            return False
        return True

    def make_predictions(self, task, project):
        if self._api_exists():
            response = self.api.predict([task], self.model_version, project)
            if response.is_error:
                if response.status_code == 404:
                    logger.info(f'Can\'t make predictions: model is not found (probably not trained yet)')
                else:
                    logger.error(f'Can\'t make predictions: ML backend returns error: {response.error_message}')
            else:
                return response.response['results']

    def update_model(self, task, completion, project):
        if self._api_exists():
            results = completion['result']
            retrain = not self.train_job_is_running(project)
            response = self.api.update(task, results, project, retrain)
            if response.is_error:
                logger.error(f'Can\'t update model: ML backend returns error: {response.error_message}')
            else:
                maybe_job = response.response.get('job')
                if maybe_job:
                    self.train_job = maybe_job
                    self.save_train_job()
                    logger.debug(f'Project {project} successfully updated train job {self.train_job}')

    def get_schema(self, label_config, project):
        if self._api_exists():
            response = self.api.validate(project.label_config)
            if response.is_error:
                logger.error(f'Can\'t infer schema for label config {label_config}. '
                             f'ML backend returns error: {response.error_message}')
            else:
                schema = response.response
                if len(schema) > 1:
                    logger.warning(f'ML backend returns multiple schemas for label config {label_config}: {schema}'
                                   f'We currently support only one schema, so 0th schema is used.')
                return schema[0]