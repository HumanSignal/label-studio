"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license."""

from core.permissions import all_permissions
from django.db.models import CharField, Q, Value
from django.db.models.functions import Concat
from projects.access import project_member_users
from projects.action_permissions import ensure_project_manage
from projects.membership import grant_project_member, revoke_project_member
from projects.models import Project, ProjectMember
from rest_framework import serializers, status
from rest_framework.exceptions import ValidationError
from rest_framework.generics import GenericAPIView, get_object_or_404
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from users.models import User

_MEMBER_SOURCES = ('organization_owner', 'project_creator', 'member')


class ProjectMemberPagination(PageNumberPagination):
    """Page member lists the same way as the organization member list.

    Responsibility: honor ``page`` and ``page_size``, defaulting to 20.

    Boundary: ``page_size=-1`` returns one large page, matching
    ``OrganizationMemberListPagination``. It does not decide who is a member.
    """

    page_size = 20
    page_size_query_param = 'page_size'

    def get_page_size(self, request):
        if (
            self.page_size_query_param in request.query_params
            and request.query_params[self.page_size_query_param] == '-1'
        ):
            return 1000000
        return super().get_page_size(request)


class ProjectMemberSerializer(serializers.Serializer):
    """Serialize one project member row.

    Responsibility: expose id, display name, email, enablement, timestamps,
    and ``access_source``.

    Boundary: output only. It does not grant access and does not include
    organization contribution fields.
    """

    id = serializers.IntegerField()
    display_name = serializers.CharField()
    email = serializers.EmailField()
    enabled = serializers.BooleanField()
    created_at = serializers.DateTimeField(allow_null=True)
    updated_at = serializers.DateTimeField(allow_null=True)
    access_source = serializers.ChoiceField(choices=_MEMBER_SOURCES)


class ProjectMemberCandidateSerializer(serializers.Serializer):
    """Serialize a user who can be added to the project.

    Responsibility: expose the id, display name, and email needed to pick
    someone.

    Boundary: no membership timestamps and no other account fields.
    """

    id = serializers.IntegerField()
    display_name = serializers.CharField()
    email = serializers.EmailField()


class ProjectMemberWriteSerializer(serializers.Serializer):
    """Accept a body that cannot choose the member or the project.

    Responsibility: tolerate ``role``, ``project``, and ``organization`` keys.

    Boundary: validated values are discarded. The URL supplies the only user
    and project. Call ``ensure_project_manage`` before ``is_valid``.
    """

    role = serializers.CharField(required=False, allow_blank=True)
    project = serializers.IntegerField(required=False, allow_null=True)
    organization = serializers.IntegerField(required=False, allow_null=True)


class ProjectMemberSearchSerializer(serializers.Serializer):
    """Read the optional candidate search string.

    Responsibility: take the ``search`` query parameter.

    Boundary: does not create users or send invitations. Page and page size
    belong to the paginator.
    """

    search = serializers.CharField(required=False, allow_blank=True, default='')


def _managed_project(request, pk):
    """Load the project and require management rights.

    Responsibility: 404 a missing project, then ``ensure_project_manage``.

    Boundary: call this before any serializer read. A hidden project stays
    404. A visible project the user cannot manage is 403.
    """
    project = get_object_or_404(Project.objects.all(), pk=pk)
    ensure_project_manage(request.user, project)
    return project


def _validation_response(exc):
    """Return the membership error as ``{"detail": "..."}``.

    Responsibility: keep ``ValidationError.detail`` as the response detail.

    Boundary: the detail is the sentence from membership. It is not wrapped
    in a list and does not add the target user's email.
    """
    return Response({'detail': exc.detail}, status=status.HTTP_400_BAD_REQUEST)


def _display_name(user):
    """Return the name shown for a member, or the email when no name is set."""
    name = user.get_full_name().strip()
    if name:
        return name
    return user.email


