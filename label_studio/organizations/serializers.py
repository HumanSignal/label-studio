"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""

from typing import TypedDict

from drf_dynamic_fields import DynamicFieldsMixin
from drf_spectacular.utils import extend_schema_serializer
from organizations.models import Organization, OrganizationMember
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


# =========================================
# OrganizationMemberListAPI
# OrganizationMemberDetailAPI
# =========================================


class ProjectInfo(TypedDict):
    id: int
    title: str


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
        org = self.context.get('organization')
        return member.user.annotations.filter(project__organization=org).count()

    def get_contributed_projects_count(self, member) -> int:
        org = self.context.get('organization')
        return member.user.annotations.filter(project__organization=org).values('project').distinct().count()

    def get_created_projects(self, member) -> list[ProjectInfo] | None:
        if not self.context.get('contributed_to_projects', False):
            return None
        organization = self.context.get('organization')
        projects = Project.objects.filter(created_by=member.user, organization=organization).values('id', 'title')
        projects = projects[:100]   # Limit to 100 projects
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
        annotations = (
            Annotation.objects.filter(completed_by=member.user, project__organization=organization)
            .values('project__id', 'project__title')
            .distinct()
        )
        annotations = annotations[:100]   # Limit to 100 projects
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
