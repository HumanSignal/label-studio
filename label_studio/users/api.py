"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license."""

import logging

from core.permissions import ViewClassPermission, all_permissions
from django.utils.decorators import method_decorator
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiParameter, OpenApiResponse, extend_schema
from rest_framework import generics, viewsets
from rest_framework.authtoken.models import Token
from rest_framework.decorators import action
from rest_framework.exceptions import MethodNotAllowed
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from users.functions import check_avatar
from users.models import User
from users.serializers import HotkeysSerializer, UserSerializer, UserSerializerUpdate, WhoAmIUserSerializer

logger = logging.getLogger(__name__)

_user_schema = {
    'type': 'object',
    'properties': {
        'id': {
            'type': 'integer',
            'description': 'User ID',
        },
        'first_name': {
            'type': 'string',
            'description': 'First name of the user',
        },
        'last_name': {
            'type': 'string',
            'description': 'Last name of the user',
        },
        'username': {
            'type': 'string',
            'description': 'Username of the user',
        },
        'email': {
            'type': 'string',
            'description': 'Email of the user',
        },
        'avatar': {
            'type': 'string',
            'description': 'Avatar URL of the user',
        },
        'initials': {
            'type': 'string',
            'description': 'Initials of the user',
        },
        'phone': {
            'type': 'string',
            'description': 'Phone number of the user',
        },
        'allow_newsletters': {
            'type': 'boolean',
            'description': 'Whether the user allows newsletters',
        },
    },
}


