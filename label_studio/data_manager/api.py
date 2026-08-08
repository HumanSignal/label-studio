"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license."""

import logging

from asgiref.sync import async_to_sync, sync_to_async
from core.current_request import CurrentContext
from core.feature_flags import flag_set
from core.permissions import ViewClassPermission, all_permissions
from core.utils.common import int_from_request, load_func
from core.utils.params import bool_from_request
from data_manager.actions import get_action_form, get_all_actions, perform_action
from data_manager.functions import evaluate_predictions, get_prepare_params
from data_manager.managers import get_fields_for_evaluation
from data_manager.models import View
from data_manager.serializers import (
    DataManagerTaskSerializer,
    PrepareParamsRequestSerializer,
    ViewOrderSerializer,
    ViewRequestSerializer,
    ViewResetSerializer,
    ViewSerializer,
)
from django.conf import settings
from django.db.models import Max, Sum
from django.db.models.functions import Coalesce
from django.utils.decorators import method_decorator
from django_filters.rest_framework import DjangoFilterBackend
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiExample, OpenApiParameter, OpenApiResponse, extend_schema
from io_storages.functions import get_import_storage_link_prefetches
from projects.models import Project
from projects.serializers import ProjectSerializer
from rest_framework import generics, viewsets
from rest_framework.decorators import action
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.views import APIView
from tasks.models import Annotation, Prediction, Task
from tasks.ordering import (
    get_task_children_prefetch,
    parse_annotations_ordering_request,
)
from users.list_mixins import UserListMixin, UsersListPagination
from users.list_query import ProjectUsersOptionsQuerySerializer
from users.models import User
from users.serializers import UserSimpleSerializer

logger = logging.getLogger(__name__)


@extend_schema(exclude=True)
class ProjectUsersOptionsAPI(UserListMixin, generics.ListAPIView):
    """Lightweight project-scoped users transport for Data Manager filter options."""

    action = 'list'
    pagination_class = UsersListPagination
    permission_required = all_permissions.projects_view
    serializer_class = UserSimpleSerializer
    list_query_serializer_class = ProjectUsersOptionsQuerySerializer

    def uses_list_filtering(self, request=None):
        return True

    def get_list_query_params(self):
        if not hasattr(self, '_list_query_params'):
            query_params = self.request.query_params.copy()
            query_params['project'] = self.kwargs['pk']
            serializer = self.list_query_serializer_class(data=query_params)
            serializer.is_valid(raise_exception=True)
            self._list_query_params = serializer.validated_data
        return self._list_query_params

    def get_queryset(self):
        organization = self.request.user.active_organization
        queryset = User.objects.filter(om_through__organization=organization)
        # FIT-2450: when column-scoping, keep soft-deleted org members so historical
        # predicate actors remain selectable via the column-candidate half of the
        # membership ∪ candidates union. Membership half still requires active OM
        # (see UserListMixin.filter_queryset).
        if 'column' not in self.request.query_params:
            queryset = queryset.filter(om_through__deleted_at__isnull=True)
        return queryset.distinct()

    def get_project(self, project_id):
        if not hasattr(self, '_project_users_project'):
            organization_id = self.request.user.active_organization_id
            project = generics.get_object_or_404(Project, pk=project_id, organization_id=organization_id)
            self.check_object_permissions(self.request, project)
            self._project_users_project = project
        return self._project_users_project

    def filter_queryset_by_project(self, queryset, project_id):
        project = self.get_project(project_id)
        get_user_ids_in_projects = load_func(settings.DATA_MANAGER_GET_PROJECT_USER_IDS)
        user_ids = get_user_ids_in_projects([project.id], project.organization_id)
        return queryset.filter(pk__in=user_ids)


