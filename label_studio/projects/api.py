"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import drf_yasg.openapi as openapi
import logging
import numpy as np
import pathlib
import os

from django.db import IntegrityError
from django.conf import settings
from drf_yasg.utils import swagger_auto_schema
from django.utils.decorators import method_decorator
from rest_framework import generics, status, filters
from rest_framework.exceptions import NotFound, ValidationError as RestValidationError
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from rest_framework.views import exception_handler
from django.http import Http404

from core.utils.common import temporary_disconnect_all_signals
from core.label_config import config_essential_data_has_changed
from projects.models import (
    Project, ProjectSummary, ProjectManager
)
from projects.serializers import (
    ProjectSerializer, ProjectLabelConfigSerializer, ProjectSummarySerializer
)
from projects.functions.next_task import get_next_task
from tasks.models import Task
from tasks.serializers import TaskSerializer, TaskSimpleSerializer, TaskWithAnnotationsAndPredictionsAndDraftsSerializer, NextTaskSerializer
from webhooks.utils import api_webhook, api_webhook_for_delete, emit_webhooks_for_instance
from webhooks.models import WebhookAction

from core.permissions import all_permissions, ViewClassPermission
from core.utils.common import (
    get_object_with_check_and_log, paginator, paginator_help)
from core.utils.exceptions import ProjectExistException, LabelStudioDatabaseException
from core.utils.io import find_dir, find_file, read_yaml

from data_manager.functions import get_prepared_queryset, filters_ordering_selected_items_exist
from data_manager.models import View

logger = logging.getLogger(__name__)


_result_schema = openapi.Schema(
    title='Labeling result',
    description='Labeling result (choices, labels, bounding boxes, etc.)',
    type=openapi.TYPE_OBJECT,
    properies={
        'from_name': openapi.Schema(
            title='from_name',
            description='The name of the labeling tag from the project config',
            type=openapi.TYPE_STRING
        ),
        'to_name': openapi.Schema(
            title='to_name',
            description='The name of the labeling tag from the project config',
            type=openapi.TYPE_STRING
        ),
        'value': openapi.Schema(
            title='value',
            description='Labeling result value. Format depends on chosen ML backend',
            type=openapi.TYPE_OBJECT
        )
    },
    example={
        'from_name': 'image_class',
        'to_name': 'image',
        'value': {
            'labels': ['Cat']
        }
    }
)

_task_data_schema = openapi.Schema(
    title='Task data',
    description='Task data',
    type=openapi.TYPE_OBJECT,
    example={
        'id': 1,
        'my_image_url': '/static/samples/kittens.jpg'
    }
)


class ProjectListPagination(PageNumberPagination):
    page_size = 30
    page_size_query_param = 'page_size'


@method_decorator(name='get', decorator=swagger_auto_schema(
    tags=['Projects'],
    operation_summary='List your projects',
    operation_description="""
    Return a list of the projects that you've created.

    To perform most tasks with the Label Studio API, you must specify the project ID, sometimes referred to as the `pk`.
    To retrieve a list of your Label Studio projects, update the following command to match your own environment.
    Replace the domain name, port, and authorization token, then run the following from the command line:
    ```bash
    curl -X GET {}/api/projects/ -H 'Authorization: Token abc123'
    ```
    """.format(settings.HOSTNAME or 'https://localhost:8080')
))
@method_decorator(name='post', decorator=swagger_auto_schema(
    tags=['Projects'],
    operation_summary='Create new project',
    operation_description="""
    Create a project and set up the labeling interface in Label Studio using the API.
    
    ```bash
    curl -H Content-Type:application/json -H 'Authorization: Token abc123' -X POST '{}/api/projects' \
    --data "{{\"label_config\": \"<View>[...]</View>\"}}"
    ```
    """.format(settings.HOSTNAME or 'https://localhost:8080')
))
class ProjectListAPI(generics.ListCreateAPIView):
    parser_classes = (JSONParser, FormParser, MultiPartParser)
    serializer_class = ProjectSerializer
    filter_backends = [filters.OrderingFilter]
    permission_required = ViewClassPermission(
        GET=all_permissions.projects_view,
        POST=all_permissions.projects_create,
    )
    ordering = ['-created_at']
    pagination_class = ProjectListPagination

    def get_queryset(self):
        projects = Project.objects.filter(organization=self.request.user.active_organization)
        return ProjectManager.with_counts_annotate(projects).prefetch_related('members', 'created_by')

    def get_serializer_context(self):
        context = super(ProjectListAPI, self).get_serializer_context()
        context['created_by'] = self.request.user
        return context

    def perform_create(self, ser):
        try:
            project = ser.save(organization=self.request.user.active_organization)
        except IntegrityError as e:
            if str(e) == 'UNIQUE constraint failed: project.title, project.created_by_id':
                raise ProjectExistException('Project with the same name already exists: {}'.
                                            format(ser.validated_data.get('title', '')))
            raise LabelStudioDatabaseException('Database error during project creation. Try again.')

    def get(self, request, *args, **kwargs):
        return super(ProjectListAPI, self).get(request, *args, **kwargs)

    @api_webhook(WebhookAction.PROJECT_CREATED)
    def post(self, request, *args, **kwargs):
        return super(ProjectListAPI, self).post(request, *args, **kwargs)


