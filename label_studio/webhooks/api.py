import django_filters
from core.permissions import ViewClassPermission, all_permissions
from django.utils.decorators import method_decorator
from django_filters.rest_framework import DjangoFilterBackend
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiParameter, OpenApiResponse, extend_schema
from projects import models as project_models
from projects.access import manageable_project_filter
from projects.action_permissions import ensure_org_owner, ensure_project_manage
from rest_framework import generics
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Webhook, WebhookAction
from .serializers import WebhookSerializer, WebhookSerializerForUpdate


def _webhook_project_reassigned(data, current_project_id) -> bool:
    """Return whether an update moves a webhook onto another project.

    Responsibility: detect a project change before the webhook serializer saves.

    Boundary: an omitted project field is not a change. Clearing a project
    webhook, or pointing it at a different id, is a change. This does not
    persist the row.
    """
    if not hasattr(data, '__contains__') or 'project' not in data:
        return False
    raw = data.get('project')
    if raw in (None, ''):
        return current_project_id is not None
    try:
        return int(raw) != current_project_id
    except (TypeError, ValueError):
        return True


def _authorize_webhook_target(user, project_value):
    """Require the organization owner or a manager of the named project.

    Responsibility: authorize a webhook save before serializer validation.

    Boundary: a missing project is an organization webhook and requires the
    organization owner. An unknown project is ``NotFound``. A visible project
    the user cannot manage is ``PermissionDenied``. ``user.project`` is set
    only after a project check succeeds. Does not call ``user.has_perm``.
    """
    if project_value in (None, ''):
        ensure_org_owner(user, user.active_organization)
        return None
    try:
        project = project_models.Project.objects.filter(pk=project_value).first()
    except (TypeError, ValueError):
        raise ValidationError('Select a project in this organization.')
    if project is None:
        raise NotFound()
    ensure_project_manage(user, project)
    user.project = project
    return project


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
        user = self.request.user
        organization = user.active_organization
        queryset = Webhook.objects.filter(organization=organization)
        project_param = self.request.query_params.get('project')
        if project_param in ('', 'null', 'isnull'):
            ensure_org_owner(user, organization)
            return queryset.filter(project__isnull=True)
        if project_param is None:
            try:
                ensure_org_owner(user, organization)
            except PermissionDenied:
                managed = project_models.Project.objects.filter(manageable_project_filter(user))
                return queryset.filter(project__in=managed)
            except NotFound:
                return queryset.none()
            return queryset
        project = generics.get_object_or_404(project_models.Project, pk=project_param)
        ensure_project_manage(user, project)
        user.project = project
        return queryset.filter(project=project)

    def create(self, request, *args, **kwargs):
        project_value = request.data.get('project') if hasattr(request.data, 'get') else None
        if hasattr(request.data, '__contains__') and 'project' not in request.data:
            project_value = None
        _authorize_webhook_target(request.user, project_value)
        return super().create(request, *args, **kwargs)

    def perform_create(self, serializer):
        project = serializer.validated_data.get('project')
        organization = self.request.user.active_organization
        if project is None:
            ensure_org_owner(self.request.user, organization)
        else:
            if project.organization_id != organization.id:
                raise NotFound('Project not found.')
            ensure_project_manage(self.request.user, project)
            self.request.user.project = project
        serializer.save(organization=organization)


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

    def get_object(self):
        """Return one webhook after the organization or project check.

        Responsibility: this view sets ``permission_classes`` to authentication
        only, so the management check has to run here.

        Boundary: an unbound webhook requires the organization owner. A project
        webhook requires management of that project. A hidden project is
        ``NotFound``. ``request.user.project`` is set only after a project
        check succeeds. Does not call ``user.has_perm``.
        """
        webhook = super().get_object()
        if webhook.project_id is None:
            ensure_org_owner(self.request.user, webhook.organization)
            return webhook
        ensure_project_manage(self.request.user, webhook.project)
        self.request.user.project = webhook.project
        return webhook

    def update(self, request, *args, **kwargs):
        webhook = self.get_object()
        if _webhook_project_reassigned(request.data, webhook.project_id):
            raise ValidationError('The project cannot be changed.')
        return super().update(request, *args, **kwargs)


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