@method_decorator(
    name='list',
    decorator=extend_schema(
        tags=['Data Manager'],
        summary='List views',
        description='List all views for a specific project.',
        parameters=[
            OpenApiParameter(name='project', type=OpenApiTypes.INT, location='query', description='Project ID'),
        ],
        extensions={
            'x-fern-sdk-group-name': 'views',
            'x-fern-sdk-method-name': 'list',
            'x-fern-audiences': ['public'],
        },
    ),
)
@method_decorator(
    name='create',
    decorator=extend_schema(
        tags=['Data Manager'],
        summary='Create view',
        description='Create a view for a specific project.',
        request=ViewRequestSerializer,
        responses={201: ViewSerializer},
        extensions={
            'x-fern-sdk-group-name': 'views',
            'x-fern-sdk-method-name': 'create',
            'x-fern-audiences': ['public'],
        },
    ),
)
@method_decorator(
    name='retrieve',
    decorator=extend_schema(
        tags=['Data Manager'],
        summary='Get view details',
        description='Get the details about a specific view in the data manager',
        parameters=[
            OpenApiParameter(name='id', type=OpenApiTypes.STR, location='path', description='View ID'),
        ],
        extensions={
            'x-fern-sdk-group-name': 'views',
            'x-fern-sdk-method-name': 'get',
            'x-fern-audiences': ['public'],
        },
    ),
)
@method_decorator(
    name='update',
    decorator=extend_schema(
        tags=['Data Manager'],
        summary='Put view',
        description='Overwrite view data with updated filters and other information for a specific project.',
        request=ViewRequestSerializer,
        parameters=[
            OpenApiParameter(name='id', type=OpenApiTypes.STR, location='path', description='View ID'),
        ],
        extensions={
            'x-fern-audiences': ['internal'],
        },
    ),
)
@method_decorator(
    name='partial_update',
    decorator=extend_schema(
        tags=['Data Manager'],
        summary='Update view',
        description='Update view data with additional filters and other information for a specific project.',
        parameters=[
            OpenApiParameter(name='id', type=OpenApiTypes.STR, location='path', description='View ID'),
        ],
        request=ViewRequestSerializer,
        responses={200: ViewSerializer},
        extensions={
            'x-fern-sdk-group-name': 'views',
            'x-fern-sdk-method-name': 'update',
            'x-fern-audiences': ['public'],
        },
    ),
)
@method_decorator(
    name='destroy',
    decorator=extend_schema(
        tags=['Data Manager'],
        summary='Delete view',
        description='Delete a specific view by ID.',
        parameters=[
            OpenApiParameter(name='id', type=OpenApiTypes.STR, location='path', description='View ID'),
        ],
        extensions={
            'x-fern-sdk-group-name': 'views',
            'x-fern-sdk-method-name': 'delete',
            'x-fern-audiences': ['public'],
        },
    ),
)
class ViewAPI(viewsets.ModelViewSet):
    queryset = View.objects.none()
    serializer_class = ViewSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['project']
    permission_required = ViewClassPermission(
        GET=all_permissions.views_view,
        POST=all_permissions.views_create,
        PATCH=all_permissions.views_change,
        PUT=all_permissions.views_change,
        DELETE=all_permissions.views_delete,
    )

    def get_serializer_class(self):
        if self.action == 'update_order':
            return ViewOrderSerializer
        return super().get_serializer_class()

    def perform_create(self, serializer):
        project = serializer.validated_data.get('project')
        max_order = View.objects.filter(project=project).aggregate(Max('order'))['order__max']
        order = (max_order if max_order is not None else -1) + 1
        serializer.save(user=self.request.user, order=order)

    @extend_schema(
        tags=['Data Manager'],
        summary='Delete all project views',
        description='Delete all views for a specific project.',
        parameters=[
            OpenApiParameter(
                name='project',
                type=OpenApiTypes.INT,
                location='query',
                description='Project ID',
                required=True,
            ),
        ],
        extensions={
            'x-fern-sdk-group-name': 'views',
            'x-fern-sdk-method-name': 'delete_all',
            'x-fern-audiences': ['public'],
        },
    )
    @action(detail=False, methods=['delete'], permission_required=all_permissions.views_reset)
    def reset(self, request):
        # Note: OpenAPI 3.0 does not support request body for DELETE requests
        # see https://github.com/tfranzel/drf-spectacular/issues/431#issuecomment-862738643
        # as a hack for the SDK, fallback to query params if request body is empty
        serializer = ViewResetSerializer(
            data=request.data if 'project' in request.data else {'project': request.query_params.get('project')}
        )
        serializer.is_valid(raise_exception=True)
        project = generics.get_object_or_404(
            Project.objects.for_user(request.user), pk=serializer.validated_data['project'].id
        )
        queryset = self.filter_queryset(self.get_queryset()).filter(project=project)
        queryset.all().delete()
        return Response(status=204)

    @extend_schema(
        tags=['Data Manager'],
        summary='Update order of views',
        description='Update the order field of views based on the provided list of view IDs',
        request=ViewOrderSerializer,
        responses={200: OpenApiResponse(description='View order updated successfully')},
        extensions={
            'x-fern-sdk-group-name': 'views',
            'x-fern-sdk-method-name': 'update_order',
            'x-fern-audiences': ['public'],
        },
    )
    @action(detail=False, methods=['post'], url_path='order')
    def update_order(self, request):
        serializer = ViewOrderSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        project_id = serializer.validated_data['project']
        view_ids = serializer.validated_data['ids']

        project = generics.get_object_or_404(Project.objects.for_user(request.user), pk=project_id)

        queryset = self.filter_queryset(self.get_queryset()).filter(project=project)
        views = list(queryset.filter(id__in=view_ids))

        # Update the order field for each view
        view_dict = {view.id: view for view in views}
        for order, view_id in enumerate(view_ids):
            if view_id in view_dict:
                view_dict[view_id].order = order

        # Bulk update views
        View.objects.bulk_update(views, ['order'])

        return Response(status=204)

    def get_queryset(self):
        return View.objects.filter(project__organization=self.request.user.active_organization).order_by('order', 'id')


