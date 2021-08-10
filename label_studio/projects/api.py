"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import drf_yasg.openapi as openapi
import logging
import numpy as np
import pathlib
import os

from collections import Counter
from django.db import IntegrityError
from django.db.models.fields import DecimalField
from django.conf import settings
from drf_yasg.utils import swagger_auto_schema
from django.utils.decorators import method_decorator
from django.db.models import Q, When, Count, Case, OuterRef, Max, Exists, Value, BooleanField
from rest_framework import generics, status, filters
from rest_framework.exceptions import NotFound, ValidationError as RestValidationError
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import exception_handler

from core.utils.common import conditional_atomic
from core.utils.disable_signals import DisableSignals
from core.label_config import config_essential_data_has_changed
from projects.models import (
    Project, ProjectSummary
)
from projects.serializers import (
    ProjectSerializer, ProjectLabelConfigSerializer, ProjectSummarySerializer
)
from tasks.models import Task, Annotation, Prediction, TaskLock
from tasks.serializers import TaskSerializer, TaskWithAnnotationsAndPredictionsAndDraftsSerializer

from core.mixins import APIViewVirtualRedirectMixin, APIViewVirtualMethodMixin
from core.permissions import all_permissions, ViewClassPermission
from core.utils.common import (
    get_object_with_check_and_log, bool_from_request, paginator, paginator_help)
from core.utils.exceptions import ProjectExistException, LabelStudioDatabaseException
from core.utils.io import find_dir, find_file, read_yaml

from data_manager.functions import get_prepared_queryset
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
        'my_image_url': 'https://app.heartex.ai/static/samples/kittens.jpg'
    }
)


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

    def get_queryset(self):
        return Project.objects.with_counts().filter(organization=self.request.user.active_organization)

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
class ProjectAPI(APIViewVirtualRedirectMixin,
                 APIViewVirtualMethodMixin,
                 generics.RetrieveUpdateDestroyAPIView):

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

    def delete(self, request, *args, **kwargs):
        return super(ProjectAPI, self).delete(request, *args, **kwargs)

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
        with DisableSignals():
            instance.delete()

    @swagger_auto_schema(auto_schema=None)
    def post(self, request, *args, **kwargs):
        return super(ProjectAPI, self).post(request, *args, **kwargs)

    @swagger_auto_schema(auto_schema=None)
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
    )) # leaving this method decorator info in case we put it back in swagger API docs
