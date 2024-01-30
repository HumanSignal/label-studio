"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""

from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _


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
        return True   # TODO - which roles have access by default?
