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
    """Return the Q for projects this user may manage in the active organization.

    Responsibility: select projects in ``user.active_organization`` whose
    creator is the user or whose organization creator is the user.

    Boundary: this Q does not check that the account is active, that
    ``active_organization`` is set, or that a non-deleted ``OrganizationMember``
    exists. A disabled ``ProjectMember`` row is ignored. ``is_staff`` and
    ``is_superuser`` do not widen the filter. Callers that grant access must
    apply those checks themselves.
    """
    return Q(organization_id=user.active_organization_id) & (
        Q(created_by_id=user.id) | Q(organization__created_by_id=user.id)
    )


def visible_project_filter(user) -> Q:
    """Return the Q for projects this user may see in the active organization.

    Responsibility: include every manageable project, plus projects in the
    active organization where the user has an enabled ``ProjectMember`` row.

    Boundary: a disabled member row does not remove a project creator or
    organization owner. This Q does not require an active account or a
    non-deleted ``OrganizationMember``; ``visible_projects`` adds those
    checks. ``is_staff`` and ``is_superuser`` do not grant visibility.
    """
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
    """Return projects this user may open in the current organization.

    Responsibility: the queryset of non-deleted projects the user can view
    and annotate.

    Boundary: an inactive, unauthenticated, or organization-less account gets
    an empty queryset. A result also requires ``visible_project_filter`` and a
    non-deleted ``OrganizationMember`` on the project's organization.
    Soft-deleted projects stay hidden. Does not call ``Project.objects.for_user``.
    ``is_staff`` and ``is_superuser`` do not add projects.
    """
    return _projects_matching(user, visible_project_filter)


def can_access_project(user, project) -> bool:
    """Return whether the user may view this project and annotate in it.

    Responsibility: the single-project form of ``visible_projects``.

    Boundary: true only when the account is active, the active organization
    matches the project, a non-deleted organization membership exists, and the
    user is a manager or an enabled project member. Missing and soft-deleted
    projects are denied. Creator, owner, and member rights do not apply before
    that organization boundary. ``is_staff`` and ``is_superuser`` are not
    sufficient.
    """
    if getattr(project, 'pk', None) is None:
        return False
    return visible_projects(user).filter(pk=project.pk).exists()


def can_manage_project(user, project) -> bool:
    """Return whether the user may change this project's settings and members.

    Responsibility: management rights for one project, not ordinary annotation
    access.

    Boundary: true only for an active account whose active organization owns
    the project, with a non-deleted organization membership, and who is the
    project creator or the organization owner. An enabled member is not a
    manager. A disabled ``ProjectMember`` row does not remove creator or owner
    rights. Missing and soft-deleted projects are denied. ``is_staff`` and
    ``is_superuser`` are not sufficient.
    """
    if getattr(project, 'pk', None) is None:
        return False
    return _projects_matching(user, manageable_project_filter).filter(pk=project.pk).exists()


def can_create_project(user) -> bool:
    """Return whether the user may create a project in the active organization.

    Responsibility: the organization-level create check, not access to an
    existing project.

    Boundary: true only when the account is active, ``active_organization`` is
    set, the user is that organization's ``created_by``, and that organization
    membership is not soft-deleted. Project creators and enabled members cannot
    create projects. ``is_staff`` and ``is_superuser`` are not sufficient.
    """
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
    """Return whether the user may change or delete this submitted annotation.

    Responsibility: author and manager write rights for one annotation.

    Boundary: the author may modify it only when they can access the
    annotation's project. Any other user may modify it only when they can
    manage that project. Users outside the project, including staff and
    superusers without those rights, are denied.
    """
    project = _annotation_project(annotation)
    if project is None:
        return False
    if getattr(annotation, 'completed_by_id', None) == getattr(user, 'id', None):
        return can_access_project(user, project)
    return can_manage_project(user, project)


def draft_visible_to(user, draft) -> bool:
    """Return whether this draft's contents may be shown to the user.

    Responsibility: personal draft visibility, not annotation or project
    management rights.

    Boundary: true only for the draft's author, and only when that user can
    access the draft's project. Managers and other members cannot read someone
    else's draft. The draft stays hidden when the project is not visible,
    including when the account or organization membership does not qualify.
    """
    if draft is None or getattr(draft, 'user_id', None) != getattr(user, 'id', None):
        return False
    if not getattr(draft, 'task_id', None):
        return False
    return can_access_project(user, draft.task.project)


def project_member_users(project) -> QuerySet:
    """Return identities that still belong to this project's organization.

    Responsibility: list the organization owner, the project creator, and
    enabled project members who still have a non-deleted ``OrganizationMember``
    on the project's organization.

    Boundary: does not filter on ``is_active`` or ``active_organization``.
    This is not the set of users who can open the project right now; use
    ``can_access_project`` for that check.
    """
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
