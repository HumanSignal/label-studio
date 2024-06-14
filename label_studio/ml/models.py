"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import logging
from typing import Dict, List

from core.utils.common import conditional_atomic, db_is_not_sqlite, load_func
from django.conf import settings
from django.db import models, transaction
from django.db.models import Count, JSONField, Q
from django.db.models.signals import post_save, pre_delete
from django.dispatch import receiver
from django.utils.translation import gettext_lazy as _
from ml.api_connector import PREDICT_URL, TIMEOUT_PREDICT, MLApi
from projects.models import Project
from tasks.serializers import PredictionSerializer, TaskSimpleSerializer
from webhooks.serializers import Webhook, WebhookSerializer

logger = logging.getLogger(__name__)

MAX_JOBS_PER_PROJECT = 1

InteractiveAnnotatingDataSerializer = load_func(settings.INTERACTIVE_DATA_SERIALIZER)


class MLBackendState(models.TextChoices):
    CONNECTED = 'CO', _('Connected')
    DISCONNECTED = 'DI', _('Disconnected')
    ERROR = 'ER', _('Error')
    TRAINING = 'TR', _('Training')
    PREDICTING = 'PR', _('Predicting')


class MLBackendAuth(models.TextChoices):
    NONE = 'NONE', _('None')
    BASIC_AUTH = 'BASIC_AUTH', _('Basic Auth')


