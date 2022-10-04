"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import logging

logger = logging.getLogger(__name__)


class DummyModelMixin():
    def has_permission(self, user):
        return True


class CreateOnlyFieldsMixin:
    """Lets you define fields that are only writeable on create"""
    def get_extra_kwargs(self):
        extra_kwargs = super().get_extra_kwargs()
        if getattr(self.context.get('view'), 'action', '') in ['update', 'partial_update']:
            return self._set_create_only_fields(extra_kwargs)
        return extra_kwargs

    def _set_create_only_fields(self, extra_kwargs):
        create_only_fields = getattr(self.Meta, 'create_only_fields', [])
        for field_name in create_only_fields:
            kwargs = extra_kwargs.get(field_name, {})
            kwargs['read_only'] = True
            extra_kwargs[field_name] = kwargs

        return extra_kwargs
