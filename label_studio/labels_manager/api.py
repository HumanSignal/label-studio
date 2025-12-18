import logging

from core.permissions import ViewClassPermission, all_permissions
from django.db.models import CharField, Count, Q
from django.db.models.functions import Cast
from django.utils.decorators import method_decorator
from django_filters.rest_framework import DjangoFilterBackend
from drf_spectacular.utils import extend_schema
from labels_manager.serializers import (
    LabelBulkUpdateSerializer,
    LabelCreateSerializer,
    LabelLinkSerializer,
    LabelSerializer,
)
from rest_framework import views, viewsets
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from webhooks.utils import api_webhook, api_webhook_for_delete

from .functions import bulk_update_label
from .models import Label, LabelLink

logger = logging.getLogger(__name__)


@method_decorator(
    name='create',
    decorator=extend_schema(
        tags=['Labels'],
        summary='Create labels',
        description='Add labels to your project without updating the labeling configuration.',
        extensions={
            'x-fern-sdk-group-name': 'labels',
            'x-fern-sdk-method-name': 'create',
            'x-fern-audiences': ['internal'],
        },
    ),
)
@method_decorator(
    name='destroy',
    decorator=extend_schema(
        tags=['Labels'],
        summary='Remove labels',
        description='Remove labels from your project without updating the labeling configuration.',
        extensions={
            'x-fern-sdk-group-name': 'labels',
            'x-fern-sdk-method-name': 'delete',
            'x-fern-audiences': ['internal'],
        },
    ),
)
@method_decorator(
    name='partial_update',
    decorator=extend_schema(
        tags=['Labels'],
        summary='Update labels',
        description='Update labels used for your project without updating the labeling configuration.',
        extensions={
            'x-fern-sdk-group-name': 'labels',
            'x-fern-sdk-method-name': 'update',
            'x-fern-audiences': ['internal'],
        },
    ),
)
@method_decorator(
    name='retrieve',
    decorator=extend_schema(
        tags=['Labels'],
        summary='Get label',
        description="""
        Retrieve a specific custom label used for your project by its ID.
        """,
        extensions={
            'x-fern-sdk-group-name': 'labels',
            'x-fern-sdk-method-name': 'get',
            'x-fern-audiences': ['internal'],
        },
    ),
)
@method_decorator(
    name='list',
    decorator=extend_schema(
        tags=['Labels'],
        summary='List labels',
        description='List all custom labels added to your project separately from the labeling configuration.',
        extensions={
            'x-fern-sdk-group-name': 'labels',
            'x-fern-sdk-method-name': 'list',
            'x-fern-audiences': ['internal'],
        },
    ),
)
@method_decorator(name='update', decorator=extend_schema(exclude=True))
class LabelAPI(viewsets.ModelViewSet):
    pagination_class = PageNumberPagination
    serializer_class = LabelSerializer
    permission_required = ViewClassPermission(
        GET=all_permissions.labels_view,
        POST=all_permissions.labels_create,
        PATCH=all_permissions.labels_change,
        DELETE=all_permissions.labels_delete,
    )

    def get_serializer(self, *args, **kwargs):
        """POST request is bulk by default"""
        if self.action == 'create':
            kwargs['many'] = True
        return super().get_serializer(*args, **kwargs)

    def perform_create(self, serializer) -> None:
        serializer.save(created_by=self.request.user, organization=self.request.user.active_organization)

    def get_queryset(self):
        return Label.objects.filter(organization=self.request.user.active_organization).prefetch_related('links')

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return LabelCreateSerializer

        return self.serializer_class