def _access_source(project, user_id):
    """Return why this user appears on the project.

    Responsibility: prefer ``organization_owner`` over ``project_creator``.

    Boundary: this is an identity check on ``organization.created_by_id`` and
    ``project.created_by_id``. It does not call ``can_manage_project``.
    """
    organization = getattr(project, 'organization', None)
    if organization is not None and organization.created_by_id == user_id:
        return 'organization_owner'
    if project.created_by_id == user_id:
        return 'project_creator'
    return 'member'


def _member_payload(project, user, membership):
    """Build one member object, including implicit managers with no row.

    Responsibility: fill the member fields from identity and, when present,
    the explicit ``ProjectMember`` row.

    Boundary: an implicit manager stays enabled. Missing rows have null
    timestamps. A disabled explicit member stays in the payload as disabled.
    """
    source = _access_source(project, user.id)
    if membership is None:
        created_at = None
        updated_at = None
        enabled = True
    else:
        created_at = membership.created_at
        updated_at = membership.updated_at
        enabled = True if source != 'member' else membership.enabled
    return {
        'id': user.id,
        'display_name': _display_name(user),
        'email': user.email,
        'enabled': enabled,
        'created_at': created_at,
        'updated_at': updated_at,
        'access_source': source,
    }


def _membership_map(project, users):
    """Map user id to the explicit row for this page, if one exists."""
    user_ids = [user.id for user in users]
    rows = ProjectMember.objects.filter(project_id=project.pk, user_id__in=user_ids)
    return {row.user_id: row for row in rows}


def _listed_users(project):
    """Return implicit managers and explicit members, including disabled rows.

    Responsibility: start from ``project_member_users`` and add disabled
    explicit members who still belong to the organization.

    Boundary: does not filter ``is_active`` or ``active_organization``.
    ``project_member_users`` already keeps implicit managers who have no
    ``ProjectMember`` row.
    """
    listed_ids = project_member_users(project).values('pk')
    disabled_ids = ProjectMember.objects.filter(project_id=project.pk, enabled=False).values('user_id')
    org_disabled_ids = User.objects.filter(
        pk__in=disabled_ids,
        om_through__organization_id=project.organization_id,
        om_through__deleted_at__isnull=True,
    ).values('pk')
    return User.objects.filter(Q(pk__in=listed_ids) | Q(pk__in=org_disabled_ids)).distinct().order_by('id')


def _apply_search(queryset, search):
    """Keep users whose email or name matches every word in ``search``."""
    text = (search or '').strip()
    if not text:
        return queryset
    queryset = queryset.annotate(
        _full_name=Concat('first_name', Value(' '), 'last_name', output_field=CharField()),
    )
    for part in text.split():
        queryset = queryset.filter(
            Q(email__icontains=part)
            | Q(first_name__icontains=part)
            | Q(last_name__icontains=part)
            | Q(_full_name__icontains=part)
        )
    return queryset


def _available_users(project, search):
    """Return active organization users who can still be enabled on the project.

    Responsibility: reuse ``organization.members`` and drop people who are
    already enabled or who already manage the project by identity.

    Boundary: does not create accounts, send invitations, or change roles.
    Disabled explicit members stay selectable. ``active_organization`` is not
    a filter.
    """
    if not project.organization_id:
        return User.objects.none()
    enabled_ids = ProjectMember.objects.filter(project_id=project.pk, enabled=True).values('user_id')
    implicit_ids = [user_id for user_id in (project.created_by_id, project.organization.created_by_id) if user_id]
    member_ids = project.organization.members.filter(deleted_at__isnull=True, user__is_active=True).values('user_id')
    queryset = User.objects.filter(pk__in=member_ids).exclude(pk__in=enabled_ids).exclude(pk__in=implicit_ids)
    return _apply_search(queryset, search).distinct().order_by('id')


def _candidate_payload(user):
    """Build the three fields a manager needs in order to add this user."""
    return {'id': user.id, 'display_name': _display_name(user), 'email': user.email}


def _target_user(user_id):
    """Return the URL user, or None when that id is not a user.

    Responsibility: resolve the path id without a 404 that would confirm
    the account exists.

    Boundary: a missing user is handed to membership, which rejects it as
    an inactive organization user and does not echo an email.
    """
    return User.objects.filter(pk=user_id).first()


