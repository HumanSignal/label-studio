"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import django_rq
import logging
from django.db import models, transaction
# Create your models here.
from django.db.models import F, Count, Q
from django.utils.translation import gettext_lazy as _
from django_rq import job
from rq import get_current_job

from core.utils.common import safe_float, conditional_atomic
from ml.api_connector import MLApi
from projects.models import Project
from tasks.models import Annotation, Prediction
from tasks.serializers import TaskSerializer, TaskSimpleSerializer, PredictionSerializer

logger = logging.getLogger(__name__)

MAX_JOBS_PER_PROJECT = 1


class MLBackendState(models.TextChoices):
    CONNECTED = 'CO', _('Connected')
    DISCONNECTED = 'DI', _('Disconnected')
    ERROR = 'ER', _('Error')
    TRAINING = 'TR', _('Training')
    PREDICTING = 'PR', _('Predicting')


class MLBackend(models.Model):
    """
    """

    state = models.CharField(
        max_length=2,
        choices=MLBackendState.choices,
        default=MLBackendState.DISCONNECTED,
    )

    url = models.TextField(
        _('url'),
        help_text='URL for the machine learning model server'
    )
    error_message = models.TextField(
        _('url'), blank=True, null=True,
        help_text='Error message in error state'
    )
    title = models.TextField(
        _('title'),
        blank=True,
        null=True,
        default='default',
        help_text='Name of the machine learning backend'
    )
    description = models.TextField(
        _('description'),
        blank=True,
        null=True,
        default='',
        help_text='Description for the machine learning backend'
    )
    model_version = models.TextField(
        _('model version'), blank=True, null=True, default='',
        help_text='Current model version associated with this machine learning backend'
    )

    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='ml_backends')
    created_at = models.DateTimeField(_('created at'), auto_now_add=True)
    updated_at = models.DateTimeField(_('updated at'), auto_now=True)

    def __str__(self):
        return f'{self.title} (id={self.id}, url={self.url})'

    @staticmethod
    def healthcheck_(url):
        return MLApi(url=url).health()

    def has_permission(self, user):
        return self.project.has_permission(user)

    @staticmethod
    def setup_(url, project):
        api = MLApi(url=url)
        if not isinstance(project, Project):
            project = Project.objects.get(pk=project)
        return api.setup(project)

    def healthcheck(self):
        return self.healthcheck_(self.url)

    def setup(self):
        return self.setup_(self.url, self.project)

    @property
    def api(self):
        return MLApi(url=self.url)

    @property
    def not_ready(self):
        return self.state in (MLBackendState.DISCONNECTED, MLBackendState.ERROR)

    def update_state(self):
        if self.healthcheck().is_error:
            self.state = MLBackendState.DISCONNECTED
        else:
            setup_response = self.setup()
            if setup_response.is_error:
                self.state = MLBackendState.ERROR
                self.error_message = setup_response.error_message
            else:
                self.state = MLBackendState.CONNECTED
                self.model_version = setup_response.response.get('model_version')
                self.error_message = None
        self.save()

    def train(self):
        train_response = self.api.train(self.project)
        if train_response.is_error:
            self.state = MLBackendState.ERROR
            self.error_message = train_response.error_message
        else:
            self.state = MLBackendState.TRAINING
            current_train_job = train_response.response.get('job')
            if current_train_job:
                MLBackendTrainJob.objects.create(job_id=current_train_job, ml_backend=self)
        self.save()

    def predict_many_tasks(self, tasks):
        self.update_state()
        if self.not_ready:
            logger.debug(f'ML backend {self} is not ready')
            return

        if isinstance(tasks, list):
            from tasks.models import Task
            tasks = Task.objects.filter(id__in=[task.id for task in tasks])

        tasks_ser = TaskSimpleSerializer(tasks, many=True).data
        ml_api_result = self.api.make_predictions(tasks_ser, self.model_version, self.project)
        if ml_api_result.is_error:
            logger.warning(f'Prediction not created for project {self}: {ml_api_result.error_message}')
            return

        if not (isinstance(ml_api_result.response, dict) and 'results' in ml_api_result.response):
            logger.error(f'ML backend returns an incorrect response, it should be a dict: {ml_api_result.response}')
            return

        responses = ml_api_result.response['results']

        if len(responses) == 0:
            logger.warning(f'ML backend returned empty prediction for project {self}')
            return

        # ML Backend doesn't support batch of tasks, do it one by one
        elif len(responses) == 1:
            logger.warning(f"'ML backend '{self.title}' doesn't support batch processing of tasks, "
                           f"switched to one-by-one task retrieving")
            for task in tasks:
                self.predict_one_task(task)
            return

        # wrong result number
        elif len(responses) != len(tasks_ser):
            logger.warning(f'ML backend returned response number {len(responses)} != task number {len(tasks_ser)}')

        predictions = []
        for task, response in zip(tasks_ser, responses):
            if 'result' not in response:
                logger.error(f"ML backend returns an incorrect prediction, it should be a dict with the 'result' field:"
                             f" {response}")
                return

            predictions.append({
                'task': task['id'],
                'result': response['result'],
                'score': response.get('score'),
                'model_version': self.model_version
            })
        with conditional_atomic():
            prediction_ser = PredictionSerializer(data=predictions, many=True)
            prediction_ser.is_valid(raise_exception=True)
            prediction_ser.save()

    def predict_one_task(self, task):
        self.update_state()
        if self.not_ready:
            logger.debug(f'ML backend {self} is not ready to predict {task}')
            return
        if task.predictions.filter(model_version=self.model_version).exists():
            # prediction already exists
            logger.info(f'Skip creating prediction with ML backend {self} for task {task}: model version '
                        f'{self.model_version} is up-to-date')
            return
        ml_api = self.api

        task_ser = TaskSimpleSerializer(task).data
        ml_api_result = ml_api.make_predictions([task_ser], self.model_version, self.project)
        if ml_api_result.is_error:
            logger.warning(f'Prediction not created for project {self}: {ml_api_result.error_message}')
            return
        results = ml_api_result.response['results']
        if len(results) == 0:
            logger.error(f'ML backend returned empty prediction for project {self}', extra={'sentry_skip': True})
            return
        prediction_response = results[0]
        task_id = task_ser['id']
        r = prediction_response['result']
        score = prediction_response.get('score')
        with conditional_atomic():
            prediction = Prediction.objects.create(
                result=r,
                score=safe_float(score),
                model_version=self.model_version,
                task_id=task_id,
                cluster=prediction_response.get('cluster'),
                neighbors=prediction_response.get('neighbors'),
                mislabeling=safe_float(prediction_response.get('mislabeling', 0))
            )
            logger.debug(f'Prediction {prediction} created')

        return prediction


