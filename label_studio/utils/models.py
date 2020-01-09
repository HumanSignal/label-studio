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

import label_studio.utils.db as db

from operator import itemgetter
from lxml import etree
from datetime import datetime
from requests.adapters import HTTPAdapter
from label_studio.utils.misc import get_data_dir, parse_config
from label_studio.utils.exceptions import ValidationError
from label_studio.utils.functions import _LABEL_CONFIG_SCHEMA_DATA

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

    @property
    def tasks(self):
        return db.tasks

    def __attrs_post_init__(self):
        """ Init analogue for attr class
        """
        self.data_types = self.extract_data_types(self.label_config)

    def connect(self, ml_backend):
        self.ml_backend = ml_backend
        self.schema = ml_backend.get_schema(self.label_config, self)

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
    def validate_label_config_on_derived_input_schema(cls, config_string_or_parsed_config):
        """
        Validate label config on input schemas (tasks types and data keys) derived from imported tasks
        :param config_string_or_parsed_config: label config string or parsed config object
        :return: True if config match already imported tasks
        """
        input_schema = db.derived_input_schema
        config = config_string_or_parsed_config
        if isinstance(config, str):
            config = parse_config(config)
        input_types, input_values = set(), set()
        for input_items in map(itemgetter('inputs'), config.values()):
            for input_item in input_items:
                input_types.add(input_item['type'])
                input_values.add(input_item['value'])
        for item in input_schema:
            if item['type'] not in input_types:
                raise ValidationError(
                    f'You\'ve already imported tasks of type {item["type"]}, '
                    f'but this type is not found among input types: {list(input_types)}')
            if item['value'] not in input_values:
                raise ValidationError(
                    f'You\'ve already imported tasks with keys "{item["value"]}", '
                    f'but this key is not found among input tags attributes "value":'
                    f' {list(input_values)}')

    @classmethod
    def validate_label_config_on_derived_output_schema(cls, config_string_or_parsed_config):
        """
        Validate label config on output schema (from_names, to_names and labeling types) derived from completions
        :param config_string_or_parsed_config: label config string or parsed config object
        :return: True if config match already created completions
        """
        output_schema = db.derived_output_schema
        config = config_string_or_parsed_config
        if isinstance(config, str):
            config = parse_config(config)

        completion_tuples = set()

        for from_name, to in config.items():
            completion_tuples.add((from_name, to['to_name'][0], to['type'].lower()))

        for from_name, to_name, type in output_schema['from_name_to_name_type']:
            if (from_name, to_name, type) not in completion_tuples:
                raise ValidationError(
                    f'You\'ve already completed some tasks, but some of them couldn\'t be loaded with this config: '
                    f'name={from_name}, toName={to_name}, type={type} are expected'
                )
        for from_name, expected_label_set in output_schema['labels'].items():
            if from_name not in config:
                raise ValidationError(
                    f'You\'ve already completed some tasks, but some of them couldn\'t be loaded with this config: '
                    f'name={from_name} is expected'
                )
            found_labels = set(config[from_name]['labels'])
            extra_labels = list(expected_label_set - found_labels)
            if extra_labels:
                raise ValidationError(
                    f'You\'ve already completed some tasks, but some of them couldn\'t be loaded with this config: '
                    f'there are labels already created for "{from_name}":\n{extra_labels}'
                )

    @classmethod
    def validate_label_config(cls, config_string):
        # xml and schema
        try:
            config = cls.parse_config_to_json(config_string)
            jsonschema.validate(config, _LABEL_CONFIG_SCHEMA_DATA)
        except (etree.XMLSyntaxError, etree.XMLSchemaParseError, ValueError) as exc:
            raise ValidationError(str(exc))
        except jsonschema.exceptions.ValidationError as exc:
            error_message = exc.context[-1].message if len(exc.context) else exc.message
            error_message = 'Validation failed on {}: {}'.format('/'.join(exc.path), error_message.replace('@', ''))
            raise ValidationError(error_message)

        # unique names in config # FIXME: 'name =' (with spaces) won't work
        all_names = re.findall(r'name="([^"]*)"', config_string)
        if len(set(all_names)) != len(all_names):
            raise ValidationError('Label config contains non-unique names')

        # toName points to existent name
        names = set(all_names)
        toNames = re.findall(r'toName="([^"]*)"', config_string)
        for toName_ in toNames:
            for toName in toName_.split(','):
                if toName not in names:
                    raise ValidationError(f'toName="{toName}" not found in names: {sorted(names)}')

        parsed_config = parse_config(config_string)
        cls.validate_label_config_on_derived_input_schema(parsed_config)
        cls.validate_label_config_on_derived_output_schema(parsed_config)


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

    @staticmethod
    def _create_project_uid(project):
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
