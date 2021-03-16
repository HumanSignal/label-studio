"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
from django.db import models
from django.conf import settings
from django.utils.translation import gettext_lazy as _

from data_manager.prepare_params import PrepareParams


class View(models.Model):
    project = models.ForeignKey(
        "projects.Project", related_name="views", on_delete=models.CASCADE, help_text="Project ID"
    )
    data = models.JSONField(_("data"), default=dict, null=True, help_text="Custom view data")
    ordering = models.JSONField(_("ordering"), default=dict, null=True, help_text="Ordering parameters")
    selected_items = models.JSONField(_("selected items"), default=dict, null=True, help_text="Selected items")
    filter_group = models.ForeignKey(
        "data_manager.FilterGroup", null=True, on_delete=models.SET_NULL, help_text="Groups of filters"
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="views",
        on_delete=models.CASCADE,
        help_text="User who made this view",
        null=True,
    )

    def get_prepare_tasks_params(self, add_selected_items=False):
        # convert filters to PrepareParams structure
        filters = None
        if self.filter_group:
            items = []
            for f in self.filter_group.filters.all():
                items.append(
                    dict(
                        filter=f.column,
                        operator=f.operator,
                        type=f.type,
                        value=f.value,
                    )
                )
            filters = dict(conjunction=self.filter_group.conjunction, items=items)

        ordering = self.ordering
        if not ordering:
            ordering = []  # default empty json field is dict, but we need list

        selected_items = None
        if add_selected_items and self.selected_items:
            selected_items = self.selected_items

        return PrepareParams(project=self.project_id, ordering=ordering, filters=filters,
                             selectedItems=selected_items)


class FilterGroup(models.Model):
    conjunction = models.CharField(_("conjunction"), max_length=1024, help_text="Type of conjunction")
    filters = models.ManyToManyField(
        "data_manager.Filter", related_name="filter_groups", help_text="Connected filters"
    )


class Filter(models.Model):
    index = models.IntegerField(_("index"), default=0, help_text="To keep filter order")
    column = models.CharField(_("column"), max_length=1024, help_text="Field name")
    type = models.CharField(_("type"), max_length=1024, help_text="Field type")
    operator = models.CharField(_("operator"), max_length=1024, help_text="Filter operator")
    value = models.JSONField(_("value"), default=dict, null=True, help_text="Filter value")
