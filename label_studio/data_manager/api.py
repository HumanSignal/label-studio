"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import logging

from asgiref.sync import async_to_sync, sync_to_async
from core.feature_flags import flag_set
from core.permissions import ViewClassPermission, all_permissions
from core.utils.common import int_from_request, load_func
from core.utils.params import bool_from_request
from data_manager.actions import get_all_actions, perform_action
from data_manager.functions import evaluate_predictions, get_prepare_params, get_prepared_queryset
from data_manager.managers import get_fields_for_evaluation
from data_manager.models import View
from data_manager.prepare_params import filters_schema, ordering_schema, prepare_params_schema
from data_manager.serializers import DataManagerTaskSerializer, ViewResetSerializer, ViewSerializer
from django.conf import settings
from django.utils.decorators import method_decorator
from django_filters.rest_framework import DjangoFilterBackend
from drf_yasg import openapi
from drf_yasg.utils import swagger_auto_schema
from projects.models import Project
from projects.serializers import ProjectSerializer
from rest_framework import generics, viewsets
from rest_framework.decorators import action
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.views import APIView
from tasks.models import Annotation, Prediction, Task

logger = logging.getLogger(__name__)

_view_request_body = openapi.Schema(
    type=openapi.TYPE_OBJECT,
    properties={
        'data': openapi.Schema(
            type=openapi.TYPE_OBJECT,
            description='Custom view data',
            properties={'filters': filters_schema, 'ordering': ordering_schema},
        ),
        'project': openapi.Schema(type=openapi.TYPE_INTEGER, description='Project ID'),
    },
)


