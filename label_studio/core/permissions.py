"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import logging   # noqa: I001
from typing import Optional

from pydantic import BaseModel
from typing import ClassVar

import rules

logger = logging.getLogger(__name__)


class AllPermissions(BaseModel):
    organizations_create : ClassVar[str] = 'organizations.create'
    organizations_view : ClassVar[str] = 'organizations.view'
    organizations_change : ClassVar[str] = 'organizations.change'
    organizations_delete : ClassVar[str] = 'organizations.delete'
    organizations_invite : ClassVar[str] = 'organizations.invite'
    projects_create : ClassVar[str] = 'projects.create'
    projects_view : ClassVar[str] = 'projects.view'
    projects_change : ClassVar[str] = 'projects.change'
    projects_delete : ClassVar[str] = 'projects.delete'
    tasks_create : ClassVar[str] = 'tasks.create'
    tasks_view : ClassVar[str] = 'tasks.view'
    tasks_change : ClassVar[str] = 'tasks.change'
    tasks_delete : ClassVar[str] = 'tasks.delete'
    annotations_create : ClassVar[str] = 'annotations.create'
    annotations_view : ClassVar[str] = 'annotations.view'
    annotations_change : ClassVar[str] = 'annotations.change'
    annotations_delete : ClassVar[str] = 'annotations.delete'
    actions_perform : ClassVar[str] = 'actions.perform'
    predictions_any : ClassVar[str] = 'predictions.any'
    avatar_any : ClassVar[str] = 'avatar.any'
    labels_create : ClassVar[str] = 'labels.create'
    labels_view : ClassVar[str] = 'labels.view'
    labels_change : ClassVar[str] = 'labels.change'
    labels_delete : ClassVar[str] = 'labels.delete'
    models_create : ClassVar[str] = 'models.create'
    models_view : ClassVar[str] = 'models.view'
    models_change : ClassVar[str] = 'models.change'
    models_delete : ClassVar[str] = 'models.delete'
    model_provider_connection_create : ClassVar[str] = 'model_provider_connection.create'
    model_provider_connection_view : ClassVar[str] = 'model_provider_connection.view'
    model_provider_connection_change : ClassVar[str] = 'model_provider_connection.change'
    model_provider_connection_delete : ClassVar[str] = 'model_provider_connection.delete'


all_permissions = AllPermissions()


class ViewClassPermission(BaseModel):
    GET: Optional[str] = None
    PATCH: Optional[str] = None
    PUT: Optional[str] = None
    DELETE: Optional[str] = None
    POST: Optional[str] = None


def make_perm(name, pred, overwrite=False):
    if rules.perm_exists(name):
        if overwrite:
            rules.remove_perm(name)
        else:
            return
    rules.add_perm(name, pred)


for _, permission_name in all_permissions:
    make_perm(permission_name, rules.is_authenticated)