class MLBackend(models.Model):
    """ """

    state = models.CharField(
        max_length=2,
        choices=MLBackendState.choices,
        default=MLBackendState.DISCONNECTED,
    )
    is_interactive = models.BooleanField(
        _('is_interactive'),
        default=False,
        help_text=('Used to interactively annotate tasks. ' 'If true, model returns one list with results'),
    )
    url = models.TextField(
        _('url'),
        help_text='URL for the machine learning model server',
    )
    error_message = models.TextField(
        _('error_message'),
        blank=True,
        null=True,
        help_text='Error message in error state',
    )
    title = models.TextField(
        _('title'),
        blank=True,
        null=True,
        default='default',
        help_text='Name of the machine learning backend',
    )

    auth_method = models.CharField(
        max_length=255,
        choices=MLBackendAuth.choices,
        default=MLBackendAuth.NONE,
    )

    basic_auth_user = models.TextField(
        _('basic auth user'),
        blank=True,
        null=True,
        default='',
        help_text='HTTP Basic Auth user',
    )

    basic_auth_pass = models.TextField(
        _('basic auth password'),
        blank=True,
        null=True,
        default='',
        help_text='HTTP Basic Auth password',
    )

    description = models.TextField(
        _('description'),
        blank=True,
        null=True,
        default='',
        help_text='Description for the machine learning backend',
    )

    extra_params = JSONField(
        _('extra params'),
        null=True,
        help_text='Any extra parameters passed to the ML Backend during the setup',
    )

    model_version = models.TextField(
        _('model version'),
        blank=True,
        null=True,
        default='',
        help_text='Current model version associated with this machine learning backend',
    )
    timeout = models.FloatField(
        _('timeout'),
        blank=True,
        default=100.0,
        help_text='Response model timeout',
    )
    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        related_name='ml_backends',
    )
    created_at = models.DateTimeField(_('created at'), auto_now_add=True)
    updated_at = models.DateTimeField(_('updated at'), auto_now=True)
    auto_update = models.BooleanField(
        _('auto_update'),
        default=True,
        help_text='If false, model version is set by the user, if true - getting latest version from backend.',
    )

    def __str__(self):
        return f'{self.title} (id={self.id}, url={self.url})'

    def __init__(self, *args, **kwargs):
        super(MLBackend, self).__init__(*args, **kwargs)
        self.__original_title = self.title

    def save(self, *args, **kwargs):
        """
        Overrides the save() method to update the associated project's model_version field.
        If the title of the model instance is changed and the model_version
        of the related project is currently the same as the original title,
        the project's model_version is updated to the new title.
        """
        p = self.project

        if self.title != self.__original_title and p.model_version == self.__original_title:
            with transaction.atomic():
                p.model_version = self.title
                p.save(update_fields=['model_version'])
                super().save(*args, **kwargs)
                # reset original field to current field after save
                self.__original_title = self.title
        else:
            super().save(*args, **kwargs)

    @staticmethod
    def healthcheck_(url, auth_method=None, **kwargs):
        return MLApi(url=url, auth_method=auth_method, **kwargs).health()

    def has_permission(self, user):
        user.project = self.project  # link for activity log
        return self.project.has_permission(user)

    @staticmethod
    def setup_(url, project, auth_method=None, **kwargs):
        api = MLApi(url=url, auth_method=auth_method, **kwargs)

        if not isinstance(project, Project):
            project = Project.objects.get(pk=project)
        return api.setup(project, **kwargs)

    def healthcheck(self):
        return self.healthcheck_(
            self.url, self.auth_method, basic_auth_user=self.basic_auth_user, basic_auth_pass=self.basic_auth_pass
        )

    def setup(self):
        return self.setup_(
            self.url,
            self.project,
            self.auth_method,
            extra_params=self.extra_params,
            basic_auth_user=self.basic_auth_user,
            basic_auth_pass=self.basic_auth_pass,
        )

    @property
    def api(self):
        return MLApi(
            url=self.url,
            timeout=self.timeout,
            auth_method=self.auth_method,
            basic_auth_user=self.basic_auth_user,
            basic_auth_pass=self.basic_auth_pass,
        )

    @property
    def not_ready(self):
        return self.state in (MLBackendState.DISCONNECTED, MLBackendState.ERROR)

    def update_state(self):
        model_version = None
        if self.healthcheck().is_error:
            self.state = MLBackendState.DISCONNECTED
        else:
            setup_response = self.setup()
            if setup_response.is_error:
                logger.info(f'ML backend responds with error: {setup_response.error_message}')
                self.state = MLBackendState.ERROR
                self.error_message = setup_response.error_message
            else:
                self.state = MLBackendState.CONNECTED
                model_version = setup_response.response.get('model_version')
                logger.info(f'ML backend responds with success: {setup_response.response}')
                if self.auto_update:
                    logger.debug(f'Changing model version: {self.model_version} -> {model_version}')
                    self.model_version = model_version
                self.error_message = None
        self.save()
        return model_version

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

    def _predict(self, task):
        """This is low level prediction method that is used for debugging"""
        ml_api = self.api
        task_ser = TaskSimpleSerializer(task).data

        request_params = ml_api._prep_prediction_req([task_ser], self.project)
        ml_api_result = ml_api._request(PREDICT_URL, request_params, verbose=False, timeout=TIMEOUT_PREDICT)

        if ml_api_result.is_error:
            logger.info(f'Prediction not created for project {self}: {ml_api_result.error_message}')
            return

        results = ml_api_result.response.get('results', None)

        return {
            'status': 200,
            'data': {
                'status': ml_api_result.status_code,
                'error_message': ml_api_result.error_message,
                'url': ml_api._get_url(PREDICT_URL),
                'task': task_ser,
                'request': request_params,
                'response': results,
            },
        }

    def _get_predictions_from_ml_backend_one_by_one(
        self, serialized_tasks: List[Dict], current_responses: List[Dict]
    ) -> List[Dict]:
        """
        This is helper method to get predictions from ML backend one by one
        in case when tasks length doesn't match responses length
        Note: don't use this function outside of this class
        """

        if len(current_responses) == 1:
            # In case ML backend doesn't support batch of tasks, do it one by one
            # TODO: remove this block after all ML backends will support batch processing
            logger.warning(
                f"'ML backend '{self.title}' doesn't support batch processing of tasks, "
                f'switched to one-by-one task retrieval'
            )
            predictions = []
            for serialized_task in serialized_tasks:
                # get predictions per task
                predictions.extend(self._get_predictions_from_ml_backend([serialized_task]))

            return predictions
        else:
            # complete failure - likely ML backend skipped some tasks, we can't match them
            logger.error(
                f'Number of tasks and responses are not equal: '
                f'{len(serialized_tasks)} tasks != {len(current_responses)} responses. '
                f'Returning empty predictions.'
            )
            return []

    def _get_predictions_from_ml_backend(self, serialized_tasks: List[Dict]) -> List[Dict]:
        result = self.api.make_predictions(serialized_tasks, self.project)

        # response validation
        if result.is_error:
            logger.error(f'Error occurred: {result.error_message}')
            return []
        elif not isinstance(result.response, dict) or 'results' not in result.response:
            logger.error(f'ML backend returns an incorrect response, it must be a dict: {result.response}')
            return []
        elif not isinstance(result.response['results'], list) or len(result.response['results']) == 0:
            logger.error(
                'ML backend returns an incorrect response, results field must be a list with at least one item'
            )
            return []

        responses = result.response['results']

        predictions = []
        if len(serialized_tasks) != len(responses):
            # Number of tasks and responses are not equal
            # It can happen if ML backend doesn't support batch processing but only process one task at a time
            # In the future versions, we may better consider this as an error and deprecate this code branch
            return self._get_predictions_from_ml_backend_one_by_one(serialized_tasks, responses)

        # ML backend supports batch processing
        for task, response in zip(serialized_tasks, responses):
            if isinstance(response, dict):
                # ML backend can return single prediction per task or multiple predictions
                response = [response]

            # get all predictions per task
            for r in response:
                if 'result' not in r:
                    logger.error(
                        f"ML backend returns an incorrect prediction, it should be a dict with the 'result' field:"
                        f' {r}'
                    )
                    continue
                predictions.append(
                    {
                        'task': task['id'],
                        'result': r['result'],
                        'score': r.get('score'),
                        'model_version': r.get('model_version', self.model_version),
                        'project': task['project'],
                    }
                )
        return predictions

    def predict_tasks(self, tasks):
        model_version = self.update_state()
        if self.not_ready:
            logger.debug(f'ML backend {self} is not ready')
            return

        if isinstance(tasks, list):
            from tasks.models import Task

            tasks = Task.objects.filter(id__in=[task.id for task in tasks])

        # Filter tasks that already contain the current model version in predictions
        tasks = tasks.annotate(predictions_count=Count('predictions')).exclude(
            Q(predictions_count__gt=0) & Q(predictions__model_version=model_version)
        )
        if not tasks.exists():
            logger.debug(f'All tasks already have prediction from model version={self.model_version}')
            return model_version
        tasks_ser = TaskSimpleSerializer(tasks, many=True).data
        predictions = self._get_predictions_from_ml_backend(tasks_ser)
        with conditional_atomic(predicate=db_is_not_sqlite):
            prediction_ser = PredictionSerializer(data=predictions, many=True)
            prediction_ser.is_valid(raise_exception=True)
            instances = prediction_ser.save()
        return instances

    def interactive_annotating(self, task, context=None, user=None):
        result = {}
        options = {}
        if user:
            options = {'user': user}
        if not self.is_interactive:
            result['errors'] = ['Model is not set to be used for interactive preannotations']
            return result

        tasks_ser = InteractiveAnnotatingDataSerializer(
            [task], many=True, expand=['drafts', 'predictions', 'annotations'], context=options
        ).data
        ml_api_result = self.api.make_predictions(
            tasks=tasks_ser,
            project=self.project,
            context=context,
        )
        if ml_api_result.is_error:
            logger.info(f'Prediction not created for project {self}: {ml_api_result.error_message}')
            result['errors'] = [ml_api_result.error_message]
            return result

        if not (isinstance(ml_api_result.response, dict) and 'results' in ml_api_result.response):
            logger.info(f'ML backend returns an incorrect response, it must be a dict: {ml_api_result.response}')
            result['errors'] = [
                'Incorrect response from ML service: ' 'ML backend returns an incorrect response, it must be a dict.'
            ]
            return result

        ml_results = ml_api_result.response.get(
            'results',
            [
                None,
            ],
        )
        if not isinstance(ml_results, list) or len(ml_results) < 1:
            logger.warning(f'ML backend has to return list with 1 annotation but it returned: {type(ml_results)}')
            result['errors'] = [
                'Incorrect response from ML service: ' 'ML backend has to return list with more than 1 result.'
            ]
            return result
        result['data'] = ml_results[0]
        return result

    @staticmethod
    def get_versions_(url, project, auth_method, **kwargs):
        api = MLApi(url=url, auth_method=auth_method, **kwargs)
        if not isinstance(project, Project):
            project = Project.objects.get(pk=project)
        return api.get_versions(project)

    def get_versions(self):
        return self.get_versions_(
            self.url,
            self.project,
            self.auth_method,
            basic_auth_user=self.basic_auth_user,
            basic_auth_pass=self.basic_auth_pass,
        )


