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
from django.db.models import Sum, Count
from ordered_set import OrderedSet

from core.utils.common import get_object_with_check_and_log, int_from_request, bool_from_request, find_first_many_to_one_related_field_by_prefix
from core.permissions import all_permissions, ViewClassPermission
from projects.models import Project
from projects.serializers import ProjectSerializer
from tasks.models import Task, Annotation

from data_manager.functions import get_all_columns, get_prepared_queryset, evaluate_predictions
from data_manager.models import View
from data_manager.serializers import ViewSerializer, DataManagerTaskSerializer, SelectedItemsSerializer, ViewResetSerializer
from data_manager.actions import get_all_actions, perform_action


logger = logging.getLogger(__name__)


class TaskPagination(PageNumberPagination):
    page_size = 100
    page_size_query_param = "page_size"
    total_annotations = 0
    total_predictions = 0
    all_tasks = 0

    def get_count(self, queryset):
        return self.all_tasks

    def paginate_queryset(self, queryset, request, view=None):
        ops = {
            'all_tasks': Count('pk'),
            'all_annotations': Sum("total_annotations"),
            'all_predictions': Sum("total_predictions")
        }
        if 'total_predictions' not in queryset.query.annotations:
            ops.pop('all_predictions')
        if 'total_annotations' not in queryset.query.annotations:
            ops.pop('all_annotations')

        aggregated = queryset.aggregate(
            **ops
        )

        self.all_tasks = aggregated['all_tasks']
        self.total_annotations = (aggregated.get('all_annotations') or 0) if 'all_annotations' in aggregated else None
        self.total_predictions = (aggregated.get('all_predictions') or 0) if 'all_predictions' in aggregated else None
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


@method_decorator(name='list', decorator=swagger_auto_schema(
    tags=['Data Manager'], operation_summary="List views",
    operation_description="List all views for a specific project."))
@method_decorator(name='create', decorator=swagger_auto_schema(
    tags=['Data Manager'], operation_summary="Create view",
    operation_description="Create a view for a speicfic project."))
@method_decorator(name='retrieve', decorator=swagger_auto_schema(
    tags=['Data Manager'], operation_summary="Get view",
    operation_description="Get all views for a specific project."))
@method_decorator(name='update', decorator=swagger_auto_schema(
    tags=['Data Manager'], operation_summary="Put view",
    operation_description="Overwrite view data with updated filters and other information for a specific project."))
@method_decorator(name='partial_update', decorator=swagger_auto_schema(
    tags=['Data Manager'], operation_summary="Update view",
    operation_description="Update view data with additional filters and other information for a specific project."))
@method_decorator(name='destroy', decorator=swagger_auto_schema(
    tags=['Data Manager'], operation_summary="Delete view",
    operation_description="Delete a view for a specific project."))
