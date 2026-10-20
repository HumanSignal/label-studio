"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license."""

from django.db.models import Q, QuerySet
from organizations.models import Organization
from projects.models import Project
from users.models import User


def user_is_active_account(user) -> bool:
    """True when the user is authenticated and the account is not suspended."""
    if user is None or not getattr(user, 'is_authenticated', False):
        return False
    return bool(getattr(user, 'is_active', False))


def manageable_project_filter(user) -> Q:
    return Q(organization_id=user.active_organization_id) & (
        Q(created_by_id=user.id) | Q(organization__created_by_id=user.id)
    )


def visible_project_filter(user) -> Q:
    return manageable_project_filter(user) | Q(
        organization_id=user.active_organization_id,
        members__user_id=user.id,
        members__enabled=True,
    )


def _account_can_use_active_organization(user) -> bool:
    return user_is_active_account(user) and bool(getattr(user, 'active_organization_id', None))


def _live_organization_member_filter(user) -> Q:
    """Organization boundary: a non-deleted membership on the project's organization."""
    return Q(
        organization__organizationmember__user_id=user.id,
        organization__organizationmember__deleted_at__isnull=True,
    )


def _projects_matching(user, project_filter) -> QuerySet:
    """Projects matching ``project_filter`` inside a live organization membership.

    Does not call ``Project.objects.for_user``. That manager will call
    ``visible_projects``, so calling it here would recurse.
    """
    if not _account_can_use_active_organization(user):
        return Project.objects.none()
    return (
        Project.objects.filter(project_filter(user))
        .filter(_live_organization_member_filter(user))
        .distinct()
    )


def visible_projects(user) -> QuerySet:
    return _projects_matching(user, visible_project_filter)


def can_access_project(user, project) -> bool:
    if getattr(project, 'pk', None) is None:
        return False
    return visible_projects(user).filter(pk=project.pk).exists()


def can_manage_project(user, project) -> bool:
    if getattr(project, 'pk', None) is None:
        return False
    return _projects_matching(user, manageable_project_filter).filter(pk=project.pk).exists()


def can_create_project(user) -> bool:
    if not _account_can_use_active_organization(user):
        return False
    return Organization.objects.filter(
        pk=user.active_organization_id,
        created_by_id=user.id,
        organizationmember__user_id=user.id,
        organizationmember__deleted_at__isnull=True,
    ).exists()


def _annotation_project(annotation):
    if annotation is None:
        return None
    if getattr(annotation, 'project_id', None):
        return annotation.project
    if getattr(annotation, 'task_id', None):
        return annotation.task.project
    return None


def can_modify_annotation(user, annotation) -> bool:
    project = _annotation_project(annotation)
    if project is None:
        return False
    if getattr(annotation, 'completed_by_id', None) == getattr(user, 'id', None):
        return can_access_project(user, project)
    return can_manage_project(user, project)


def draft_visible_to(user, draft) -> bool:
    if draft is None or getattr(draft, 'user_id', None) != getattr(user, 'id', None):
        return False
    if not getattr(draft, 'task_id', None):
        return False
    return can_access_project(user, draft.task.project)


def project_member_users(project) -> QuerySet:
    """Owner, project creator, and enabled members who still belong to the organization."""
    if project is None or not getattr(project, 'pk', None) or not project.organization_id:
        return User.objects.none()
    owner_ids = Organization.objects.filter(pk=project.organization_id).values('created_by_id')
    identity = Q(project_memberships__project_id=project.pk, project_memberships__enabled=True)
    if project.created_by_id:
        identity |= Q(pk=project.created_by_id)
    identity |= Q(pk__in=owner_ids)
    return (
        User.objects.filter(
            om_through__organization_id=project.organization_id,
            om_through__deleted_at__isnull=True,
        )
        .filter(identity)
        .distinct()
    )