class MLBackendPredictionJob(models.Model):

    job_id = models.CharField(max_length=128)
    ml_backend = models.ForeignKey(MLBackend, related_name='prediction_jobs', on_delete=models.CASCADE)
    model_version = models.TextField(
        _('model version'), blank=True, null=True, help_text='Model version this job is associated with'
    )
    batch_size = models.PositiveSmallIntegerField(
        _('batch size'), default=100, help_text='Number of tasks processed per batch'
    )

    created_at = models.DateTimeField(_('created at'), auto_now_add=True)
    updated_at = models.DateTimeField(_('updated at'), auto_now=True)


class MLBackendTrainJob(models.Model):

    job_id = models.CharField(max_length=128)
    ml_backend = models.ForeignKey(MLBackend, related_name='train_jobs', on_delete=models.CASCADE)
    model_version = models.TextField(
        _('model version'),
        blank=True,
        null=True,
        help_text='Model version this job is associated with',
    )
    created_at = models.DateTimeField(_('created at'), auto_now_add=True)
    updated_at = models.DateTimeField(_('updated at'), auto_now=True)

    def get_status(self):
        project = self.ml_backend.project
        ml_api = project.get_ml_api()
        if not ml_api:
            logger.error(
                f"Training job {self.id}: Can't collect training jobs for project {project.id}: ML API is null"
            )
            return None
        ml_api_result = ml_api.get_train_job_status(self)
        if ml_api_result.is_error:
            if ml_api_result.status_code == 410:
                return {'job_status': 'removed'}
            logger.info(
                f"Training job {self.id}: Can't collect training jobs for project {project}: "
                f'ML API returns error {ml_api_result.error_message}'
            )
            return None
        return ml_api_result.response

    @property
    def is_running(self):
        status = self.get_status()
        return status['job_status'] in ('queued', 'started')


