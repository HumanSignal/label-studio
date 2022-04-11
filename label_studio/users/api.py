"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import logging
import drf_yasg.openapi as openapi

from django_filters.rest_framework import DjangoFilterBackend
from drf_yasg.utils import swagger_auto_schema
from django.utils.decorators import method_decorator

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.authtoken.models import Token
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import MethodNotAllowed

from core.permissions import all_permissions, ViewClassPermission
from users.models import User
from users.serializers import UserSerializer
from users.functions import check_avatar


logger = logging.getLogger(__name__)


@method_decorator(name='update', decorator=swagger_auto_schema(
    tags=['Users'],
    operation_summary='Save user details',
    operation_description="""
    Save details for a specific user, such as their name or contact information, in Label Studio.
    """,
    manual_parameters=[
        openapi.Parameter(
            name='id',
            type=openapi.TYPE_INTEGER,
            in_=openapi.IN_PATH,
            description='User ID'),
    ],
    request_body=UserSerializer
))
@method_decorator(name='list', decorator=swagger_auto_schema(
        tags=['Users'],
        operation_summary='List users',
        operation_description='List the users that exist on the Label Studio server.'
    ))
@method_decorator(name='create', decorator=swagger_auto_schema(
        tags=['Users'],
        operation_summary='Create new user',
        operation_description='Create a user in Label Studio.',
        request_body=UserSerializer
    ))
@method_decorator(name='retrieve', decorator=swagger_auto_schema(
        tags=['Users'],
        operation_summary='Get user info',
        operation_description='Get info about a specific Label Studio user, based on the user ID.',
        manual_parameters = [
            openapi.Parameter(
                name='id',
                type=openapi.TYPE_INTEGER,
                in_=openapi.IN_PATH,
                description='User ID'),
                ],
    ))
@method_decorator(name='partial_update', decorator=swagger_auto_schema(
        tags=['Users'],
        operation_summary='Update user details',
        operation_description="""
        Update details for a specific user, such as their name or contact information, in Label Studio.
        """,
        manual_parameters=[
            openapi.Parameter(
                name='id',
                type=openapi.TYPE_INTEGER,
                in_=openapi.IN_PATH,
                description='User ID'),
        ],
        request_body=UserSerializer
    ))
@method_decorator(name='destroy', decorator=swagger_auto_schema(
        tags=['Users'],
        operation_summary='Delete user',
        operation_description='Delete a specific Label Studio user.',
        manual_parameters=[
            openapi.Parameter(
                name='id',
                type=openapi.TYPE_INTEGER,
                in_=openapi.IN_PATH,
                description='User ID'),
        ],
    ))
class UserAPI(viewsets.ModelViewSet):
    serializer_class = UserSerializer
    permission_required = ViewClassPermission(
        GET=all_permissions.organizations_view,
        PUT=all_permissions.organizations_change,
        POST=all_permissions.organizations_change,
        PATCH=all_permissions.organizations_view,
        DELETE=all_permissions.organizations_change,
    )
    http_method_names = ['get', 'post', 'head', 'patch', 'delete']

    def get_queryset(self):
        return User.objects.filter(organizations=self.request.user.active_organization)

    @swagger_auto_schema(auto_schema=None, methods=['delete', 'post'])
    @action(detail=True, methods=['delete', 'post'], permission_required=all_permissions.avatar_any)
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

    def update(self, request, *args, **kwargs):
        return super(UserAPI, self).update(request, *args, **kwargs)

    def list(self, request, *args, **kwargs):
        return super(UserAPI, self).list(request, *args, **kwargs)

    def create(self, request, *args, **kwargs):
        return super(UserAPI, self).create(request, *args, **kwargs)

    def retrieve(self, request, *args, **kwargs):
        return super(UserAPI, self).retrieve(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        return super(UserAPI, self).partial_update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        return super(UserAPI, self).destroy(request, *args, **kwargs)


@method_decorator(name='post', decorator=swagger_auto_schema(
        tags=['Users'],
        operation_summary='Reset user token',
        operation_description='Reset the user token for the current user.',
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
        }))
class UserResetTokenAPI(APIView):
    parser_classes = (JSONParser, FormParser, MultiPartParser)
    queryset = User.objects.all()
    permission_classes = (IsAuthenticated,)

    def post(self, request, *args, **kwargs):
        user = request.user
        token = user.reset_token()
        logger.debug(f'New token for user {user.pk} is {token.key}')
        return Response({'token': token.key}, status=201)


@method_decorator(name='get', decorator=swagger_auto_schema(
        tags=['Users'],
        operation_summary='Get user token',
        operation_description='Get a user token to authenticate to the API as the current user.',
        responses={
            200: openapi.Response(
                description='User token response',
                type=openapi.TYPE_OBJECT,
                properties={
                    'detail': openapi.Schema(
                        description='Token',
                        type=openapi.TYPE_STRING
                    )
                }
            )
        }))
class UserGetTokenAPI(APIView):
    parser_classes = (JSONParser,)
    permission_classes = (IsAuthenticated,)
    
    def get(self, request, *args, **kwargs):
        user = request.user
        token = Token.objects.get(user=user)
        return Response({'token': str(token)}, status=200)


@method_decorator(name='get', decorator=swagger_auto_schema(
        tags=['Users'],
        operation_summary='Retrieve my user',
        operation_description='Retrieve details of the account that you are using to access the API.'
    ))
class UserWhoAmIAPI(generics.RetrieveAPIView):
    parser_classes = (JSONParser, FormParser, MultiPartParser)
    queryset = User.objects.all()
    permission_classes = (IsAuthenticated, )
    serializer_class = UserSerializer

    def get_object(self):
        return self.request.user

    def get(self, request, *args, **kwargs):
        return super(UserWhoAmIAPI, self).get(request, *args, **kwargs)