@method_decorator(name='get', decorator=swagger_auto_schema(
        tags=['Projects'],
        operation_summary='Get project by ID',
        operation_description='Retrieve information about a project by project ID.'
    ))
@method_decorator(name='delete', decorator=swagger_auto_schema(
        tags=['Projects'],
        operation_summary='Delete project',
        operation_description='Delete a project by specified project ID.'
    ))
@method_decorator(name='patch', decorator=swagger_auto_schema(
        tags=['Projects'],
        operation_summary='Update project',
        operation_description='Update the project settings for a specific project.',
        request_body=ProjectSerializer
    ))
class ProjectAPI(generics.RetrieveUpdateDestroyAPIView):

    parser_classes = (JSONParser, FormParser, MultiPartParser)
    queryset = Project.objects.with_counts()
    permission_required = ViewClassPermission(
        GET=all_permissions.projects_view,
        DELETE=all_permissions.projects_delete,
        PATCH=all_permissions.projects_change,
        PUT=all_permissions.projects_change,
        POST=all_permissions.projects_create,
    )
    serializer_class = ProjectSerializer

    redirect_route = 'projects:project-detail'
    redirect_kwarg = 'pk'

    def get_queryset(self):
        return Project.objects.with_counts().filter(organization=self.request.user.active_organization)

    def get(self, request, *args, **kwargs):
        return super(ProjectAPI, self).get(request, *args, **kwargs)

    @api_webhook_for_delete(WebhookAction.PROJECT_DELETED)
    def delete(self, request, *args, **kwargs):
        return super(ProjectAPI, self).delete(request, *args, **kwargs)

    @api_webhook(WebhookAction.PROJECT_UPDATED)
    def patch(self, request, *args, **kwargs):
        project = self.get_object()
        label_config = self.request.data.get('label_config')

        # config changes can break view, so we need to reset them
        if label_config:
            try:
                has_changes = config_essential_data_has_changed(label_config, project.label_config)
            except KeyError:
                pass
            else:
                if has_changes:
                    View.objects.filter(project=project).all().delete()

        return super(ProjectAPI, self).patch(request, *args, **kwargs)

    def perform_destroy(self, instance):
        # we don't need to relaculate counters if we delete whole project
        with temporary_disconnect_all_signals():
            instance.delete()

    @swagger_auto_schema(auto_schema=None)
    @api_webhook(WebhookAction.PROJECT_UPDATED)
    def put(self, request, *args, **kwargs):
        return super(ProjectAPI, self).put(request, *args, **kwargs)


@method_decorator(name='get', decorator=swagger_auto_schema(
    tags=['Projects'],
    operation_summary='Get next task to label',
    operation_description="""
    Get the next task for labeling. If you enable Machine Learning in
    your project, the response might include a "predictions"
    field. It contains a machine learning prediction result for
    this task.
    """,
    responses={200: TaskWithAnnotationsAndPredictionsAndDraftsSerializer()}
    ))  # leaving this method decorator info in case we put it back in swagger API docs
