"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license."""

import enum

from core.permissions import ViewClassPermission
from rest_framework.exceptions import NotFound, PermissionDenied
from rest_framework.permissions import BasePermission

_MISSING = object()
_WEBHOOK_PERMISSIONS = frozenset({'webhooks.view', 'webhooks.change'})


class Action(enum.Enum):
    """Business action selected from a declared permission string.

    Responsibility: name the check a view must pass. Callers compare these
    members; they are not Django permission strings.

    Boundary: HTTP methods do not imply an action. An unmapped string never
    becomes one of these values.
    """

    ACCESS = 'ACCESS'
    MANAGE = 'MANAGE'
    CREATE_PROJECT = 'CREATE_PROJECT'
    ORG_OWNER = 'ORG_OWNER'
    SELF = 'SELF'
    ANNOTATION_WRITE = 'ANNOTATION_WRITE'


PERMISSION_ACTIONS = {
    'projects.view': Action.ACCESS,
    'tasks.view': Action.ACCESS,
    'annotations.view': Action.ACCESS,
    'annotations.create': Action.ACCESS,
    'views.view': Action.ACCESS,
    'projects.change': Action.MANAGE,
    'projects.delete': Action.MANAGE,
    'projects.reset_cache': Action.MANAGE,
    'tasks.create': Action.MANAGE,
    'tasks.change': Action.MANAGE,
    'tasks.delete': Action.MANAGE,
    'views.create': Action.MANAGE,
    'views.change': Action.MANAGE,
    'views.delete': Action.MANAGE,
    'views.reset': Action.MANAGE,
    'actions.perform': Action.MANAGE,
    'predictions.any': Action.MANAGE,
    'storages.view': Action.MANAGE,
    'storages.change': Action.MANAGE,
    'storages.sync': Action.MANAGE,
    'labels.create': Action.MANAGE,
    'labels.view': Action.MANAGE,
    'labels.change': Action.MANAGE,
    'labels.delete': Action.MANAGE,
    'models.create': Action.MANAGE,
    'models.view': Action.MANAGE,
    'models.change': Action.MANAGE,
    'models.delete': Action.MANAGE,
    'webhooks.view': Action.MANAGE,
    'webhooks.change': Action.MANAGE,
    'projects.create': Action.CREATE_PROJECT,
    'organizations.change': Action.ORG_OWNER,
    'organizations.delete': Action.ORG_OWNER,
    'organizations.invite': Action.ORG_OWNER,
    'organizations.create': Action.ORG_OWNER,
    'model_provider_connection.create': Action.ORG_OWNER,
    'model_provider_connection.view': Action.ORG_OWNER,
    'model_provider_connection.change': Action.ORG_OWNER,
    'model_provider_connection.delete': Action.ORG_OWNER,
    'organizations.view': Action.SELF,
    'users.token.any': Action.SELF,
    'avatar.any': Action.SELF,
    'annotations.change': Action.ANNOTATION_WRITE,
    'annotations.delete': Action.ANNOTATION_WRITE,
}


PUBLIC_VIEWS = frozenset(
    {
        'projects.api.LabelConfigValidateAPI',
        'webhooks.api.WebhookInfoAPI',
        'core.views.TriggerAPIError',
    }
)


def resolve_permission_name(view, request) -> str | None:
    """Return the permission string declared for this view and request.

    Responsibility: read the current DRF ``@action`` declaration, then a
    string ``permission_required``, then the current method on
    ``ViewClassPermission``.

    Boundary: returns None when none of those three declare a string. Does not
    infer an action from the HTTP method and does not call ``user.has_perm``.
    """
    declared = _action_declaration(view, request)
    if isinstance(declared, str):
        return declared
    if isinstance(declared, ViewClassPermission):
        return _permission_for_method(declared, request)

    required = getattr(view, 'permission_required', None)
    if isinstance(required, str):
        return required
    if isinstance(required, ViewClassPermission):
        return _permission_for_method(required, request)
    return None


def project_actions_api_action(action_id: str | None) -> Action | None:
    """Map a ``ProjectActionsAPI`` action id to the action it must pass.

    Responsibility: ``next_task`` is project access. Every other registered
    data-manager action is management. A missing id is denied. An unknown id
    is management so the view can answer 400; it is not a hidden project.

    Boundary: this exception lives here so views do not branch on
    ``next_task``. ``None`` means deny. Does not call ``user.has_perm``.
    """
    if not action_id:
        return None
    if action_id == 'next_task':
        return Action.ACCESS
    return Action.MANAGE


def webhook_permission_action(project_id) -> Action:
    """Map a webhook ``project_id`` to organization-owner or project-manage.

    Responsibility: an empty ``project_id`` is an organization webhook and
    requires the organization owner. Any other id stays on the table mapping,
    which is management of that project.

    Boundary: does not decide whether this user passes. Callers still run
    ``ensure_org_owner`` or ``ensure_project_manage``.
    """
    if project_id is None or project_id == '':
        return Action.ORG_OWNER
    return Action.MANAGE