class TaskPagination(PageNumberPagination):
    page_size = 100
    page_size_query_param = 'page_size'
    total_annotations = 0
    total_predictions = 0
    max_page_size = settings.TASK_API_PAGE_SIZE_MAX

    @async_to_sync
    async def async_paginate_queryset(self, queryset, request, view=None):
        predictions_count_qs = Prediction.objects.filter(task_id__in=queryset)
        self.total_predictions = await sync_to_async(predictions_count_qs.count, thread_sensitive=True)()

        annotations_count_qs = Annotation.objects.filter(task_id__in=queryset, was_cancelled=False)
        self.total_annotations = await sync_to_async(annotations_count_qs.count, thread_sensitive=True)()
        # Use .only('id') to avoid loading heavy task.data fields during pagination
        # Full task objects are loaded later with proper annotations
        id_only_queryset = queryset.only('id')
        return await sync_to_async(super().paginate_queryset, thread_sensitive=True)(id_only_queryset, request, view)

    def sync_paginate_queryset(self, queryset, request, view=None):
        self.total_predictions = Prediction.objects.filter(task_id__in=queryset).count()
        self.total_annotations = Annotation.objects.filter(task_id__in=queryset, was_cancelled=False).count()
        # Use .only('id') to avoid loading heavy task.data fields during pagination
        # Full task objects are loaded later with proper annotations
        id_only_queryset = queryset.only('id')
        return super().paginate_queryset(id_only_queryset, request, view)

    def paginate_totals_queryset(self, queryset, request, view=None):
        totals = queryset.values('id').aggregate(
            total_annotations=Coalesce(Sum('total_annotations'), 0),
            total_predictions=Coalesce(Sum('total_predictions'), 0),
        )
        self.total_annotations = totals['total_annotations']
        self.total_predictions = totals['total_predictions']
        # Use .only('id') to avoid loading heavy task.data fields during pagination
        # Full task objects are loaded later with proper annotations
        id_only_queryset = queryset.only('id')
        return super().paginate_queryset(id_only_queryset, request, view)

    def paginate_queryset(self, queryset, request, view=None):
        return self.paginate_totals_queryset(queryset, request, view)

    def get_paginated_response_schema(self, schema):
        return {
            'type': 'object',
            'properties': {
                'tasks': schema,
                'total': {
                    'type': 'integer',
                    'description': 'Total number of tasks',
                    'example': 123,
                },
                'total_annotations': {
                    'type': 'integer',
                    'description': 'Total number of annotations',
                    'example': 456,
                },
                'total_predictions': {
                    'type': 'integer',
                    'description': 'Total number of predictions',
                    'example': 78,
                },
            },
            'required': ['tasks', 'total', 'total_annotations', 'total_predictions'],
        }

    def get_paginated_response(self, data):
        return Response(
            {
                'total_annotations': self.total_annotations,
                'total_predictions': self.total_predictions,
                'total': self.page.paginator.count,
                'tasks': data,
            }
        )