class ProjectNextTaskAPI(generics.RetrieveAPIView):

    permission_required = all_permissions.tasks_view
    serializer_class = TaskWithAnnotationsAndPredictionsAndDraftsSerializer  # using it for swagger API docs
    queryset = Project.objects.all()
    swagger_schema = None # this endpoint doesn't need to be in swagger API docs

    def get(self, request, *args, **kwargs):
        project = self.get_object()
        dm_queue = filters_ordering_selected_items_exist(request.data)
        prepared_tasks = get_prepared_queryset(request, project)

        next_task, queue_info = get_next_task(request.user, prepared_tasks, project, dm_queue)

        if next_task is None:
            raise NotFound(
                f'There are still some tasks to complete for the user={request.user}, '
                f'but they seem to be locked by another user.')

        # serialize task
        context = {'request': request, 'project': project, 'resolve_uri': True, 'annotations': False}
        serializer = NextTaskSerializer(next_task, context=context)
        response = serializer.data

        response['queue'] = queue_info
        return Response(response)


@method_decorator(name='post', decorator=swagger_auto_schema(
        tags=['Projects'],
        operation_summary='Validate label config',
        operation_description='Validate an arbitrary labeling configuration.',
        responses={200: 'Validation success'},
        request_body=ProjectLabelConfigSerializer,
    ))
class LabelConfigValidateAPI(generics.CreateAPIView):
    parser_classes = (JSONParser, FormParser, MultiPartParser)
    permission_classes = (AllowAny,)
    serializer_class = ProjectLabelConfigSerializer

    def post(self, request, *args, **kwargs):
        return super(LabelConfigValidateAPI, self).post(request, *args, **kwargs)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        try:
            serializer.is_valid(raise_exception=True)
        except RestValidationError as exc:
            context = self.get_exception_handler_context()
            response = exception_handler(exc, context)
            response = self.finalize_response(request, response)
            return response

        return Response(status=status.HTTP_204_NO_CONTENT)


@method_decorator(name='post', decorator=swagger_auto_schema(
        tags=['Projects'],
        operation_summary='Validate project label config',
        operation_description="""
        Determine whether the label configuration for a specific project is valid.
        """,
        manual_parameters=[
            openapi.Parameter(
                name='id',
                type=openapi.TYPE_INTEGER,
                in_=openapi.IN_PATH,
                description='A unique integer value identifying this project.'),
        ],
        request_body=ProjectLabelConfigSerializer,
))
class ProjectLabelConfigValidateAPI(generics.RetrieveAPIView):
    """ Validate label config
    """
    parser_classes = (JSONParser, FormParser, MultiPartParser)
    serializer_class = ProjectLabelConfigSerializer
    permission_required = all_permissions.projects_change
    queryset = Project.objects.all()

    def post(self, request, *args, **kwargs):
        project = self.get_object()
        label_config = self.request.data.get('label_config')
        if not label_config:
            raise RestValidationError('Label config is not set or is empty')

        # check new config includes meaningful changes
        has_changed = config_essential_data_has_changed(label_config, project.label_config)
        project.validate_config(label_config, strict=True)
        return Response({'config_essential_data_has_changed': has_changed}, status=status.HTTP_200_OK)

    @swagger_auto_schema(auto_schema=None)
    def get(self, request, *args, **kwargs):
        return super(ProjectLabelConfigValidateAPI, self).get(request, *args, **kwargs)


class ProjectSummaryAPI(generics.RetrieveAPIView):
    parser_classes = (JSONParser,)
    serializer_class = ProjectSummarySerializer
    permission_required = all_permissions.projects_view
    queryset = ProjectSummary.objects.all()

    @swagger_auto_schema(auto_schema=None)
    def get(self, *args, **kwargs):
        return super(ProjectSummaryAPI, self).get(*args, **kwargs)


@method_decorator(name='delete', decorator=swagger_auto_schema(
        tags=['Projects'],
        operation_summary='Delete all tasks',
        operation_description='Delete all tasks from a specific project.',
        manual_parameters=[
            openapi.Parameter(
                name='id',
                type=openapi.TYPE_INTEGER,
                in_=openapi.IN_PATH,
                description='A unique integer value identifying this project.'),
        ],
))
@method_decorator(name='get', decorator=swagger_auto_schema(
        tags=['Projects'],
        operation_summary='List project tasks',
        operation_description="""
            Retrieve a paginated list of tasks for a specific project. For example, use the following cURL command:
            ```bash
            curl -X GET {}/api/projects/{{id}}/tasks/ -H 'Authorization: Token abc123'
            ```
        """.format(settings.HOSTNAME or 'https://localhost:8080'),
        manual_parameters=[
            openapi.Parameter(
                name='id',
                type=openapi.TYPE_INTEGER,
                in_=openapi.IN_PATH,
                description='A unique integer value identifying this project.'),
        ],
    ))
