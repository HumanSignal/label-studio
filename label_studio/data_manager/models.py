"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license."""

from data_manager.prepare_params import PrepareParams
from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _


class ViewBaseModel(models.Model):
    data = models.JSONField(_('data'), default=dict, null=True, help_text='Custom view data')
    ordering = models.JSONField(_('ordering'), default=dict, null=True, help_text='Ordering parameters')
    order = models.IntegerField(
        _('order'),
        default=0,
        null=True,
        help_text='Position of the tab, starting at the left in data manager and increasing as the tabs go left to right',
    )
    selected_items = models.JSONField(_('selected items'), default=dict, null=True, help_text='Selected items')
    filter_group = models.ForeignKey(
        'data_manager.FilterGroup', null=True, on_delete=models.SET_NULL, help_text='Groups of filters'
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name='%(app_label)s_%(class)ss',
        on_delete=models.CASCADE,
        help_text='User who made this view',
        null=True,
    )

    class Meta:
        ordering = ['order', 'id']
        indexes = [models.Index(fields=['project', 'order'])]
        abstract = True


class ProjectViewMixin(models.Model):
    project = models.ForeignKey(
        'projects.Project', related_name='views', on_delete=models.CASCADE, help_text='Project ID'
    )

    def has_permission(self, user):
        user.project = self.project  # link for activity log
        if self.project.organization == user.active_organization:
            return True
        return False

    class Meta:
        abstract = True


class View(ViewBaseModel, ProjectViewMixin):
    def get_prepare_tasks_params(self, add_selected_items=False):
        # Import here to avoid circular imports
        from data_manager.serializers import FilterGroupSerializer

        # convert filters to PrepareParams structure
        filters = None
        if self.filter_group:
            serializer = FilterGroupSerializer()
            filters = serializer.to_representation(self.filter_group)

        ordering = self.ordering
        if not ordering:
            ordering = []  # default empty json field is dict, but we need list

        selected_items = None
        if add_selected_items and self.selected_items:
            selected_items = self.selected_items

        return PrepareParams(
            project=self.project_id, ordering=ordering, filters=filters, data=self.data, selectedItems=selected_items
        )


class FilterGroup(models.Model):
    conjunction = models.CharField(_('conjunction'), max_length=1024, help_text='Type of conjunction')
    filters = models.ManyToManyField(
        'data_manager.Filter', related_name='filter_groups', help_text='Connected filters'
    )


class Filter(models.Model):
    # Optional reference to a parent filter. We only allow **one** level of nesting.
    parent = models.ForeignKey(
        'self',
        on_delete=models.CASCADE,
        related_name='children',
        null=True,
        blank=True,
        help_text='Optional parent filter to create one-level hierarchy (child filters are AND-merged with parent)',
    )

    # `index` is now only meaningful for **root** filters (parent is NULL)
    index = models.IntegerField(
        _('index'),
        null=True,
        blank=True,
        default=None,
        help_text='Display order among root filters only',
    )
    column = models.CharField(_('column'), max_length=1024, help_text='Field name')
    type = models.CharField(_('type'), max_length=1024, help_text='Field type')
    operator = models.CharField(_('operator'), max_length=1024, help_text='Filter operator')
    value = models.JSONField(_('value'), default=dict, null=True, help_text='Filter value')
