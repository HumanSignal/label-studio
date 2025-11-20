import logging

from core.permissions import all_permissions
from core.utils.filterset_to_openapi_params import filterset_to_openapi_params
from django.shortcuts import get_object_or_404
from django.utils.decorators import method_decorator
from django_filters import CharFilter, DateTimeFilter, FilterSet, NumberFilter
from django_filters.rest_framework import DjangoFilterBackend
from drf_spectacular.utils import extend_schema
from fsm.registry import get_state_model, state_model_registry, transition_registry
from fsm.serializers import (
    FSMTransitionExecuteRequestSerializer,
    FSMTransitionExecuteResponseSerializer,
    StateModelSerializer,
)
from fsm.state_manager import get_state_manager
from fsm.transitions import ModelChangeTransition, TransitionValidationError
from pydantic import ValidationError as PydanticValidationError
from rest_framework import generics, status
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError
from rest_framework.filters import OrderingFilter
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response

logger = logging.getLogger(__name__)


class FSMAPIMixin:
    def get_permission_required(self):

        entity_name = self.kwargs['entity_name']
        permission = self.permission_map.get(entity_name)
        if not permission:
            raise ValueError(f'Invalid entity name: {entity_name}')
        return permission

    def get_entity(self):
        state_model = get_state_model(self.kwargs['entity_name'])
        if not state_model:
            raise NotFound()
        entity_model = state_model.get_entity_model()
        entity = get_object_or_404(entity_model.objects, id=self.kwargs['entity_id'])
        try:
            self.check_object_permissions(self.request, entity)
        except PermissionDenied as e:
            # Return 404 instead of 403 to avoid leaking entity existence
            raise NotFound() from e
        return entity


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
class FSMEntityHistoryAPI(FSMAPIMixin, generics.ListAPIView):
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


@method_decorator(
    name='post',
    decorator=extend_schema(
        tags=['FSM'],
        summary='Execute manual FSM transition',
        description='Execute a registered manual transition for an entity.',
        request=FSMTransitionExecuteRequestSerializer,
        responses={200: FSMTransitionExecuteResponseSerializer},
        extensions={
            'x-fern-sdk-group-name': 'fsm',
            'x-fern-sdk-method-name': 'execute_transition',
            'x-fern-audiences': ['internal'],
        },
    ),
)
class FSMEntityTransitionAPI(FSMAPIMixin, generics.GenericAPIView):
    """
    POST /api/fsm/entities/{entity_type}/{entity_id}/transition/
    """

    serializer_class = FSMTransitionExecuteRequestSerializer

    permission_map = {
        'task': all_permissions.tasks_change,
        'annotation': all_permissions.annotations_change,
        'project': all_permissions.projects_change,
    }

    def post(self, request, *args, **kwargs):
        entity_name = kwargs['entity_name']
        if entity_name not in state_model_registry.get_all_models():
            raise NotFound()

        entity = self.get_entity()

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        transition_name = serializer.validated_data['transition_name']
        transition_data = serializer.validated_data.get('transition_data') or {}

        # Validate that transition is registered and manual (not auto-triggered)
        transition_class = transition_registry.get_transition(entity_name, transition_name)
        if not transition_class:
            raise ValidationError({'transition_name': ['Unknown transition for this entity']})

        # If it's a ModelChangeTransition and has any triggers configured, it's not manual
        if issubclass(transition_class, ModelChangeTransition):
            triggers_on_create = getattr(transition_class, '_triggers_on_create', False)
            triggers_on_update = getattr(transition_class, '_triggers_on_update', False)
            if triggers_on_create or triggers_on_update:
                raise ValidationError(
                    {'transition_name': ['Transition is auto-triggered and cannot be executed manually']}
                )

        # Execute transition
        StateManager = get_state_manager()
        try:
            state_record = StateManager.execute_transition(
                entity=entity,
                transition_name=transition_name,
                transition_data=transition_data,
                user=request.user,
                organization_id=getattr(request.user, 'active_organization_id', None),
            )
        except PydanticValidationError as e:
            # Pydantic schema validation errors from transition instantiation
            raise ValidationError({'detail': str(e)})
        except TransitionValidationError as e:
            # Explicit validation failure
            logger.warning(
                f'Transition validation failed with context: {e.context} and error: {e} for entity: {entity.id}'
            )
            raise ValidationError({'detail': str(e)})
        # Handle feature-flag disabled path (no state record created)
        if state_record is None:
            response_payload = {
                'success': True,
                'new_state': None,
                'state_record': None,
            }
        else:
            response_payload = {
                'success': True,
                'new_state': state_record.state,
                # Pass model instance; nested serializer will handle representation
                'state_record': state_record,
            }
        return Response(
            FSMTransitionExecuteResponseSerializer(response_payload, context={'request': request}).data,
            status=status.HTTP_200_OK,
        )