class ProjectMemberListAPI(GenericAPIView):
    """List implicit managers and explicit project members.

    Responsibility: one row per user, with access source and timestamps.

    Boundary: ``projects.change``. ``ensure_project_manage`` runs before the
    response is serialized. Disabled explicit members are included. Implicit
    managers are identities, not ``can_manage_project`` results.
    """

    permission_required = all_permissions.projects_change
    pagination_class = ProjectMemberPagination
    serializer_class = ProjectMemberSerializer

    def get(self, request, pk):
        project = _managed_project(request, pk)
        queryset = _listed_users(project)
        page = self.paginate_queryset(queryset)
        users = list(page if page is not None else queryset)
        memberships = _membership_map(project, users)
        payloads = [_member_payload(project, user, memberships.get(user.id)) for user in users]
        data = self.get_serializer(payloads, many=True).data
        if page is not None:
            return self.get_paginated_response(data)
        return Response(data)


class ProjectMemberAvailableAPI(GenericAPIView):
    """Search organization users who can be enabled on this project.

    Responsibility: return id, display name, and email for candidates.

    Boundary: ``projects.change``. ``ensure_project_manage`` runs before the
    search serializer is read. Reuses the organization member query. Does not
    create accounts or send invitations.
    """

    permission_required = all_permissions.projects_change
    pagination_class = ProjectMemberPagination
    serializer_class = ProjectMemberCandidateSerializer

    def get(self, request, pk):
        project = _managed_project(request, pk)
        params = ProjectMemberSearchSerializer(data=request.query_params)
        params.is_valid(raise_exception=True)
        queryset = _available_users(project, params.validated_data.get('search', ''))
        page = self.paginate_queryset(queryset)
        users = list(page if page is not None else queryset)
        data = self.get_serializer([_candidate_payload(user) for user in users], many=True).data
        if page is not None:
            return self.get_paginated_response(data)
        return Response(data)


class ProjectMemberGrantAPI(GenericAPIView):
    """Enable one explicit project member.

    Responsibility: pass the URL user to ``grant_project_member``.

    Boundary: ``projects.change``. ``ensure_project_manage`` runs before the
    body serializer is read. Role, project, and organization fields in the
    body are ignored.
    """

    permission_required = all_permissions.projects_change
    serializer_class = ProjectMemberWriteSerializer

    def put(self, request, pk, user_id):
        project = _managed_project(request, pk)
        written = self.get_serializer(data=request.data)
        written.is_valid(raise_exception=True)
        target = _target_user(user_id)
        try:
            membership = grant_project_member(project=project, actor=request.user, target=target)
        except ValidationError as exc:
            return _validation_response(exc)
        payload = _member_payload(project, membership.user, membership)
        return Response(ProjectMemberSerializer(payload).data)


class ProjectMemberRevokeAPI(GenericAPIView):
    """Disable one explicit project member.

    Responsibility: pass the URL user to ``revoke_project_member``.

    Boundary: ``projects.change``. ``ensure_project_manage`` runs before any
    other work. Role, project, and organization fields in the body are
    ignored. A second delete of an already disabled member stays successful.
    """

    permission_required = all_permissions.projects_change

    def delete(self, request, pk, user_id):
        project = _managed_project(request, pk)
        target = _target_user(user_id)
        try:
            revoke_project_member(project=project, actor=request.user, target=target)
        except ValidationError as exc:
            return _validation_response(exc)
        return Response(status=status.HTTP_204_NO_CONTENT)


class ProjectMemberAPI(ProjectMemberGrantAPI, ProjectMemberRevokeAPI):
    """Grant or revoke the user named by the member URL.

    Responsibility: PUT enables that user and DELETE disables that user.

    Boundary: both methods require ``projects.change`` and call
    ``ensure_project_manage`` before reading a serializer. DELETE ignores
    the body. The body cannot retarget the membership.
    """

    permission_required = all_permissions.projects_change
