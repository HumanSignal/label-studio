import django_filters
from core.permissions import ViewClassPermission, all_permissions
from django.utils.decorators import method_decorator
from django_filters.rest_framework import DjangoFilterBackend
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiParameter, OpenApiResponse, extend_schema
from projects import models as project_models
from rest_framework import generics
from rest_framework.exceptions import NotFound
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Webhook, WebhookAction
from .serializers import WebhookSerializer, WebhookSerializerForUpdate


class WebhookFilterSet(django_filters.FilterSet):
    project = django_filters.ModelChoiceFilter(
        field_name='project', queryset=project_models.Project.objects.all(), null_label='isnull'
    )


@method_decorator(
    name='get',
    decorator=extend_schema(
        tags=['Webhooks'],
        summary='List all webhooks',
        description='List all webhooks set up for your organization.',
        parameters=[
            OpenApiParameter(
                name='project',
                type=OpenApiTypes.STR,
                location='query',
                description='Project ID',
            ),
        ],
        extensions={
            'x-fern-sdk-group-name': 'webhooks',
            'x-fern-sdk-method-name': 'list',
            'x-fern-audiences': ['public'],
        },
    ),
)
@method_decorator(
    name='post',
    decorator=extend_schema(
        tags=['Webhooks'],
        summary='Create a webhook',
        description='Create a webhook for your organization.',
        extensions={
            'x-fern-sdk-group-name': 'webhooks',
            'x-fern-sdk-method-name': 'create',
            'x-fern-audiences': ['public'],
        },
    ),
)
class WebhookListAPI(generics.ListCreateAPIView):
    queryset = Webhook.objects.all()
    serializer_class = WebhookSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_class = WebhookFilterSet
    permission_required = ViewClassPermission(
        GET=all_permissions.webhooks_view,
        POST=all_permissions.webhooks_change,
    )

    def get_queryset(self):
        return Webhook.objects.filter(organization=self.request.user.active_organization)

    def perform_create(self, serializer):
        project = serializer.validated_data.get('project')
        if project is None or project.organization_id != self.request.user.active_organization.id:
            raise NotFound('Project not found.')
        serializer.save(organization=self.request.user.active_organization)


@method_decorator(
    name='get',
    decorator=extend_schema(
        tags=['Webhooks'],
        summary='Get webhook info',
        extensions={
            'x-fern-sdk-group-name': 'webhooks',
            'x-fern-sdk-method-name': 'get',
            'x-fern-audiences': ['public'],
        },
    ),
)
@method_decorator(
    name='put',
    decorator=extend_schema(
        tags=['Webhooks'],
        summary='Save webhook info',
        request=WebhookSerializerForUpdate,
        extensions={
            'x-fern-audiences': ['internal'],
        },
    ),
)
@method_decorator(
    name='patch',
    decorator=extend_schema(
        tags=['Webhooks'],
        summary='Update webhook info',
        request=WebhookSerializerForUpdate,
        extensions={
            'x-fern-sdk-group-name': 'webhooks',
            'x-fern-sdk-method-name': 'update',
            'x-fern-audiences': ['public'],
        },
    ),
)
@method_decorator(
    name='delete',
    decorator=extend_schema(
        tags=['Webhooks'],
        summary='Delete webhook info',
        extensions={
            'x-fern-sdk-group-name': 'webhooks',
            'x-fern-sdk-method-name': 'delete',
            'x-fern-audiences': ['public'],
        },
    ),
)
class WebhookAPI(generics.RetrieveUpdateDestroyAPIView):
    queryset = Webhook.objects.all()
    serializer_class = WebhookSerializer
    permission_classes = [IsAuthenticated]
    permission_required = ViewClassPermission(
        GET=all_permissions.webhooks_view,
        PATCH=all_permissions.webhooks_change,
        PUT=all_permissions.webhooks_change,
        DELETE=all_permissions.webhooks_change,
    )

    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return WebhookSerializerForUpdate
        return super().get_serializer_class()

    def get_queryset(self):
        return Webhook.objects.filter(organization=self.request.user.active_organization)


@method_decorator(
    name='get',
    decorator=extend_schema(
        tags=['Webhooks'],
        summary='Get all webhook actions',
        description='Get descriptions of all available webhook actions to set up webhooks.',
        responses={
            200: OpenApiResponse(
                description='Object with webhook action descriptions.',
                response={
                    'type': 'object',
                    'properties': {
                        action: {
                            'type': 'object',
                            'properties': {
                                'name': {'type': 'string'},
                                'description': {'type': 'string'},
                                'key': {'type': 'string'},
                                'organization-only': {'type': 'boolean'},
                            },
                            'required': ['name', 'description', 'key', 'organization-only'],
                        }
                        for action in WebhookAction.ACTIONS.keys()
                    },
                },
            ),
        },
        parameters=[
            OpenApiParameter(
                name='organization-only',
                location='query',
                description='organization-only or not',
                type=OpenApiTypes.BOOL,
            )
        ],
        extensions={
            'x-fern-sdk-group-name': 'webhooks',
            'x-fern-sdk-method-name': 'info',
            'x-fern-audiences': ['public'],
        },
    ),
)
class WebhookInfoAPI(APIView):
    permission_classes = [AllowAny]

    def get(self, request, *args, **kwargs):
        result = {
            key: {
                'name': value['name'],
                'description': value['description'],
                'key': value['key'],
                'organization-only': value.get('organization-only', False),
            }
            for key, value in WebhookAction.ACTIONS.items()
        }
        organization_only = request.query_params.get('organization-only')
        if organization_only is not None:
            organization_only = organization_only == 'true'
            result = {
                key: value
                for key, value in result.items()
                if value.get('organization-only', False) == organization_only
            }
        return Response(data=result)
