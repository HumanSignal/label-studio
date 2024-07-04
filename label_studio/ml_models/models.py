"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license."""

import logging

from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _
from ml_model_providers.models import ModelProviderConnection
from projects.models import Project
from rest_framework.exceptions import ValidationError
from tasks.models import Annotation, Prediction

logger = logging.getLogger(__name__)


def validate_string_list(value):
    if not value:
        raise ValidationError('list should not be empty')
    if not isinstance(value, list):
        raise ValidationError('Value must be a list')
    if not all(isinstance(item, str) for item in value):
        raise ValidationError('All items in the list must be strings')


class ModelInterface(models.Model):
    title = models.CharField(_('title'), max_length=500, null=False, blank=False, help_text='Model name')

    description = models.TextField(_('description'), null=True, blank=True, help_text='Model description')

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, related_name='created_models', on_delete=models.SET_NULL, null=True
    )

    created_at = models.DateTimeField(_('created at'), auto_now_add=True)

    updated_at = models.DateTimeField(_('updated at'), auto_now=True)

    organization = models.ForeignKey(
        'organizations.Organization', on_delete=models.CASCADE, related_name='model_interfaces', null=True
    )

    input_fields = models.JSONField(default=list, validators=[validate_string_list])

    output_classes = models.JSONField(default=list, validators=[validate_string_list])

    associated_projects = models.ManyToManyField('projects.Project', blank=True)

    def has_permission(self, user):
        return user.active_organization == self.organization


class ModelVersion(models.Model):
    class Meta:
        abstract = True

    title = models.CharField(_('title'), max_length=500, null=False, blank=False, help_text='Model name')

    parent_model = models.ForeignKey(ModelInterface, related_name='model_versions', on_delete=models.CASCADE)

    prompt = models.TextField(_('prompt'), null=False, blank=False, help_text='Prompt to execute')

    @property
    def full_title(self):
        return f'{self.parent_model.title}__{self.title}'

    def delete(self, *args, **kwargs):
        """
        Deletes Predictions associated with ModelVersion
        """
        model_runs = ModelRun.objects.filter(model_version=self.id)
        for model_run in model_runs:
            model_run.delete_predictions()
        super().delete(*args, **kwargs)


class ThirdPartyModelVersion(ModelVersion):
    provider = models.CharField(
        max_length=255,
        choices=ModelProviderConnection.ModelProviders.choices,
        default=ModelProviderConnection.ModelProviders.OPENAI,
        help_text='The model provider to use e.g. OpenAI',
    )

    provider_model_id = models.CharField(
        max_length=255,
        blank=False,
        null=False,
        help_text='The model ID to use within the given provider, e.g. gpt-3.5',
    )

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name='created_third_party_model_versions',
        on_delete=models.SET_NULL,
        null=True,
    )

    created_at = models.DateTimeField(_('created at'), auto_now_add=True)

    updated_at = models.DateTimeField(_('updated at'), auto_now=True)

    organization = models.ForeignKey(
        'organizations.Organization', on_delete=models.CASCADE, related_name='third_party_model_versions', null=True
    )

    def has_permission(self, user):
        return user.active_organization == self.organization


class ModelRun(models.Model):
    class ProjectSubset(models.TextChoices):
        ALL = 'All', _('All')
        HASGT = 'HasGT', _('HasGT')
        SAMPLE = 'Sample', _('Sample')

    class FileType(models.TextChoices):
        INPUT = 'Input', _('Input')
        OUTPUT = 'Output', _('Output')

    class ModelRunStatus(models.TextChoices):
        PENDING = 'Pending', _('Pending')
        INPROGRESS = 'InProgress', _('InProgress')
        COMPLETED = 'Completed', ('Completed')
        FAILED = 'Failed', ('Failed')
        CANCELED = 'Canceled', ('Canceled')

    organization = models.ForeignKey(
        'organizations.Organization', on_delete=models.CASCADE, related_name='model_runs', null=True
    )

    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='model_runs')

    model_version = models.ForeignKey(ThirdPartyModelVersion, on_delete=models.CASCADE, related_name='model_runs')

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name='model_runs',
        on_delete=models.SET_NULL,
        null=True,
    )

    project_subset = models.CharField(max_length=255, choices=ProjectSubset.choices, default=ProjectSubset.HASGT)

    status = models.CharField(max_length=255, choices=ModelRunStatus.choices, default=ModelRunStatus.PENDING)

    job_id = models.CharField(
        max_length=255,
        null=True,
        blank=True,
        default=None,
        help_text='Job ID for inference job for a ModelRun e.g. Adala job ID',
    )

    total_predictions = models.IntegerField(_('total predictions'), default=0)

    total_correct_predictions = models.IntegerField(_('total correct predictions'), default=0)

    total_tasks = models.IntegerField(_('total tasks'), default=0)

    created_at = models.DateTimeField(_('created at'), auto_now_add=True)

    triggered_at = models.DateTimeField(_('triggered at'), null=True, default=None)

    predictions_updated_at = models.DateTimeField(_('predictions updated at'), null=True, default=None)

    completed_at = models.DateTimeField(_('completed at'), null=True, default=None)

    def delete_predictions(self):
        """
        Deletes any predictions that have originated from a ModelRun

        Executing a raw SQL query here for speed. This ignores any foreign key relationships
        so if another model has a Prediction fk and set to on_delete=CASCADE for example,
        it will not take affect. The only relationship like this that currently exists
        is in Annotation.parent_prediction, which we are handling here
        """
        predictions = Prediction.objects.filter(model_run=self.id)
        prediction_ids = [p.id for p in predictions]
        # to delete all dependencies where predictions are foreign keys.
        Annotation.objects.filter(parent_prediction__in=prediction_ids).update(parent_prediction=None)
        try:
            from stats.models import PredictionStats

            prediction_stats_to_be_deleted = PredictionStats.objects.filter(prediction_to__in=prediction_ids)
            prediction_stats_to_be_deleted.delete()
        except Exception as e:
            logger.info(f'PredictionStats model does not exist , exception:{e}')
        predictions._raw_delete(predictions.db)

    def delete(self, *args, **kwargs):
        """
        Deletes Predictions associated with ModelRun
        """
        self.delete_predictions()
        super().delete(*args, **kwargs)
