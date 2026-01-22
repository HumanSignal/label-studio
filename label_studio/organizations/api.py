"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import logging

from core.feature_flags import flag_set
from core.mixins import GetParentObjectMixin
from core.utils.common import load_func
from django.conf import settings
from django.urls import reverse
from django.utils.decorators import method_decorator
from django.utils.functional import cached_property
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiParameter, OpenApiResponse, extend_schema
from organizations.models import Organization, OrganizationMember
from organizations.serializers import (
    OrganizationIdSerializer,
    OrganizationInviteSerializer,
    OrganizationMemberListParamsSerializer,
    OrganizationMemberListSerializer,
    OrganizationMemberSerializer,
    OrganizationSerializer,
)
from projects.models import Project
from rest_framework import generics, status
from rest_framework.exceptions import NotFound, PermissionDenied
from rest_framework.generics import get_object_or_404
from rest_framework.pagination import PageNumberPagination
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.settings import api_settings
from rest_framework.views import APIView
from tasks.models import Annotation
from users.models import User

from label_studio.core.permissions import ViewClassPermission, all_permissions
from label_studio.core.utils.params import bool_from_request

logger = logging.getLogger(__name__)

HasObjectPermission = load_func(settings.MEMBER_PERM)


@method_decorator(
    name='get',
    decorator=extend_schema(
        tags=['Organizations'],
        summary='List your organizations',
        description="""
        Return a list of the organizations you've created or that you have access to.
        """,
        extensions={
            'x-fern-sdk-group-name': 'organizations',
            'x-fern-sdk-method-name': 'list',
            'x-fern-audiences': ['public'],
        },
    ),
)
class OrganizationListAPI(generics.ListCreateAPIView):
    queryset = Organization.objects.all()
    parser_classes = (JSONParser, FormParser, MultiPartParser)
    permission_required = ViewClassPermission(
        GET=all_permissions.organizations_view,
        PUT=all_permissions.organizations_change,
        POST=all_permissions.organizations_create,
        PATCH=all_permissions.organizations_change,
        DELETE=all_permissions.organizations_change,
    )
    serializer_class = OrganizationIdSerializer

    def filter_queryset(self, queryset):
        return queryset.filter(
            organizationmember__in=self.request.user.om_through.filter(deleted_at__isnull=True)
        ).distinct()

    def get(self, request, *args, **kwargs):
        return super(OrganizationListAPI, self).get(request, *args, **kwargs)

    @extend_schema(exclude=True)
    def post(self, request, *args, **kwargs):
        return super(OrganizationListAPI, self).post(request, *args, **kwargs)


class OrganizationMemberListPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'

    def get_page_size(self, request):
        # emulate "unlimited" page_size
        if (
            self.page_size_query_param in request.query_params
            and request.query_params[self.page_size_query_param] == '-1'
        ):
            return 1000000
        return super().get_page_size(request)


