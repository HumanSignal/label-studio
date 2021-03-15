"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import logging
import rules

from django.shortcuts import redirect, reverse
from django.core.exceptions import PermissionDenied as HTMLPermissionDenied
from django.views.decorators.http import require_http_methods
from django.conf import settings
from django.apps import apps

from rest_framework.permissions import IsAuthenticated, SAFE_METHODS
from rest_framework.exceptions import PermissionDenied as DRFPermissionDenied

from core.utils.common import get_object_with_check_and_log, request_permissions_add, get_project
from projects.models import Project, ProjectTemplate
from tasks.models import Task, Annotation
from users.models import User
logger = logging.getLogger(__name__)


@rules.predicate
def is_project_owner(user, obj):
    return get_project(obj).created_by == user


@rules.predicate
def is_annotation_creator(user, obj):
    if isinstance(obj, Annotation):
        if not obj.task.project.show_annotation_history:
            return False
        return obj.completed_by == user
    return False


def make_perm(name, pred):
    if rules.perm_exists(name):
        rules.remove_perm(name)
    rules.add_perm(name, pred)


make_perm('projects.add_project', rules.is_authenticated)
make_perm('projects.view_project', rules.is_authenticated)
make_perm('projects.change_project', rules.is_authenticated)
make_perm('projects.delete_project', rules.is_authenticated)

make_perm('tasks.view_task', rules.is_authenticated)
make_perm('tasks.change_task', rules.is_authenticated)
make_perm('tasks.delete_task', rules.is_authenticated)

make_perm('annotations.view_annotation', rules.is_authenticated)
make_perm('annotations.change_annotation', rules.is_authenticated)
make_perm('annotations.delete_annotation', rules.is_authenticated)

make_perm('projects_nav', rules.is_authenticated)


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


""" Helpers """


def view_with_auth(http_method_names, permission_names):
    """ Decorator combining require_http_methods and check_auth into one line

    :param http_method_names: http methods ['GET', 'POST', ...]
    :param permission_names: DRF auth classes [IsAuthenticated, IsBusiness, ...]
    :return: wrapped into decorator function
    """

    def check_auth(func):
        """ Check authentication based on DRF permission classes (IsAuthenticated, IsBusiness, etc)
        """
        def wrapper(request, *args, **kwargs):
            checks = [name().has_permission(request, None) for name in permission_names]
            # auth is ok
            if any(checks):
                return func(request, *args, **kwargs)
            # auth is bad
            else:
                redirect_name = 'expert-login' if request.path.startswith('/expert') else 'user-login'
                redirect_path = reverse(redirect_name) + '?next=' + request.path
                return raise_auth_denied('Authentication credentials were not provided', request, redirect_path)

        return wrapper

    def decorator(func):
        check_methods = require_http_methods(http_method_names)
        func = check_auth(func)
        func = check_methods(func)
        return func

    return decorator


def check_permissions(request, obj, permission_class):
    approved = permission_class().has_object_permission(request, None, obj)
    if not approved:
        raise_auth_denied('Access denied', request)
    return True


def check_object_permissions(request, obj, permission_name):
    if request.user.has_perm(permission_name, obj):
        return True
    raise_auth_denied('Access denied', request)


def get_object_with_permissions(request, class_name, pk, permission_name):
    assert isinstance(permission_name, str)
    obj = get_object_with_check_and_log(request, class_name, pk=pk)
    check_object_permissions(request, obj, permission_name)
    return obj


def raise_auth_denied(msg, request, redirect_path=''):
    # HTML request
    if 'text/html' in request.META.get('HTTP_ACCEPT', 'text/html'):
        if redirect_path:
            return redirect(redirect_path)
        else:
            raise HTMLPermissionDenied(msg)

    # DRF request
    else:
        raise DRFPermissionDenied(msg)


def raise_business_not_approved(request):
    msg = 'Your account is not allowed by administrator. ' \
          'Write us an email to approve your account: ' \
          '<a href="mailto:hi@heartex.net">hi@heartex.ai</a>'
    return raise_auth_denied(msg, request)


def project_from_obj(obj, request):
    """ Get project from task, annotation or other objects

    :param obj: task, annotation
    :param request: request to store project
    :return: Project, None or False
    """
    # detect object type and get project
    if isinstance(obj, Project):
        project = obj
    elif isinstance(obj, Task):
        project = obj.project
    elif isinstance(obj, Annotation):
        project = obj.task.project
    elif not obj:
        return False
    else:
        raise PermissionError(f'Incorrect obj passed to project_from_obj: {str(obj)}')

    request_permissions_add(request, 'project', project)
    return project