class TaskListAPI(generics.ListCreateAPIView):
    task_serializer_class = DataManagerTaskSerializer
    permission_required = ViewClassPermission(
        GET=all_permissions.tasks_view,
        POST=all_permissions.tasks_change,
        PATCH=all_permissions.tasks_change,
        PUT=all_permissions.tasks_change,
        DELETE=all_permissions.tasks_delete,
    )
    pagination_class = TaskPagination

    def _ensure_state_field_for_evaluation(self, fields_for_evaluation, request):
        if not (
            CurrentContext.is_fsm_enabled() and flag_set('fflag_feat_fit_710_fsm_state_fields', user=request.user)
        ):
            return fields_for_evaluation

        fields_for_evaluation = list(fields_for_evaluation)
        if 'state' not in fields_for_evaluation:
            fields_for_evaluation.append('state')
        return fields_for_evaluation

    def get_task_serializer_context(self, request, project, queryset):
        all_fields = request.GET.get('fields', None) == 'all'  # false by default

        return {
            'resolve_uri': bool_from_request(request.GET, 'resolve_uri', True),
            'request': request,
            'project': project,
            'drafts': all_fields,
            'predictions': all_fields,
            'annotations': all_fields,
            'annotations_ordering': parse_annotations_ordering_request(request),
        }

    def get_task_queryset(self, request, prepare_params):
        return Task.prepared.only_filtered(prepare_params=prepare_params)

    @staticmethod
    def prefetch(queryset, request=None):
        common = (
            'annotations__completed_by',
            'project',
            *get_import_storage_link_prefetches(),
            'file_upload',
        )
        if request:
            ordering = parse_annotations_ordering_request(request)
            annotation_children, prediction_children = get_task_children_prefetch(ordering)
            return queryset.prefetch_related(annotation_children, prediction_children, *common)
        return queryset.prefetch_related(
            'annotations',
            'predictions',
            *common,
        )

    def get(self, request):
        # get project
        view_pk = int_from_request(request.GET, 'view', 0) or int_from_request(request.data, 'view', 0)
        project_pk = int_from_request(request.GET, 'project', 0) or int_from_request(request.data, 'project', 0)
        if project_pk:
            project = generics.get_object_or_404(Project, pk=project_pk)
            self.check_object_permissions(request, project)
        elif view_pk:
            view = generics.get_object_or_404(View, pk=view_pk)
            project = view.project
            self.check_object_permissions(request, project)
        else:
            return Response({'detail': 'Neither project nor view id specified'}, status=404)
        # get prepare params (from view or from payload directly)
        prepare_params = get_prepare_params(request, project)
        queryset = self.get_task_queryset(request, prepare_params)

        # paginated tasks
        page = self.paginate_queryset(queryset)

        # get request params
        all_fields = 'all' if request.GET.get('fields', None) == 'all' else None
        fields_for_evaluation = get_fields_for_evaluation(prepare_params, request.user)
        review = bool_from_request(self.request.GET, 'review', False)

        if review:
            fields_for_evaluation = ['annotators', 'reviewed']
            all_fields = None
        # If the response will expose task state, annotate it in bulk so FSMStateField does not
        # fall back to one current-state lookup per task during serialization.
        fields_for_evaluation = self._ensure_state_field_for_evaluation(fields_for_evaluation, request)
        if page is not None:
            ids = [task.id for task in page]  # page is a list already
            tasks = self.prefetch(
                Task.prepared.annotate_queryset(
                    Task.objects.filter(id__in=ids),
                    fields_for_evaluation=fields_for_evaluation,
                    all_fields=all_fields,
                    request=request,
                ),
                request,
            )

            tasks_by_ids = {task.id: task for task in tasks}
            # keep ids ordering
            page = [tasks_by_ids[_id] for _id in ids]

            # retrieve ML predictions if tasks don't have them
            if not review and project.evaluate_predictions_automatically:
                # TODO MM TODO this needs a discussion, because I'd expect
                # people to retrieve manually instead on DM load, plus it
                # will slow down initial DM load
                # if project.retrieve_predictions_automatically is deprecated now and no longer used
                tasks_for_predictions = Task.objects.filter(id__in=ids, predictions__isnull=True)
                evaluate_predictions(tasks_for_predictions)
                [tasks_by_ids[_id].refresh_from_db() for _id in ids]

            context = self.get_task_serializer_context(self.request, project, tasks)
            serializer = self.task_serializer_class(page, many=True, context=context)
            return self.get_paginated_response(serializer.data)
        # all tasks
        if project.evaluate_predictions_automatically:
            evaluate_predictions(queryset.filter(predictions__isnull=True))
        queryset = Task.prepared.annotate_queryset(
            queryset, fields_for_evaluation=fields_for_evaluation, all_fields=all_fields, request=request
        )
        context = self.get_task_serializer_context(self.request, project, queryset)
        serializer = self.task_serializer_class(queryset, many=True, context=context)
        return Response(serializer.data)