class MLBackendPredictionJob(models.Model):

    job_id = models.CharField(max_length=128)
    ml_backend = models.ForeignKey(MLBackend, related_name='prediction_jobs', on_delete=models.CASCADE)
    model_version = models.TextField(
        _('model version'), blank=True, null=True,
        help_text='Model version this job associated with'
    )
    batch_size = models.PositiveSmallIntegerField(
        _('batch size'), default=100, help_text='Number of tasks processed per batch')

    created_at = models.DateTimeField(_('created at'), auto_now_add=True)
    updated_at = models.DateTimeField(_('updated at'), auto_now=True)


class MLBackendTrainJob(models.Model):

    job_id = models.CharField(max_length=128)
    ml_backend = models.ForeignKey(MLBackend, related_name='train_jobs', on_delete=models.CASCADE)
    model_version = models.TextField(
        _('model version'), blank=True, null=True,
        help_text='Model version this job is associated with'
    )
    created_at = models.DateTimeField(_('created at'), auto_now_add=True)
    updated_at = models.DateTimeField(_('updated at'), auto_now=True)

    def get_status(self):
        project = self.ml_backend.project
        ml_api = project.get_ml_api()
        if not ml_api:
            logger.error(f'Training job {self.id}: Can\'t collect training jobs for project {project}: ML API is null')
            return None
        ml_api_result = ml_api.get_train_job_status(self)
        if ml_api_result.is_error:
            if ml_api_result.status_code == 410:
                return {'job_status': 'removed'}
            logger.error(f'Training job {self.id}: Can\'t collect training jobs for project {project}: '
                         f'ML API returns error {ml_api_result.error_message}')
            return None
        return ml_api_result.response

    @property
    def is_running(self):
        status = self.get_status()
        return status['job_status'] in ('queued', 'started')


def _validate_ml_api_result(ml_api_result, tasks, curr_logger):
    if ml_api_result.is_error:
        curr_logger.warning(ml_api_result.error_message)
        return False

    results = ml_api_result.response['results']
    if not isinstance(results, list) or len(results) != len(tasks):
        curr_logger.warning('Num input tasks is %d but ML API returns %d results', len(tasks), len(results))
        return False

    return True


def _get_model_version(project, ml_api, curr_logger):
    logger.debug(f'Get model version for project {project}')
    model_version = None
    ml_api_result = ml_api.setup(project)
    if ml_api_result.is_error:
        curr_logger.warning(
            f'Project {project}: can\'t fetch last model version from {ml_api_result.url}, reason: {ml_api_result.error_message}.')
    else:
        if 'model_version' in ml_api_result.response:
            model_version = ml_api_result.response['model_version']
        else:
            curr_logger.error(f'Project {project}: "model_version" field is not specified in response.')
    return model_version
