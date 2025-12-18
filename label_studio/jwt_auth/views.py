import logging
from datetime import datetime

from core.permissions import ViewClassPermission, all_permissions
from django.utils.decorators import method_decorator
from drf_spectacular.utils import extend_schema
from jwt_auth.auth import TokenAuthenticationPhaseout
from jwt_auth.models import LSAPIToken, TruncatedLSAPIToken
from jwt_auth.serializers import (
    JWTSettingsSerializer,
    LSAPITokenCreateSerializer,
    LSAPITokenListSerializer,
    TokenRefreshResponseSerializer,
    TokenRotateResponseSerializer,
)
from rest_framework import generics, status
from rest_framework.authentication import SessionAuthentication
from rest_framework.exceptions import APIException
from rest_framework.generics import CreateAPIView
from rest_framework.response import Response
from rest_framework.settings import api_settings
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import TokenBackendError, TokenError
from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken, OutstandingToken
from rest_framework_simplejwt.views import TokenRefreshView, TokenViewBase

logger = logging.getLogger(__name__)


class TokenExistsError(APIException):
    status_code = status.HTTP_409_CONFLICT
    default_detail = 'You already have a valid token. Please revoke it before creating a new one.'
    default_code = 'token_exists'


@method_decorator(
    name='get',
    decorator=extend_schema(
        tags=['JWT'],
        summary='Retrieve JWT Settings',
        description='Retrieve JWT settings for the currently active organization.',
        extensions={
            'x-fern-sdk-group-name': 'jwt_settings',
            'x-fern-sdk-method-name': 'get',
            'x-fern-audiences': ['public'],
        },
    ),
)
@method_decorator(
    name='post',
    decorator=extend_schema(
        tags=['JWT'],
        summary='Update JWT Settings',
        description='Update JWT settings for the currently active organization.',
        extensions={
            'x-fern-sdk-group-name': 'jwt_settings',
            'x-fern-sdk-method-name': 'update',
            'x-fern-audiences': ['public'],
        },
    ),
)
class JWTSettingsAPI(CreateAPIView):
    serializer_class = JWTSettingsSerializer
    permission_required = ViewClassPermission(
        GET=all_permissions.organizations_view,
        POST=all_permissions.organizations_change,
    )

    def get_object(self):
        jwt = self.request.user.active_organization.jwt
        self.check_object_permissions(self.request, jwt)
        return jwt

    def get(self, request, *args, **kwargs):
        jwt_settings = self.get_object()
        return Response(self.get_serializer(jwt_settings).data)

    def post(self, request, *args, **kwargs):
        jwt_settings = self.get_object()
        serializer = self.get_serializer(data=request.data, instance=jwt_settings)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class DecoratedTokenRefreshView(TokenRefreshView):
    @extend_schema(
        tags=['JWT'],
        summary='Refresh JWT token',
        description='Get a new access token, using a refresh token.',
        responses={
            status.HTTP_200_OK: TokenRefreshResponseSerializer,
        },
        extensions={
            'x-fern-sdk-group-name': 'tokens',
            'x-fern-sdk-method-name': 'refresh',
            'x-fern-audiences': ['public'],
        },
    )
    def post(self, request, *args, **kwargs):
        return super().post(request, *args, **kwargs)


