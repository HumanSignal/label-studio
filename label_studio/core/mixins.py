"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import logging

from django.db.models.query import QuerySet
from rest_framework.generics import get_object_or_404
from rules.contrib.views import PermissionRequiredMixin
from core.permissions import ViewClassPermission
from django.views.generic.edit import BaseCreateView

logger = logging.getLogger(__name__)


class PermissionCheckMixin(PermissionRequiredMixin):
    def get_permission_object(self):
        """
        Override this method to provide the object to check for permission
        against. By default uses ``self.get_object()`` as provided by
        ``SingleObjectMixin``. Returns None if there's no ``get_object``
        method.
        """
        if not isinstance(self, BaseCreateView):
            # We do NOT want to call get_object in a BaseCreateView, see issue #85
            if hasattr(self, "get_object") and callable(self.get_object):
                # Requires SingleObjectMixin or equivalent ``get_object`` method
                return self.get_object()
        return None

    def get_permission_required(self):
        """
        Override this method to provide the permissions required for the view.
        Returns None if there are no permissions required.
        """
        if isinstance(self.permission_required, ViewClassPermission):
            # Use the permissions defined in ViewClassPermission for each HTTP method
            action = self.request.method.upper()
            return getattr(self.permission_required, action, None)
        else:
            # Use the original permission_required behavior
            return super().get_permission_required()

    def has_permission(self):
        obj = self.get_permission_object()
        perms = self.get_permission_required()
        return self.request.user.has_perms(perms, obj)


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
