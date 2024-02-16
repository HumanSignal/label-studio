"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""

from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _
from ml_model_providers.models import ModelProviderConnection
from projects.models import Project


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

    def has_permission(self, user):
        return user.active_organization == self.organization


class ModelVersion(models.Model):
    class Meta:
        abstract = True

    title = models.CharField(_('title'), max_length=500, null=False, blank=False, help_text='Model name')

    parent_model = models.ForeignKey(ModelInterface, related_name='model_versions', on_delete=models.CASCADE)

    # TODO add field containing model run IDs

    prompt = models.TextField(_('prompt'), null=False, blank=False, help_text='Prompt to execute')


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
    
    class FileType(models.TextChoices):
        INPUT = 'Input', _('Input')
        OUTPUT = 'Output', _('Output')

    class ProjectStatus(models.TextChoices):
        PENDING = 'Pending', _('Pending')
        COMPLETED = 'Completed', ('Completed')
        FAILED = 'Failed', ('Failed')
        CANCELED = 'CANCELED', ('CANCELED')

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
    status = models.CharField(max_length=255, choices=ProjectStatus.choices, default=ProjectStatus.PENDING)


    created_at = models.DateTimeField(_('created at'), auto_now_add=True)

    triggered_at = models.DateTimeField(_('triggered at'))

    completed_at = models.DateTimeField(_('completed at'), null=True, default=None)

    
    #todo may need to clean up in future
    @property
    def get_input_file_name(self):
        return f'{self.project.id}_{self.model_version.pk}_{self.pk}/input_tasks.csv'
    
    @property
    def get_output_file_name(self):
        return f'{self.project.id}_{self.model_version.pk}_{self.pk}/.csv'