class ProjectNextTaskAPI(generics.RetrieveAPIView):

    permission_required = all_permissions.tasks_view
    serializer_class = TaskWithAnnotationsAndPredictionsAndDraftsSerializer  # using it for swagger API docs
    swagger_schema = None # this endpoint doesn't need to be in swagger API docs

    def _get_random_unlocked(self, task_query, upper_limit=None):
        # get random task from task query, ignoring locked tasks
        n = task_query.count()
        if n > 0:
            upper_limit = upper_limit or n
            random_indices = np.random.permutation(upper_limit)
            task_query_only = task_query.only('overlap', 'id')

            for i in random_indices:
                try:
                    task = task_query_only[int(i)]
                except IndexError as exc:
                    logger.error(f'Task query out of range for {int(i)}, count={task_query_only.count()}. '
                                 f'Reason: {exc}', exc_info=True)
                except Exception as exc:
                    logger.error(exc, exc_info=True)
                else:
                    try:
                        task = Task.objects.select_for_update(skip_locked=True).get(pk=task.id)
                        if not task.has_lock(self.current_user):
                            return task
                    except Task.DoesNotExist:
                        logger.debug('Task with id {} locked'.format(task.id))

    def _get_first_unlocked(self, tasks_query):
        # Skip tasks that are locked due to being taken by collaborators
        for task_id in tasks_query.values_list('id', flat=True):
            try:
                task = Task.objects.select_for_update(skip_locked=True).get(pk=task_id)
                if not task.has_lock(self.current_user):
                    return task
            except Task.DoesNotExist:
                logger.debug('Task with id {} locked'.format(task_id))

    def _try_ground_truth(self, tasks, project):
        """Returns task from ground truth set"""
        ground_truth = Annotation.objects.filter(task=OuterRef('pk'), ground_truth=True)
        not_solved_tasks_with_ground_truths = tasks.annotate(
            has_ground_truths=Exists(ground_truth)).filter(has_ground_truths=True)
        if not_solved_tasks_with_ground_truths.exists():
            if project.sampling == project.SEQUENCE:
                return self._get_first_unlocked(not_solved_tasks_with_ground_truths)
            return self._get_random_unlocked(not_solved_tasks_with_ground_truths)

    def _try_tasks_with_overlap(self, tasks):
        """Filter out tasks without overlap (doesn't return next task)"""
        tasks_with_overlap = tasks.filter(overlap__gt=1)
        if tasks_with_overlap.exists():
            return None, tasks_with_overlap
        else:
            return None, tasks.filter(overlap=1)

    def _try_breadth_first(self, tasks):
        """Try to find tasks with maximum amount of annotations, since we are trying to label tasks as fast as possible
        """

        # =======
        # This commented part is trying to solve breadth-first in a bit different way:
        # it selects first task where any amount of annotations have been already created
        # we've left it here to be able to select it through the project settings later
        # =======
        # annotations = Annotation.objects.filter(task=OuterRef('pk'), ground_truth=False)
        # not_solved_tasks_labeling_started = tasks.annotate(labeling_started=Exists(annotations))
        # not_solved_tasks_labeling_started_true = not_solved_tasks_labeling_started.filter(labeling_started=True)
        # if not_solved_tasks_labeling_started_true.exists():
        #     # try to complete tasks that are already in progress
        #     next_task = self._get_random(not_solved_tasks_labeling_started_true)
        #     return next_task

        tasks = tasks.annotate(annotations_count=Count('annotations'))
        max_annotations_count = tasks.aggregate(Max('annotations_count'))['annotations_count__max']
        if max_annotations_count == 0:
            # there is no any labeled tasks found
            return

        # find any task with maximal amount of created annotations
        not_solved_tasks_labeling_started = tasks.annotate(
            reach_max_annotations_count=Case(
                When(annotations_count=max_annotations_count, then=Value(True)),
                default=Value(False),
                output_field=BooleanField()))
        not_solved_tasks_labeling_with_max_annotations = not_solved_tasks_labeling_started.filter(
            reach_max_annotations_count=True)
        if not_solved_tasks_labeling_with_max_annotations.exists():
            # try to complete tasks that are already in progress
            return self._get_random_unlocked(not_solved_tasks_labeling_with_max_annotations)

    def _try_uncertainty_sampling(self, tasks, project, user_solved_tasks_array):
        task_with_current_predictions = tasks.filter(predictions__model_version=project.model_version)
        if task_with_current_predictions.exists():
            logger.debug('Use uncertainty sampling')
            # collect all clusters already solved by user, count number of solved task in them
            user_solved_clusters = project.prepared_tasks.filter(pk__in=user_solved_tasks_array).annotate(
                cluster=Max('predictions__cluster')).values_list('cluster', flat=True)
            user_solved_clusters = Counter(user_solved_clusters)
            # order each task by the count of how many tasks solved in it's cluster
            cluster_num_solved_map = [When(predictions__cluster=k, then=v) for k, v in user_solved_clusters.items()]

            num_tasks_with_current_predictions = task_with_current_predictions.count()  # WARNING! this call doesn't work after consequent annotate
            if cluster_num_solved_map:
                task_with_current_predictions = task_with_current_predictions.annotate(
                    cluster_num_solved=Case(*cluster_num_solved_map, default=0, output_field=DecimalField()))
                # next task is chosen from least solved cluster and with lowest prediction score
                possible_next_tasks = task_with_current_predictions.order_by('cluster_num_solved', 'predictions__score')
            else:
                possible_next_tasks = task_with_current_predictions.order_by('predictions__score')

            num_annotators = project.annotators().count()
            if num_annotators > 1 and num_tasks_with_current_predictions > 0:
                # try to randomize tasks to avoid concurrent labeling between several annotators
                next_task = self._get_random_unlocked(
                    possible_next_tasks, upper_limit=min(num_annotators + 1, num_tasks_with_current_predictions))
            else:
                next_task = self._get_first_unlocked(possible_next_tasks)
        else:
            # uncertainty sampling fallback: choose by random sampling
            logger.debug(f'Uncertainty sampling fallbacks to random sampling '
                         f'(current project.model_version={str(project.model_version)})')
            next_task = self._get_random_unlocked(tasks)
        return next_task

    def _make_response(self, next_task, request, use_task_lock=True):
        """Once next task has chosen, this function triggers inference and prepare the API response"""
        user = request.user
        project = next_task.project

        if use_task_lock:
            # set lock for the task with TTL 3x time more then current average lead time (or 1 hour by default)
            next_task.set_lock(request.user)

        # call machine learning api and format response
        if project.show_collab_predictions and not next_task.predictions.exists():
            for ml_backend in project.ml_backends.all():
                ml_backend.predict_one_task(next_task)

        # serialize task
        context = {'request': request, 'project': project, 'resolve_uri': True,
                   'proxy': bool_from_request(request.GET, 'proxy', True)}
        serializer = TaskWithAnnotationsAndPredictionsAndDraftsSerializer(next_task, context=context)
        response = serializer.data

        annotations = []
        for c in response.get('annotations', []):
            if c.get('completed_by') == user.id and not (c.get('ground_truth') or c.get('honeypot')):
                annotations.append(c)
        response['annotations'] = annotations

        # remove all predictions if we don't want to show it in the label stream
        if not project.show_collab_predictions:
            response['predictions'] = []

        return Response(response)

    def get(self, request, *args, **kwargs):
        project = get_object_with_check_and_log(request, Project, pk=self.kwargs['pk'])
        self.check_object_permissions(request, project)
        user = request.user
        self.current_user = user

        # support actions api call from actions/next_task.py
        if hasattr(self, 'prepared_tasks'):
            project.prepared_tasks = self.prepared_tasks
        # get prepared tasks from request params (filters, selected items)
        else:
            project.prepared_tasks = get_prepared_queryset(self.request, project)

        # detect solved and not solved tasks
        assigned_flag = hasattr(self, 'assignee_flag') and self.assignee_flag
        user_solved_tasks_array = user.annotations.filter(ground_truth=False)
        user_solved_tasks_array = user_solved_tasks_array.filter(task__isnull=False)\
            .distinct().values_list('task__pk', flat=True)

        with conditional_atomic():
            not_solved_tasks = project.prepared_tasks.\
                exclude(pk__in=user_solved_tasks_array)

            # if annotator is assigned for tasks, he must to solve it regardless of is_labeled=True

            if not assigned_flag:
                not_solved_tasks = not_solved_tasks.filter(is_labeled=False)

            not_solved_tasks_count = not_solved_tasks.count()

            # return nothing if there are no tasks remain
            if not_solved_tasks_count == 0:
                raise NotFound(f'There are no tasks remaining to be annotated by the user={user}')
            logger.debug(f'{not_solved_tasks_count} tasks that still need to be annotated for user={user}')

            # ordered by data manager
            if assigned_flag:
                next_task = not_solved_tasks.first()
                if not next_task:
                    raise NotFound('No more tasks found')
                return self._make_response(next_task, request, use_task_lock=False)

            # If current user has already lock one task - return it (without setting the lock again)
            next_task = Task.get_locked_by(user, tasks=not_solved_tasks)
            if next_task:
                return self._make_response(next_task, request, use_task_lock=False)

            if project.show_ground_truth_first:
                logger.debug(f'User={request.user} tries ground truth from {not_solved_tasks_count} tasks')
                next_task = self._try_ground_truth(not_solved_tasks, project)
                if next_task:
                    return self._make_response(next_task, request)

            if project.show_overlap_first:
                # don't output anything - just filter tasks with overlap
                logger.debug(f'User={request.user} tries overlap first from {not_solved_tasks_count} tasks')
                _, not_solved_tasks = self._try_tasks_with_overlap(not_solved_tasks)

            # don't use this mode for data manager sorting, because the sorting becomes not obvious
            if project.sampling != project.SEQUENCE:
                # if there any tasks in progress (with maximum number of annotations), randomly sampling from them
                logger.debug(f'User={request.user} tries depth first from {not_solved_tasks_count} tasks')
                next_task = self._try_breadth_first(not_solved_tasks)
                if next_task:
                    return self._make_response(next_task, request)

            if project.sampling == project.UNCERTAINTY:
                logger.debug(f'User={request.user} tries uncertainty sampling from {not_solved_tasks_count} tasks')
                next_task = self._try_uncertainty_sampling(not_solved_tasks, project, user_solved_tasks_array)

            elif project.sampling == project.UNIFORM:
                logger.debug(f'User={request.user} tries random sampling from {not_solved_tasks_count} tasks')
                next_task = self._get_random_unlocked(not_solved_tasks)

            elif project.sampling == project.SEQUENCE:
                logger.debug(f'User={request.user} tries sequence sampling from {not_solved_tasks_count} tasks')
                next_task = self._get_first_unlocked(not_solved_tasks)

            if next_task:
                return self._make_response(next_task, request)
            else:
                raise NotFound(
                    f'There are still some tasks to complete for the user={user}, but they seem to be locked by another user.')


