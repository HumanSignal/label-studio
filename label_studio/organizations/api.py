"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import logging

from django.urls import reverse
from django.conf import settings
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework import generics
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination

from drf_yasg.utils import swagger_auto_schema  # type: ignore[import]
from drf_yasg import openapi  # type: ignore[import]
from django.utils.decorators import method_decorator

from core.permissions import all_permissions, ViewClassPermission
from core.utils.params import bool_from_request

from organizations.models import Organization
from organizations.serializers import (
    OrganizationSerializer, OrganizationIdSerializer, OrganizationMemberUserSerializer, OrganizationInviteSerializer,
    OrganizationsParamsSerializer
)
from core.feature_flags import flag_set  # type: ignore[attr-defined]

logger = logging.getLogger(__name__)


@method_decorator(name='get', decorator=swagger_auto_schema(
        tags=['Organizations'],
        operation_summary='List your organizations',
        operation_description="""
        Return a list of the organizations you've created or that you have access to.
        """
    ))
class OrganizationListAPI(generics.ListCreateAPIView):  # type: ignore[type-arg]
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

    def filter_queryset(self, queryset):  # type: ignore[no-untyped-def]
        return queryset.filter(users=self.request.user).distinct()

    def get(self, request, *args, **kwargs):  # type: ignore[no-untyped-def]
        return super(OrganizationListAPI, self).get(request, *args, **kwargs)

    @swagger_auto_schema(auto_schema=None)
    def post(self, request, *args, **kwargs):  # type: ignore[no-untyped-def]
        return super(OrganizationListAPI, self).post(request, *args, **kwargs)


class OrganizationMemberPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'

    def get_page_size(self, request):  # type: ignore[no-untyped-def]
        # emulate "unlimited" page_size
        if self.page_size_query_param in request.query_params and request.query_params[self.page_size_query_param] == '-1':
            return 1000000
        return super().get_page_size(request)


@method_decorator(name='get', decorator=swagger_auto_schema(
        tags=['Organizations'],
        operation_summary='Get organization members list',
        operation_description='Retrieve a list of the organization members and their IDs.',
        manual_parameters=[
            openapi.Parameter(
                name='id',
                type=openapi.TYPE_INTEGER,
                in_=openapi.IN_PATH,
                description='A unique integer value identifying this organization.'),
        ],
    ))
class OrganizationMemberListAPI(generics.ListAPIView):  # type: ignore[type-arg]

    parser_classes = (JSONParser, FormParser, MultiPartParser)
    permission_required = ViewClassPermission(
        GET=all_permissions.organizations_view,
        PUT=all_permissions.organizations_change,
        PATCH=all_permissions.organizations_change,
        DELETE=all_permissions.organizations_change,
    )
    serializer_class = OrganizationMemberUserSerializer
    pagination_class = OrganizationMemberPagination

    def get_serializer_context(self):  # type: ignore[no-untyped-def]
        return {
            'contributed_to_projects': bool_from_request(self.request.GET, 'contributed_to_projects', False),  # type: ignore[no-untyped-call]
            'request': self.request
        }

    def get_queryset(self):  # type: ignore[no-untyped-def]
        org = generics.get_object_or_404(self.request.user.organizations, pk=self.kwargs[self.lookup_field])  # type: ignore[union-attr]
        if flag_set('fix_backend_dev_3134_exclude_deactivated_users', self.request.user):  # type: ignore[no-untyped-call]
            serializer = OrganizationsParamsSerializer(data=self.request.GET)
            serializer.is_valid(raise_exception=True)
            active = serializer.validated_data.get('active')
            
            # return only active users (exclude DISABLED and NOT_ACTIVATED)
            if active:
                return org.active_members.order_by('user__username')
            
            # organization page to show all members
            return org.members.order_by('user__username')
        else:
            return org.members.order_by('user__username')


@method_decorator(name='get', decorator=swagger_auto_schema(
        tags=['Organizations'],
        operation_summary=' Get organization settings',
        operation_description='Retrieve the settings for a specific organization by ID.'
    ))
@method_decorator(name='patch', decorator=swagger_auto_schema(
        tags=['Organizations'],
        operation_summary='Update organization settings',
        operation_description='Update the settings for a specific organization by ID.'
    ))
class OrganizationAPI(generics.RetrieveUpdateAPIView):  # type: ignore[type-arg]

    parser_classes = (JSONParser, FormParser, MultiPartParser)
    queryset = Organization.objects.all()
    permission_required = all_permissions.organizations_change
    serializer_class = OrganizationSerializer

    redirect_route = 'organizations-dashboard'
    redirect_kwarg = 'pk'

    def get(self, request, *args, **kwargs):  # type: ignore[no-untyped-def]
        return super(OrganizationAPI, self).get(request, *args, **kwargs)

    def patch(self, request, *args, **kwargs):  # type: ignore[no-untyped-def]
        return super(OrganizationAPI, self).patch(request, *args, **kwargs)

    @swagger_auto_schema(auto_schema=None)
    def put(self, request, *args, **kwargs):  # type: ignore[no-untyped-def]
        return super(OrganizationAPI, self).put(request, *args, **kwargs)


@method_decorator(name='get', decorator=swagger_auto_schema(
        tags=["Invites"],
        operation_summary='Get organization invite link',
        operation_description='Get a link to use to invite a new member to an organization in Label Studio Enterprise.',
        responses={200: OrganizationInviteSerializer()}
    ))
class OrganizationInviteAPI(generics.RetrieveAPIView):  # type: ignore[type-arg]
    parser_classes = (JSONParser,)
    queryset = Organization.objects.all()
    permission_required = all_permissions.organizations_change

    def get(self, request, *args, **kwargs):  # type: ignore[no-untyped-def]
        org = request.user.active_organization
        invite_url = '{}?token={}'.format(reverse('user-signup'), org.token)
        if hasattr(settings, 'FORCE_SCRIPT_NAME') and settings.FORCE_SCRIPT_NAME:
            invite_url = invite_url.replace(settings.FORCE_SCRIPT_NAME, '', 1)
        serializer = OrganizationInviteSerializer(data={'invite_url': invite_url, 'token': org.token})
        serializer.is_valid()
        return Response(serializer.data, status=200)


@method_decorator(name='post', decorator=swagger_auto_schema(
        tags=["Invites"],
        operation_summary='Reset organization token',
        operation_description='Reset the token used in the invitation link to invite someone to an organization.',
        responses={200: OrganizationInviteSerializer()}
    ))
class OrganizationResetTokenAPI(APIView):
    permission_required = all_permissions.organizations_invite
    parser_classes = (JSONParser,)

    def post(self, request, *args, **kwargs):  # type: ignore[no-untyped-def]
        org = request.user.active_organization
        org.reset_token()
        logger.debug(f'New token for organization {org.pk} is {org.token}')
        invite_url = '{}?token={}'.format(reverse('user-signup'), org.token)
        serializer = OrganizationInviteSerializer(data={'invite_url': invite_url, 'token': org.token})
        serializer.is_valid()
        return Response(serializer.data, status=201)