@method_decorator(
    name='get',
    decorator=extend_schema(
        tags=['Data Manager'],
        summary='Get data manager columns',
        description=(
            'Retrieve the data manager columns available for the tasks in a specific project. '
            'For more details, see [GET api/actions](api:GET/api/dm/actions/).'
        ),
        parameters=[
            OpenApiParameter(
                name='project',
                type=OpenApiTypes.INT,
                location='query',
                description='Project ID',
                required=True,
            )
        ],
        responses={
            200: OpenApiResponse(
                description='Columns retrieved successfully',
                examples=[
                    OpenApiExample(
                        name='response',
                        value={
                            'columns': [
                                {
                                    'id': 'id',
                                    'title': 'ID',
                                    'type': 'Number',
                                    'help': 'Task ID',
                                    'target': 'tasks',
                                    'visibility_defaults': {'explore': True, 'labeling': False},
                                    'project_defined': False,
                                },
                                {
                                    'id': 'completed_at',
                                    'title': 'Completed',
                                    'type': 'Datetime',
                                    'target': 'tasks',
                                    'help': 'Last annotation date',
                                    'visibility_defaults': {'explore': True, 'labeling': False},
                                    'project_defined': False,
                                },
                                # ... other columns ...
                            ]
                        },
                        media_type='application/json',
                    )
                ],
            ),
            400: OpenApiResponse(description='Invalid project ID supplied'),
            404: OpenApiResponse(description='Project not found'),
        },
        extensions={
            'x-fern-audiences': ['internal'],
        },
    ),
)
class ProjectColumnsAPI(APIView):
    permission_required = all_permissions.projects_view

    def get(self, request):
        pk = int_from_request(request.GET, 'project', 1)
        project = generics.get_object_or_404(Project, pk=pk)
        self.check_object_permissions(request, project)
        GET_ALL_COLUMNS = load_func(settings.DATA_MANAGER_GET_ALL_COLUMNS)
        data = GET_ALL_COLUMNS(project, request.user)
        return Response(data)