@method_decorator(
    name='list',
    decorator=swagger_auto_schema(
        tags=['Data Manager'],
        x_fern_sdk_group_name='views',
        x_fern_sdk_method_name='list',
        x_fern_audiences=['public'],
        operation_summary='List views',
        operation_description='List all views for a specific project.',
        manual_parameters=[
            openapi.Parameter(
                name='project', type=openapi.TYPE_INTEGER, in_=openapi.IN_QUERY, description='Project ID'
            ),
        ],
    ),
)
@method_decorator(
    name='create',
    decorator=swagger_auto_schema(
        tags=['Data Manager'],
        x_fern_sdk_group_name='views',
        x_fern_sdk_method_name='create',
        x_fern_audiences=['public'],
        operation_summary='Create view',
        operation_description='Create a view for a specific project.',
        request_body=_view_request_body,
        responses={201: ViewSerializer},
    ),
)
@method_decorator(
    name='retrieve',
    decorator=swagger_auto_schema(
        tags=['Data Manager'],
        x_fern_sdk_group_name='views',
        x_fern_sdk_method_name='get',
        x_fern_audiences=['public'],
        operation_summary='Get view details',
        operation_description='Get the details about a specific view in the data manager',
        manual_parameters=[
            openapi.Parameter(name='id', type=openapi.TYPE_STRING, in_=openapi.IN_PATH, description='View ID'),
        ],
    ),
)
@method_decorator(
    name='update',
    decorator=swagger_auto_schema(
        tags=['Data Manager'],
        x_fern_audiences=['internal'],
        operation_summary='Put view',
        operation_description='Overwrite view data with updated filters and other information for a specific project.',
        request_body=_view_request_body,
        manual_parameters=[
            openapi.Parameter(name='id', type=openapi.TYPE_STRING, in_=openapi.IN_PATH, description='View ID'),
        ],
    ),
)
@method_decorator(
    name='partial_update',
    decorator=swagger_auto_schema(
        tags=['Data Manager'],
        x_fern_sdk_group_name='views',
        x_fern_sdk_method_name='update',
        x_fern_audiences=['public'],
        operation_summary='Update view',
        operation_description='Update view data with additional filters and other information for a specific project.',
        manual_parameters=[
            openapi.Parameter(name='id', type=openapi.TYPE_STRING, in_=openapi.IN_PATH, description='View ID'),
        ],
        request_body=_view_request_body,
        responses={200: ViewSerializer},
    ),
)
@method_decorator(
    name='destroy',
    decorator=swagger_auto_schema(
        tags=['Data Manager'],
        x_fern_sdk_group_name='views',
        x_fern_sdk_method_name='delete',
        x_fern_audiences=['public'],
        operation_summary='Delete view',
        operation_description='Delete a specific view by ID.',
        manual_parameters=[
            openapi.Parameter(name='id', type=openapi.TYPE_STRING, in_=openapi.IN_PATH, description='View ID'),
        ],
    ),
)
class ViewAPI(viewsets.ModelViewSet):
    serializer_class = ViewSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['project']
    permission_required = ViewClassPermission(
        GET=all_permissions.tasks_view,
        POST=all_permissions.tasks_change,
        PATCH=all_permissions.tasks_change,
        PUT=all_permissions.tasks_change,
        DELETE=all_permissions.tasks_delete,
    )

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @swagger_auto_schema(
        tags=['Data Manager'],
        x_fern_sdk_group_name='views',
        x_fern_sdk_method_name='delete_all',
        x_fern_audiences=['public'],
        operation_summary='Delete all project views',
        operation_description='Delete all views for a specific project',
        request_body=ViewResetSerializer,
    )
    @action(detail=False, methods=['delete'])
    def reset(self, request):
        serializer = ViewResetSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        project = generics.get_object_or_404(
            Project.objects.for_user(request.user), pk=serializer.validated_data['project'].id
        )
        queryset = self.filter_queryset(self.get_queryset()).filter(project=project)
        queryset.all().delete()
        return Response(status=204)

    def get_queryset(self):
        return View.objects.filter(project__organization=self.request.user.active_organization).order_by('id')


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
        return await sync_to_async(super().paginate_queryset, thread_sensitive=True)(queryset, request, view)

    def sync_paginate_queryset(self, queryset, request, view=None):
        self.total_predictions = Prediction.objects.filter(task_id__in=queryset).count()
        self.total_annotations = Annotation.objects.filter(task_id__in=queryset, was_cancelled=False).count()
        return super().paginate_queryset(queryset, request, view)

    def paginate_queryset(self, queryset, request, view=None):
        if flag_set('fflag_fix_back_leap_24_tasks_api_optimization_05092023_short'):
            return self.async_paginate_queryset(queryset, request, view)
        else:
            return self.sync_paginate_queryset(queryset, request, view)

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

    @staticmethod
    def get_task_serializer_context(request, project):
        all_fields = request.GET.get('fields', None) == 'all'  # false by default

        return {
            'resolve_uri': bool_from_request(request.GET, 'resolve_uri', True),
            'request': request,
            'project': project,
            'drafts': all_fields,
            'predictions': all_fields,
            'annotations': all_fields,
        }

    def get_task_queryset(self, request, prepare_params):
        return Task.prepared.only_filtered(prepare_params=prepare_params)

    @staticmethod
    def prefetch(queryset):
        return queryset.prefetch_related(
            'annotations',
            'predictions',
            'annotations__completed_by',
            'project',
            'io_storages_azureblobimportstoragelink',
            'io_storages_gcsimportstoragelink',
            'io_storages_localfilesimportstoragelink',
            'io_storages_redisimportstoragelink',
            'io_storages_s3importstoragelink',
            'file_upload',
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
        context = self.get_task_serializer_context(self.request, project)

        # paginated tasks
        page = self.paginate_queryset(queryset)

        # get request params
        all_fields = 'all' if request.GET.get('fields', None) == 'all' else None
        fields_for_evaluation = get_fields_for_evaluation(prepare_params, request.user)
        review = bool_from_request(self.request.GET, 'review', False)

        if review:
            fields_for_evaluation = ['annotators', 'reviewed']
            all_fields = None
        if page is not None:
            ids = [task.id for task in page]  # page is a list already
            tasks = list(
                self.prefetch(
                    Task.prepared.annotate_queryset(
                        Task.objects.filter(id__in=ids),
                        fields_for_evaluation=fields_for_evaluation,
                        all_fields=all_fields,
                        request=request,
                    )
                )
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

            if flag_set('fflag_fix_back_leap_24_tasks_api_optimization_05092023_short'):
                serializer = self.task_serializer_class(
                    page,
                    many=True,
                    context=context,
                    include=get_fields_for_evaluation(prepare_params, request.user, skip_regular=False),
                )
            else:
                serializer = self.task_serializer_class(page, many=True, context=context)
            return self.get_paginated_response(serializer.data)
        # all tasks
        if project.evaluate_predictions_automatically:
            evaluate_predictions(queryset.filter(predictions__isnull=True))
        queryset = Task.prepared.annotate_queryset(
            queryset, fields_for_evaluation=fields_for_evaluation, all_fields=all_fields, request=request
        )
        serializer = self.task_serializer_class(queryset, many=True, context=context)
        return Response(serializer.data)


@method_decorator(
    name='get',
    decorator=swagger_auto_schema(
        tags=['Data Manager'],
        x_fern_audiences=['internal'],
        operation_summary='Get data manager columns',
        operation_description=(
            'Retrieve the data manager columns available for the tasks in a specific project. '
            'For more details, see [GET api/actions](#/Data%20Manager/get_api_actions).'
        ),
        manual_parameters=[
            openapi.Parameter(
                name='project',
                type=openapi.TYPE_INTEGER,
                in_=openapi.IN_QUERY,
                description='Project ID',
                required=True,
            )
        ],
        responses={
            200: openapi.Response(
                description='Columns retrieved successfully',
                examples={
                    'application/json': {
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
                    }
                },
            ),
            400: openapi.Response(description='Invalid project ID supplied'),
            404: openapi.Response(description='Project not found'),
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
    decorator=swagger_auto_schema(
        tags=['Data Manager'],
        x_fern_audiences=['internal'],
        operation_summary='Get project state',
        operation_description='Retrieve the project state for the data manager.',
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
    decorator=swagger_auto_schema(
        tags=['Data Manager'],
        x_fern_sdk_group_name='actions',
        x_fern_sdk_method_name='list',
        x_fern_audiences=['public'],
        operation_summary='Get actions',
        operation_description='Retrieve all the registered actions with descriptions that data manager can use.',
    ),
)
@method_decorator(
    name='post',
    decorator=swagger_auto_schema(
        tags=['Data Manager'],
        x_fern_sdk_group_name='actions',
        x_fern_sdk_method_name='create',
        x_fern_audiences=['public'],
        operation_summary='Post actions',
        operation_description=(
            'Perform a Data Manager action with the selected tasks and filters. '
            'Note: More complex actions require additional parameters in the request body. '
            'Call `GET api/actions?project=<id>` to explore them. <br>'
            'Example: `GET api/actions?id=delete_tasks&project=1`'
        ),
        request_body=prepare_params_schema,
        manual_parameters=[
            openapi.Parameter(
                name='id',
                type=openapi.TYPE_STRING,
                in_=openapi.IN_QUERY,
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
                example='delete_tasks',
                required=True,
            ),
            openapi.Parameter(
                name='project',
                type=openapi.TYPE_INTEGER,
                in_=openapi.IN_QUERY,
                description='Project ID',
                required=True,
            ),
            openapi.Parameter(
                name='view',
                type=openapi.TYPE_INTEGER,
                in_=openapi.IN_QUERY,
                description='View ID (optional, it has higher priority than filters, '
                'selectedItems and ordering from the request body payload)',
            ),
        ],
        responses={200: openapi.Response(description='Action performed successfully')},
    ),
)
class ProjectActionsAPI(APIView):
    permission_required = ViewClassPermission(
        GET=all_permissions.projects_view,
        POST=all_permissions.projects_view,
    )

    def get(self, request):
        pk = int_from_request(request.GET, 'project', 1)  # replace 1 to None, it's for debug only
        project = generics.get_object_or_404(Project, pk=pk)
        self.check_object_permissions(request, project)
        return Response(get_all_actions(request.user, project))

    def post(self, request):
        pk = int_from_request(request.GET, 'project', None)
        project = generics.get_object_or_404(Project, pk=pk)
        self.check_object_permissions(request, project)

        queryset = get_prepared_queryset(request, project)

        # wrong action id
        action_id = request.GET.get('id', None)
        if action_id is None:
            response = {'detail': 'No action id "' + str(action_id) + '", use ?id=<action-id>'}
            return Response(response, status=422)

        # perform action and return the result dict
        kwargs = {'request': request}  # pass advanced params to actions
        result = perform_action(action_id, project, queryset, request.user, **kwargs)
        code = result.pop('response_code', 200)

        return Response(result, status=code)
