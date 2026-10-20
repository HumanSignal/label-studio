"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license."""

from django.db import IntegrityError, transaction
from django.utils import timezone
from organizations.models import OrganizationMember
from projects.access import can_manage_project
from projects.models import ProjectMember
from rest_framework.exceptions import PermissionDenied, ValidationError

_IMPLICIT_MANAGER = 'This user already manages the project. Membership cannot grant or revoke that access.'
_INACTIVE_TARGET = 'Select an active user in this organization.'


def grant_project_member(*, project, actor, target) -> ProjectMember:
    """Create or re-enable the one explicit membership row for this user.

    Responsibility: keep a single ``(project, user)`` row and set ``enabled``
    to true.

    Boundary: ``actor`` must pass ``can_manage_project``. ``target`` must be an
    active member of that project's organization. The project creator and the
    organization owner are implicit managers by identity, including when their
    ``active_organization`` is somewhere else, and cannot receive a row. This
    function does not accept a role or a project field, and it does not change
    annotations or drafts.
    """
    _require_manager(actor, project)
    _require_explicit_target(project, target)
    try:
        with transaction.atomic():
            member, _created = ProjectMember.objects.update_or_create(
                project=project,
                user=target,
                defaults={'enabled': True},
            )
    except IntegrityError:
        member = _enable_existing_member(project, target)
    return member


def revoke_project_member(*, project, actor, target) -> None:
    """Disable an explicit membership without deleting history.

    Responsibility: set ``enabled`` to false on the existing row.

    Boundary: ``actor`` must pass ``can_manage_project``. ``target`` must be an
    active member of that project's organization. The project creator and the
    organization owner are implicit managers by identity, including when their
    ``active_organization`` is somewhere else, and their rows are left untouched.
    A missing row stays missing. Users, tasks, submitted annotations, and drafts
    are left in place. ``updated_at`` moves forward when a row is disabled.
    """
    _require_manager(actor, project)
    _require_explicit_target(project, target)
    ProjectMember.objects.filter(project=project, user=target).update(
        enabled=False,
        updated_at=timezone.now(),
    )


def _require_manager(actor, project):
    if not can_manage_project(actor, project):
        raise PermissionDenied()


def _require_explicit_target(project, target):
    if _is_implicit_manager(project, target):
        raise _validation_error(_IMPLICIT_MANAGER)
    if not _is_active_organization_member(project, target):
        raise _validation_error(_INACTIVE_TARGET)


def _is_implicit_manager(project, target) -> bool:
    """True when this user is the project creator or the organization owner.

    This is an identity, not ``can_manage_project``. A different
    ``active_organization`` does not make the user eligible for a membership row.
    """
    target_id = getattr(target, 'id', None)
    if target_id is None or getattr(project, 'pk', None) is None:
        return False
    if project.created_by_id == target_id:
        return True
    organization = getattr(project, 'organization', None)
    if organization is None:
        return False
    return organization.created_by_id == target_id


def _is_active_organization_member(project, target) -> bool:
    if target is None or not getattr(target, 'is_active', False) or not getattr(target, 'pk', None):
        return False
    organization_id = getattr(project, 'organization_id', None)
    if not organization_id:
        return False
    return OrganizationMember.objects.filter(
        user_id=target.pk,
        organization_id=organization_id,
        deleted_at__isnull=True,
    ).exists()


def _enable_existing_member(project, target):
    """Read the row that won a unique-constraint race and enable it."""
    member = ProjectMember.objects.get(project=project, user=target)
    ProjectMember.objects.filter(pk=member.pk).update(enabled=True, updated_at=timezone.now())
    member.refresh_from_db()
    return member


def _validation_error(message):
    """Return a 400 whose ``detail`` is the sentence itself.

    DRF wraps a string in a list. These messages are compared as plain text
    and must not carry the target user's email or other identity fields.
    """
    error = ValidationError(message)
    error.detail = message
    return error