class ProjectTaskListAPI(generics.ListCreateAPIView,
                         generics.DestroyAPIView):

    parser_classes = (JSONParser, FormParser)
    queryset = Task.objects.all()
    permission_required = ViewClassPermission(
        GET=all_permissions.tasks_view,
        POST=all_permissions.tasks_change,
        DELETE=all_permissions.tasks_delete,
    )
    serializer_class = TaskSerializer
    redirect_route = 'projects:project-settings'
    redirect_kwarg = 'pk'

    def get_serializer_class(self):
        if self.request.method == 'GET':
            return TaskSimpleSerializer
        else:
            return TaskSerializer

    def filter_queryset(self, queryset):
        project = generics.get_object_or_404(Project.objects.for_user(self.request.user), pk=self.kwargs.get('pk', 0))
        tasks = Task.objects.filter(project=project)
        page = paginator(tasks, self.request)
        if page:
            return page
        else:
            raise Http404

    def delete(self, request, *args, **kwargs):
        project = generics.get_object_or_404(Project.objects.for_user(self.request.user), pk=self.kwargs['pk'])
        task_ids = list(Task.objects.filter(project=project).values('id'))
        Task.delete_tasks_without_signals(Task.objects.filter(project=project))
        project.summary.reset()
        emit_webhooks_for_instance(request.user.active_organization, None, WebhookAction.TASKS_DELETED, task_ids)
        return Response(data={'tasks': task_ids}, status=204)

    @swagger_auto_schema(**paginator_help('tasks', 'Projects'))
    def get(self, *args, **kwargs):
        return super(ProjectTaskListAPI, self).get(*args, **kwargs)

    @swagger_auto_schema(auto_schema=None)
    def post(self, *args, **kwargs):
        return super(ProjectTaskListAPI, self).post(*args, **kwargs)

    def get_serializer_context(self):
        context = super(ProjectTaskListAPI, self).get_serializer_context()
        context['project'] = get_object_with_check_and_log(self.request, Project, pk=self.kwargs['pk'])
        return context

    def perform_create(self, serializer):
        project = get_object_with_check_and_log(self.request, Project, pk=self.kwargs['pk'])
        instance = serializer.save(project=project)
        emit_webhooks_for_instance(self.request.user.active_organization, project, WebhookAction.TASKS_CREATED, [instance])


class TemplateListAPI(generics.ListAPIView):
    parser_classes = (JSONParser, FormParser, MultiPartParser)
    permission_required = all_permissions.projects_view
    swagger_schema = None

    def list(self, request, *args, **kwargs):
        annotation_templates_dir = find_dir('annotation_templates')
        configs = []
        for config_file in pathlib.Path(annotation_templates_dir).glob('**/*.yml'):
            config = read_yaml(config_file)
            if settings.VERSION_EDITION == 'Community':
                if settings.VERSION_EDITION.lower() != config.get('type', 'community'):
                    continue
            if config.get('image', '').startswith('/static') and settings.HOSTNAME:
                # if hostname set manually, create full image urls
                config['image'] = settings.HOSTNAME + config['image']
            configs.append(config)
        template_groups_file = find_file(os.path.join('annotation_templates', 'groups.txt'))
        with open(template_groups_file, encoding='utf-8') as f:
            groups = f.read().splitlines()
        logger.debug(f'{len(configs)} templates found.')
        return Response({'templates': configs, 'groups': groups})


class ProjectSampleTask(generics.RetrieveAPIView):
    parser_classes = (JSONParser,)
    queryset = Project.objects.all()
    permission_required = all_permissions.projects_view
    serializer_class = ProjectSerializer
    swagger_schema = None

    def post(self, request, *args, **kwargs):
        label_config = self.request.data.get('label_config')
        if not label_config:
            raise RestValidationError('Label config is not set or is empty')

        project = self.get_object()
        return Response({'sample_task': project.get_sample_task(label_config)}, status=200)


class ProjectModelVersions(generics.RetrieveAPIView):
    parser_classes = (JSONParser,)
    swagger_schema = None
    permission_required = all_permissions.projects_view
    queryset = Project.objects.all()

    def get(self, request, *args, **kwargs):
        project = self.get_object()
        return Response(data=project.get_model_versions(with_counters=True))