@method_decorator(
    name='get',
    decorator=extend_schema(
        tags=['JWT'],
        summary='List API tokens',
        description='List all API tokens for the current user.',
        responses={
            status.HTTP_200_OK: LSAPITokenListSerializer,
        },
        extensions={
            'x-fern-sdk-group-name': 'tokens',
            'x-fern-sdk-method-name': 'list',
            'x-fern-audiences': ['public'],
        },
    ),
)
@method_decorator(
    name='post',
    decorator=extend_schema(
        tags=['JWT'],
        summary='Create API token',
        description='Create a new API token for the current user.',
        responses={
            status.HTTP_201_CREATED: LSAPITokenCreateSerializer,
        },
        extensions={
            'x-fern-sdk-group-name': 'tokens',
            'x-fern-sdk-method-name': 'create',
            'x-fern-audiences': ['public'],
        },
    ),
)
class LSAPITokenView(generics.ListCreateAPIView):
    permission_required = all_permissions.users_token_any
    token_class = LSAPIToken

    def get_queryset(self):
        """Returns all non-expired non-blacklisted tokens for the current user.

        The `list` method handles filtering for refresh tokens (as opposed to access tokens),
        since simple-jwt makes it hard to do this at the DB level."""
        # Notably, if the list of non-expired blacklisted tokens ever gets too long
        # (e.g. users from orgs who have not set a token expiration for their org
        # revoke enough tokens for this to blow up), this will become inefficient.
        # Would be ideal to just add a "blacklisted" attr to our own subclass of
        # OutstandingToken so we can check at that level, or just clean up
        # OutstandingTokens that have been blacklisted every so often.
        current_blacklisted_tokens = BlacklistedToken.objects.filter(token__expires_at__gt=datetime.now()).values_list(
            'token_id', flat=True
        )
        return OutstandingToken.objects.filter(user_id=self.request.user.id, expires_at__gt=datetime.now()).exclude(
            id__in=current_blacklisted_tokens
        )

    def list(self, request, *args, **kwargs):
        all_tokens = self.get_queryset()

        def _maybe_get_token(token: OutstandingToken):
            try:
                return TruncatedLSAPIToken(str(token.token))
            except (TokenError, TokenBackendError) as e:  # expired/invalid token
                logger.debug('JWT API token validation failed: %s', e)
                return None

        # Annoyingly, token_type not stored directly so we have to filter it here.
        # Shouldn't be many unexpired tokens to iterate through.
        token_objects = list(filter(None, [_maybe_get_token(token) for token in all_tokens]))
        refresh_tokens = [tok for tok in token_objects if tok['token_type'] == 'refresh']

        serializer = self.get_serializer(refresh_tokens, many=True)
        data = serializer.data
        return Response(data)

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return LSAPITokenCreateSerializer
        return LSAPITokenListSerializer

    def perform_create(self, serializer) -> None:
        # Check for existing valid tokens
        existing_tokens = self.get_queryset()
        if existing_tokens.exists():
            raise TokenExistsError()

        token = self.token_class.for_user(self.request.user)
        serializer.instance = token


class LSTokenBlacklistView(TokenViewBase):
    _serializer_class = 'jwt_auth.serializers.LSAPITokenBlacklistSerializer'

    @extend_schema(
        tags=['JWT'],
        summary='Blacklist a JWT refresh token',
        description='Adds a JWT refresh token to the blacklist, preventing it from being used to obtain new access tokens.',
        responses={
            status.HTTP_204_NO_CONTENT: 'Token was successfully blacklisted',
            status.HTTP_404_NOT_FOUND: 'Token is already blacklisted',
        },
        extensions={
            'x-fern-sdk-group-name': 'tokens',
            'x-fern-sdk-method-name': 'blacklist',
            'x-fern-audiences': ['public'],
        },
    )
    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        try:
            # Notably, simple jwt's serializer (which we inherit from) calls
            # .blacklist() on the token under the hood
            serializer.is_valid(raise_exception=True)
        except TokenError as e:
            logger.error('Token error occurred while trying to blacklist a token: %s', str(e), exc_info=True)
            return Response({'detail': 'Token is invalid or already blacklisted.'}, status=status.HTTP_404_NOT_FOUND)

        return Response(status=status.HTTP_204_NO_CONTENT)


class LSAPITokenRotateView(TokenViewBase):
    # Have to explicitly set authentication_classes here, due to how auth works in our middleware, request.user is not set
    # properly before executing the view.
    authentication_classes = [JWTAuthentication, TokenAuthenticationPhaseout, SessionAuthentication]
    permission_classes = api_settings.DEFAULT_PERMISSION_CLASSES
    permission_required = all_permissions.users_token_any
    _serializer_class = 'jwt_auth.serializers.LSAPITokenRotateSerializer'
    token_class = LSAPIToken

    @extend_schema(
        tags=['JWT'],
        summary='Rotate JWT refresh token',
        description='Creates a new JWT refresh token and blacklists the current one.',
        responses={
            status.HTTP_200_OK: TokenRotateResponseSerializer,
            status.HTTP_400_BAD_REQUEST: 'Invalid token or token already blacklisted',
        },
        extensions={
            'x-fern-sdk-group-name': 'tokens',
            'x-fern-sdk-method-name': 'rotate',
            'x-fern-audiences': ['public'],
        },
    )
    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        current_token = serializer.validated_data['refresh']

        # Blacklist the current token
        try:
            current_token.blacklist()
        except TokenError:
            return Response({'detail': 'Token is invalid or already blacklisted.'}, status=status.HTTP_400_BAD_REQUEST)

        # Create a new token for the user
        new_token = self.create_token(request.user)
        return Response({'refresh': new_token.get_full_jwt()}, status=status.HTTP_200_OK)

    def create_token(self, user):
        """Create a new token for the user. Can be overridden by child classes to use different token classes."""
        return self.token_class.for_user(user)
