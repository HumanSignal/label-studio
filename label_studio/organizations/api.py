"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import logging

from django.urls import reverse
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework import generics
from rest_framework.views import APIView
from rest_framework.response import Response

from drf_yasg.utils import swagger_auto_schema

from core.mixins import APIViewVirtualRedirectMixin, APIViewVirtualMethodMixin
from core.permissions import IsAuthenticated, BaseRulesPermission
from core.utils.common import get_object_with_check_and_log

from organizations.models import Organization
from organizations.serializers import (
    OrganizationSerializer, OrganizationIdSerializer, OrganizationMemberUserSerializer, OrganizationInviteSerializer
)


logger = logging.getLogger(__name__)


class OrganizationAPIPermissions(BaseRulesPermission):
    perm = 'organizations.change_organization'


class OrganizationListAPI(generics.ListCreateAPIView):
    """
    get:
    List your organizations

    Return a list of the organizations you've created.
    """
    parser_classes = (JSONParser, FormParser, MultiPartParser)
    permission_classes = (IsAuthenticated, OrganizationAPIPermissions)
    serializer_class = OrganizationIdSerializer

    def get_object(self):
        org = get_object_with_check_and_log(self.request, Organization, pk=self.kwargs[self.lookup_field])
        self.check_object_permissions(self.request, org)
        return org

    def get_queryset(self):
        return Organization.objects.filter(created_by=self.request.user)

    @swagger_auto_schema(tags=['Organizations'])
    def get(self, request, *args, **kwargs):
        return super(OrganizationListAPI, self).get(request, *args, **kwargs)

    @swagger_auto_schema(auto_schema=None)
    def post(self, request, *args, **kwargs):
        return super(OrganizationListAPI, self).post(request, *args, **kwargs)


class OrganizationMemberListAPI(generics.ListAPIView):
    """
    get:
    Get organization members list

    Retrieve a list of the organization members.
    """

    parser_classes = (JSONParser, FormParser, MultiPartParser)
    permission_classes = (IsAuthenticated, OrganizationAPIPermissions)
    serializer_class = OrganizationMemberUserSerializer

    def get_queryset(self):
        org = get_object_with_check_and_log(self.request, Organization, pk=self.kwargs[self.lookup_field])
        self.check_object_permissions(self.request, org)
        return org.members

    @swagger_auto_schema(tags=['Organizations'])
    def get(self, request, *args, **kwargs):
        return super(OrganizationMemberListAPI, self).get(request, *args, **kwargs)


class OrganizationAPI(APIViewVirtualRedirectMixin,
                      APIViewVirtualMethodMixin,
                      generics.RetrieveUpdateAPIView):
    """
    get:
    Get organization settings

    Retrieve the settings for a specific organization.

    patch:
    Update organization settings

    Update the settings for a specific organization.
    """
    parser_classes = (JSONParser, FormParser, MultiPartParser)
    queryset = Organization.objects.all()
    permission_classes = (IsAuthenticated, OrganizationAPIPermissions)
    serializer_class = OrganizationSerializer

    redirect_route = 'organizations-dashboard'
    redirect_kwarg = 'pk'

    def get_object(self):
        org = get_object_with_check_and_log(self.request, Organization, pk=self.kwargs[self.lookup_field])
        self.check_object_permissions(self.request, org)
        return org

    @swagger_auto_schema(tags=['Organizations'])
    def get(self, request, *args, **kwargs):
        return super(OrganizationAPI, self).get(request, *args, **kwargs)

    @swagger_auto_schema(tags=['Organizations'])
    def patch(self, request, *args, **kwargs):
        return super(OrganizationAPI, self).patch(request, *args, **kwargs)

    @swagger_auto_schema(auto_schema=None)
    def post(self, request, *args, **kwargs):
        return super(OrganizationAPI, self).post(request, *args, **kwargs)

    @swagger_auto_schema(auto_schema=None)
    def put(self, request, *args, **kwargs):
        return super(OrganizationAPI, self).put(request, *args, **kwargs)


class OrganizationInviteAPI(APIView):
    parser_classes = (JSONParser,)
    permission_classes = (IsAuthenticated,)

    @swagger_auto_schema(
        tags=["Invites"],
        operation_summary='Get organization invite link',
        responses={200: OrganizationInviteSerializer()}
    )
    def get(self, request, *args, **kwargs):
        org = get_object_with_check_and_log(self.request, Organization, pk=request.user.active_organization_id)
        self.check_object_permissions(self.request, org)
        invite_url = '{}?token={}'.format(reverse('user-signup'), org.token)
        serializer = OrganizationInviteSerializer(data={'invite_url': invite_url, 'token': org.token})
        serializer.is_valid()
        return Response(serializer.data, status=200)


class OrganizationResetTokenAPI(APIView):
    parser_classes = (JSONParser,)
    permission_classes = (IsAuthenticated,)

    @swagger_auto_schema(
        tags=["Invites"],
        operation_summary='Reset organization token',
        responses={200: OrganizationInviteSerializer()}
    )
    def post(self, request, *args, **kwargs):
        org = get_object_with_check_and_log(self.request, Organization, pk=request.user.active_organization_id)
        self.check_object_permissions(self.request, org)
        org.reset_token()
        logger.debug(f'New token for organization {org.pk} is {org.token}')
        invite_url = '{}?token={}'.format(reverse('user-signup'), org.token)
        serializer = OrganizationInviteSerializer(data={'invite_url': invite_url, 'token': org.token})
        serializer.is_valid()
        return Response(serializer.data, status=201)

