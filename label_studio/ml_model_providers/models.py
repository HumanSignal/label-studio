"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""

from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _


class ModelProviderConnection(models.Model):

    class ModelProviders(models.TextChoices):
        OPENAI = 'OpenAI', _('OpenAI')


    class ModelProviderConnectionScopes(models.TextChoices):
        ORG = 'Org', _('Organization')
        USER = 'User', _('User')
        MODEL = 'Model', _('Model')


    provider = models.CharField(
        max_length=10,
        choices=ModelProviders.choices,
        default=ModelProviders.OPENAI
    )

    api_key = models.TextField(
        _('api_key'),
        null=True,
        blank=True,
        help_text='Model provider API key'
    )

    scope = models.CharField(
        max_length=10,
        choices=ModelProviderConnectionScopes.choices,
        default=ModelProviderConnectionScopes.ORG
    )

    organization = models.ForeignKey(
        'organizations.Organization', on_delete=models.CASCADE, related_name='model_provider_connections', null=True
    )

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, related_name='created_model_provider_connections', on_delete=models.SET_NULL, null=True
    )

    # Future work - add foreign key for modelinterface / modelinstance

    created_at = models.DateTimeField(_('created at'), auto_now_add=True)

    updated_at = models.DateTimeField(_('updated at'), auto_now=True)

    def has_permission(self, user):
        if user.active_organization == self.organization:
            return True
        else:
            return False
