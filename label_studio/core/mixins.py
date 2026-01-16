"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import logging

from django.db.models.query import QuerySet
from django.utils.functional import cached_property
from rest_framework.generics import get_object_or_404

logger = logging.getLogger(__name__)


class DummyModelMixin:
    def has_permission(self, user):
        return True


class GetParentObjectMixin:
    """
    Mixin for nested resources that fetches the parent object from URL kwargs.

    Provides `self.parent_object` (cached) based on `parent_queryset`.

    Attributes:
        parent_queryset: QuerySet for the parent model (required)
        parent_lookup_field: Field to filter on (default: lookup_field, usually 'pk')
        parent_lookup_url_kwarg: URL kwarg name (default: lookup_url_kwarg or lookup_field)

    Example:
        # URL: /api/organizations/<int:pk>/member-tags/<int:tag_pk>
        class MemberTagAPI(GetParentObjectMixin, viewsets.ModelViewSet):
            parent_queryset = Organization.objects.all()
            parent_lookup_url_kwarg = 'pk'      # org ID from URL
            lookup_url_kwarg = 'tag_pk'         # tag ID from URL

            def get_queryset(self):
                return MemberTag.objects.filter(organization=self.parent_object)
    """

    parent_queryset = None
    parent_lookup_field = None
    parent_lookup_url_kwarg = None

    @cached_property
    def parent_object(self):
        return self._get_parent_object()

    def _get_parent_lookup_field(self):
        return self.parent_lookup_field or self.lookup_field

    def _get_parent_lookup_url_kwarg(self):
        return self.parent_lookup_url_kwarg or self.lookup_url_kwarg or self.lookup_field

    def _get_parent_object(self):
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
        lookup_url_kwarg = self._get_parent_lookup_url_kwarg()

        assert lookup_url_kwarg in self.kwargs, (
            'Expected view %s to be called with a URL keyword argument '
            'named "%s". Fix your URL conf, or set the `.lookup_field` '
            'attribute on the view correctly.' % (self.__class__.__name__, lookup_url_kwarg)
        )

        lookup_field = self._get_parent_lookup_field()

        filter_kwargs = {lookup_field: self.kwargs[lookup_url_kwarg]}
        obj = get_object_or_404(queryset, **filter_kwargs)

        # May raise a permission denied
        self.check_object_permissions(self.request, obj)

        return obj
