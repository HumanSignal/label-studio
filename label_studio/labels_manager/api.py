import logging

from django.db.models import CharField, Count, F, Q
from django.db.models.functions import Cast
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import views, viewsets
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response

from core.permissions import ViewClassPermission, all_permissions
from labels_manager.serializers import (
    LabelBulkUpdateSerializer,
    LabelCreateSerializer,
    LabelLinkSerializer,
    LabelSerializer,
)
from webhooks.utils import api_webhook, api_webhook_for_delete

from .functions import bulk_update_label
from .models import Label, LabelLink

logger = logging.getLogger(__name__)


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
        '''POST request is bulk by default'''
        if self.action == 'create':
            kwargs['many'] = True
        return super().get_serializer(*args, **kwargs)

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user, organization=self.request.user.active_organization)

    def get_queryset(self):
        return Label.objects.filter(organization=self.request.user.active_organization).prefetch_related('links')

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return LabelCreateSerializer

        return self.serializer_class


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