@method_decorator(
    name='create',
    decorator=extend_schema(
        tags=['Labels'],
        summary='Create label links',
        description='Create label links to link new custom labels to your project labeling configuration.',
        extensions={
            'x-fern-sdk-group-name': ['projects', 'labels'],
            'x-fern-sdk-method-name': 'create',
            'x-fern-audiences': ['internal'],
        },
    ),
)
@method_decorator(
    name='destroy',
    decorator=extend_schema(
        tags=['Labels'],
        summary='Remove label link',
        description="""
        Remove a label link that links custom labels to your project labeling configuration. If you remove a label link,
        the label stops being available for the project it was linked to. You can add a new label link at any time. 
        """,
        extensions={
            'x-fern-sdk-group-name': ['projects', 'labels'],
            'x-fern-sdk-method-name': 'delete',
            'x-fern-audiences': ['internal'],
        },
    ),
)
@method_decorator(
    name='partial_update',
    decorator=extend_schema(
        tags=['Labels'],
        summary='Update label link',
        description="""
        Update a label link that links custom labels to a project labeling configuration, for example if the fromName,  
        toName, or name parameters for a tag in the labeling configuration change. 
        """,
        extensions={
            'x-fern-sdk-group-name': ['projects', 'labels'],
            'x-fern-sdk-method-name': 'update',
            'x-fern-audiences': ['internal'],
        },
    ),
)
@method_decorator(
    name='retrieve',
    decorator=extend_schema(
        tags=['Labels'],
        summary='Get label link',
        description='Get label links for a specific project configuration. ',
        extensions={
            'x-fern-sdk-group-name': ['projects', 'labels'],
            'x-fern-sdk-method-name': 'get',
            'x-fern-audiences': ['internal'],
        },
    ),
)
@method_decorator(
    name='list',
    decorator=extend_schema(
        tags=['Labels'],
        summary='List label links',
        description='List label links for a specific label and project.',
        extensions={
            'x-fern-sdk-group-name': ['projects', 'labels'],
            'x-fern-sdk-method-name': 'list',
            'x-fern-audiences': ['internal'],
        },
    ),
)
@method_decorator(name='update', decorator=extend_schema(exclude=True))
class LabelLinkAPI(viewsets.ModelViewSet):
    filter_backends = [DjangoFilterBackend]
    filterset_fields = {
        'project': ['exact'],
        'label__created_at': ['exact', 'gte', 'lte'],
        'label__created_by': ['exact'],
    }
    pagination_class = PageNumberPagination
    serializer_class = LabelLinkSerializer
    permission_required = ViewClassPermission(
        GET=all_permissions.labels_view,
        POST=all_permissions.labels_create,
        PATCH=all_permissions.labels_change,
        DELETE=all_permissions.labels_delete,
    )

    def get_queryset(self):
        return LabelLink.objects.filter(label__organization=self.request.user.active_organization).annotate(
            annotations_count=Count(
                'project__tasks__annotations',
                filter=Q(
                    project__tasks__annotations__result__icontains=Cast('label__value', output_field=CharField())
                ),
            )
        )

    @api_webhook('LABEL_LINK_UPDATED')
    def update(self, request, *args, **kwargs):
        return super().update(request, *args, **kwargs)

    @api_webhook_for_delete('LABEL_LINK_DELETED')
    def destroy(self, request, *args, **kwargs):
        return super().destroy(request, *args, **kwargs)


@method_decorator(
    name='post',
    decorator=extend_schema(
        tags=['Labels'],
        summary='Bulk update labels',
        description="""
        If you want to update the labels in saved annotations, use this endpoint.
        """,
        extensions={
            'x-fern-sdk-group-name': ['projects', 'labels'],
            'x-fern-sdk-method-name': 'update_many',
            'x-fern-audiences': ['internal'],
        },
    ),
)
class LabelBulkUpdateAPI(views.APIView):
    permission_required = all_permissions.labels_change

    def post(self, request):
        serializer = LabelBulkUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        project = serializer.validated_data['project']
        if project is not None:
            self.check_object_permissions(self.request, project)

        updated_count = bulk_update_label(
            old_label=serializer.validated_data['old_label'],
            new_label=serializer.validated_data['new_label'],
            organization=self.request.user.active_organization,
            project=project,
        )
        return Response({'annotations_updated': updated_count})
