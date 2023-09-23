"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import logging   # noqa: I001
from typing import Optional
from django.contrib.auth.models import Permission
from pydantic import BaseModel
from django.http import HttpRequest

import rules

logger = logging.getLogger(__name__)

class AllPermissions(BaseModel):
    organizations_create = 'organizations.create'
    organizations_view = 'organizations.view'
    organizations_change = 'organizations.change'
    organizations_delete = 'organizations.delete'
    organizations_invite = 'organizations.invite'
    projects_create = 'projects.create'
    projects_view = 'projects.view'
    projects_change = 'projects.change'
    projects_delete = 'projects.delete'
    tasks_create = 'tasks.create'
    tasks_view = 'tasks.view'
    tasks_change = 'tasks.change'
    tasks_delete = 'tasks.delete'
    annotations_create = 'annotations.create'
    annotations_view = 'annotations.view'
    annotations_change = 'annotations.change'
    annotations_delete = 'annotations.delete'
    actions_perform = 'actions.perform'
    predictions_any = 'predictions.any'
    avatar_any = 'avatar.any'
    labels_create = 'labels.create'
    labels_view = 'labels.view'
    labels_change = 'labels.change'
    labels_delete = 'labels.delete'

rulzz = {
    'organizations.create': rules.is_group_member('Etiquetador'),
    'organizations.view': rules.is_group_member('Etiquetador'),
    'organizations.change': rules.is_group_member('Etiquetador'),
    'organizations.delete': rules.is_group_member('Etiquetador'),
    'organizations.invite': rules.is_group_member('Etiquetador'),
    'projects.create': rules.is_group_member('Etiquetador'),
    'projects.view': rules.is_group_member('Etiquetador'),
    'projects.change': rules.is_group_member('Etiquetador'),
    'projects.delete': rules.is_group_member('Etiquetador'),
    'tasks.create': rules.is_group_member('Etiquetador'),
    'tasks.view': rules.is_group_member('Etiquetador'),
    'tasks.change': rules.is_group_member('Etiquetador'),
    'tasks.delete': rules.is_group_member('Etiquetador'),
    'annotations.create': rules.is_group_member('Etiquetador'),
    'annotations.view': rules.is_group_member('Etiquetador'),
    'annotations.change': rules.is_group_member('Etiquetador'),
    'annotations.delete': rules.is_group_member('Etiquetador'),
    'actions.perform': rules.is_group_member('Etiquetador'),
    'predictions.any': rules.is_group_member('Etiquetador'),
    'avatar.any': rules.is_group_member('Etiquetador'),
    'labels.create': rules.is_group_member('Etiquetador'),
    'labels.view': rules.is_group_member('Etiquetador'),
    'labels.change': rules.is_group_member('Etiquetador'),
    'labels.delete': rules.is_group_member('Etiquetador')
}

all_permissions = AllPermissions()

class ViewClassPermission(BaseModel):
    GET: Optional[str] = None
    PATCH: Optional[str] = None
    PUT: Optional[str] = None
    DELETE: Optional[str] = None
    POST: Optional[str] = None

    def check_permissions(self, request: HttpRequest):
        if request.method == 'GET':
            return rules.test_rule(self.GET, request.user)
        elif request.method == 'POST':
            return rules.test_rule(self.POST, request.user)
        elif request.method == 'PUT':
            return rules.test_rule(self.PUT, request.user)
        elif request.method == 'PATCH':
            return rules.test_rule(self.PATCH, request.user)
        elif request.method == 'DELETE':
            return rules.test_rule(self.DELETE, request.user)
        return False

def make_perm(name, pred, overwrite=True):
    if rules.perm_exists(name):
        if overwrite:
            rules.remove_perm(name)
        else:
            return
    rules.add_perm(name, pred)


for _, permission_name in all_permissions:
    make_perm(permission_name, rulzz[permission_name])
