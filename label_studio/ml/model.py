import os
import logging
import time
import json
import redis
import attr
import io

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
    is_training = attr.attrib(default=False)
    job_id = attr.ib(default=None)


class LabelStudioMLBase(ABC):

    def __init__(self, label_config=None, train_output=None, **kwargs):
        """Model loader"""
        self.label_config = label_config
        self.parsed_label_config = parse_config(self.label_config)
        self.train_output = train_output

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
        **init_kwargs
    ):
        if not issubclass(model_class, LabelStudioMLBase):
            raise ValueError('Inference class should be the subclass of ' + LabelStudioMLBase.__class__.__name__)
        cls.model_class = model_class

        cls.model_dir = model_dir
        if cls.model_dir:
            cls.model_dir = os.path.expanduser(cls.model_dir)
            os.makedirs(cls.model_dir, exist_ok=True)
        cls.init_kwargs = init_kwargs
        cls.redis_host = redis_host
        cls.redis_port = redis_port

        cls._redis = cls._get_redis(redis_host, redis_port)
        if cls._redis:
            cls._redis_queue = Queue(name=redis_queue, connection=cls._redis)

        cls._current_model = {}

    @property
    def without_redis(cls):
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
        return 'project:' + str(project) + 'job_results'

    @classmethod
    def _remove_jobs(cls, project):
        started_registry = StartedJobRegistry(cls._redis_queue.name, cls._redis_queue.connection)
        finished_registry = FinishedJobRegistry(cls._redis_queue.name, cls._redis_queue.connection)
        for job_id in started_registry.get_job_ids() + finished_registry.get_job_ids():
            job = Job.fetch(job_id, connection=cls._redis)
            if job.meta.get('project') != project:
                continue
            logger.info('Deleting job_id ' + job_id)
            job.delete()

    @classmethod
    def _get_latest_job_result_from_redis(cls, project):
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
    def _get_latest_job_result_from_workdir(cls, project):
        project_model_dir = os.path.join(cls.model_dir, project or '')
        if not os.path.exists(project_model_dir):
            return
        subdirs = list(filter(lambda d: d.isdigit(), os.listdir(project_model_dir)))
        if subdirs:
            last_version = str(list(sorted(map(int, subdirs)))[-1])
            job_result_file = os.path.join(project_model_dir, last_version, 'job_result.json')
            if not os.path.exists(job_result_file):
                return
            with open(job_result_file) as f:
                return json.load(f)

    @classmethod
    def _key(cls, project):
        return project, os.getpid()

    @classmethod
    def has_active_model(cls, project):
        return cls._key(project) in cls._current_model

    @classmethod
    def get(cls, project):
        key = cls._key(project)
        logger.debug('Get project ' + str(key))
        return cls._current_model.get(key)

    @classmethod
    def create(cls, project=None, label_config=None, train_output=None, version=None, **kwargs):
        key = cls._key(project)
        logger.debug('Create project ' + str(key))
        kwargs.update(cls.init_kwargs)
        cls._current_model[key] = ModelWrapper(
            model=cls.model_class(label_config=label_config, train_output=train_output, **kwargs),
            model_version=version or cls._generate_version()
        )
        return cls._current_model[key]

    @classmethod
    def get_or_create(
        cls, project=None, label_config=None, force_reload=False, train_output=None, version=None, **kwargs
    ):
        if not cls.has_active_model(project) or force_reload:
            cls.create(project, label_config, train_output, version, **kwargs)
        return cls.get(project)

    @classmethod
    def fetch(cls, project=None, label_config=None, force_reload=False, **kwargs):
        if cls.without_redis:
            job_result = cls._get_latest_job_result_from_workdir(project) or {}
        else:
            job_result = cls._get_latest_job_result_from_redis(project) or {}
        train_output = job_result.get('train_output')
        version = job_result.get('version')
        return cls.get_or_create(project, label_config, force_reload, train_output, version, **kwargs)

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
    def is_training(cls, project):
        if not cls.has_active_model(project):
            return {'is_training': False}
        m = cls.get(project)
        if cls.without_redis:
            is_training = m.is_training
            backend = 'subprocess'
        else:
            job = Job.fetch(m.job_id, connection=cls._redis)
            is_training = job.is_queued or job.is_started
            backend = 'redis'
        return {
            'is_training': is_training,
            'model_version': m.model_version,
            'job_id': m.job_id,
            'backend': backend
        }

    @classmethod
    def predict(
        cls, tasks, project=None, label_config=None, force_reload=False, try_fetch=True, **kwargs
    ):
        if try_fetch:
            m = cls.fetch(project, label_config, force_reload)
        else:
            m = cls.get(project)
            if not m:
                raise FileNotFoundError('No model loaded. Specify "try_fetch=True" option.')

        predictions = m.model.predict(tasks, **kwargs)
        return predictions, m

    @classmethod
    def create_data_snapshot(cls, data_iter, workdir):
        data = list(data_iter)
        data_file = os.path.join(workdir, 'train_data.json')
        with io.open(data_file, mode='w') as fout:
            json.dump(data, fout, ensure_ascii=False, indent=2)

        info_file = os.path.join(workdir, 'train_data_info.json')
        with io.open(info_file, mode='w') as fout:
            json.dump({'count': len(data)}, fout, indent=2)

    @classmethod
    def train_script_wrapper(cls, project, label_config, train_kwargs, tasks=()):
        version = cls._generate_version()

        if cls.model_dir:
            project_model_dir = os.path.join(cls.model_dir, project or '')
            workdir = os.path.join(project_model_dir, version)
            os.makedirs(workdir, exist_ok=True)
        else:
            workdir = None

        if cls.without_redis:
            data_stream = tasks
        else:
            data_stream = cls._redis.lrange(cls._get_tasks_key(project), 0, -1)

        if workdir:
            cls.create_data_snapshot(iter(data_stream), workdir)

        t = time.time()
        m = cls.fetch(project, label_config)
        m.is_training = True
        try:
            train_output = m.model.fit(data_stream, workdir, **train_kwargs)
            if cls.without_redis:
                job_id = None
            else:
                job_id = get_current_job().id
            job_result = json.dumps({
                'status': 'ok',
                'train_output': train_output,
                'project': project,
                'workdir': workdir,
                'version': version,
                'job_id': job_id,
                'time': time.time() - t
            })
            if workdir:
                job_result_file = os.path.join(workdir, 'job_result.json')
                with open(job_result_file, mode='w') as fout:
                    fout.write(job_result)
            if not cls.without_redis:
                cls._redis.rpush(cls._get_job_results_key(project), job_result)
        except:
            raise
        finally:
            m.is_training = False
        return job_result

    @classmethod
    def _start_training_job(cls, project, label_config, train_kwargs):
        job = cls._redis_queue.enqueue(
            cls.train_script_wrapper,
            args=(project, label_config, train_kwargs),
            job_timeout='365d',
            ttl=-1,
            result_ttl=-1,
            failure_ttl=300,
            meta={'project': project},
        )
        logger.info('Training job {job} started for project {project}'.format(job=job, project=project))
        return job

    @classmethod
    def train(cls, tasks, project=None, label_config=None, **kwargs):
        job = None
        if cls.without_redis:
            job_result = cls.train_script_wrapper(
                project, label_config, train_kwargs=kwargs, tasks=tasks)
            train_output = json.loads(job_result)['train_output']
            cls.get_or_create(project, label_config, force_reload=True, train_output=train_output)
        else:
            tasks_key = cls._get_tasks_key(project)
            cls._redis.delete(tasks_key)
            for task in tasks:
                cls._redis.push(tasks_key, task)
            job = cls._start_training_job(project, label_config, kwargs)
        return job