@method_decorator(
    name='get',
    decorator=extend_schema(
        tags=['Organizations'],
        summary='Get organization members list',
        description='Retrieve a list of the organization members and their IDs.',
        parameters=[
            OpenApiParameter(
                name='contributed_to_projects',
                type=OpenApiTypes.BOOL,
                location='query',
                description='Whether to include projects created and contributed to by the members.',
            ),
        ],
        extensions={
            'x-fern-sdk-group-name': ['organizations', 'members'],
            'x-fern-sdk-method-name': 'list',
            'x-fern-audiences': ['public'],
            'x-fern-pagination': {
                'offset': '$request.page',
                'results': '$response.results',
            },
        },
    ),
)
class OrganizationMemberListAPI(generics.ListAPIView):
    parser_classes = (JSONParser, FormParser, MultiPartParser)
    permission_required = ViewClassPermission(
        GET=all_permissions.organizations_view,
        PUT=all_permissions.organizations_change,
        PATCH=all_permissions.organizations_change,
        DELETE=all_permissions.organizations_change,
    )
    serializer_class = OrganizationMemberListSerializer
    pagination_class = OrganizationMemberListPagination

    @cached_property
    def paginated_members(self):
        return self.paginate_queryset(self.filter_queryset(self.get_queryset()))

    def _get_created_projects_map(self):
        members = self.paginated_members
        user_ids = [member.user_id for member in members]
        projects = (
            Project.objects.filter(created_by_id__in=user_ids, organization=self.request.user.active_organization)
            .values('created_by_id', 'id', 'title')
            .distinct()
        )
        projects_map = {}
        for project in projects:
            projects_map.setdefault(project['created_by_id'], []).append(
                {
                    'id': project['id'],
                    'title': project['title'],
                }
            )
        return projects_map

    def _get_contributed_to_projects_map(self):
        members = self.paginated_members
        user_ids = [member.user_id for member in members]
        org_project_ids = Project.objects.filter(organization=self.request.user.active_organization).values_list(
            'id', flat=True
        )
        annotations = (
            Annotation.objects.filter(completed_by__in=list(user_ids), project__in=list(org_project_ids))
            .values('completed_by', 'project_id')
            .distinct()
        )
        project_ids = [annotation['project_id'] for annotation in annotations]
        projects_map = Project.objects.in_bulk(id_list=project_ids, field_name='id')

        contributed_to_projects_map = {}
        for annotation in annotations:
            project = projects_map[annotation['project_id']]
            contributed_to_projects_map.setdefault(annotation['completed_by'], []).append(
                {
                    'id': project.id,
                    'title': project.title,
                }
            )
        return contributed_to_projects_map

    def get_serializer_context(self):
        context = super().get_serializer_context()
        contributed_to_projects = bool_from_request(self.request.GET, 'contributed_to_projects', False)
        return {
            'contributed_to_projects': contributed_to_projects,
            'created_projects_map': self._get_created_projects_map() if contributed_to_projects else None,
            'contributed_to_projects_map': self._get_contributed_to_projects_map()
            if contributed_to_projects
            else None,
            **context,
        }

    def get_queryset(self):
        org = generics.get_object_or_404(self.request.user.organizations, pk=self.kwargs[self.lookup_field])
        if flag_set('fix_backend_dev_3134_exclude_deactivated_users', self.request.user):
            serializer = OrganizationMemberListParamsSerializer(data=self.request.GET)
            serializer.is_valid(raise_exception=True)
            active = serializer.validated_data.get('active')

            # return only active users (exclude DISABLED and NOT_ACTIVATED)
            if active:
                return org.active_members.prefetch_related('user__om_through').order_by('user__username')

            # organization page to show all members
            return org.members.prefetch_related('user__om_through').order_by('user__username')
        else:
            return org.members.prefetch_related('user__om_through').order_by('user__username')

    def list(self, request, *args, **kwargs):
        page = self.paginated_members   # Using cached property to avoid multiple queries
        serializer = self.get_serializer(page, many=True)
        return self.get_paginated_response(serializer.data)


@method_decorator(
    name='get',
    decorator=extend_schema(
        tags=['Organizations'],
        summary='Get organization member details',
        description='Get organization member details by user ID.',
        parameters=[
            OpenApiParameter(
                name='user_pk',
                type=OpenApiTypes.INT,
                location='path',
                description='A unique integer value identifying the user to get organization details for.',
            ),
            OpenApiParameter(
                name='contributed_to_projects',
                type=OpenApiTypes.BOOL,
                location='query',
                description='Whether to include projects created and contributed to by the member.',
            ),
        ],
        responses={200: OrganizationMemberSerializer()},
        extensions={
            'x-fern-sdk-group-name': ['organizations', 'members'],
            'x-fern-sdk-method-name': 'get',
            'x-fern-audiences': ['public'],
        },
    ),
)
@method_decorator(
    name='delete',
    decorator=extend_schema(
        tags=['Organizations'],
        summary='Soft delete an organization member',
        description='Soft delete a member from the organization.',
        parameters=[
            OpenApiParameter(
                name='user_pk',
                type=OpenApiTypes.INT,
                location='path',
                description='A unique integer value identifying the user to be deleted from the organization.',
            ),
        ],
        responses={
            204: OpenApiResponse(description='Member deleted successfully.'),
            405: OpenApiResponse(description='User cannot soft delete self.'),
            404: OpenApiResponse(description='Member not found'),
            403: OpenApiResponse(description='You can delete members only for your current active organization'),
        },
        extensions={
            'x-fern-sdk-group-name': ['organizations', 'members'],
            'x-fern-sdk-method-name': 'delete',
            'x-fern-audiences': ['public'],
        },
    ),
)
class OrganizationMemberDetailAPI(GetParentObjectMixin, generics.RetrieveDestroyAPIView):
    permission_required = ViewClassPermission(
        GET=all_permissions.organizations_view,
        DELETE=all_permissions.organizations_change,
    )
    parent_queryset = Organization.objects.all()
    parser_classes = (JSONParser, FormParser, MultiPartParser)
    serializer_class = OrganizationMemberSerializer
    http_method_names = ['delete', 'get']

    @property
    def permission_classes(self):
        if self.request.method == 'DELETE':
            return [IsAuthenticated, HasObjectPermission]
        return api_settings.DEFAULT_PERMISSION_CLASSES

    def get_queryset(self):
        return OrganizationMember.objects.filter(organization=self.parent_object).select_related('user')

    def get_serializer_context(self):
        return {
            **super().get_serializer_context(),
            'organization': self.parent_object,
            'contributed_to_projects': bool_from_request(self.request.GET, 'contributed_to_projects', False),
        }

    def get(self, request, pk, user_pk):
        queryset = self.get_queryset()
        member = get_object_or_404(queryset, user=user_pk)
        self.check_object_permissions(request, member)
        serializer = self.get_serializer(member)
        return Response(serializer.data)

    def delete(self, request, pk=None, user_pk=None):
        org = self.parent_object
        if org != request.user.active_organization:
            raise PermissionDenied('You can delete members only for your current active organization')

        user = get_object_or_404(User, pk=user_pk)
        member = get_object_or_404(OrganizationMember, user=user, organization=org)
        if member.deleted_at is not None:
            raise NotFound('Member not found')

        if member.user_id == request.user.id:
            return Response({'detail': 'User cannot soft delete self'}, status=status.HTTP_405_METHOD_NOT_ALLOWED)

        member.soft_delete()
        return Response(status=204)  # 204 No Content is a common HTTP status for successful delete requests


