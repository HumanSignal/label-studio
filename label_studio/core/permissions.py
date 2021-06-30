"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import logging
import rules

from pydantic import BaseModel
from typing import Optional

from django.shortcuts import redirect, reverse
from django.core.exceptions import PermissionDenied as HTMLPermissionDenied
from django.views.decorators.http import require_http_methods
from django.conf import settings
from django.apps import apps

from rest_framework.permissions import IsAuthenticated, SAFE_METHODS, BasePermission
from rest_framework.exceptions import PermissionDenied as DRFPermissionDenied

from core.utils.common import get_object_with_check_and_log
from users.models import User
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


class PermissionException(Exception):
    pass


class BasePermission(IsAuthenticated):
    def __call__(self, *args, **kwargs):
        return self.has_object_permission(*args, **kwargs)


class BaseRulesPermission(BasePermission):
    perm = None

    def has_object_permission(self, request, view, obj):
        if request.user.has_perm(self.perm, obj):
            return True


class CanViewTask(BaseRulesPermission):
    perm = 'tasks.view_task'


class CanChangeTask(BaseRulesPermission):
    perm = 'tasks.change_task'


class CanViewProject(BaseRulesPermission):
    perm = 'projects.view_project'


class CanChangeProject(BaseRulesPermission):
    perm = 'projects.change_project'


class IsBusiness(BasePermission):
    """ Permission checks for business account
    """
    def has_permission(self, request, view):
        # check is user authenticated
        if not BasePermission.has_permission(self, request, view):
            return False

        # check user is business and it's approved
        if not request.user.is_anonymous:
            return True

        return False


class IsSuperuser(BasePermission):
    """ Check: is superuser, god mode
    """
    def has_permission(self, request, view):
        user = request.user

        # each super user has read only access
        if user.is_superuser and hasattr(request, 'method') and request.method == 'GET':
            return True

        # super user heartex@heartex.net has full read-write access
        elif user.is_superuser and user.email == 'heidi@labelstud.io':
            return True

        return False

    def has_object_permission(self, request, view, obj):
        return self.has_permission(request, view)


class IsUserProjectOwner(BasePermission):
    """ Check: is user owner of this project, task or task annotation
    """
    def has_object_permission(self, request, view, obj):
        user = request.user
        project = project_from_obj(obj, request)
        if not project:
            return False

        org_pk = project.organization.pk

        # business
        if project.created_by == user:
            return True

        return False


""" ProjectTemplate """


class CanModifyUserOrReadOnly(IsBusiness):

    def has_object_permission(self, request, view, obj):
        if IsSuperuser()(request, view, obj):
            return True

        if not isinstance(obj, User):
            raise PermissionError(f'obj is not User: type {type(obj)} found')

        # read only
        if request.method in SAFE_METHODS:
            return True

        # user who creates this template can delete it
        if request.user == obj:
            return True

        return False
