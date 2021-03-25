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

from core.utils.common import safe_float
from ml.api_connector import MLApi
from projects.models import Project
from tasks.models import Annotation, Prediction
from tasks.serializers import TaskSerializer

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

    def predict_all_tasks(self, batch_size=100):
        num_prediction_jobs = MLBackendPredictionJob.objects.filter(ml_backend_id=self.id).count()
        if num_prediction_jobs >= MAX_JOBS_PER_PROJECT:
            logger.info(
                f'Can\'t start prediction job for project {self.project}: {num_prediction_jobs} currently running')
            return {'status': 'ok'}
        queue = django_rq.get_queue('default')
        job = queue.enqueue(run_task_predictions, self.id, batch_size)
        # job_id = run_task_predictions.delay(self.project.id, batch_size)
        MLBackendPredictionJob.objects.create(
            ml_backend=self, job_id=job.id, model_version=self.model_version, batch_size=batch_size)

    def predict_one_task(self, task):
        if self.not_ready:
            logger.debug(f'ML backend {self} is not ready to predict {task}')
            return
        if task.predictions.filter(model_version=self.model_version).exists():
            # prediction already exists
            logger.info(f'Skip creating prediction with ML backend {self} for task {task}: model version is up-to-date')
            return
        ml_api = self.api

        task_ser = TaskSerializer(task).data
        ml_api_result = ml_api.make_predictions([task_ser], self.model_version, self.project)
        if ml_api_result.is_error:
            logger.warning(f'Prediction not created for project {self}: {ml_api_result.error_message}')
            return
        results = ml_api_result.response['results']
        if len(results) == 0:
            logger.error(f'ML backend returned empty prediction for project {self}')
            return
        prediction_response = results[0]
        task_id = task_ser['id']
        r = prediction_response['result']
        score = prediction_response.get('score')
        matching_score = None
        prediction = Prediction.objects.create(
            result=r,
            score=safe_float(score),
            model_version=self.model_version,
            task_id=task_id,
            cluster=prediction_response.get('cluster'),
            neighbors=prediction_response.get('neighbors'),
            mislabeling=safe_float(prediction_response.get('mislabeling', 0))
        )
        logger.info(f'Prediction created: result={r}, score={score}, id={prediction.id}')

        model_version = ml_api_result.response.get('model_version')
        if model_version != self.model_version:
            self.model_version = model_version
            self.save()
            logger.info(f'Project {self} updates model version to {model_version}')

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


@job('default', timeout=36000)
def run_task_predictions(ml_backend_id, batch_size=100):
    """
    Run prediction and update db, stats counts and project prerequisites
    :param project_id:
    :param batch_size:
    :return:
    """
    ml_backend = MLBackend.objects.get(id=ml_backend_id)
    response = ml_backend.setup()
    if response.is_error:
        raise ValueError(response.error_message)
    else:
        if response.response['model_version'] != ml_backend.model_version:
            ml_backend.model_version = response.response['model_version']
            ml_backend.save()

    # collect tasks without predictions for current model version
    tasks_without_predictions = ml_backend.project.tasks.annotate(
        model_version=F('predictions__model_version'),
        num_predictions=Count('predictions')
    ).filter(~Q(model_version=ml_backend.model_version) | Q(num_predictions=0))

    if not tasks_without_predictions.exists():
        logger.info(f'Predictions for project {ml_backend.project} with version {ml_backend.model_version} already exist, '
                       f'update is not needed')
        return {'status': 'ok'}
    else:
        logger.info(f'Found {tasks_without_predictions.count()} tasks without predictions '
                       f'from model version {ml_backend.model_version} in project {ml_backend.project}')

    # TODO: randomize tasks selection so that taken tasks don't clash with each other with high probability
    tasks = TaskSerializer(tasks_without_predictions[:batch_size], many=True).data

    failed_tasks = []
    for task in tasks:
        task_id = task['id']
        ml_api_result = ml_backend.api.make_predictions([task], ml_backend.model_version, ml_backend.project)
        if not _validate_ml_api_result(ml_api_result, [task], logger):
            logger.warning(f'Project {ml_backend.project}: task {task.id} failed')
            failed_tasks.append(task)
            continue

        prediction_result = ml_api_result.response['results'][0]

        with transaction.atomic():
            Prediction.objects.filter(task_id=task_id, model_version=ml_backend.model_version).delete()
            Prediction.objects.create(
                task_id=task_id,
                model_version=ml_backend.model_version,
                result=prediction_result['result'],
                score=safe_float(prediction_result.get('score', 0)),
                cluster=prediction_result.get('cluster'),
                neighbors=prediction_result.get('neighbors'),
                mislabeling=safe_float(prediction_result.get('mislabeling', 0))
            )
        logger.info(f'Project {ml_backend.project}: task {task_id} processed with model version {ml_backend.model_version}')

    MLBackendPredictionJob.objects.filter(job_id=get_current_job().id).delete()
    logger.info(f'Total task processes: {len(tasks)}, failed: {len(failed_tasks)}')
    return {'status': 'ok', 'processed_num': len(tasks), 'failed': failed_tasks}


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
