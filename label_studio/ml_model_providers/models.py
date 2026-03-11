"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license."""

import logging
from typing import List

from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _
from tasks.models import PredictionMeta

logger = logging.getLogger(__name__)


class ModelProviders(models.TextChoices):
    OPENAI = 'OpenAI', _('OpenAI')
    AZURE_OPENAI = 'AzureOpenAI', _('AzureOpenAI')
    AZURE_AI_FOUNDRY = 'AzureAIFoundry', _('AzureAIFoundry')
    VERTEX_AI = 'VertexAI', _('VertexAI')
    GEMINI = 'Gemini', _('Gemini')
    ANTHROPIC = 'Anthropic', _('Anthropic')
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

    google_application_credentials = models.TextField(
        _('google application credentials'),
        null=True,
        blank=True,
        help_text='The content of GOOGLE_APPLICATION_CREDENTIALS json file',
    )

    google_project_id = models.CharField(
        _('google project id'), max_length=255, null=True, blank=True, help_text='Google project ID'
    )

    google_location = models.CharField(
        _('google location'), max_length=255, null=True, blank=True, help_text='Google project location'
    )

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

    is_internal = models.BooleanField(
        _('is_internal'),
        default=False,
        help_text='Whether the model provider connection is internal, not visible to the user',
        null=True,
        blank=True,
    )

    budget_limit = models.FloatField(
        _('budget_limit'),
        null=True,
        blank=True,
        default=None,
        help_text='Budget limit for the model provider connection (null if unlimited)',
    )

    budget_last_reset_date = models.DateTimeField(
        _('budget_last_reset_date'),
        null=True,
        blank=True,
        default=None,
        help_text='Date and time the budget was last reset',
    )

    budget_reset_period = models.CharField(
        _('budget_reset_period'),
        max_length=20,
        choices=[
            ('Monthly', 'Monthly'),
            ('Yearly', 'Yearly'),
        ],
        null=True,
        blank=True,
        default=None,
        help_text='Budget reset period for the model provider connection (null if not reset)',
    )

    budget_total_spent = models.FloatField(
        _('budget_total_spent'),
        null=True,
        blank=True,
        default=None,
        help_text='Tracked total budget spent for the given provider connection within the current budget period',
    )

    budget_alert_threshold = models.FloatField(
        _('budget_alert_threshold'),
        null=True,
        blank=True,
        default=None,
        help_text='Budget alert threshold for the given provider connection',
    )

    # Check if user is Admin or Owner
    # This will need to be updated if we ever use this model in LSO as `is_owner` and
    # `is_administrator` only exist in LSE
    def has_permission(self, user):
        return (
            user.is_administrator or user.is_owner or user.is_manager
        ) and user.active_organization_id == self.organization_id

    def update_budget_total_spent_from_predictions_meta(self, predictions_meta: List[PredictionMeta]):
        total_cost = sum(meta.total_cost or 0 for meta in predictions_meta)
        # opting for the goofy "self.budget_total_spent or 0" to avoid a db migration
        self.budget_total_spent = (self.budget_total_spent or 0) + total_cost
        self.save(update_fields=['budget_total_spent'])

    def has_reached_budget_limit(self):
        if (
            self.is_internal
            and self.budget_total_spent
            and self.budget_limit
            and self.budget_total_spent > self.budget_limit
        ):
            logger.info(
                f'Model connection {self.id} has reached the budget limit: '
                f'{self.budget_total_spent} > {self.budget_limit}'
            )
            return True
        return False