def _validate_ml_api_result(ml_api_result, tasks, curr_logger):
    if ml_api_result.is_error:
        curr_logger.info(ml_api_result.error_message)
        return False

    results = ml_api_result.response['results']
    if not isinstance(results, list) or len(results) != len(tasks):
        curr_logger.warning('Num input tasks is %d but ML API returns %d results', len(tasks), len(results))
        return False

    return True


@receiver(pre_delete, sender=MLBackend)
def modify_project_model_version(sender, instance, **kwargs):
    project = instance.project

    if project.model_version == instance.title:
        project.model_version = ''
        project.save(update_fields=['model_version'])


@receiver(post_save, sender=MLBackend)
def create_ml_webhook(sender, instance, created, **kwargs):
    if not created:
        return
    ml_backend = instance
    webhook_url = ml_backend.url.rstrip('/') + '/webhook'
    project = ml_backend.project
    if Webhook.objects.filter(project=project, url=webhook_url).exists():
        logger.info(f'Webhook {webhook_url} already exists for project {project}: skip creating new one.')
        return
    logger.info(f'Create ML backend webhook {webhook_url}')
    ser = WebhookSerializer(
        data=dict(project=project.id, url=webhook_url, send_payload=True, send_for_all_actions=True)
    )
    if ser.is_valid():
        ser.save(organization=project.organization)
