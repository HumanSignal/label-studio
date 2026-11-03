"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license."""

from typing import TypedDict

from drf_dynamic_fields import DynamicFieldsMixin
from drf_spectacular.utils import extend_schema_serializer
from organizations.models import Organization, OrganizationMember
from projects.access import visible_projects
from projects.models import Project
from rest_framework import serializers
from tasks.models import Annotation
from users.serializers import UserSerializer


class OrganizationIdSerializer(DynamicFieldsMixin, serializers.ModelSerializer):
    class Meta:
        model = Organization
        fields = ['id', 'title', 'contact_info', 'created_at']


class OrganizationSerializer(DynamicFieldsMixin, serializers.ModelSerializer):
    class Meta:
        model = Organization
        fields = '__all__'
        # created_by is the only privilege boundary in LSO (member removal), never mass-assignable;
        # any member could re-enable script in instructions if the unsafe-tags switch were writable here
        read_only_fields = ('created_by', 'allow_unsafe_instruction_tags')


# =========================================
# OrganizationMemberListAPI
# OrganizationMemberDetailAPI
# =========================================


class ProjectInfo(TypedDict):
    id: int
    title: str


def _projects_visible_to_requester(context):
    """Return projects the requesting user may see.

    Responsibility: bound created-project and contributed-project fields to
    ``visible_projects``.

    Boundary: a missing request or an unauthenticated user sees no projects.
    Does not grant access and does not call ``user.has_perm``.
    """
    request = context.get('request')
    user = getattr(request, 'user', None) if request is not None else None
    if user is None or not getattr(user, 'is_authenticated', False):
        return Project.objects.none()
    return visible_projects(user)


class OrganizationMemberListParamsSerializer(serializers.Serializer):
    active = serializers.BooleanField(required=False, default=False)
    contributed_to_projects = serializers.BooleanField(required=False, default=False)


@extend_schema_serializer(
    deprecate_fields=[
        'created_projects',
        'contributed_to_projects',
    ]
)
class UserOrganizationMemberListSerializer(UserSerializer):
    created_projects = serializers.SerializerMethodField(read_only=True)
    contributed_to_projects = serializers.SerializerMethodField(read_only=True)

    def get_created_projects(self, user) -> list[ProjectInfo] | None:
        if not self.context.get('contributed_to_projects', False):
            return None
        created_projects_map = self.context.get('created_projects_map', {})
        return created_projects_map.get(user.id, [])

    def get_contributed_to_projects(self, user) -> list[ProjectInfo] | None:
        if not self.context.get('contributed_to_projects', False):
            return None
        contributed_to_projects_map = self.context.get('contributed_to_projects_map', {})
        return contributed_to_projects_map.get(user.id, [])

    class Meta(UserSerializer.Meta):
        fields = UserSerializer.Meta.fields + ('created_projects', 'contributed_to_projects')


class OrganizationMemberListSerializer(DynamicFieldsMixin, serializers.ModelSerializer):
    user = UserOrganizationMemberListSerializer()
    created_projects = serializers.SerializerMethodField(read_only=True)
    contributed_to_projects = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = OrganizationMember
        fields = ['id', 'organization', 'user', 'created_projects', 'contributed_to_projects']

    def get_created_projects(self, member) -> list[ProjectInfo] | None:
        if not self.context.get('contributed_to_projects', False):
            return None
        created_projects_map = self.context.get('created_projects_map', {})
        return created_projects_map.get(member.user.id, [])

    def get_contributed_to_projects(self, member) -> list[ProjectInfo] | None:
        if not self.context.get('contributed_to_projects', False):
            return None
        contributed_to_projects_map = self.context.get('contributed_to_projects_map', {})
        return contributed_to_projects_map.get(member.user.id, [])


class OrganizationMemberSerializer(DynamicFieldsMixin, serializers.ModelSerializer):
    annotations_count = serializers.SerializerMethodField(read_only=True)
    contributed_projects_count = serializers.SerializerMethodField(read_only=True)
    created_projects = serializers.SerializerMethodField(read_only=True)
    contributed_to_projects = serializers.SerializerMethodField(read_only=True)

    def get_annotations_count(self, member) -> int:
        visible = _projects_visible_to_requester(self.context).filter(organization=self.context.get('organization'))
        return member.user.annotations.filter(project__in=visible).count()

    def get_contributed_projects_count(self, member) -> int:
        visible = _projects_visible_to_requester(self.context).filter(organization=self.context.get('organization'))
        return member.user.annotations.filter(project__in=visible).values('project').distinct().count()

    def get_created_projects(self, member) -> list[ProjectInfo] | None:
        if not self.context.get('contributed_to_projects', False):
            return None
        organization = self.context.get('organization')
        projects = (
            _projects_visible_to_requester(self.context)
            .filter(created_by=member.user, organization=organization)
            .values('id', 'title')[:100]
        )
        return [
            {
                'id': project['id'],
                'title': project['title'],
            }
            for project in projects
        ]

    def get_contributed_to_projects(self, member) -> list[ProjectInfo] | None:
        if not self.context.get('contributed_to_projects', False):
            return None
        organization = self.context.get('organization')
        visible = _projects_visible_to_requester(self.context).filter(organization=organization)
        annotations = (
            Annotation.objects.filter(completed_by=member.user, project__in=visible)
            .values('project__id', 'project__title')
            .distinct()
        )
        annotations = annotations[:100]  # Limit to 100 projects
        return [
            {
                'id': annotation['project__id'],
                'title': annotation['project__title'],
            }
            for annotation in annotations
        ]

    class Meta:
        model = OrganizationMember
        fields = [
            'user',
            'organization',
            'contributed_projects_count',
            'annotations_count',
            'created_at',
            'created_projects',
            'contributed_to_projects',
        ]


# =========================================


class OrganizationInviteSerializer(serializers.Serializer):
    token = serializers.CharField(required=False)
    invite_url = serializers.CharField(required=False)
    expires_at = serializers.DateTimeField(
        required=False, allow_null=True, help_text='When the invite link expires; null if no expiry was recorded'
    )
    expired = serializers.BooleanField(
        required=False, help_text='True once the invite link has expired; reset the token to issue a new link'
    )
