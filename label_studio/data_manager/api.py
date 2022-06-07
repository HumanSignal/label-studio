"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import logging

from django_filters.rest_framework import DjangoFilterBackend
from django.utils.decorators import method_decorator
from rest_framework import viewsets, generics
from rest_framework.decorators import action
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.views import APIView
from drf_yasg.utils import swagger_auto_schema
from drf_yasg import openapi
from django.db.models import Sum, Count
from django.conf import settings
from ordered_set import OrderedSet

from core.utils.common import get_object_with_check_and_log, int_from_request, bool_from_request, load_func
from core.permissions import all_permissions, ViewClassPermission
from projects.models import Project
from projects.serializers import ProjectSerializer
from tasks.models import Task, Annotation, Prediction
from tasks.serializers import TaskIDOnlySerializer

from data_manager.functions import get_prepared_queryset, evaluate_predictions, get_prepare_params
from data_manager.models import View, PrepareParams
from data_manager.managers import get_fields_for_evaluation
from data_manager.serializers import ViewSerializer, DataManagerTaskSerializer, SelectedItemsSerializer, ViewResetSerializer
from data_manager.actions import get_all_actions, perform_action

logger = logging.getLogger(__name__)


@method_decorator(name='list', decorator=swagger_auto_schema(
    tags=['Data Manager'], operation_summary="List views",
    operation_description="List all views for a specific project.",
    manual_parameters=[
        openapi.Parameter(
            name='project',
            type=openapi.TYPE_INTEGER,
            in_=openapi.IN_QUERY,
            description='Project ID'),
    ],
))
@method_decorator(name='create', decorator=swagger_auto_schema(
    tags=['Data Manager'], operation_summary="Create view",
    operation_description="Create a view for a specific project.",
))
@method_decorator(name='retrieve', decorator=swagger_auto_schema(
    tags=['Data Manager'],
    operation_summary="Get view details",
    operation_description="Get the details about a specific view in the data manager",
    manual_parameters=[
        openapi.Parameter(
            name='id',
            type=openapi.TYPE_STRING,
            in_=openapi.IN_PATH,
            description='View ID'),
    ],
))
@method_decorator(name='update', decorator=swagger_auto_schema(
    tags=['Data Manager'], operation_summary="Put view",
    operation_description="Overwrite view data with updated filters and other information for a specific project.",
    manual_parameters=[
        openapi.Parameter(
            name='id',
            type=openapi.TYPE_STRING,
            in_=openapi.IN_PATH,
            description='View ID'),
    ],
))
@method_decorator(name='partial_update', decorator=swagger_auto_schema(
    tags=['Data Manager'], operation_summary="Update view",
    operation_description="Update view data with additional filters and other information for a specific project.",
    manual_parameters=[
        openapi.Parameter(
            name='id',
            type=openapi.TYPE_STRING,
            in_=openapi.IN_PATH,
            description='View ID'),
    ],
))
@method_decorator(name='destroy', decorator=swagger_auto_schema(
    tags=['Data Manager'], operation_summary="Delete view",
    operation_description="Delete a specific view by ID.",
    manual_parameters=[
        openapi.Parameter(
            name='id',
            type=openapi.TYPE_STRING,
            in_=openapi.IN_PATH,
            description='View ID'),
    ],
))
class ViewAPI(viewsets.ModelViewSet):
    serializer_class = ViewSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["project"]
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
        operation_summary="Reset project views",
        operation_description="Reset all views for a specific project.",
        request_body=ViewResetSerializer,
    )
    @action(detail=False, methods=["delete"])
    def reset(self, request):
        serializer = ViewResetSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        project = generics.get_object_or_404(Project.objects.for_user(request.user), pk=serializer.validated_data['project'].id)
        queryset = self.filter_queryset(self.get_queryset()).filter(project=project)
        queryset.all().delete()
        return Response(status=204)

    def get_queryset(self):
        return View.objects.filter(project__organization=self.request.user.active_organization)


class TaskPagination(PageNumberPagination):
    page_size = 100
    page_size_query_param = "page_size"
    total_annotations = 0
    total_predictions = 0
    max_page_size = settings.TASK_API_PAGE_SIZE_MAX

    def paginate_queryset(self, queryset, request, view=None):
        self.total_predictions = Prediction.objects.filter(task_id__in=queryset).count()
        self.total_annotations = Annotation.objects.filter(task_id__in=queryset, was_cancelled=False).count()
        return super().paginate_queryset(queryset, request, view)

    def get_paginated_response(self, data):
        return Response(
            {
                "total_annotations": self.total_annotations,
                "total_predictions": self.total_predictions,
                "total": self.page.paginator.count,
                "tasks": data,
            }
        )


