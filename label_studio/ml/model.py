import os
import logging
import time
import json
import redis
import attr

from abc import ABC, abstractmethod
from datetime import datetime
from redis import Redis
from rq import Queue, get_current_job
from rq.registry import StartedJobRegistry, FinishedJobRegistry
from rq.job import Job

from label_studio.utils.misc import parse_config


logger = logging.getLogger(__name__)


@attr.s
class ModelWrapper(object):
    model = attr.ib()
    model_version = attr.ib()


class LabelStudioMLBase(ABC):

    def __init__(self, schema=None, data=None, **kwargs):
        """Model loader"""
        self.schema = schema
        self.parsed_schema = parse_config(self.schema)
        self.data = data

    @abstractmethod
    def predict(self, tasks, **kwargs):
        pass

    @abstractmethod
    def fit(self, completions, workdir=None, **kwargs):
        pass


class LabelStudioMLManager(object):

    model_class = None
    model_dir = None
    redis_host = None
    redis_port = None
    train_kwargs = None

    _redis = None
    _redis_queue = None
    _current_model = None

    @classmethod
    def initialize(
        cls, model_class, model_dir=None, redis_host='localhost', redis_port=6379, redis_queue='default',
        **train_kwargs
    ):
        if not issubclass(model_class, LabelStudioMLBase):
            raise ValueError('Inference class should be the subclass of ' + LabelStudioMLBase.__class__.__name__)
        cls.model_class = model_class

        cls.model_dir = model_dir
        if cls.model_dir:
            cls.model_dir = os.path.expanduser(cls.model_dir)
            os.makedirs(cls.model_dir, exist_ok=True)
        cls.train_kwargs = train_kwargs
        cls.redis_host = redis_host
        cls.redis_port = redis_port

        cls._redis = cls._get_redis(redis_host, redis_port)
        if cls._redis:
            cls._redis_queue = Queue(name=redis_queue, connection=cls._redis)

        cls._current_model = {}

    @property
    def only_inference(cls):
        return cls._redis is None

    @classmethod
    def _get_redis(cls, host, port, raise_on_error=False):
        r = Redis(host=host, port=port)
        try:
            r.ping()
        except redis.ConnectionError:
            if raise_on_error:
                raise
            return None
        else:
            return r

    @classmethod
    def _generate_version(cls):
        return str(int(datetime.now().timestamp()))

    @classmethod
    def _get_tasks_key(cls, project):
        return 'project:' + str(project) + 'tasks'

    @classmethod
    def _get_job_results_key(cls, project):
        return f'project:' + str(project) + 'job_results'

    @classmethod
    def _remove_jobs(cls, project):
        started_registry = StartedJobRegistry(cls._redis_queue.name, cls._redis_queue.connection)
        finished_registry = FinishedJobRegistry(cls._redis_queue.name, cls._redis_queue.connection)
        for job_id in started_registry.get_job_ids() + finished_registry.get_job_ids():
            job = Job.fetch(job_id, connection=cls._redis)
            if job.meta.get('project') != project:
                continue
            logger.info(f'Deleting job_id {job_id}')
            job.delete()

    @classmethod
    def _get_latest_training_job_result(cls, project):
        job_results_key = cls._get_job_results_key(project)
        try:
            num_finished_jobs = cls._redis.llen(job_results_key)
            if num_finished_jobs == 0:
                logger.info('Job queue is empty')
                return
            latest_job = cls._redis.lindex(job_results_key, -1)
        except redis.exceptions.ConnectionError as exc:
            logger.error(exc)
            return
        else:
            return json.loads(latest_job)

    @classmethod
    def _key(cls, project):
        return project, os.getpid()

    @classmethod
    def has_active_model(cls, project):
        return cls._key(project) in cls._current_model

    @classmethod
    def get(cls, project):
        return cls._current_model.get(cls._key(project))

    @classmethod
    def create(cls, project=None, schema=None, data=None, version=None, **kwargs):
        key = cls._key(project)
        cls._current_model[key] = ModelWrapper(
            model=cls.model_class(schema=schema, data=data, **kwargs),
            model_version=version or cls._generate_version()
        )
        return cls._current_model[key]

    @classmethod
    def get_or_create(cls, project=None, schema=None, force_reload=False, data=None, version=None, **kwargs):
        if not cls.has_active_model(project) or force_reload:
            cls.create(project, schema, data, version, **kwargs)
        return cls.get(project)

    @classmethod
    def fetch(cls, project=None, schema=None, force_reload=False, **kwargs):
        if cls.only_inference:
            return cls.get_or_create(project, schema, force_reload, **kwargs)
        else:
            job_result = cls._get_latest_training_job_result(project) or {}
            job_data = job_result.get('data')
            version = job_result.get('version')
            return cls.get_or_create(project, schema, force_reload, job_data, version, **kwargs)

    @classmethod
    def job_status(cls, job_id):
        job = Job.fetch(job_id, connection=cls._redis)
        response = {
            'job_status': job.get_status(),
            'error': job.exc_info,
            'created_at': job.created_at,
            'enqueued_at': job.enqueued_at,
            'started_at': job.started_at,
            'ended_at': job.ended_at
        }
        if job.is_finished and isinstance(job.result, str):
            response['result'] = json.loads(job.result)
        return response

    @classmethod
    def predict(
        cls, tasks, project=None, schema=None, force_reload=False, try_fetch=True,
        init_kwargs=None, predict_kwargs=None
    ):
        init_kwargs = init_kwargs or {}
        predict_kwargs = predict_kwargs or {}
        if try_fetch:
            m = cls.fetch(project, schema, force_reload, **init_kwargs)
        else:
            m = cls.get(project)
            if not m:
                raise FileNotFoundError('No model loaded. Specify "try_fetch=True" option.')

        predictions = m.model.predict(tasks, **predict_kwargs)
        return predictions, m

    @classmethod
    def train_script_wrapper(cls, project, schema, init_kwargs, train_kwargs):
        version = cls._generate_version()

        if cls.model_dir:
            project_model_dir = os.path.join(cls.model_dir, project or '')
            workdir = os.path.join(project_model_dir, version)
            os.makedirs(workdir, exist_ok=True)
        else:
            workdir = None

        data_stream = cls._redis.lrange(cls._get_tasks_key(project), 0, -1)
        t = time.time()
        model = cls.fetch(project, schema, **init_kwargs)
        output_data = model.fit(data_stream, workdir, **train_kwargs)
        job_result = json.dumps({
            'status': 'ok',
            'data': output_data,
            'project': project,
            'workdir': workdir,
            'version': version,
            'job_id': get_current_job().id,
            'time': time.time() - t
        })
        cls._redis.rpush(cls._get_job_results_key(project), job_result)
        return job_result

    @classmethod
    def _start_training_job(cls, project, schema, init_kwargs):
        job = cls._redis_queue.enqueue(
            cls.train_script_wrapper,
            args=(project, schema, init_kwargs, cls.train_kwargs),
            job_timeout='365d',
            ttl=-1,
            result_ttl=-1,
            failure_ttl=300,
            meta={'project': project},
        )
        logger.info('Training job {job} started for project {project}'.format(job=job, project=project))
        return job

    @classmethod
    def train(cls, tasks, project=None, schema=None, **kwargs):
        if cls.only_inference:
            raise NotImplementedError('You have to connect to Redis server for online training support.')
        tasks_key = cls._get_tasks_key(project)
        cls._redis.delete(tasks_key)
        for task in tasks:
            cls._redis.push(tasks_key, task)
        job = cls._start_training_job(project, schema, kwargs)
        return job