def ensure_project_visible(user, project) -> None:
    """Raise ``NotFound`` when the user cannot open this project.

    Responsibility: the 404 gate in front of project data.

    Boundary: a visible member passes, including a member who cannot manage.
    An inactive account, another organization, or a disabled membership is
    ``NotFound``. Staff and superuser flags are ignored. Does not call
    ``user.has_perm``.
    """
    from projects.access import can_access_project

    if not can_access_project(user, project):
        raise NotFound()


def ensure_project_manage(user, project) -> None:
    """Raise ``NotFound`` when the project is hidden, then ``PermissionDenied``.

    Responsibility: management checks that do not reveal a project the user
    cannot already open.

    Boundary: visibility is the same 404 test as ``ensure_project_visible``.
    A member who can annotate but not manage gets ``PermissionDenied``. Does
    not call ``user.has_perm``.
    """
    from projects.access import can_manage_project

    ensure_project_visible(user, project)
    if not can_manage_project(user, project):
        raise PermissionDenied()


def ensure_can_create_project(user) -> None:
    """Raise ``PermissionDenied`` unless the user may create a project.

    Responsibility: the organization-level create check.

    Boundary: delegates to ``can_create_project``. There is no project id to
    hide, so a non-owner is 403. Does not call ``user.has_perm``.
    """
    from projects.access import can_create_project

    if not can_create_project(user):
        raise PermissionDenied()


def ensure_org_owner(user, organization) -> None:
    """Allow only the owner of the given organization.

    Responsibility: organization-level administration, including webhooks that
    are not bound to a project.

    Boundary: an inactive account, a missing organization, a mismatched
    ``active_organization``, or a missing non-deleted ``OrganizationMember``
    is ``NotFound``. ``active_organization`` is not membership. A live member
    who is not ``organization.created_by`` is ``PermissionDenied``. Does not
    call ``user.has_perm``.
    """
    from projects.access import user_is_active_account

    org_id = getattr(organization, 'pk', None)
    if org_id is None or not user_is_active_account(user):
        raise NotFound()
    if not _has_live_organization_membership(user, org_id):
        raise NotFound()
    if getattr(user, 'active_organization_id', None) != org_id:
        raise NotFound()
    if getattr(organization, 'created_by_id', None) != getattr(user, 'id', None):
        raise PermissionDenied()


class ProjectActionPermission(BasePermission):
    """Turn a declared permission string into a project action check.

    Responsibility: deny unmapped declarations, apply the webhook and
    ``ProjectActionsAPI`` exceptions, and enforce the mapped action when the
    target object is known.

    Boundary: does not call ``user.has_perm``. A missing mapping is denied.
    Project visibility failures raise ``NotFound``; a visible project with the
    wrong action raises ``PermissionDenied``. This class is installed on
    ``DEFAULT_PERMISSION_CLASSES``.
    """

    def has_permission(self, request, view):
        if _is_public_view(view):
            return True
        action = _resolve_request_action(view, request, obj=None)
        if action is None:
            return False
        if action is Action.CREATE_PROJECT:
            from projects.access import can_create_project

            return can_create_project(getattr(request, 'user', None))
        if action is Action.ORG_OWNER:
            user = getattr(request, 'user', None)
            # Unauthenticated requests stay False so the auth class can return 401.
            if not getattr(user, 'is_authenticated', False):
                return False
            ensure_org_owner(user, getattr(user, 'active_organization', None))
        if action is Action.SELF:
            user = getattr(request, 'user', None)
            return bool(getattr(user, 'is_authenticated', False))
        return True

    def has_object_permission(self, request, view, obj):
        if _is_public_view(view):
            return True
        action = _resolve_request_action(view, request, obj)
        if action is None:
            return False
        if resolve_permission_name(view, request) in ('labels.change', 'labels.delete'):
            from labels_manager.models import Label

            if isinstance(obj, Label):
                _enforce_label_write(getattr(request, 'user', None), obj)
                return True
        _enforce(getattr(request, 'user', None), action, obj)
        return True


def _permission_for_method(declared: ViewClassPermission, request) -> str | None:
    method = getattr(request, 'method', None)
    if not method:
        return None
    value = getattr(declared, str(method).upper(), None)
    if isinstance(value, str):
        return value
    return None


def _action_name(view, request) -> str | None:
    name = getattr(view, 'action', None)
    if name:
        return name
    action_map = getattr(view, 'action_map', None) or {}
    method = getattr(request, 'method', None)
    if method:
        return action_map.get(str(method).lower())
    return None


def _action_declaration(view, request):
    action_name = _action_name(view, request)
    if not action_name:
        return None
    handler = getattr(view, action_name, None)
    if handler is None:
        return None
    func = getattr(handler, '__func__', handler)
    kwargs = getattr(func, 'kwargs', None)
    if not isinstance(kwargs, dict) or 'permission_required' not in kwargs:
        return None
    return kwargs['permission_required']


def _view_qualname(view) -> str:
    cls = view if isinstance(view, type) else view.__class__
    return f'{cls.__module__}.{cls.__name__}'


def _is_public_view(view) -> bool:
    return _view_qualname(view) in PUBLIC_VIEWS


def _is_project_actions_api(view) -> bool:
    from data_manager.api import ProjectActionsAPI

    return isinstance(view, ProjectActionsAPI)


