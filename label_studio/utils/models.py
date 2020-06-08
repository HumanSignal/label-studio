import io
import os
import re
import attr
import urllib
import logging
import xmljson
import requests
import jsonschema
try:
    import ujson as json
except:
    import json

from lxml import etree
from datetime import datetime
from requests.adapters import HTTPAdapter
from .io import get_data_dir
from .exceptions import ValidationError
from .functions import _LABEL_CONFIG_SCHEMA_DATA

DEFAULT_PROJECT_ID = 1
logger = logging.getLogger(__name__)


@attr.s
class ProjectObj(object):
    """
    ProjectObj object holds general labeling project settings
    """
    # project ID
    id = attr.ib(default=DEFAULT_PROJECT_ID)
    # project creation time
    created_at = attr.ib(factory=lambda: datetime.now())
    # Input source / output tags schema exposed for connected ML backend
    schema = attr.ib(default='')
    # label config line stripped
    label_config = attr.ib(default='')
    # label config full with line breaks
    label_config_full = attr.ib(default='')
    # credentials for restricted data access
    task_data_login = attr.ib(default='')
    task_data_password = attr.ib(default='')
    # connected machine learning backend
    ml_backend = attr.ib(default=None)
    # import settings
    max_tasks_file_size = attr.ib(default=250)

    def __attrs_post_init__(self):
        """ Init analogue for attr class
        """
        self.data_types = self.extract_data_types(self.label_config)

    def connect(self, ml_backend):
        self.ml_backend = ml_backend
        self.schema = ml_backend.get_schema(self)
        if self.schema is None:
            raise ValueError('Can\'t connect to ML backend because schema was not set')

    @property
    def train_job(self):
        if self.ml_backend is not None:
            return self.ml_backend.train_job

    @property
    def data_types_json(self):
        return json.dumps(self.data_types)

    @classmethod
    def extract_data_types(cls, label_config):
        # load config
        parser = etree.XMLParser()
        xml = etree.fromstring(label_config, parser)
        if xml is None:
            raise etree.XMLSchemaParseError('Project config is empty or incorrect')

        # take all tags with values attribute and fit them to tag types
        data_type = {}
        parent = xml.findall('.//*[@value]')
        for match in parent:
            name = match.get('value')
            if len(name) > 1 and name[0] == '$':
                name = name[1:]
                data_type[name] = match.tag

        return data_type

    @property
    def generate_sample_task_str(self):
        from .functions import generate_sample_task
        return json.dumps(generate_sample_task(self))

    @property
    def generate_sample_task_escape(self):
        from .functions import generate_sample_task
        task = json.dumps(generate_sample_task(self))
        return task.replace("'", "\\'")

    @property
    def supported_formats(self):
        """ Returns supported input formats for project (json / csv)

        :param project: project with label config
        :return: list of supported file types
        """
        # load config
        parser = etree.XMLParser()
        xml = etree.fromstring(self.label_config, parser)
        if xml is None:
            raise etree.XMLSchemaParseError('Project config is empty or incorrect')

        supported = {'json', 'csv', 'tsv'}

        if len(self.data_types.keys()) == 1:
            supported.add('txt')

        # if any of Lists are presented there is only json allowed
        lists = xml.findall('.//List')  # take all tags with value attribute
        if lists:
            supported.remove('csv')
            supported.remove('tsv')
            supported.remove('txt')

        return supported

    @classmethod
    def parse_config_to_json(cls, config_string):
        parser = etree.XMLParser(recover=False)
        xml = etree.fromstring(config_string, parser)
        if xml is None:
            raise etree.XMLSchemaParseError('xml is empty or incorrect')
        config = xmljson.badgerfish.data(xml)
        return config

    @classmethod
    def validate_label_config(cls, config_string):
        # xml and schema
        try:
            logger.debug('Convert label config from XML to JSON')
            config = cls.parse_config_to_json(config_string)
            logger.debug(json.dumps(dict(config), indent=2))
            jsonschema.validate(config, _LABEL_CONFIG_SCHEMA_DATA)
        except (etree.XMLSyntaxError, etree.XMLSchemaParseError, ValueError) as exc:
            logger.debug('Parsing error')
            raise ValidationError(str(exc))
        except jsonschema.exceptions.ValidationError as exc:
            logger.debug('Validation error')
            error_message = exc.context[-1].message if len(exc.context) else exc.message
            error_message = 'Validation failed on {}: {}'.format('/'.join(exc.path), error_message.replace('@', ''))
            raise ValidationError(error_message)
        except Exception as exc:
            logger.debug('Unknown error: ' + str(exc))
            raise ValidationError(str(exc))

        # unique names in config # FIXME: 'name =' (with spaces) won't work
        all_names = re.findall(r'name="([^"]*)"', config_string)
        if len(set(all_names)) != len(all_names):
            logger.debug(all_names)
            raise ValidationError('Label config contains non-unique names')

        # toName points to existent name
        names = set(all_names)
        toNames = re.findall(r'toName="([^"]*)"', config_string)
        for toName_ in toNames:
            for toName in toName_.split(','):
                if toName not in names:
                    raise ValidationError('toName="{toName}" not found in names: {names}'
                                          .format(toName=toName, names=sorted(names)))


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

    @staticmethod
    def _prepare_kwargs(kwargs):
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

    def __init__(self, url, name, **kwargs):
        super(MLApi, self).__init__(url=url, **kwargs)
        self._validate_request_timeout = 10
        self._name = name

    def is_ok(self):
        url_is_ok = self._url is not None and isinstance(self._url, str)
        return url_is_ok

    def _get_url(self, url_suffix):
        url = self._url
        if url[-1] != '/':
            url += '/'
        return urllib.parse.urljoin(url, url_suffix)

    def _get(self, url_suffix, *args, **kwargs):
        url = self._get_url(url_suffix)
        headers = dict(self.http.headers)
        response = None
        try:
            response = self.get(url=url, *args, **kwargs)
            response.raise_for_status()
        except requests.exceptions.RequestException as e:
            logger.debug('Error getting response from ' + url, exc_info=True)
            status_code = response.status_code if response is not None else 0
            error_msg = response.content.decode('utf-8') if response is not None else str(e)
            return MLApiResult(url, {}, {'error': error_msg}, headers, 'error', status_code=status_code)
        status_code = response.status_code
        try:
            response = response.json()
        except ValueError as e:
            logger.debug('Error parsing JSON response from '+url+'. Response: ' + str(response.content), exc_info=True)
            return MLApiResult(
                url, {}, {'error': str(e), 'response': response.content.decode('utf-8')}, headers, 'error',
                status_code=status_code
            )
        logger.debug('Response from ' + url + ':' + json.dumps(response, indent=2))
        return MLApiResult(url, {}, response, headers, status_code=status_code)

    def _post(self, url_suffix, request, *args, **kwargs):
        url = self._get_url(url_suffix)
        headers = dict(self.http.headers)
        logger.debug('Request to ' + url + ':' + json.dumps(request, indent=2))
        response = None
        try:
            response = self.post(url=url, json=request, *args, **kwargs)
            response.raise_for_status()
        except requests.exceptions.RequestException as e:
            logger.debug('Error getting response from ' + url, exc_info=True)
            status_code = response.status_code if response is not None else 0
            error_msg = response.content.decode('utf-8') if response is not None else str(e)
            return MLApiResult(url, request, {'error': error_msg}, headers, 'error', status_code=status_code)
        status_code = response.status_code
        try:
            response = response.json()
        except ValueError as e:
            logger.debug('Error parsing JSON response from '+url+'. Response: ' + str(response.content), exc_info=True)
            return MLApiResult(
                url, request, {'error': str(e), 'response': response.content}, headers, 'error',
                status_code=status_code
            )
        logger.debug('Response from ' + url + ':' + json.dumps(response, indent=2))
        return MLApiResult(url, request, response, headers, status_code=status_code)

    def _create_project_uid(self, project):
        return self._name

    def train(self, completions, project):
        """Upload new task results and update model when necessary"""
        request = {
            'completions': completions,
            'project': self._create_project_uid(project),
            'label_config': project.label_config_line,
            'params': {
                'login': project.task_data_login,
                'password': project.task_data_password
            }
        }
        return self._post('train', request)

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
            'label_config': project.label_config_line,
            'params': {
                'force_load': True,
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
            'schema': project.label_config_line
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

    def is_training(self, project):
        return self._get('is_training?project=' + self._create_project_uid(project))

    def check_connection(self):
        return self._get('health')


class CantStartTrainJobError(Exception):
    pass


class CantValidateIsTraining(Exception):
    pass


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
    # number of completions fed
    num_completions = attr.ib(type=int, default=0)
    # backend dir
    _dir = attr.ib(default=None)

    _TRAIN_JOBS_FILE = os.path.join(get_data_dir(), 'train_jobs.json')

    @property
    def url(self):
        return self.api._url

    @property
    def dir(self):
        if self._dir is None:
            r = self.api.check_connection()
            if not r.is_error:
                self._dir = os.path.basename(r.response['model_dir'])
        return self._dir

    @property
    def connected(self):
        try:
            r = self.api.check_connection()
            if r.is_error:
                return False
        except:
            return False
        return True

    def restore_train_job(self):
        """
        Restore train job for the given model name
        :return:
        """
        if not os.path.exists(self._TRAIN_JOBS_FILE):
            logger.warning('Can\'t restore train job because ' + self._TRAIN_JOBS_FILE + ' not found')
            return
        with io.open(self._TRAIN_JOBS_FILE) as f:
            train_jobs = json.load(f)
            if self.model_name not in train_jobs:
                logger.warning(
                    'Can\'t restore train job because ' + self.model_name + ' key not found in ' + self._TRAIN_JOBS_FILE)
            else:
                self.train_job = train_jobs[self.model_name]
                logger.debug(
                    'Train job ' + self.train_job + ' for model name ' + self.model_name +
                    ' restored from ' + self._TRAIN_JOBS_FILE)

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
        ml_api = MLApi(params['url'], params['name'])
        m = MLBackend(api=ml_api, model_name=params['name'])
        m.restore_train_job()
        return m

    def train_job_is_running(self):
        if self._api_exists() and self.train_job is not None:
            response = self.api.get_train_job_status(self.train_job)
            if response.is_error:
                logger.error('Can\'t fetch train job status for job ' + self.train_job + ': '
                             'ML backend returns an error: ' + response.error_message)
            else:
                return response.response['job_status'] in ('queued', 'started')
        return False

    def _api_exists(self):
        if self.api is None or not self.api.is_ok():
            logger.debug('Can\'t make predictions because ML backend was not specified: '
                         'add "ml_backend" option with URL in your config file')
            return False
        return True

    def sync(self, project):
        r = self.api.setup(project)
        if r.is_error:
            raise ValueError(r.error_message)
        model_version = r.response['model_version']
        if self.model_version != model_version:
            self.model_version = model_version
            logger.debug('Model version has changed: ' + str(model_version))
        else:
            logger.debug('Model version hasn\'t changed: ' + str(model_version))

    def make_predictions(self, task, project):
        self.sync(project)
        response = self.api.predict([task], self.model_version, project)
        if response.is_error:
            if response.status_code == 404:
                logger.info('Can\'t make predictions: model is not found (probably not trained yet)')
            else:
                logger.error('Can\'t make predictions: ML backend returns an error: ' + response.error_message)
        else:
            return response.response['results'][0]

    def is_training(self, project):
        if self._api_exists():
            response = self.api.is_training(project)
            if response.is_error:
                raise CantValidateIsTraining('Can\'t validate whether model is training for project ' + project.name)
            logger.debug(response.response)
            return response.response

    def train(self, completions, project):
        if self.train_job_is_running():
            raise CantStartTrainJobError('Can\'t start new training: Train job is running.')
        train_status = self.is_training(project)
        if train_status['is_training']:
            raise CantStartTrainJobError('Can\'t start new training: Train job is running.')
        response = self.api.train(completions, project)
        if response.is_error:
            raise CantStartTrainJobError('Can\'t update model: ML backend returns an error: ' + response.error_message)
        else:
            self.num_completions = len(completions)
            logger.info('Training job with ' + str(self.num_completions) + ' completions has been started.')
            maybe_job = response.response.get('job')
            if maybe_job:
                self.train_job = maybe_job
                self.save_train_job()
                logger.debug('Project ' + str(project) + ' successfully updated train job ' + self.train_job)

    def validate(self, label_config):
        if self._api_exists():
            response = self.api.validate(label_config)
            if response.is_error:
                if response.status_code == 422:
                    raise ValidationError(
                        'ML backend doesn\'t accept current label config ' + label_config +
                        ' since the model is intended to work on different tasks / data types. ' +
                        '(Check what you\'ve specified in <project_name>/config.json under "ml_backend" section')
                else:
                    raise ValueError(
                        'Can\'t infer schema for label config ' + label_config +
                        ' ML backend returns error: ' + response.error_message)
            else:
                return response.response

    def get_schema(self, project):
        schema = self.validate(project.label_config)
        if len(schema) > 1:
            logger.warning('ML backend returns multiple schemas for label config ' + project.label_config + ': ' +
                           str(schema) + '\nWe currently support only one schema, so 0th schema is used.')
        return schema[0]

    def clear(self, project):
        if self._api_exists():
            response = self.api.delete(project)
            if response.is_error:
                logger.error('Can\'t clear ML backend for project ' + project.name + ': ' + response.error_message)
            else:
                logger.info('ML backend for project ' + project.name + ' has been cleared.')

    def train_log(self):
        return 'here is train log\n' * 100

    def prediction_log(self):
        return 'here is prediction log\n' * 100
