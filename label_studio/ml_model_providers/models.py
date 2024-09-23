"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _


class ModelProviders(models.TextChoices):
    OPENAI = 'OpenAI', _('OpenAI')
    AZURE_OPENAI = 'AzureOpenAI', _('AzureOpenAI')
    CUSTOM = 'Custom', _('Custom')


class ModelProviderConnectionScopes(models.TextChoices):
    ORG = 'Organization', _('Organization')
    USER = 'User', _('User')
    MODEL = 'Model', _('Model')


class ModelProviderConnection(models.Model):

    provider = models.CharField(max_length=255, choices=ModelProviders.choices, default=ModelProviders.OPENAI)

    api_key = models.TextField(_('api_key'), null=True, blank=True, help_text='Model provider API key')

    auth_token = models.TextField(_('auth_token'), null=True, blank=True, help_text='Model provider Auth token')

    deployment_name = models.CharField(max_length=512, null=True, blank=True, help_text='Azure OpenAI deployment name')

    endpoint = models.CharField(max_length=512, null=True, blank=True, help_text='Azure OpenAI endpoint')

    cached_available_models = models.CharField(
        max_length=4096, null=True, blank=True, help_text='List of available models from the provider'
    )

    scope = models.CharField(
        max_length=255, choices=ModelProviderConnectionScopes.choices, default=ModelProviderConnectionScopes.ORG
    )

    organization = models.ForeignKey(
        'organizations.Organization', on_delete=models.CASCADE, related_name='model_provider_connections', null=True
    )

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name='created_model_provider_connections',
        on_delete=models.SET_NULL,
        null=True,
    )

    # Future work - add foreign key for modelinterface / modelinstance

    created_at = models.DateTimeField(_('created at'), auto_now_add=True)

    updated_at = models.DateTimeField(_('updated at'), auto_now=True)

    # Check if user is Admin or Owner
    # This will need to be updated if we ever use this model in LSO as `is_owner` and
    # `is_administrator` only exist in LSE
    def has_permission(self, user):
        return (
            user.is_administrator or user.is_owner or user.is_manager
        ) and user.active_organization_id == self.organization_id
