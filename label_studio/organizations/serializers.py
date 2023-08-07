"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import ujson as json

from rest_framework import serializers
from drf_dynamic_fields import DynamicFieldsMixin  # type: ignore[import]

from organizations.models import Organization, OrganizationMember
from users.serializers import UserSerializer
from collections import OrderedDict


class OrganizationIdSerializer(DynamicFieldsMixin, serializers.ModelSerializer):  # type: ignore[misc, type-arg]
    class Meta:
        model = Organization
        fields = ['id', 'title']


class OrganizationSerializer(DynamicFieldsMixin, serializers.ModelSerializer):  # type: ignore[misc, type-arg]
    class Meta:
        model = Organization
        fields = '__all__'


class OrganizationMemberSerializer(DynamicFieldsMixin, serializers.ModelSerializer):  # type: ignore[misc, type-arg]
    class Meta:
        model = OrganizationMember
        fields = ['id', 'organization', 'user']


class UserSerializerWithProjects(UserSerializer):  # type: ignore[misc]
    created_projects = serializers.SerializerMethodField(read_only=True)
    contributed_to_projects = serializers.SerializerMethodField(read_only=True)

    def get_created_projects(self, user):  # type: ignore[no-untyped-def]
        if not self.context.get('contributed_to_projects', False):
            return None

        current_user = self.context['request'].user
        return user.created_projects.filter(organization=current_user.active_organization).values('id', 'title')

    def get_contributed_to_projects(self, user):  # type: ignore[no-untyped-def]
        if not self.context.get('contributed_to_projects', False):
            return None

        current_user = self.context['request'].user
        projects = user.annotations\
            .filter(project__organization=current_user.active_organization)\
            .values('project__id', 'project__title')
        contributed_to = [(json.dumps({'id': p['project__id'], 'title': p['project__title']}), 0)
                          for p in projects]
        contributed_to = OrderedDict(contributed_to)    # type: ignore[assignment] # remove duplicates without ordering losing
        return [json.loads(key) for key in contributed_to]  # type: ignore[arg-type]

    class Meta(UserSerializer.Meta):  # type: ignore[misc]
        fields = UserSerializer.Meta.fields + ('created_projects', 'contributed_to_projects')


class OrganizationMemberUserSerializer(DynamicFieldsMixin, serializers.ModelSerializer):  # type: ignore[misc, type-arg]
    """Adds all user properties"""
    user = UserSerializerWithProjects()

    class Meta:
        model = OrganizationMember
        fields = ['id', 'organization', 'user']


class OrganizationInviteSerializer(serializers.Serializer):  # type: ignore[type-arg]
    token = serializers.CharField(required=False)
    invite_url = serializers.CharField(required=False)


class OrganizationsParamsSerializer(serializers.Serializer):  # type: ignore[type-arg]
    active = serializers.BooleanField(required=False, default=False)
    contributed_to_projects = serializers.BooleanField(required=False, default=False)