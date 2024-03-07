"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import logging

from core.utils.common import conditional_atomic, db_is_not_sqlite, load_func, safe_float
from django.conf import settings
from django.db import models, transaction
from django.db.models import Count, JSONField, Q
from django.db.models.signals import post_save, pre_delete
from django.dispatch import receiver
from django.utils.translation import gettext_lazy as _
from ml.api_connector import PREDICT_URL, TIMEOUT_PREDICT, MLApi
from projects.models import Project
from tasks.models import Task
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
    NONE = 'NA', _('None')
    BASIC_AUTH = 'BA', _('Basic Auth')


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
        max_length=2,
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

    # deprecated
    auto_update = models.BooleanField(
        _('auto_update'),
        default=True,
        help_text='If false, model version is set by the user, if true - getting latest version from backend.',
    )

    @staticmethod
    def healthcheck_(url, auth_method=None, **kwargs):
        return MLApi(url=url, auth_method=auth_method, **kwargs).health()

    @staticmethod
    def setup_(url, project, auth_method=None, **kwargs):
        api = MLApi(url=url, auth_method=auth_method, **kwargs)

        if not isinstance(project, Project):
            project = Project.objects.get(pk=project)

        return api.setup(project, **kwargs)

    @staticmethod
    def get_versions_(url, project, auth_method, **kwargs):
        """ """
        api = MLApi(url=url, auth_method=auth_method, **kwargs)

        if not isinstance(project, Project):
            project = Project.objects.get(pk=project)

        return api.get_versions(project)

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
                p.save()
                super().save(*args, **kwargs)
                # reset original field to current field after save
                self.__original_title = self.title
        else:
            super().save(*args, **kwargs)

    def has_permission(self, user):
        user.project = self.project  # link for activity log
        return self.project.has_permission(user)

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

    def get_versions(self):
        return self.get_versions_(
            self.url,
            self.project,
            self.auth_method,
            basic_auth_user=self.basic_auth_user,
            basic_auth_pass=self.basic_auth_pass,
        )

    def update_state(self):
        """ """
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
                model_version = setup_response.response.get('model_version', 'undefined')
                logger.info(f'ML backend responds with success: {setup_response.response}')
                # if self.auto_update:
                #     logger.debug(f'Changing model version: {self.model_version} -> {model_version}')
                #     self.model_version = model_version
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

        # url=self.url, timeout=self.timeout, auth_method=self.auth_method,
        # basic_auth_user=self.basic_auth_user, basic_auth_pass=self.basic_auth_pass

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

    def predict_and_save(self, tasks=None):
        """ """
        # update model state, if model is ready it sets appropriate status and return its version
        model_version = self.update_state()
        if not self.ready_for_prediction():
            return

        # take only those tasks for which we do not have that version predictions already saved
        tasks_queryset = self.get_filtered_tasks(tasks, filter_model_version=model_version)
        if not tasks_queryset.exists():
            logger.debug(f'All tasks already have prediction from model version={self.model_version}')
            return model_version

        # serialize data to pass to the model
        tasks_ser = TaskSimpleSerializer(tasks_queryset, many=True).data

        # send a request to the model to create predictions
        ml_api_result = self.api.make_predictions(tasks_ser, self.project)
        responses = ml_api_result.response['results']

        # check if we've the results we need
        if not self.prediction_results_ready(ml_api_result):
            return

        # check if we have support to process multiple tasks at once
        # on the ML Backend side
        if len(responses) == 1 and len(tasks_queryset) != 1:
            logger.warning(
                f"'ML backend '{self.title}' doesn't support batch processing of tasks, "
                f'switched to one-by-one task retrieval'
            )

            # TODO: this is an artifact from previous code, and
            # clearly not the best idea. You should not be sending a
            # request to the server with all the data only to figure
            # out that the server does not support it, and you need to
            # move to one by one processing
            instances = [self.predict_one_task(task, model_version=model_version) for task in tasks_queryset]

            return instances

        return self.handle_prediction_results(responses, tasks_queryset, tasks_ser)

    def predict_one_task(self, task, model_version=None):
        """ """
        if not model_version:
            model_version = self.update_state()
            if not self.ready_for_prediction():
                return

        tasks_queryset = self.get_filtered_tasks([task])
        if not tasks_queryset.exists():
            logger.info(
                f'Skip creating prediction with ML backend {self} for task {task}: model version '
                f'{self.model_version} is up-to-date'
            )
            return

        task_ser = TaskSimpleSerializer(tasks_queryset.first()).data
        ml_api_result = self.api.make_predictions([task_ser], self.project)

        if not self.prediction_results_ready(ml_api_result):
            return

        responses = ml_api_result.response['results']
        return self.handle_single_prediction(task, responses[0])

    def ready_for_prediction(self):
        if self.not_ready:
            logger.debug(f'ML backend {self} is not ready')
            return False

        return True

    def get_filtered_tasks(self, tasks, filter_model_version=None):
        """Filter tasks that already contain the current model version
        in predictions

        """
        if isinstance(tasks, list):
            tasks = Task.objects.filter(id__in=[task.id for task in tasks])

        if filter_model_version is None:
            filter_model_version = self.model_version

        tasks = tasks.annotate(predictions_count=Count('predictions')).exclude(
            Q(predictions_count__gt=0) & Q(predictions__model_version=filter_model_version)
        )

        return tasks

    def prediction_results_ready(self, ml_api_result):
        """Given restuls from ML Backend understand and log the status"""
        if ml_api_result.is_error:
            logger.info(f'Prediction not created for project {self}: {ml_api_result.error_message}')
            return False

        if not (isinstance(ml_api_result.response, dict) and 'results' in ml_api_result.response):
            logger.info(f'ML backend returns an incorrect response, it should be a dict: {ml_api_result.response}')
            return False

        if len(ml_api_result.response['results']) == 0:
            logger.warning(f'ML backend returned empty prediction for project {self}')
            return False

        return True

    def handle_prediction_results(self, responses, tasks_queryset, tasks_ser):
        """ """
        if len(responses) != len(tasks_ser):
            logger.warning(f'ML backend returned response number {len(responses)} != task number {len(tasks_ser)}')

        predictions = []
        for task, response in zip(tasks_ser, responses):
            if 'result' not in response:
                logger.info(
                    f"ML backend returns an incorrect prediction, it should be a dict with the 'result' field:"
                    f' {response}'
                )

                return

            predictions.append(
                {
                    'task': task['id'],
                    'result': response['result'],
                    'score': response.get('score'),
                    'cluster': response.get('cluster'),
                    'neighbors': response.get('neighbors'),
                    'model_version': response.get('model_version', 'undefined'),
                }
            )

        with conditional_atomic(predicate=db_is_not_sqlite):
            prediction_ser = PredictionSerializer(data=predictions, many=True)
            prediction_ser.is_valid(raise_exception=True)
            instances = prediction_ser.save()

            return instances

    def handle_single_prediction(self, task, response):
        """ """
        result = response['result']
        score = response.get('score')

        with conditional_atomic(predicate=db_is_not_sqlite):
            prediction_ser = PredictionSerializer(
                data={
                    'result': result,
                    'score': safe_float(score),
                    'model': self.pk,
                    'model_version': response.get('model_version', 'undefined'),
                    'task': task.pk,
                    'project': task.project.pk,
                    'cluster': response.get('cluster'),
                    'neighbors': response.get('neighbors'),
                    'mislabeling': safe_float(response.get('mislabeling', 0)),
                }
            )

            prediction_ser.is_valid(raise_exception=True)
            instance = prediction_ser.save()

            logger.debug(f'Prediction {instance} created')

            return instance

    def interactive_annotating(self, task, context=None, user=None):
        """Function to annotate a task interactively."""
        if not self.is_interactive:
            return {'errors': ['Model is not set for interactive preannotations']}

        options = {'user': user} if user else {}

        tasks_ser = InteractiveAnnotatingDataSerializer(
            [task], many=True, expand=['drafts', 'predictions', 'annotations'], context=options
        ).data

        return self.api.make_predictions(tasks=tasks_ser, project=self.project, context=context)


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
    """ """
    project = instance.project

    if project.model_version == instance.title:
        project.model_version = None
        project.save()


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