class ViewAPI(viewsets.ModelViewSet):
    serializer_class = ViewSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["project"]
    task_serializer_class = DataManagerTaskSerializer
    permission_required = ViewClassPermission(
        GET=all_permissions.tasks_view,
        POST=all_permissions.tasks_change,
        PATCH=all_permissions.tasks_change,
        PUT=all_permissions.tasks_change,
        DELETE=all_permissions.tasks_delete,
    )

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @swagger_auto_schema(tags=['Data Manager'])
    @action(detail=False, methods=['delete'])
    def reset(self, request):
        """
        delete:
        Reset project views

        Reset all views for a specific project.
        """
        serializer = ViewResetSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        project = generics.get_object_or_404(Project.objects.for_user(request.user), pk=serializer.validated_data['project'].id)
        queryset = self.filter_queryset(self.get_queryset()).filter(project=project)
        queryset.all().delete()
        return Response(status=204)

    def get_queryset(self):
        return View.objects.filter(project__organization=self.request.user.active_organization)

    @staticmethod
    def get_task_serializer_context(request, project):
        storage = find_first_many_to_one_related_field_by_prefix(project, '.*io_storages.*')
        resolve_uri = True
        if not storage and not project.task_data_login and not project.task_data_password:
            resolve_uri = False

        all_fields = request.GET.get('fields', None) == 'all'  # false by default

        return {
            'proxy': bool_from_request(request.GET, 'proxy', True),
            'resolve_uri': resolve_uri,
            'request': request,
            'project': project,
            'drafts': all_fields,
            'predictions': all_fields,
            'annotations': all_fields
        }

    def get_task_queryset(self, request, view):
        all_fields = 'all' if request.GET.get('fields', None) == 'all' else None
        return Task.prepared.all(
            fields_for_evaluation=all_fields,
            prepare_params=view.get_prepare_tasks_params(),
            request=request)

    @swagger_auto_schema(tags=['Data Manager'], responses={200: task_serializer_class(many=True)})
    @action(detail=True, methods=["get"])
    def tasks(self, request, pk=None):
        """
        get:
        Get task list for view

        Retrieve a list of tasks with pagination for a specific view using filters and ordering.
        """
        view = self.get_object()
        queryset = self.get_task_queryset(request, view)
        project = view.project
        context = self.get_task_serializer_context(self.request, project)

        # paginated tasks
        self.pagination_class = TaskPagination
        page = self.paginate_queryset(queryset)
        if page is not None:
            # retrieve ML predictions if tasks don't have them
            if project.evaluate_predictions_automatically:
                ids = [task.id for task in page]  # page is a list already
                tasks_for_predictions = Task.objects.filter(id__in=ids, predictions__isnull=True)
                evaluate_predictions(tasks_for_predictions)

            serializer = self.task_serializer_class(page, many=True, context=context)
            return self.get_paginated_response(serializer.data)

        # all tasks
        if project.evaluate_predictions_automatically:
            evaluate_predictions(queryset.filter(predictions__isnull=True))
        serializer = self.task_serializer_class(queryset, many=True, context=context)
        return Response(serializer.data)

    @swagger_auto_schema(tags=['Data Manager'], methods=["get", "post", "delete", "patch"])
    @action(detail=True, url_path="selected-items", methods=["get", "post", "delete", "patch"])
    def selected_items(self, request, pk=None):
        """
        get:
        Get selected items

        Retrieve selected tasks for a specified view.

        post:
        Overwrite selected items

        Overwrite the selected items with new data.

        patch:
        Add selected items

        Add selected items to a specific view.

        delete:
        Delete selected items

        Delete selected items from a specific view.
        """
        view = self.get_object()

        # GET: get selected items from tab
        if request.method == "GET":
            serializer = SelectedItemsSerializer(view.selected_items)
            return Response(serializer.data)

        data = request.data
        serializer = SelectedItemsSerializer(data=data, context={"view": view, "request": request})
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        # POST: set whole
        if request.method == "POST":
            view.selected_items = data
            view.save()
            return Response(serializer.validated_data, status=201)

        selected_items = view.selected_items
        if selected_items is None:
            selected_items = {"all": False, "included": []}

        key = "excluded" if data["all"] else "included"
        left = OrderedSet(selected_items.get(key, []))
        right = OrderedSet(data.get(key, []))

        # PATCH: set particular with union
        if request.method == "PATCH":
            # make union
            result = left | right
            view.selected_items = selected_items
            view.selected_items[key] = list(result)
            view.save(update_fields=["selected_items"])
            return Response(view.selected_items, status=201)

        # DELETE: delete specified items
        if request.method == "DELETE":
            result = left - right
            view.selected_items[key] = list(result)
            view.save(update_fields=["selected_items"])
            return Response(view.selected_items, status=204)


class TaskAPI(APIView):
    permission_required = all_permissions.projects_view

    def get_serializer_class(self):
        return DataManagerTaskSerializer

    @staticmethod
    def get_serializer_context(request):
        return {
            'proxy': bool_from_request(request.GET, 'proxy', True),
            'resolve_uri': True,
            'completed_by': 'full',
            'drafts': True,
            'predictions': True,
            'annotations': True,
            'request': request
        }

    @swagger_auto_schema(tags=["Data Manager"])
    def get(self, request, pk):
        """
        get:
        Task by ID

        Retrieve a specific task by ID.
        """
        task = Task.prepared.get_queryset(fields_for_evaluation='all').get(id=pk)
        context = self.get_serializer_context(request)
        context['project'] = project = task.project

        # get prediction
        if project.evaluate_predictions_automatically and not task.predictions.exists():
            evaluate_predictions([task])

        serializer = self.get_serializer_class()(task, many=False, context=context)
        data = serializer.data
        return Response(data)


class ProjectColumnsAPI(APIView):
    permission_required = all_permissions.projects_view

    @swagger_auto_schema(tags=["Data Manager"])
    def get(self, request):
        """
        get:
        Get data manager columns

        Retrieve the data manager columns available for the tasks in a specific project.
        """
        pk = int_from_request(request.GET, "project", 1)
        project = get_object_with_check_and_log(request, Project, pk=pk)
        self.check_object_permissions(request, project)
        data = get_all_columns(request, project)
        return Response(data)


class ProjectStateAPI(APIView):
    permission_required = all_permissions.projects_view

    @swagger_auto_schema(tags=["Data Manager"])
    def get(self, request):
        """
        get:
        Project state

        Retrieve the project state for data manager.
        """
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
                'config_has_control_tags': len(project.get_control_tags_from_config()) > 0
            }
        )
        return Response(data)


class ProjectActionsAPI(APIView):
    permission_required = ViewClassPermission(
        GET=all_permissions.projects_view,
        POST=all_permissions.projects_view,
    )

    @swagger_auto_schema(tags=["Data Manager"])
    def get(self, request):
        """
        get:
        Get actions

        Retrieve all the registered actions with descriptions that data manager can use.
        """
        pk = int_from_request(request.GET, "project", 1)  # replace 1 to None, it's for debug only
        project = get_object_with_check_and_log(request, Project, pk=pk)
        self.check_object_permissions(request, project)
        return Response(get_all_actions(request.user))

    @swagger_auto_schema(tags=["Data Manager"])
    def post(self, request):
        """
        post:
        Post actions

        Perform an action with the selected items from a specific view.
        """
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
