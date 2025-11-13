from core.permissions import all_permissions
from core.utils.filterset_to_openapi_params import filterset_to_openapi_params
from django.shortcuts import get_object_or_404
from django.utils.decorators import method_decorator
from django_filters import CharFilter, DateTimeFilter, FilterSet, NumberFilter
from django_filters.rest_framework import DjangoFilterBackend
from drf_spectacular.utils import extend_schema
from fsm.registry import get_state_model, state_model_registry
from fsm.serializers import StateModelSerializer
from fsm.state_manager import get_state_manager
from rest_framework import generics
from rest_framework.exceptions import NotFound, PermissionDenied
from rest_framework.filters import OrderingFilter
from rest_framework.pagination import PageNumberPagination


class FSMEntityHistoryPagination(PageNumberPagination):
    page_size_query_param = 'page_size'
    page_size = 100
    max_page_size = 1000


class FSMEntityHistoryFilterSet(FilterSet):
    created_at_from = DateTimeFilter(
        field_name='created_at',
        lookup_expr='gte',
        label='Filter for state history items created at or after the ISO 8601 formatted date (YYYY-MM-DDTHH:MM:SS)',
    )
    created_at_to = DateTimeFilter(
        field_name='created_at',
        lookup_expr='lte',
        label='Filter for state history items created at or before the ISO 8601 formatted date (YYYY-MM-DDTHH:MM:SS)',
    )
    state = CharFilter(field_name='state', lookup_expr='iexact')
    previous_state = CharFilter(field_name='previous_state', lookup_expr='iexact')
    transition_name = CharFilter(field_name='transition_name', lookup_expr='iexact')
    triggered_by = NumberFilter(field_name='triggered_by', lookup_expr='exact')


@method_decorator(
    name='get',
    decorator=extend_schema(
        tags=['FSM'],
        summary='Get entity state history',
        description='Get the state history of an entity',
        parameters=filterset_to_openapi_params(FSMEntityHistoryFilterSet),
        extensions={
            'x-fern-sdk-group-name': 'fsm',
            'x-fern-sdk-method-name': 'state_history',
            'x-fern-audiences': ['internal'],
            'x-fern-pagination': {
                'offset': '$request.page',
                'results': '$response.results',
            },
        },
    ),
)
class FSMEntityHistoryAPI(generics.ListAPIView):
    serializer_class = StateModelSerializer
    pagination_class = FSMEntityHistoryPagination
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_class = FSMEntityHistoryFilterSet
    ordering_fields = ['id']   # Only allow ordering by id

    permission_map = {
        'task': all_permissions.tasks_view,
        'annotation': all_permissions.annotations_view,
        'project': all_permissions.projects_view,
    }

    def get_permission_required(self):
        entity_name = self.kwargs['entity_name']
        permission = self.permission_map.get(entity_name)
        if not permission:
            raise ValueError(f'Invalid entity name: {entity_name}')
        return permission

    def get_entity(self):
        state_model = get_state_model(self.kwargs['entity_name'])
        entity_model = state_model.get_entity_model()
        entity = get_object_or_404(entity_model.objects, id=self.kwargs['entity_id'])
        try:
            self.check_object_permissions(self.request, entity)
        except PermissionDenied as e:
            # Returning 404 instead of 403 to avoid leaking information about the existence of the entity
            raise NotFound() from e
        return entity

    def get_queryset(self):
        entity = self.get_entity()
        state_manager = get_state_manager()
        qs = state_manager.get_state_history(entity)
        qs = qs.filter(organization_id=self.request.user.active_organization_id)
        qs = qs.prefetch_related('triggered_by__om_through')
        return qs

    def list(self, request, *args, **kwargs):
        entity_name = kwargs['entity_name']
        if entity_name not in state_model_registry.get_all_models():
            raise NotFound()
        return super().list(request, *args, **kwargs)