@method_decorator(
    name='get',
    decorator=extend_schema(
        tags=['Organizations'],
        summary='Get organization settings',
        description='Retrieve the settings for a specific organization by ID.',
        extensions={
            'x-fern-sdk-group-name': 'organizations',
            'x-fern-sdk-method-name': 'get',
            'x-fern-audiences': ['public'],
        },
    ),
)
@method_decorator(
    name='patch',
    decorator=extend_schema(
        tags=['Organizations'],
        summary='Update organization settings',
        description='Update the settings for a specific organization by ID.',
        extensions={
            'x-fern-sdk-group-name': 'organizations',
            'x-fern-sdk-method-name': 'update',
            'x-fern-audiences': ['public'],
        },
    ),
)
class OrganizationAPI(generics.RetrieveUpdateAPIView):

    parser_classes = (JSONParser, FormParser, MultiPartParser)
    queryset = Organization.objects.all()
    permission_required = all_permissions.organizations_change
    serializer_class = OrganizationSerializer

    redirect_route = 'organizations-dashboard'
    redirect_kwarg = 'pk'

    def get(self, request, *args, **kwargs):
        return super(OrganizationAPI, self).get(request, *args, **kwargs)

    def patch(self, request, *args, **kwargs):
        return super(OrganizationAPI, self).patch(request, *args, **kwargs)

    @extend_schema(exclude=True)
    def put(self, request, *args, **kwargs):
        return super(OrganizationAPI, self).put(request, *args, **kwargs)


@method_decorator(
    name='get',
    decorator=extend_schema(
        tags=['Invites'],
        summary='Get organization invite link',
        description='Get a link to use to invite a new member to an organization in Label Studio Enterprise.',
        responses={200: OrganizationInviteSerializer()},
        extensions={
            'x-fern-sdk-group-name': 'organizations',
            'x-fern-sdk-method-name': 'get_invite',
            'x-fern-audiences': ['public'],
        },
    ),
)
class OrganizationInviteAPI(generics.RetrieveAPIView):
    parser_classes = (JSONParser,)
    queryset = Organization.objects.all()
    permission_required = all_permissions.organizations_invite

    def get(self, request, *args, **kwargs):
        org = request.user.active_organization
        invite_url = '{}?token={}'.format(reverse('user-signup'), org.token)
        if hasattr(settings, 'FORCE_SCRIPT_NAME') and settings.FORCE_SCRIPT_NAME:
            invite_url = invite_url.replace(settings.FORCE_SCRIPT_NAME, '', 1)
        serializer = OrganizationInviteSerializer(data={'invite_url': invite_url, 'token': org.token})
        serializer.is_valid()
        return Response(serializer.data, status=200)


@method_decorator(
    name='post',
    decorator=extend_schema(
        tags=['Invites'],
        summary='Reset organization token',
        description='Reset the token used in the invitation link to invite someone to an organization.',
        responses={200: OrganizationInviteSerializer()},
        extensions={
            'x-fern-sdk-group-name': 'organizations',
            'x-fern-sdk-method-name': 'reset_token',
            'x-fern-audiences': ['public'],
        },
    ),
)
class OrganizationResetTokenAPI(APIView):
    permission_required = all_permissions.organizations_invite
    parser_classes = (JSONParser,)

    def post(self, request, *args, **kwargs):
        org = request.user.active_organization
        org.reset_token()
        logger.debug(f'New token for organization {org.pk} is {org.token}')
        invite_url = '{}?token={}'.format(reverse('user-signup'), org.token)
        serializer = OrganizationInviteSerializer(data={'invite_url': invite_url, 'token': org.token})
        serializer.is_valid()
        return Response(serializer.data, status=201)