@method_decorator(name='get', decorator=swagger_auto_schema(auto_schema=None))
@method_decorator(name='post', decorator=swagger_auto_schema(auto_schema=None))
class TaskListAPI(generics.ListCreateAPIView):
    task_serializer_class = DataManagerTaskSerializer
    permission_required = ViewClassPermission(
        GET=all_permissions.tasks_view,
        POST=all_permissions.tasks_change,
        PATCH=all_permissions.tasks_change,
        PUT=all_permissions.tasks_change,
        DELETE=all_permissions.tasks_delete,
    )

    @staticmethod
    def get_task_serializer_context(request, project):
        all_fields = request.GET.get('fields', None) == 'all'  # false by default

        return {
            'resolve_uri': True,
            'request': request,
            'project': project,
            'drafts': all_fields,
            'predictions': all_fields,
            'annotations': all_fields
        }

    def get_task_queryset(self, request, prepare_params):
        return Task.prepared.only_filtered(prepare_params=prepare_params)

    @staticmethod
    def prefetch(queryset):
        return queryset.prefetch_related(
            'annotations', 'predictions', 'annotations__completed_by', 'project',
            'io_storages_azureblobimportstoragelink',
            'io_storages_gcsimportstoragelink',
            'io_storages_localfilesimportstoragelink',
            'io_storages_redisimportstoragelink',
            'io_storages_s3importstoragelink',
            'file_upload'
        )

    def get(self, request):
        # get project
        view_pk = int_from_request(request.GET, 'view', 0) or int_from_request(request.data, 'view', 0)
        project_pk = int_from_request(request.GET, 'project', 0) or int_from_request(request.data, 'project', 0)
        if project_pk:
            project = get_object_with_check_and_log(request, Project, pk=project_pk)
            self.check_object_permissions(request, project)
        elif view_pk:
            view = get_object_with_check_and_log(request, View, pk=view_pk)
            project = view.project
            self.check_object_permissions(request, project)
        else:
            return Response({'detail': 'Neither project nor view id specified'}, status=404)
        # get prepare params (from view or from payload directly)
        prepare_params = get_prepare_params(request, project)
        queryset = self.get_task_queryset(request, prepare_params)
        context = self.get_task_serializer_context(self.request, project)

        # paginated tasks
        self.pagination_class = TaskPagination
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
                    )
                )
            )
            tasks_by_ids = {task.id: task for task in tasks}
            # keep ids ordering
            page = [tasks_by_ids[_id] for _id in ids]

            # retrieve ML predictions if tasks don't have them
            if not review and project.evaluate_predictions_automatically:
                tasks_for_predictions = Task.objects.filter(id__in=ids, predictions__isnull=True)
                evaluate_predictions(tasks_for_predictions)

            serializer = self.task_serializer_class(page, many=True, context=context)
            return self.get_paginated_response(serializer.data)
        # all tasks
        if project.evaluate_predictions_automatically:
            evaluate_predictions(queryset.filter(predictions__isnull=True))
        queryset = Task.prepared.annotate_queryset(
            queryset, fields_for_evaluation=fields_for_evaluation, all_fields=all_fields
        )
        serializer = self.task_serializer_class(queryset, many=True, context=context)
        return Response(serializer.data)


@method_decorator(name='get', decorator=swagger_auto_schema(
    tags=['Data Manager'],
    operation_summary='Get data manager columns',
    operation_description='Retrieve the data manager columns available for the tasks in a specific project.',
))
class ProjectColumnsAPI(APIView):
    permission_required = all_permissions.projects_view

    def get(self, request):
        pk = int_from_request(request.GET, "project", 1)
        project = get_object_with_check_and_log(request, Project, pk=pk)
        self.check_object_permissions(request, project)
        GET_ALL_COLUMNS = load_func(settings.DATA_MANAGER_GET_ALL_COLUMNS)
        data = GET_ALL_COLUMNS(project, request.user)
        return Response(data)


@method_decorator(name='get', decorator=swagger_auto_schema(
    tags=['Data Manager'],
    operation_summary='Get project state',
    operation_description='Retrieve the project state for the data manager.',
))
class ProjectStateAPI(APIView):
    permission_required = all_permissions.projects_view

    def get(self, request):
        pk = int_from_request(request.GET, "project", 1)  # replace 1 to None, it's for debug only
        project = get_object_with_check_and_log(request, Project, pk=pk)
        self.check_object_permissions(request, project)
        data = ProjectSerializer(project).data

        data.update(
            {
                "can_delete_tasks": True,
                "can_manage_annotations": True,
                "can_manage_tasks": True,
                "source_syncing": False,
                "target_syncing": False,
                "task_count": project.tasks.count(),
                "annotation_count": Annotation.objects.filter(task__project=project).count(),
                'config_has_control_tags': len(project.get_parsed_config()) > 0
            }
        )
        return Response(data)


@method_decorator(name='get', decorator=swagger_auto_schema(
    tags=['Data Manager'],
    operation_summary='Get actions',
    operation_description='Retrieve all the registered actions with descriptions that data manager can use.',
))
@method_decorator(name='post', decorator=swagger_auto_schema(
    tags=['Data Manager'],
    operation_summary='Post actions',
    operation_description='Perform an action with the selected items from a specific view.',
))
class ProjectActionsAPI(APIView):
    permission_required = ViewClassPermission(
        GET=all_permissions.projects_view,
        POST=all_permissions.projects_view,
    )

    def get(self, request):
        pk = int_from_request(request.GET, "project", 1)  # replace 1 to None, it's for debug only
        project = get_object_with_check_and_log(request, Project, pk=pk)
        self.check_object_permissions(request, project)
        return Response(get_all_actions(request.user, project))

    def post(self, request):
        pk = int_from_request(request.GET, "project", None)
        project = get_object_with_check_and_log(request, Project, pk=pk)
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