@method_decorator(
    name='update',
    decorator=extend_schema(
        tags=['Users'],
        summary='Save user details',
        description="""
    Save details for a specific user, such as their name or contact information, in Label Studio.
    """,
        parameters=[
            OpenApiParameter(name='id', type=OpenApiTypes.INT, location='path', description='User ID'),
        ],
        request=UserSerializer,
        extensions={
            'x-fern-audiences': ['internal'],
        },
    ),
)
@method_decorator(
    name='list',
    decorator=extend_schema(
        tags=['Users'],
        summary='List users',
        description='List the users that exist on the Label Studio server.',
        extensions={
            'x-fern-sdk-group-name': 'users',
            'x-fern-sdk-method-name': 'list',
            'x-fern-audiences': ['public'],
        },
    ),
)
@method_decorator(
    name='create',
    decorator=extend_schema(
        tags=['Users'],
        summary='Create new user',
        description='Create a user in Label Studio.',
        request={
            'application/json': _user_schema,
        },
        responses={201: UserSerializer},
        extensions={
            'x-fern-sdk-group-name': 'users',
            'x-fern-sdk-method-name': 'create',
            'x-fern-audiences': ['public'],
        },
    ),
)
@method_decorator(
    name='retrieve',
    decorator=extend_schema(
        tags=['Users'],
        summary='Get user info',
        description='Get info about a specific Label Studio user, based on the user ID.',
        parameters=[
            OpenApiParameter(name='id', type=OpenApiTypes.INT, location='path', description='User ID'),
        ],
        request=None,
        responses={200: UserSerializer},
        extensions={
            'x-fern-sdk-group-name': 'users',
            'x-fern-sdk-method-name': 'get',
            'x-fern-audiences': ['public'],
        },
    ),
)
@method_decorator(
    name='partial_update',
    decorator=extend_schema(
        tags=['Users'],
        summary='Update user details',
        description="""
        Update details for a specific user, such as their name or contact information, in Label Studio.
        """,
        parameters=[
            OpenApiParameter(name='id', type=OpenApiTypes.INT, location='path', description='User ID'),
        ],
        request={
            'application/json': _user_schema,
        },
        responses={200: UserSerializer},
        extensions={
            'x-fern-sdk-group-name': 'users',
            'x-fern-sdk-method-name': 'update',
            'x-fern-audiences': ['public'],
        },
    ),
)
@method_decorator(
    name='destroy',
    decorator=extend_schema(
        tags=['Users'],
        summary='Delete user',
        description='Delete a specific Label Studio user.',
        parameters=[
            OpenApiParameter(name='id', type=OpenApiTypes.INT, location='path', description='User ID'),
        ],
        request=None,
        extensions={
            'x-fern-sdk-group-name': 'users',
            'x-fern-sdk-method-name': 'delete',
            'x-fern-audiences': ['public'],
        },
    ),
)
class UserAPI(viewsets.ModelViewSet):
    serializer_class = UserSerializer
    permission_required = ViewClassPermission(
        GET=all_permissions.organizations_change,
        PUT=all_permissions.organizations_change,
        POST=all_permissions.organizations_change,
        PATCH=all_permissions.organizations_view,
        DELETE=all_permissions.organizations_change,
    )
    http_method_names = ['get', 'post', 'head', 'patch', 'delete']

    def get_queryset(self):
        return User.objects.filter(organizations=self.request.user.active_organization)

    @extend_schema(exclude=True)
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

    def get_serializer_class(self):
        if self.request.method in {'PUT', 'PATCH'}:
            return UserSerializerUpdate
        return super().get_serializer_class()

    def get_serializer_context(self):
        context = super(UserAPI, self).get_serializer_context()
        context['user'] = self.request.user
        return context

    def update(self, request, *args, **kwargs):
        return super(UserAPI, self).update(request, *args, **kwargs)

    def list(self, request, *args, **kwargs):
        return super(UserAPI, self).list(request, *args, **kwargs)

    def create(self, request, *args, **kwargs):
        return super(UserAPI, self).create(request, *args, **kwargs)

    def perform_create(self, serializer):
        instance = serializer.save()
        self.request.user.active_organization.add_user(instance)

    def retrieve(self, request, *args, **kwargs):
        return super(UserAPI, self).retrieve(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        result = super(UserAPI, self).partial_update(request, *args, **kwargs)

        # throw MethodNotAllowed if read-only fields are attempted to be updated
        read_only_fields = self.get_serializer_class().Meta.read_only_fields
        for field in read_only_fields:
            if field in request.data:
                raise MethodNotAllowed('PATCH', detail=f'Cannot update read-only field: {field}')

        # newsletters
        if 'allow_newsletters' in request.data:
            user = User.objects.get(id=request.user.id)  # we need an updated user
            request.user.advanced_json = {  # request.user instance will be unchanged in request all the time
                'email': user.email,
                'allow_newsletters': user.allow_newsletters,
                'update-notifications': 1,
                'new-user': 0,
            }
        return result

    def destroy(self, request, *args, **kwargs):
        return super(UserAPI, self).destroy(request, *args, **kwargs)


@method_decorator(
    name='post',
    decorator=extend_schema(
        tags=['Users'],
        summary='Reset user token',
        description='Reset the user token for the current user.',
        request=None,
        responses={
            201: OpenApiResponse(
                description='User token response',
                response={
                    'type': 'object',
                    'properties': {'token': {'type': 'string'}},
                },
            )
        },
        extensions={
            'x-fern-sdk-group-name': 'users',
            'x-fern-sdk-method-name': 'reset_token',
            'x-fern-audiences': ['public'],
        },
    ),
)
class UserResetTokenAPI(APIView):
    parser_classes = (JSONParser, FormParser, MultiPartParser)
    queryset = User.objects.all()
    permission_required = all_permissions.users_token_any

    def post(self, request, *args, **kwargs):
        user = request.user
        token = user.reset_token()
        logger.debug(f'New token for user {user.pk} is {token.key}')
        return Response({'token': token.key}, status=201)


@method_decorator(
    name='get',
    decorator=extend_schema(
        tags=['Users'],
        summary='Get user token',
        description='Get a user token to authenticate to the API as the current user.',
        request=None,
        responses={
            200: OpenApiResponse(
                description='User token response',
                response={
                    'type': 'object',
                    'properties': {'detail': {'type': 'string'}},
                },
            )
        },
        extensions={
            'x-fern-sdk-group-name': 'users',
            'x-fern-sdk-method-name': 'get_token',
            'x-fern-audiences': ['public'],
        },
    ),
)
class UserGetTokenAPI(APIView):
    parser_classes = (JSONParser,)
    permission_required = all_permissions.users_token_any

    def get(self, request, *args, **kwargs):
        user = request.user
        token = Token.objects.get(user=user)
        return Response({'token': str(token)}, status=200)


@method_decorator(
    name='get',
    decorator=extend_schema(
        tags=['Users'],
        summary='Retrieve my user',
        description='Retrieve details of the account that you are using to access the API.',
        request=None,
        responses={200: WhoAmIUserSerializer},
        extensions={
            'x-fern-sdk-group-name': 'users',
            'x-fern-sdk-method-name': 'whoami',
            'x-fern-audiences': ['public'],
        },
    ),
)
class UserWhoAmIAPI(generics.RetrieveAPIView):
    parser_classes = (JSONParser, FormParser, MultiPartParser)
    queryset = User.objects.all()
    permission_classes = (IsAuthenticated,)
    serializer_class = WhoAmIUserSerializer

    def get_object(self):
        return self.request.user

    def get(self, request, *args, **kwargs):
        return super(UserWhoAmIAPI, self).get(request, *args, **kwargs)


@method_decorator(
    name='patch',
    decorator=extend_schema(
        tags=['Users'],
        summary='Update user hotkeys',
        description='Update the custom hotkeys configuration for the current user.',
        request=HotkeysSerializer,
        responses={200: HotkeysSerializer},
        extensions={
            'x-fern-sdk-group-name': 'users',
            'x-fern-sdk-method-name': 'update_hotkeys',
            'x-fern-audiences': ['public'],
        },
    ),
)
@method_decorator(
    name='get',
    decorator=extend_schema(
        tags=['Users'],
        summary='Get user hotkeys',
        description='Retrieve the custom hotkeys configuration for the current user.',
        request=None,
        responses={200: HotkeysSerializer},
        extensions={
            'x-fern-sdk-group-name': 'users',
            'x-fern-sdk-method-name': 'get_hotkeys',
            'x-fern-audiences': ['public'],
        },
    ),
)
class UserHotkeysAPI(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = (JSONParser, FormParser, MultiPartParser)

    def get(self, request, *args, **kwargs):
        """Retrieve the current user's hotkeys configuration"""
        try:
            user = request.user
            custom_hotkeys = user.custom_hotkeys or {}

            serializer = HotkeysSerializer(data={'custom_hotkeys': custom_hotkeys})
            if serializer.is_valid():
                return Response(serializer.validated_data, status=200)
            else:
                # If stored data is invalid, return empty config
                logger.warning(f'Invalid hotkeys data for user {user.pk}: {serializer.errors}')
                return Response({'custom_hotkeys': {}}, status=200)

        except Exception as e:
            logger.error(f'Error retrieving hotkeys for user {request.user.pk}: {str(e)}')
            return Response({'error': 'Failed to retrieve hotkeys configuration'}, status=500)

    def patch(self, request, *args, **kwargs):
        """Update the current user's hotkeys configuration"""
        try:
            serializer = HotkeysSerializer(data=request.data)

            if not serializer.is_valid():
                return Response({'error': 'Invalid hotkeys configuration', 'details': serializer.errors}, status=400)

            user = request.user

            # Security check: Ensure user can only update their own hotkeys
            if not user.is_authenticated:
                return Response({'error': 'Authentication required'}, status=401)

            # Update user's hotkeys
            user.custom_hotkeys = serializer.validated_data['custom_hotkeys']
            user.save(update_fields=['custom_hotkeys'])

            logger.info(f'Updated hotkeys for user {user.pk}')

            return Response(serializer.validated_data, status=200)

        except Exception as e:
            logger.error(f'Error updating hotkeys for user {request.user.pk}: {str(e)}')
            return Response({'error': 'Failed to update hotkeys configuration'}, status=500)
