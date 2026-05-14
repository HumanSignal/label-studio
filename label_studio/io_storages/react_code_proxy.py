import logging
import uuid
from datetime import timedelta

import jwt
from django.conf import settings
from django.contrib.auth import get_user_model
from django.http import HttpResponse
from django.utils import timezone
from drf_spectacular.utils import extend_schema
from projects.models import Project
from rest_framework import serializers, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from label_studio.io_storages.proxy_api import ResolveStorageUriAPIMixin

logger = logging.getLogger(__name__)

REACT_CODE_TOKEN_AUDIENCE = 'react-code-resolve'
REACT_CODE_TOKEN_TTL_DEFAULT = 3600
REACT_CODE_TOKEN_TTL_MIN = 60
REACT_CODE_TOKEN_TTL_MAX = 86400


class ReactCodeTokenSerializer(serializers.Serializer):
    project_id = serializers.IntegerField(required=True)
    ttl = serializers.IntegerField(
        required=False,
        default=REACT_CODE_TOKEN_TTL_DEFAULT,
        min_value=REACT_CODE_TOKEN_TTL_MIN,
        max_value=REACT_CODE_TOKEN_TTL_MAX,
    )


def generate_react_code_token(user, project_id: int, ttl: int = REACT_CODE_TOKEN_TTL_DEFAULT) -> tuple[str, int]:
    """Generate a scoped JWT for ReactCode iframe storage URL resolution."""
    ttl = max(REACT_CODE_TOKEN_TTL_MIN, min(ttl, REACT_CODE_TOKEN_TTL_MAX))
    now = timezone.now()
    exp = now + timedelta(seconds=ttl)
    payload = {
        'sub': str(user.id),
        'prj': project_id,
        'org': getattr(user, 'active_organization_id', None),
        'exp': int(exp.timestamp()),
        'iat': int(now.timestamp()),
        'jti': uuid.uuid4().hex,
        'aud': REACT_CODE_TOKEN_AUDIENCE,
    }
    token = jwt.encode(payload, settings.SECRET_KEY, algorithm='HS256')
    return token, ttl


def decode_react_code_token(token: str) -> dict:
    """Decode and validate a ReactCode JWT. Raises jwt.PyJWTError on failure."""
    return jwt.decode(
        token,
        settings.SECRET_KEY,
        algorithms=['HS256'],
        audience=REACT_CODE_TOKEN_AUDIENCE,
    )


def _add_cors_headers(response: HttpResponse) -> HttpResponse:
    response['Access-Control-Allow-Origin'] = '*'
    response['Access-Control-Allow-Methods'] = 'GET, OPTIONS'
    response['Access-Control-Allow-Headers'] = 'Range'
    response['Access-Control-Expose-Headers'] = 'Content-Range, Content-Length, Accept-Ranges, Content-Type, Location'
    return response


@extend_schema(exclude=True)
class ReactCodeTokenView(APIView):
    """Generate a scoped JWT for ReactCode iframe storage URL resolution.

    The token is tied to the authenticated user and a specific project.
    The iframe can then use this token in place of session cookies to resolve
    storage URIs via ReactCodeResolveView.
    """

    http_method_names = ['post']
    permission_classes = (IsAuthenticated,)

    def post(self, request, *args, **kwargs):
        serializer = ReactCodeTokenSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        project_id = serializer.validated_data['project_id']
        try:
            project = Project.objects.get(pk=project_id)
        except Project.DoesNotExist:
            return Response({'detail': 'Project not found.'}, status=status.HTTP_404_NOT_FOUND)

        if not project.has_permission(request.user):
            return Response(status=status.HTTP_403_FORBIDDEN)

        ttl = serializer.validated_data['ttl']
        token, expires_in = generate_react_code_token(request.user, project_id, ttl=ttl)
        return Response({'token': token, 'expires_in': expires_in})


@extend_schema(exclude=True)
class ReactCodeResolveView(ResolveStorageUriAPIMixin, APIView):
    """Token-authenticated proxy for storage URIs, used by ReactCode iframes.

    Authentication is performed via the JWT embedded in the URL path
    instead of session cookies, since the sandboxed iframe has an opaque
    origin and cannot send cookies.
    """

    http_method_names = ['get', 'options']
    permission_classes = ()
    authentication_classes = ()
    throttle_classes = ()

    def options(self, request, *args, **kwargs):
        response = HttpResponse(status=200)
        return _add_cors_headers(response)

    def get(self, request, *args, **kwargs):
        token = kwargs.get('token')
        fileuri = request.GET.get('fileuri')

        if not token or not fileuri:
            return _add_cors_headers(Response(status=status.HTTP_400_BAD_REQUEST))

        try:
            payload = decode_react_code_token(token)
        except jwt.ExpiredSignatureError:
            return _add_cors_headers(Response({'detail': 'Token has expired.'}, status=status.HTTP_401_UNAUTHORIZED))
        except jwt.PyJWTError as exc:
            logger.debug(f'ReactCode token validation failed: {exc}')
            return _add_cors_headers(Response({'detail': 'Invalid token.'}, status=status.HTTP_401_UNAUTHORIZED))

        user_id = payload.get('sub')
        project_id = payload.get('prj')

        if not user_id or not project_id:
            return _add_cors_headers(
                Response({'detail': 'Invalid token claims.'}, status=status.HTTP_401_UNAUTHORIZED)
            )

        User = get_user_model()
        try:
            user = User.objects.get(pk=user_id, is_active=True)
        except User.DoesNotExist:
            return _add_cors_headers(Response(status=status.HTTP_401_UNAUTHORIZED))

        try:
            project = Project.objects.get(pk=project_id)
        except Project.DoesNotExist:
            return _add_cors_headers(Response(status=status.HTTP_404_NOT_FOUND))

        request.user = user
        response = self.resolve(request, fileuri, project)
        return _add_cors_headers(response)