def _query_value(request, key):
    params = getattr(request, 'query_params', None)
    if params is None:
        params = getattr(request, 'GET', None)
    if params is None:
        return None
    return params.get(key)


def _webhook_project_id(request, obj):
    from webhooks.models import Webhook

    if isinstance(obj, Webhook):
        return obj.project_id
    data = getattr(request, 'data', None)
    if isinstance(data, dict) and 'project' in data:
        value = data.get('project')
        if value in (None, ''):
            return None
        return value
    return _MISSING


def _resolve_request_action(view, request, obj):
    if _is_project_actions_api(view) and str(getattr(request, 'method', '')).upper() == 'POST':
        return project_actions_api_action(_query_value(request, 'id'))

    name = resolve_permission_name(view, request)
    if name in _WEBHOOK_PERMISSIONS:
        project_id = _webhook_project_id(request, obj)
        if project_id is not _MISSING:
            return webhook_permission_action(project_id)
    if name is None:
        return None
    return PERMISSION_ACTIONS.get(name)


def _project_of(obj):
    from projects.models import Project

    if isinstance(obj, Project):
        return obj
    project = getattr(obj, 'project', None)
    if isinstance(project, Project):
        return project
    task = getattr(obj, 'task', None)
    if task is not None:
        project = getattr(task, 'project', None)
        if isinstance(project, Project):
            return project
    from labels_manager.models import Label, LabelLink

    if isinstance(obj, LabelLink):
        project = getattr(obj, 'project', None)
        if isinstance(project, Project):
            return project
    if isinstance(obj, Label):
        link = obj.links.select_related('project').order_by('id').first()
        if link is not None and isinstance(link.project, Project):
            return link.project
    return None


def _has_live_organization_membership(user, organization_id) -> bool:
    """True when this user still has a non-deleted membership on the organization."""
    from organizations.models import OrganizationMember

    user_id = getattr(user, 'id', None)
    if not user_id or organization_id is None:
        return False
    return OrganizationMember.objects.filter(
        user_id=user_id,
        organization_id=organization_id,
        deleted_at__isnull=True,
    ).exists()


def _organization_of(obj):
    from organizations.models import Organization

    if isinstance(obj, Organization):
        return obj
    organization = getattr(obj, 'organization', None)
    if isinstance(organization, Organization):
        return organization
    return None


def _enforce(user, action, obj) -> None:
    if action is Action.ACCESS:
        project = _project_of(obj)
        if project is None:
            raise NotFound()
        ensure_project_visible(user, project)
        return
    if action is Action.MANAGE:
        project = _project_of(obj)
        if project is None:
            raise NotFound()
        ensure_project_manage(user, project)
        return
    if action is Action.ORG_OWNER:
        organization = _organization_of(obj)
        if organization is None:
            raise NotFound()
        ensure_org_owner(user, organization)
        return
    if action is Action.CREATE_PROJECT:
        ensure_can_create_project(user)
        return
    if action is Action.ANNOTATION_WRITE:
        from tasks.models import Annotation, AnnotationDraft

        if isinstance(obj, AnnotationDraft):
            from projects.access import draft_visible_to

            if not draft_visible_to(user, obj):
                raise NotFound()
            return
        if not isinstance(obj, Annotation):
            raise NotFound()
        _enforce_annotation_write(user, obj)
        return
    if action is Action.SELF:
        _enforce_self(user, obj)
        return
    raise NotFound()


def _enforce_label_write(user, label) -> None:
    """Require management of every project affected by a shared label write."""
    from labels_manager.models import LabelLink

    # LabelAPI prefetches only visible links, so its reverse relation cache
    # cannot establish which projects a global update or deletion affects.
    projects = [link.project for link in LabelLink.objects.filter(label_id=label.pk).select_related('project')]
    if not projects:
        raise NotFound()
    # Check all visibility first so a hidden project remains 404 even when an
    # earlier visible project would reject management with 403.
    for project in projects:
        ensure_project_visible(user, project)
    for project in projects:
        ensure_project_manage(user, project)


def _enforce_self(user, obj) -> None:
    """Allow an account action for the requester, not for another user.

    Boundary: this does not resolve a project. A ``User`` is visible only when
    its pk is the requester; any other user is ``NotFound``. A non-user object
    is left alone unless ``user_id`` names a different user.
    """
    from users.models import User

    requester_id = getattr(user, 'pk', None)
    if isinstance(obj, User):
        if getattr(obj, 'pk', None) != requester_id:
            raise NotFound()
        return
    owner_id = getattr(obj, 'user_id', None)
    if owner_id is not None and owner_id != requester_id:
        raise NotFound()


def _enforce_annotation_write(user, annotation) -> None:
    """Hide annotations outside the visible project; forbid other people's writes.

    Boundary: no project access is ``NotFound``. Access without authorship or
    management is ``PermissionDenied``.
    """
    from projects.access import can_access_project, can_modify_annotation

    project = _project_of(annotation)
    if project is None or not can_access_project(user, project):
        raise NotFound()
    if not can_modify_annotation(user, annotation):
        raise PermissionDenied()