@method_decorator(name='post', decorator=swagger_auto_schema(
        tags=['Projects'],
        operation_summary='Validate label config',
        operation_description='Validate a labeling configuration for a project.',
        responses={200: 'Validation success'}
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
                name='label_config',
                type=openapi.TYPE_STRING,
                in_=openapi.IN_QUERY,
                description='labeling config')
        ]
)) # This might be the same endpoint as the previous one for some reason?
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
        project.validate_config(label_config)
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
        operation_description='Delete all tasks from a specific project.'
))
@method_decorator(name='get', decorator=swagger_auto_schema(
        **paginator_help('tasks', 'Projects'),
        operation_summary='List project tasks',
        operation_description="""
            Retrieve a paginated list of tasks for a specific project. For example, use the following cURL command:
            ```bash
            curl -X GET {}/api/projects/{{id}}/tasks/ -H 'Authorization: Token abc123'
            ```
        """.format(settings.HOSTNAME or 'https://localhost:8080')
    ))
class TasksListAPI(generics.ListCreateAPIView,
                   generics.DestroyAPIView,
                   APIViewVirtualMethodMixin,
                   APIViewVirtualRedirectMixin):

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

    def filter_queryset(self, queryset):
        project = generics.get_object_or_404(Project.objects.for_user(self.request.user), pk=self.kwargs.get('pk', 0))
        tasks = Task.objects.filter(project=project)
        return paginator(tasks, self.request)

    def delete(self, request, *args, **kwargs):
        project = generics.get_object_or_404(Project.objects.for_user(self.request.user), pk=self.kwargs['pk'])
        Task.objects.filter(project=project).delete()
        return Response(status=204)


    def get(self, *args, **kwargs):
        return super(TasksListAPI, self).get(*args, **kwargs)

    @swagger_auto_schema(auto_schema=None)
    def post(self, *args, **kwargs):
        return super(TasksListAPI, self).post(*args, **kwargs)

    def get_serializer_context(self):
        context = super(TasksListAPI, self).get_serializer_context()
        context['project'] = get_object_with_check_and_log(self.request, Project, pk=self.kwargs['pk'])
        return context

    def perform_create(self, serializer):
        project = get_object_with_check_and_log(self.request, Project, pk=self.kwargs['pk'])
        serializer.save(project=project)


class TemplateListAPI(generics.ListAPIView):
    parser_classes = (JSONParser, FormParser, MultiPartParser)
    permission_required = all_permissions.projects_view
    swagger_schema = None

    def list(self, request, *args, **kwargs):
        annotation_templates_dir = find_dir('annotation_templates')
        configs = []
        for config_file in pathlib.Path(annotation_templates_dir).glob('**/*.yml'):
            config = read_yaml(config_file)
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
        model_versions = Prediction.objects.filter(task__project=project).values_list('model_version', flat=True).distinct()
        return Response(data=model_versions)
