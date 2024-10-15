"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import logging

from django.db.models.query import QuerySet
from rest_framework.generics import get_object_or_404

logger = logging.getLogger(__name__)


class DummyModelMixin:
    def has_permission(self, user):
        return True


class GetParentObjectMixin:
    parent_queryset = None

    def get_parent_object(self):
        """
        The same as get_object method from DRF, but for the parent object
        For example if you want to get project inside /api/projects/ID/tasks handler
        """
        assert self.parent_queryset is not None, (
            "'%s' should include a `parent_queryset` attribute, " % self.__class__.__name__
        )
        queryset = self.parent_queryset
        if isinstance(queryset, QuerySet):
            # Ensure queryset is re-evaluated on each request.
            queryset = queryset.all()

        # Perform the lookup filtering.
        lookup_url_kwarg = self.lookup_url_kwarg or self.lookup_field

        assert lookup_url_kwarg in self.kwargs, (
            'Expected view %s to be called with a URL keyword argument '
            'named "%s". Fix your URL conf, or set the `.lookup_field` '
            'attribute on the view correctly.' % (self.__class__.__name__, lookup_url_kwarg)
        )

        filter_kwargs = {self.lookup_field: self.kwargs[lookup_url_kwarg]}
        obj = get_object_or_404(queryset, **filter_kwargs)

        # May raise a permission denied
        self.check_object_permissions(self.request, obj)

        return obj
