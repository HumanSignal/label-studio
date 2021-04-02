"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import logging
import drf_yasg.openapi as openapi

from django_filters.rest_framework import DjangoFilterBackend
from drf_yasg.utils import swagger_auto_schema

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.authtoken.models import Token
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework import generics

from core.permissions import IsAuthenticated, CanModifyUserOrReadOnly
from users.models import User
from users.serializers import UserSerializer
from users.forms import UserProfileForm
from users.functions import check_avatar


logger = logging.getLogger(__name__)


class UserAPI(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [CanModifyUserOrReadOnly]
    filter_backends = [DjangoFilterBackend]
    parser_classes = (JSONParser, MultiPartParser, FormParser)

    @swagger_auto_schema(auto_schema=None, methods=['delete', 'post'])
    @action(detail=True, methods=['delete', 'post'])
    def avatar(self, request, pk):
        if request.method == 'POST':
            avatar = check_avatar(request.FILES)
            request.user.avatar = avatar
            request.user.save()
            return Response({'detail': 'avatar saved'}, status=200)

        elif request.method == 'DELETE':
            request.user.avatar = None
            request.user.save()
            return Response(status=204)

    @swagger_auto_schema(tags=['Users'], operation_summary='Save user details')
    def update(self, request, *args, **kwargs):
        form = UserProfileForm(data=request.data, files=request.FILES, instance=request.user)
        if form.is_valid():
            form.save()
            return Response({'detail': 'user details saved'}, status=200)

    @swagger_auto_schema(auto_schema=None)
    def list(self, request, *args, **kwargs):
        return super(UserAPI, self).list(request, *args, **kwargs)

    @swagger_auto_schema(auto_schema=None)
    def create(self, request, *args, **kwargs):
        return super(UserAPI, self).create(request, *args, **kwargs)

    @swagger_auto_schema(auto_schema=None)
    def retrieve(self, request, *args, **kwargs):
        return super(UserAPI, self).retrieve(request, *args, **kwargs)

    @swagger_auto_schema(auto_schema=None)
    def partial_update(self, request, *args, **kwargs):
        return super(UserAPI, self).partial_update(request, *args, **kwargs)

    @swagger_auto_schema(auto_schema=None)
    def destroy(self, request, *args, **kwargs):
        return super(UserAPI, self).destroy(request, *args, **kwargs)


class UserResetTokenAPI(APIView):
    parser_classes = (JSONParser, FormParser, MultiPartParser)
    queryset = User.objects.all()
    permission_classes = (CanModifyUserOrReadOnly,)

    @swagger_auto_schema(
        tags=['Users'],
        operation_summary='Reset user token',
        responses={
            201: openapi.Response(
                description='User token response',
                schema=openapi.Schema(
                    description='User token',
                    type=openapi.TYPE_OBJECT,
                    properties={
                        'token': openapi.Schema(
                            description='Token',
                            type=openapi.TYPE_STRING
                        )
                    }
                ))
        })
    def post(self, request, *args, **kwargs):
        user = request.user
        token = user.reset_token()
        logger.debug(f'New token for user {user.pk} is {token.key}')
        return Response({'token': token.key}, status=201)


class UserGetTokenAPI(APIView):
    parser_classes = (JSONParser,)
    permission_classes = (IsAuthenticated,)

    @swagger_auto_schema(
        tags=['Users'],
        operation_summary='Get user token',
        responses={
            200: openapi.Response(
                description='User token response',
                schema=openapi.Schema(description='User token', type=openapi.TYPE_STRING))
        })
    def get(self, request, *args, **kwargs):
        user = request.user
        token = Token.objects.get(user=user)
        return Response(str(token), status=200)


class UserWhoAmIAPI(generics.RetrieveAPIView):
    parser_classes = (JSONParser, FormParser, MultiPartParser)
    queryset = User.objects.all()
    permission_classes = (CanModifyUserOrReadOnly,)
    serializer_class = UserSerializer

    def get_object(self):
        return User.objects.get(id=self.request.user.id)

    @swagger_auto_schema(tags=['Users'], operation_summary='Retrieve my user')
    def get(self, request, *args, **kwargs):
        return super(UserWhoAmIAPI, self).get(request, *args, **kwargs)