@method_decorator(
    name='get',
    decorator=extend_schema(
        tags=['Data Manager'],
        summary='Get project state',
        description='Retrieve the project state for the data manager.',
        extensions={
            'x-fern-audiences': ['internal'],
        },
    ),
)
class ProjectStateAPI(APIView):
    permission_required = all_permissions.projects_view

    def get(self, request):
        pk = int_from_request(request.GET, 'project', 1)  # replace 1 to None, it's for debug only
        project = generics.get_object_or_404(Project, pk=pk)
        self.check_object_permissions(request, project)
        data = ProjectSerializer(project).data

        data.update(
            {
                'can_delete_tasks': True,
                'can_manage_annotations': True,
                'can_manage_tasks': True,
                'source_syncing': False,
                'target_syncing': False,
                'task_count': project.tasks.count(),
                'annotation_count': Annotation.objects.filter(project=project).count(),
                'config_has_control_tags': len(project.get_parsed_config()) > 0,
            }
        )
        return Response(data)


@method_decorator(
    name='get',
    decorator=extend_schema(
        tags=['Data Manager'],
        summary='Get actions',
        description='Retrieve all the registered actions with descriptions that data manager can use.',
        parameters=[
            OpenApiParameter(
                name='project',
                type=OpenApiTypes.INT,
                location='query',
                description='Project ID',
                required=True,
            ),
        ],
        responses={
            200: OpenApiResponse(
                description='Actions retrieved successfully',
                response={
                    'type': 'array',
                    'title': 'Action list',
                    'description': 'List of available actions',
                    'items': {
                        'type': 'object',
                        'title': 'Action',
                        'properties': {
                            'id': {'type': 'string', 'title': 'Action ID'},
                            'title': {'type': 'string', 'title': 'Title'},
                            'order': {'type': 'integer', 'title': 'Order'},
                            'permission': {
                                'oneOf': [
                                    {'type': 'string'},
                                    {
                                        'type': 'array',
                                        'items': {'type': 'string'},
                                        'description': 'List of permissions (user needs any all of them)',
                                    },
                                ]
                            },
                            'experimental': {'type': 'boolean', 'title': 'Experimental'},
                            'dialog': {
                                'type': 'object',
                                'title': 'Dialog',
                                'properties': {
                                    'title': {'type': 'string', 'title': 'Title', 'nullable': True},
                                    'text': {'type': 'string', 'title': 'Text', 'nullable': True},
                                    'type': {'type': 'string', 'title': 'Type', 'nullable': True},
                                    'form': {
                                        'type': 'array',
                                        'title': 'Form',
                                        'items': {'type': 'object'},
                                        'nullable': True,
                                    },
                                },
                            },
                        },
                    },
                },
                examples=[
                    OpenApiExample(
                        name='response',
                        value=[
                            {
                                'id': 'predictions_to_annotations',
                                'title': 'Create Annotations From Predictions',
                                'order': 91,
                                'permission': 'tasks.change',
                                'experimental': False,
                                'dialog': {
                                    'title': 'Create Annotations From Predictions',
                                    'text': 'Create annotations from predictions using selected predictions set for each selected task. Your account will be assigned as an owner to those annotations.',
                                    'type': 'confirm',
                                    'form': None,
                                },
                            }
                        ],
                        media_type='application/json',
                    ),
                ],
            )
        },
        extensions={
            'x-fern-sdk-group-name': 'actions',
            'x-fern-sdk-method-name': 'list',
            'x-fern-audiences': ['public'],
        },
    ),
)
@method_decorator(
    name='post',
    decorator=extend_schema(
        tags=['Data Manager'],
        summary='Post actions',
        description=(
            'Perform a Data Manager action with the selected tasks and filters. '
            'Note: More complex actions require additional parameters in the request body. '
            'Call `GET api/actions?project=<id>` to explore them. <br>'
            'Example: `GET api/actions?id=delete_tasks&project=1`'
        ),
        request=PrepareParamsRequestSerializer,
        parameters=[
            OpenApiParameter(
                name='id',
                type=OpenApiTypes.STR,
                location='query',
                description='Action name ID, see the full list of actions in the `GET api/actions` request',
                enum=[
                    'retrieve_tasks_predictions',
                    'predictions_to_annotations',
                    'remove_duplicates',
                    'delete_tasks',
                    'delete_ground_truths',
                    'delete_tasks_annotations',
                    'delete_tasks_reviews',
                    'delete_tasks_predictions',
                    'delete_reviewers',
                    'delete_annotators',
                ],
                required=True,
            ),
            OpenApiParameter(
                name='project',
                type=OpenApiTypes.INT,
                location='query',
                description='Project ID',
                required=True,
            ),
            OpenApiParameter(
                name='view',
                type=OpenApiTypes.INT,
                location='query',
                description='View ID (optional, it has higher priority than filters, '
                'selectedItems and ordering from the request body payload)',
            ),
        ],
        responses={200: OpenApiResponse(description='Action performed successfully')},
        extensions={
            'x-fern-sdk-group-name': 'actions',
            'x-fern-sdk-method-name': 'create',
            'x-fern-audiences': ['public'],
        },
    ),
)
class ProjectActionsAPI(APIView):
    permission_required = ViewClassPermission(
        GET=all_permissions.projects_view,
        POST=all_permissions.projects_view,
    )

    def get(self, request):
        pk = int_from_request(request.GET, 'project', 0)
        project = generics.get_object_or_404(Project, pk=pk)
        self.check_object_permissions(request, project)
        return Response(get_all_actions(request.user, project))

    def post(self, request):
        pk = int_from_request(request.GET, 'project', 0)
        project = generics.get_object_or_404(Project, pk=pk)
        self.check_object_permissions(request, project)

        # keep ordering only when needed, otherwise drop to avoid expensive sorts/annotations
        action_id = request.GET.get('id', None)
        prepare_params = get_prepare_params(request, project)
        if not flag_set(
            'fflag_root_223_optimize_delete_predictions', organization=project.organization
        ) or action_id in ['next_task', 'remove_duplicates']:
            queryset = Task.prepared.only_filtered(prepare_params=prepare_params)
        else:
            prepare_params.ordering = []
            queryset = Task.prepared.only_filtered(prepare_params=prepare_params)
            queryset = queryset.order_by()

        # wrong action id
        if action_id is None:
            response = {'detail': 'No action id "' + str(action_id) + '", use ?id=<action-id>'}
            return Response(response, status=422)

        # perform action and return the result dict
        kwargs = {'request': request, 'prepare_params': prepare_params}
        result = perform_action(action_id, project, queryset, request.user, **kwargs)
        code = result.pop('response_code', 200)

        return Response(result, status=code)


@method_decorator(
    name='get',
    decorator=extend_schema(
        tags=['Data Manager'],
        summary='Get action form',
        description='Get the form configuration for a specific action.',
        parameters=[
            OpenApiParameter(
                name='project',
                type=OpenApiTypes.INT,
                location='query',
                description='Project ID',
                required=True,
            )
        ],
        responses={
            200: OpenApiResponse(
                description='Action form configuration returned successfully',
                response={
                    'type': 'object',
                    'description': 'Form configuration object',
                },
            )
        },
        extensions={
            'x-fern-audiences': ['internal'],
        },
    ),
)
class ProjectActionsFormAPI(APIView):
    permission_required = ViewClassPermission(
        GET=all_permissions.projects_view,
    )

    def get(self, request, action_id):
        pk = int_from_request(request.GET, 'project', 0)
        project = generics.get_object_or_404(Project, pk=pk)
        self.check_object_permissions(request, project)

        form = get_action_form(action_id, project, request.user)
        return Response(form)
