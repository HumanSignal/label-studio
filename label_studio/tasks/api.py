"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license."""

import logging

from core.feature_flags import flag_set
from core.mixins import GetParentObjectMixin
from core.permissions import ViewClassPermission, all_permissions
from core.utils.common import is_community
from core.utils.db import delete_annotation_with_retry
from core.utils.params import bool_from_request
from data_manager.api import TaskListAPI as DMTaskListAPI
from data_manager.functions import evaluate_predictions
from data_manager.models import PrepareParams
from data_manager.serializers import DataManagerTaskSerializer
from django.db import transaction
from django.db.models import Prefetch, Q, QuerySet, prefetch_related_objects
from django.utils import timezone
from django.utils.decorators import method_decorator
from django_filters.rest_framework import DjangoFilterBackend
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiExample, OpenApiParameter, OpenApiResponse, extend_schema
from projects.functions.stream_history import fill_history_annotation
from projects.models import Project
from rest_framework import generics, viewsets
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response
from tasks.models import Annotation, AnnotationDraft, Prediction, Task
from tasks.openapi_schema import (
    annotation_response_example,
    dm_task_response_example,
    prediction_response_example,
    task_response_example,
)
from tasks.ordering import (
    get_task_children_prefetch,
    parse_annotations_ordering_request,
)
from tasks.serializers import (
    AnnotationDraftSerializer,
    AnnotationSerializer,
    PredictionSerializer,
    TaskSerializer,
    TaskSimpleSerializer,
)
from webhooks.models import WebhookAction
from webhooks.utils import (
    api_webhook,
    api_webhook_for_delete,
    emit_webhooks_for_instance,
)

logger = logging.getLogger(__name__)


# TODO: fix after switch to api/tasks from api/dm/tasks
@method_decorator(
    name='post',
    decorator=extend_schema(
        tags=['Tasks'],
        summary='Create task',
        description='Create a new labeling task in Label Studio.',
        request=TaskSerializer,
        responses={
            '201': OpenApiResponse(
                description='Created task',
                response=TaskSerializer,
                examples=[OpenApiExample(name='response', value=task_response_example, media_type='application/json')],
            )
        },
        extensions={
            'x-fern-sdk-group-name': 'tasks',
            'x-fern-sdk-method-name': 'create',
            'x-fern-audiences': ['public'],
        },
    )
    if is_community()
    else lambda f: f,
)
@method_decorator(
    name='get',
    decorator=extend_schema(
        tags=['Tasks'],
        summary='Get tasks list',
        description="""
    Retrieve a list of tasks with pagination for a specific view or project, by using filters and ordering.
    """,
        parameters=[
            OpenApiParameter(name='view', type=OpenApiTypes.INT, location='query', description='View ID'),
            OpenApiParameter(name='project', type=OpenApiTypes.INT, location='query', description='Project ID'),
            OpenApiParameter(
                name='resolve_uri',
                type=OpenApiTypes.BOOL,
                location='query',
                description='Resolve task data URIs using Cloud Storage',
            ),
            OpenApiParameter(
                name='fields',
                type=OpenApiTypes.STR,
                enum=['all', 'task_only'],
                default='task_only',
                location='query',
                description='Set to "all" if you want to include annotations and predictions in the response',
            ),
            OpenApiParameter(
                name='review',
                type=OpenApiTypes.BOOL,
                location='query',
                description='Get tasks for review',
            ),
            OpenApiParameter(
                name='include',
                type=OpenApiTypes.STR,
                location='query',
                description='Specify which fields to include in the response',
            ),
            OpenApiParameter(
                name='query',
                type=OpenApiTypes.STR,
                location='query',
                description='Additional query to filter tasks. It must be JSON encoded string of dict containing '
                'one of the following parameters: `{"filters": ..., "selectedItems": ..., "ordering": ...}`. Check '
                '[Data Manager > Create View > see `data` field](api:POST/api/dm/views/) '
                'for more details about filters, selectedItems and ordering.\n\n'
                '* **filters**: dict with `"conjunction"` string (`"or"` or `"and"`) and list of filters in `"items"` array. '
                'Each filter is a dictionary with keys: `"filter"`, `"operator"`, `"type"`, `"value"`. '
                '[Read more about available filters](https://labelstud.io/sdk/data_manager.html)<br/>'
                '                   Example: `{"conjunction": "or", "items": [{"filter": "filter:tasks:completed_at", "operator": "greater", "type": "Datetime", "value": "2021-01-01T00:00:00.000Z"}]}`\n'
                '* **selectedItems**: dictionary with keys: `"all"`, `"included"`, `"excluded"`. If "all" is `false`, `"included"` must be used. If "all" is `true`, `"excluded"` must be used.<br/>'
                '                   Examples: `{"all": false, "included": [1, 2, 3]}` or `{"all": true, "excluded": [4, 5]}`\n'
                '* **ordering**: list of fields to order by. Currently, ordering is supported by only one parameter. <br/>\n'
                '                   Example: `["completed_at"]`',
            ),
        ],
        responses={
            '200': OpenApiResponse(
                description='Tasks list',
                response={
                    'type': 'object',
                    'properties': {
                        'tasks': {
                            'description': 'List of tasks',
                            'type': 'array',
                            'items': {
                                'description': 'Task object',
                                'type': 'object',
                            },
                        },
                        'total': {
                            'description': 'Total number of tasks',
                            'type': 'integer',
                        },
                        'total_annotations': {
                            'description': 'Total number of annotations',
                            'type': 'integer',
                        },
                        'total_predictions': {
                            'description': 'Total number of predictions',
                            'type': 'integer',
                        },
                    },
                },
            )
        },
        extensions={
            'x-fern-sdk-group-name': 'tasks',
            'x-fern-sdk-method-name': 'list',
            'x-fern-pagination': {
                'offset': '$request.page',
                'results': '$response.tasks',
            },
            'x-fern-audiences': ['public'],
        },
    )
    if is_community()
    else lambda f: f,
)
class TaskListAPI(DMTaskListAPI):
    serializer_class = TaskSerializer
    permission_required = ViewClassPermission(
        GET=all_permissions.tasks_view,
        POST=all_permissions.tasks_create,
    )
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['project']

    def filter_queryset(self, queryset):
        queryset = super().filter_queryset(queryset)
        return queryset.filter(project__organization=self.request.user.active_organization)

    def get_serializer_context(self):
        context = super().get_serializer_context()
        project_id = self.request.data.get('project')
        if project_id:
            context['project'] = generics.get_object_or_404(Project, pk=project_id)
        return context

    def perform_create(self, serializer):
        project_id = self.request.data.get('project')
        project = generics.get_object_or_404(Project, pk=project_id)
        instance = serializer.save(project=project)
        emit_webhooks_for_instance(
            self.request.user.active_organization, project, WebhookAction.TASKS_CREATED, [instance]
        )


@method_decorator(
    name='get',
    decorator=extend_schema(
        tags=['Tasks'],
        summary='Get task',
        description="""
        Get task data, metadata, annotations and other attributes for a specific labeling task by task ID.
        """,
        parameters=[
            OpenApiParameter(name='id', type=OpenApiTypes.STR, location='path', description='Task ID'),
            OpenApiParameter(
                name='annotations_ordering',
                type=OpenApiTypes.STR,
                location='query',
                required=False,
                description=(
                    'Django-style ordering for nested annotations and predictions: `-id` or `-pk` for descending '
                    'primary key (labeling UI), `id` or `pk` for ascending. Omit for default database ordering.'
                ),
            ),
        ],
        request=None,
        responses={
            '200': OpenApiResponse(
                description='Task',
                response=DataManagerTaskSerializer,
                examples=[
                    OpenApiExample(name='response', value=dm_task_response_example, media_type='application/json')
                ],
            )
        },
        extensions={
            'x-fern-sdk-group-name': 'tasks',
            'x-fern-sdk-method-name': 'get',
            'x-fern-audiences': ['public'],
        },
    ),
)
@method_decorator(
    name='patch',
    decorator=extend_schema(
        tags=['Tasks'],
        summary='Update task',
        description='Update the attributes of an existing labeling task.',
        parameters=[
            OpenApiParameter(name='id', type=OpenApiTypes.STR, location='path', description='Task ID'),
        ],
        request=TaskSimpleSerializer,
        responses={
            '200': OpenApiResponse(
                description='Updated task',
                response=TaskSerializer,
                examples=[OpenApiExample(name='response', value=task_response_example, media_type='application/json')],
            )
        },
        extensions={
            'x-fern-sdk-group-name': 'tasks',
            'x-fern-sdk-method-name': 'update',
            'x-fern-audiences': ['public'],
        },
    ),
)
@method_decorator(
    name='delete',
    decorator=extend_schema(
        tags=['Tasks'],
        summary='Delete task',
        description='Delete a task in Label Studio. This action cannot be undone!',
        parameters=[
            OpenApiParameter(name='id', type=OpenApiTypes.STR, location='path', description='Task ID'),
        ],
        request=None,
        extensions={
            'x-fern-sdk-group-name': 'tasks',
            'x-fern-sdk-method-name': 'delete',
            'x-fern-audiences': ['public'],
        },
    ),
)
class TaskAPI(generics.RetrieveUpdateDestroyAPIView):
    parser_classes = (JSONParser, FormParser, MultiPartParser)
    permission_required = ViewClassPermission(
        GET=all_permissions.tasks_view,
        PUT=all_permissions.tasks_change,
        PATCH=all_permissions.tasks_change,
        DELETE=all_permissions.tasks_delete,
    )

    def initial(self, request, *args, **kwargs):
        super().initial(request, *args, **kwargs)
        self.task = self.get_object()

    def prefetch(self, queryset, request=None):
        ordering = parse_annotations_ordering_request(request)
        annotations_stub = False
        if request and flag_set('fflag_fix_all_fit_720_lazy_load_annotations', user=request.user):
            annotations_stub = bool_from_request(request.GET, 'annotations_stub', False)

        if annotations_stub:
            from tasks.ordering import (
                ANNOTATION_ORDERING_ID_ASC,
                ANNOTATION_ORDERING_ID_DESC,
                order_annotations,
                order_annotations_asc,
            )

            annotations_qs = Annotation.objects.select_related('completed_by').only(
                'id',
                'completed_by',
                'ground_truth',
                'was_cancelled',
                'created_at',
                'updated_at',
                'task_id',
                'last_action',
            )
            if ordering == ANNOTATION_ORDERING_ID_DESC:
                annotations_qs = order_annotations(annotations_qs)
            elif ordering == ANNOTATION_ORDERING_ID_ASC:
                annotations_qs = order_annotations_asc(annotations_qs)

            annotation_children = Prefetch('annotations', queryset=annotations_qs)
            prediction_children = 'predictions'
        else:
            annotation_children, prediction_children = get_task_children_prefetch(ordering)

        return queryset.prefetch_related(
            annotation_children,
            prediction_children,
            'annotations__completed_by',
            Prefetch('drafts', queryset=AnnotationDraft.objects.select_related('user')),
            'project',
            'io_storages_azureblobimportstoragelink',
            'io_storages_gcsimportstoragelink',
            'io_storages_localfilesimportstoragelink',
            'io_storages_redisimportstoragelink',
            'io_storages_s3importstoragelink',
            'file_upload',
            'project__ml_backends',
        )

    def get_retrieve_serializer_context(self, request):
        """Build serializer context for task retrieval.

        The resolve_uri parameter controls whether storage URLs (e.g., s3://bucket/file.jpg)
        are converted to proxy URLs (/tasks/<id>/resolve/?fileuri=...). This is useful for:
        - resolve_uri=True (default): URLs are proxied through Label Studio for security
        - resolve_uri=False: Original storage URLs are preserved, useful for debugging
          or when users need to see the actual source paths in task preview
        """
        fields = ['drafts', 'predictions', 'annotations']

        # Lazy load annotations behind feature flag (FIT-720)
        annotations_stub = False
        if flag_set('fflag_fix_all_fit_720_lazy_load_annotations', user=request.user):
            annotations_stub = bool_from_request(request.GET, 'annotations_stub', False)

        return {
            'resolve_uri': bool_from_request(request.GET, 'resolve_uri', True),
            'predictions': 'predictions' in fields,
            'annotations': 'annotations' in fields,
            'drafts': 'drafts' in fields,
            'annotations_stub': annotations_stub,
            'annotations_ordering': parse_annotations_ordering_request(request),
            'request': request,
        }

    def maybe_evaluate_predictions(self, project, request):
        """Ask the ML backend for predictions when the task has none yet.

        get_object() runs the whole PreparedTaskManager query, which takes tens of
        seconds on tasks with thousands of annotations, so it must run exactly once
        per GET. Instead of re-running it, refresh only the prediction-derived values.
        """
        if not (project.evaluate_predictions_automatically or project.show_collab_predictions):
            return

        # prefetched by prefetch(); .exists() would issue an extra query on every GET
        if self.task.predictions.all():
            return

        # project.ml_backend slices the queryset, which bypasses the prefetch cache
        if not project.ml_backends.all():
            return

        evaluate_predictions([self.task])
        self.refresh_predictions(request)

    def refresh_predictions(self, request):
        """Reload predictions and the prediction-derived DM annotations in place.

        Keeps every other prefetch and DM annotation from the single get_object() call.
        """
        _, prediction_children = get_task_children_prefetch(parse_annotations_ordering_request(request))
        getattr(self.task, '_prefetched_objects_cache', {}).pop('predictions', None)
        prefetch_related_objects([self.task], prediction_children)

        predictions = self.task.predictions.all()
        self.task.total_predictions = len(predictions)
        self.task.predictions_model_versions = [p.model_version for p in predictions]
        # This path only runs when the task had no predictions, so every prediction here
        # was just created by the project's own backend. That is exactly the set
        # annotate_predictions_score() would average over its model_version filter.
        scores = [p.score for p in predictions if p.score is not None]
        self.task.predictions_score = sum(scores) / len(scores) if scores else None

    def get(self, request, pk):
        context = self.get_retrieve_serializer_context(request)
        context['project'] = project = self.task.project

        self.maybe_evaluate_predictions(project, request)

        # Don't use expand for annotations when using stub mode (FIT-720)
        # The expand mechanism would override get_annotations and use AnnotationSerializer
        # instead of AnnotationStubSerializer
        expand = [] if context.get('annotations_stub') else ['annotations.completed_by']
        serializer = self.get_serializer_class()(self.task, many=False, context=context, expand=expand)
        data = serializer.data
        return Response(data)

    def get_excluded_fields_for_evaluation(self):
        return ['annotations_results', 'predictions_results']

    def get_queryset(self):
        task_id = self.request.parser_context['kwargs'].get('pk')
        task = generics.get_object_or_404(Task, pk=task_id)
        review = bool_from_request(self.request.GET, 'review', False)
        selected = {'all': False, 'included': [self.kwargs.get('pk')]}

        annotations_stub = False
        if flag_set('fflag_fix_all_fit_720_lazy_load_annotations', user=self.request.user):
            annotations_stub = bool_from_request(self.request.GET, 'annotations_stub', False)

        if review:
            kwargs = {'fields_for_evaluation': ['annotators', 'reviewed']}
        else:
            excluded = self.get_excluded_fields_for_evaluation()
            if annotations_stub:
                excluded = excluded + ['annotators', 'annotations_ids', 'avg_lead_time']
            kwargs = {
                'all_fields': True,
                'excluded_fields_for_evaluation': excluded,
            }
        project = self.request.query_params.get('project') or self.request.data.get('project')
        if not project:
            project = task.project.id
        return self.prefetch(
            Task.prepared.get_queryset(
                prepare_params=PrepareParams(project=project, selectedItems=selected, request=self.request), **kwargs
            ),
            self.request,
        )

    def get_object(self):
        """
        Override to check permissions on a lightweight task first.

        This avoids executing the expensive PreparedTaskManager query
        when the user doesn't have permission to access the task.
        """
        task_id = self.kwargs.get('pk')

        # First check permissions using a lightweight query
        # select_related('project') avoids extra query when permission check accesses task.project
        lean_task = generics.get_object_or_404(
            Task.objects.filter(project__organization=self.request.user.active_organization).select_related('project'),
            pk=task_id,
        )
        self.check_object_permissions(self.request, lean_task)

        # Now fetch full task with heavy queryset (prefetches, annotations, etc.)
        queryset = self.filter_queryset(self.get_queryset())
        return generics.get_object_or_404(queryset, pk=task_id)

    def get_serializer_class(self):
        # GET => task + annotations + predictions + drafts
        if self.request.method == 'GET':
            return DataManagerTaskSerializer

        # POST, PATCH, PUT
        else:
            return TaskSimpleSerializer

    def patch(self, request, *args, **kwargs):
        return super(TaskAPI, self).patch(request, *args, **kwargs)

    @api_webhook_for_delete(WebhookAction.TASKS_DELETED)
    def delete(self, request, *args, **kwargs):
        return super(TaskAPI, self).delete(request, *args, **kwargs)

    @extend_schema(exclude=True)
    def put(self, request, *args, **kwargs):
        return super(TaskAPI, self).put(request, *args, **kwargs)


@method_decorator(
    name='get',
    decorator=extend_schema(
        tags=['Tasks'],
        summary='Get task label distribution',
        description='Get aggregated label distribution across all annotations for a task. '
        'Returns counts of each label value grouped by control tag. '
        'This is an efficient endpoint that avoids N+1 queries.',
        responses={
            '200': OpenApiResponse(
                description='Label distribution data',
                examples=[
                    OpenApiExample(
                        name='response',
                        value={
                            'total_annotations': 100,
                            'agreement': 85.5,
                            'distributions': {
                                'label': {
                                    'type': 'rectanglelabels',
                                    'labels': {'Car': 45, 'Person': 30, 'Dog': 25},
                                },
                            },
                        },
                        media_type='application/json',
                    )
                ],
            )
        },
        extensions={
            'x-fern-audiences': ['internal'],
        },
    ),
)
class TaskAgreementAPI(generics.RetrieveAPIView):
    """
    Efficient endpoint for getting label distribution without fetching all annotations.

    This endpoint aggregates annotation results at the database level to avoid N+1 queries.
    It returns pre-computed label counts for the Distribution row in the Summary view.
    """

    permission_required = ViewClassPermission(GET=all_permissions.tasks_view)
    queryset = Task.objects.all()

    def get(self, request, pk):
        try:
            task = Task.objects.get(pk=pk)
        except Task.DoesNotExist:
            return Response({'error': 'Task not found'}, status=404)

        # Check project access using LSO's native permission check
        if not task.project.has_permission(request.user):
            raise PermissionDenied('You do not have permission to view this task')

        # Get all annotations for this task with their results in a single query
        annotations = Annotation.objects.filter(
            task=task,
            was_cancelled=False,
        ).values_list('result', flat=True)

        total_annotations = len(annotations)
        distributions = {}

        def merge_result_into_distributions(result):
            """Merge a single result (list of labeling items) into distributions in place."""
            if not result or not isinstance(result, list):
                return
            for item in result:
                if not isinstance(item, dict):
                    continue
                from_name = item.get('from_name', '')
                result_type = item.get('type', '')
                value = item.get('value', {})

                if from_name not in distributions:
                    distributions[from_name] = {
                        'type': result_type,
                        'labels': {},
                        'values': [],
                    }

                if result_type.endswith('labels'):
                    labels = value.get(result_type, [])
                    if isinstance(labels, list):
                        for label in labels:
                            if label not in distributions[from_name]['labels']:
                                distributions[from_name]['labels'][label] = 0
                            distributions[from_name]['labels'][label] += 1

                elif result_type == 'choices':
                    choices = value.get('choices', [])
                    if isinstance(choices, list):
                        for choice in choices:
                            if choice not in distributions[from_name]['labels']:
                                distributions[from_name]['labels'][choice] = 0
                            distributions[from_name]['labels'][choice] += 1

                elif result_type == 'rating':
                    rating = value.get('rating')
                    if rating is not None:
                        distributions[from_name]['values'].append(rating)

                elif result_type == 'number':
                    number = value.get('number')
                    if number is not None:
                        distributions[from_name]['values'].append(number)

                elif result_type == 'taxonomy':
                    taxonomy = value.get('taxonomy', [])
                    if isinstance(taxonomy, list):
                        for path in taxonomy:
                            if isinstance(path, list) and path:
                                leaf = path[-1]
                                if leaf not in distributions[from_name]['labels']:
                                    distributions[from_name]['labels'][leaf] = 0
                                distributions[from_name]['labels'][leaf] += 1

                elif result_type == 'pairwise':
                    selected = value.get('selected')
                    if selected:
                        if selected not in distributions[from_name]['labels']:
                            distributions[from_name]['labels'][selected] = 0
                        distributions[from_name]['labels'][selected] += 1

        # Process annotation results
        for result in annotations:
            merge_result_into_distributions(result)

        # Include prediction results in distribution counts so aggregate matches
        # client-side (develop / FF off). total_annotations stays annotation count only.
        predictions = Prediction.objects.filter(task=task).values_list('result', flat=True)
        for result in predictions:
            # Prediction.result can be list (same as annotation) or dict
            if isinstance(result, list):
                merge_result_into_distributions(result)

        # Post-process: calculate averages for numeric types
        for from_name, dist in distributions.items():
            if dist['values']:
                dist['average'] = sum(dist['values']) / len(dist['values'])
                dist['count'] = len(dist['values'])
            # Remove raw values from response to keep it lightweight
            del dist['values']

        agreement_score = None
        raw_agreement = getattr(task, 'precomputed_agreement', None)
        if raw_agreement is not None:
            val = float(raw_agreement)
            # DM / LSE task payloads expose agreement as 0–100; DB may store 0–1 or percent
            agreement_score = val * 100.0 if val <= 1.0 else val

        return Response(
            {
                'total_annotations': total_annotations,
                'distributions': distributions,
                'agreement': agreement_score,
            }
        )


@method_decorator(
    name='get',
    decorator=extend_schema(
        tags=['Tasks'],
        summary='Get task summary',
        description='Get the task summary payload including aggregated label distribution '
        'across all annotations and (in LSE) per-dimension agreement scores. '
        'Returns counts of each label value grouped by control tag. '
        'This is an efficient endpoint that avoids N+1 queries.',
        responses={
            '200': OpenApiResponse(
                description='Task summary payload',
                examples=[
                    OpenApiExample(
                        name='response',
                        value={
                            'task': {'id': 42, 'agreement': 85.5},
                            'total_annotations': 2,
                            'total_predictions': 1,
                            'annotations': [
                                {
                                    'id': 123,
                                    'type': 'annotation',
                                    'user': {
                                        'id': 10,
                                        'email': 'user@example.com',
                                        'first_name': 'Alice',
                                        'last_name': 'Smith',
                                    },
                                    'result': [],
                                },
                            ],
                            'agreement': 85.5,
                            'distributions': {
                                'label': {
                                    'type': 'rectanglelabels',
                                    'labels': {'Car': 45, 'Person': 30, 'Dog': 25},
                                },
                            },
                        },
                        media_type='application/json',
                    )
                ],
            )
        },
        extensions={
            'x-fern-audiences': ['internal'],
        },
    ),
)
class TaskSummaryAPI(generics.RetrieveAPIView):
    """
    Efficient endpoint that produces the full payload for the task summary panel.

    Aggregates annotation results at the database level to avoid N+1 queries.
    Returns pre-computed label counts for the Distribution row and (in LSE)
    per-dimension agreement scores.
    """

    permission_required = ViewClassPermission(GET=all_permissions.tasks_view)
    queryset = Task.objects.all()

    def get(self, request, pk):
        include_predictions = bool_from_request(request.GET, 'include_predictions', False)

        try:
            task = Task.objects.get(pk=pk)
        except Task.DoesNotExist:
            return Response({'error': 'Task not found'}, status=404)

        # Check project access using LSO's native permission check
        if not task.project.has_permission(request.user):
            raise PermissionDenied('You do not have permission to view this task')

        # Fetch annotations with user info for the summary panel
        annotation_objs = list(
            Annotation.objects.filter(task=task, was_cancelled=False)
            .select_related('completed_by')
            .only(
                'id',
                'result',
                'ground_truth',
                'lead_time',
                'completed_by__id',
                'completed_by__email',
                'completed_by__first_name',
                'completed_by__last_name',
            )
        )

        total_annotations = len(annotation_objs)
        total_predictions = Prediction.objects.filter(task=task).count()
        distributions = {}

        def merge_result_into_distributions(result):
            """Merge a single result (list of labeling items) into distributions in place."""
            if not result or not isinstance(result, list):
                return
            for item in result:
                if not isinstance(item, dict):
                    continue
                from_name = item.get('from_name', '')
                result_type = item.get('type', '')
                value = item.get('value', {})

                if from_name not in distributions:
                    distributions[from_name] = {
                        'type': result_type,
                        'labels': {},
                        'values': [],
                    }

                if result_type.endswith('labels'):
                    labels = value.get(result_type, [])
                    if isinstance(labels, list):
                        for label in labels:
                            if label not in distributions[from_name]['labels']:
                                distributions[from_name]['labels'][label] = 0
                            distributions[from_name]['labels'][label] += 1

                elif result_type == 'choices':
                    choices = value.get('choices', [])
                    if isinstance(choices, list):
                        for choice in choices:
                            if choice not in distributions[from_name]['labels']:
                                distributions[from_name]['labels'][choice] = 0
                            distributions[from_name]['labels'][choice] += 1

                elif result_type == 'rating':
                    rating = value.get('rating')
                    if rating is not None:
                        distributions[from_name]['values'].append(rating)

                elif result_type == 'number':
                    number = value.get('number')
                    if number is not None:
                        distributions[from_name]['values'].append(number)

                elif result_type == 'taxonomy':
                    taxonomy = value.get('taxonomy', [])
                    if isinstance(taxonomy, list):
                        for path in taxonomy:
                            if isinstance(path, list) and path:
                                leaf = path[-1]
                                if leaf not in distributions[from_name]['labels']:
                                    distributions[from_name]['labels'][leaf] = 0
                                distributions[from_name]['labels'][leaf] += 1

                elif result_type == 'pairwise':
                    selected = value.get('selected')
                    if selected:
                        if selected not in distributions[from_name]['labels']:
                            distributions[from_name]['labels'][selected] = 0
                        distributions[from_name]['labels'][selected] += 1

        for ann in annotation_objs:
            if ann.ground_truth or not ann.result:
                continue
            merge_result_into_distributions(ann.result)

        if include_predictions:
            prediction_results = Prediction.objects.filter(task=task, result__isnull=False).values_list(
                'result', flat=True
            )
            for result in prediction_results:
                if isinstance(result, list):
                    merge_result_into_distributions(result)

        # Post-process: calculate averages for numeric types
        for from_name, dist in distributions.items():
            if dist['values']:
                dist['average'] = sum(dist['values']) / len(dist['values'])
                dist['count'] = len(dist['values'])
            del dist['values']

        from users.serializers import AnnotatorReviewerFirewall, is_user_deleted

        def _serialize_user(user):
            if user is None:
                return None
            data = {
                'id': user.id,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
            }
            if is_user_deleted(user, context={'project': task.project}, project=task.project):
                data['first_name'] = 'Deleted'
                data['last_name'] = f'User {user.id}'
                data['email'] = f'deleted-{user.id}-user@example.com'
            elif AnnotatorReviewerFirewall.should_anonymize(user=user, requester=request.user):
                return AnnotatorReviewerFirewall.anonymize_user_data(data, user=user, requester=request.user)
            return data

        annotations_list = [
            {
                'id': ann.id,
                'type': 'annotation',
                'user': _serialize_user(ann.completed_by),
                'result': ann.result or [],
                'ground_truth': ann.ground_truth,
                'lead_time': ann.lead_time,
                'reviews': [],
                'comments': [],
            }
            for ann in annotation_objs
        ]

        predictions_list = None
        if include_predictions:
            predictions_list = [
                {
                    'id': pred.id,
                    'model_version': pred.model_version,
                    'result': pred.result or [],
                }
                for pred in Prediction.objects.filter(task=task, result__isnull=False).only(
                    'id', 'result', 'model_version'
                )
            ]

        agreement_score = None
        raw_agreement = getattr(task, 'precomputed_agreement', None)
        if raw_agreement is not None:
            val = float(raw_agreement)
            # DM / LSE task payloads expose agreement as 0–100; DB may store 0–1 or percent
            agreement_score = val * 100.0 if val <= 1.0 else val

        response_data = {
            'task': {
                'id': task.id,
                'agreement': getattr(task, 'agreement', None),
            },
            'total_annotations': total_annotations,
            'total_predictions': total_predictions,
            'annotations': annotations_list,
            'distributions': distributions,
            'agreement': agreement_score,
        }
        if predictions_list is not None:
            response_data['predictions'] = predictions_list

        return Response(response_data)


@method_decorator(
    name='get',
    decorator=extend_schema(
        tags=['Annotations'],
        summary='Get annotation by its ID',
        description='Retrieve a specific annotation for a task using the annotation result ID.',
        request=None,
        responses={
            '200': OpenApiResponse(
                description='Retrieved annotation',
                response=AnnotationSerializer,
                examples=[
                    OpenApiExample(name='response', value=annotation_response_example, media_type='application/json')
                ],
            )
        },
        extensions={
            'x-fern-sdk-group-name': 'annotations',
            'x-fern-sdk-method-name': 'get',
            'x-fern-audiences': ['public'],
        },
    ),
)
@method_decorator(
    name='patch',
    decorator=extend_schema(
        tags=['Annotations'],
        summary='Update annotation',
        description='Update existing attributes on an annotation.',
        request=AnnotationSerializer,
        responses={
            '200': OpenApiResponse(
                description='Updated annotation',
                response=AnnotationSerializer,
                examples=[
                    OpenApiExample(name='response', value=annotation_response_example, media_type='application/json')
                ],
            )
        },
        extensions={
            'x-fern-sdk-group-name': 'annotations',
            'x-fern-sdk-method-name': 'update',
            'x-fern-audiences': ['public'],
        },
    ),
)
@method_decorator(
    name='delete',
    decorator=extend_schema(
        tags=['Annotations'],
        summary='Delete annotation',
        description="Delete an annotation. This action can't be undone!",
        request=None,
        extensions={
            'x-fern-sdk-group-name': 'annotations',
            'x-fern-sdk-method-name': 'delete',
            'x-fern-audiences': ['public'],
        },
    ),
)
class AnnotationAPI(generics.RetrieveUpdateDestroyAPIView):
    parser_classes = (JSONParser, FormParser, MultiPartParser)
    permission_required = ViewClassPermission(
        GET=all_permissions.annotations_view,
        PUT=all_permissions.annotations_change,
        PATCH=all_permissions.annotations_change,
        DELETE=all_permissions.annotations_delete,
    )

    serializer_class = AnnotationSerializer
    queryset = Annotation.objects.none()

    def get_queryset(self) -> QuerySet[Annotation]:
        return Annotation.objects.for_user(self.request.user)

    def perform_destroy(self, annotation):
        delete_annotation_with_retry(annotation)

    def update(self, request, *args, **kwargs):
        # save user history with annotator_id, time & annotation result
        annotation = self.get_object()
        # use updated instead of save to avoid duplicated signals
        Annotation.objects.filter(id=annotation.id).update(updated_by=request.user)

        task = annotation.task
        if self.request.data.get('ground_truth'):
            task.ensure_unique_groundtruth(annotation_id=annotation.id)
        task.update_is_labeled()
        task.save()  # refresh task metrics

        result = super(AnnotationAPI, self).update(request, *args, **kwargs)

        task.update_is_labeled()
        task.save(update_fields=['updated_at'])  # refresh task metrics
        return result

    def get(self, request, *args, **kwargs):
        return super(AnnotationAPI, self).get(request, *args, **kwargs)

    @api_webhook(WebhookAction.ANNOTATION_UPDATED)
    @extend_schema(exclude=True)
    def put(self, request, *args, **kwargs):
        return super(AnnotationAPI, self).put(request, *args, **kwargs)

    @api_webhook(WebhookAction.ANNOTATION_UPDATED)
    def patch(self, request, *args, **kwargs):
        return super(AnnotationAPI, self).patch(request, *args, **kwargs)

    @api_webhook_for_delete(WebhookAction.ANNOTATIONS_DELETED)
    def delete(self, request, *args, **kwargs):
        return super(AnnotationAPI, self).delete(request, *args, **kwargs)


@method_decorator(
    name='get',
    decorator=extend_schema(
        tags=['Annotations'],
        summary='Get all task annotations',
        description='List all annotations for a task.',
        parameters=[
            OpenApiParameter(name='id', type=OpenApiTypes.INT, location='path', description='Task ID'),
        ],
        request=None,
        responses={
            '200': OpenApiResponse(
                description='Annotation',
                response=AnnotationSerializer(many=True),
                examples=[
                    OpenApiExample(name='response', value=annotation_response_example, media_type='application/json')
                ],
            )
        },
        extensions={
            'x-fern-sdk-group-name': 'annotations',
            'x-fern-sdk-method-name': 'list',
            'x-fern-audiences': ['public'],
        },
    ),
)
@method_decorator(
    name='post',
    decorator=extend_schema(
        tags=['Annotations'],
        summary='Create annotation',
        description="""
        Add annotations to a task like an annotator does. The content of the result field depends on your
        labeling configuration. For example, send the following data as part of your POST
        request to send an empty annotation with the ID of the user who completed the task:

        ```json
        {
        "result": {},
        "was_cancelled": true,
        "ground_truth": true,
        "lead_time": 0,
        "task": 0
        "completed_by": 123
        }
        ```
        """,
        parameters=[
            OpenApiParameter(name='id', type=OpenApiTypes.INT, location='path', description='Task ID'),
        ],
        request=AnnotationSerializer,
        responses={
            '201': OpenApiResponse(
                description='Created annotation',
                response=AnnotationSerializer,
                examples=[
                    OpenApiExample(name='response', value=annotation_response_example, media_type='application/json')
                ],
            )
        },
        extensions={
            'x-fern-sdk-group-name': 'annotations',
            'x-fern-sdk-method-name': 'create',
            'x-fern-audiences': ['public'],
        },
    ),
)
class AnnotationsListAPI(GetParentObjectMixin, generics.ListCreateAPIView):
    parser_classes = (JSONParser, FormParser, MultiPartParser)
    permission_required = ViewClassPermission(
        GET=all_permissions.annotations_view,
        POST=all_permissions.annotations_create,
    )
    parent_queryset = Task.objects.all()

    serializer_class = AnnotationSerializer

    def get(self, request, *args, **kwargs):
        return super(AnnotationsListAPI, self).get(request, *args, **kwargs)

    @api_webhook(WebhookAction.ANNOTATION_CREATED)
    def post(self, request, *args, **kwargs):
        return super(AnnotationsListAPI, self).post(request, *args, **kwargs)

    def get_queryset(self):
        task = generics.get_object_or_404(Task.objects.for_user(self.request.user), pk=self.kwargs.get('pk', 0))
        return Annotation.objects.filter(Q(task=task) & Q(was_cancelled=False)).order_by('pk')

    def get_serializer_context(self):
        context = super().get_serializer_context()
        # Only needed for annotation create/update validation; avoid parent_object
        # permission checks on GET list (url_smoke expects annotator list = 200).
        if self.request.method != 'GET':
            context['task'] = self.parent_object
        return context

    def delete_draft(self, draft_id, annotation_id):
        try:
            draft = AnnotationDraft.objects.get(id=draft_id)
            # We call delete on the individual draft object because
            # AnnotationDraft#delete has special behavior (updating created_labels_drafts).
            # This special behavior won't be triggered if we call delete on the queryset.
            # Only for drafts with empty annotation_id, other ones deleted by signal
            draft.delete()
        except AnnotationDraft.DoesNotExist:
            pass

    def perform_create(self, ser):
        task = self.parent_object
        # annotator has write access only to annotations and it can't be checked it after serializer.save()
        user = self.request.user

        # Check if task is being skipped and if it's allowed
        was_cancelled_get = bool_from_request(self.request.GET, 'was_cancelled', False)
        was_cancelled_data = self.request.data.get('was_cancelled', False)
        is_skipping = was_cancelled_get or was_cancelled_data

        if is_skipping and not task.can_be_skipped():
            raise ValidationError({'detail': 'This task cannot be skipped.'})

        # updates history
        result = ser.validated_data.get('result')
        extra_args = {'task_id': self.kwargs['pk'], 'project_id': task.project_id}

        # save stats about how well annotator annotations coincide with current prediction
        # only for finished task annotations
        if result is not None:
            prediction = Prediction.objects.filter(task=task, model_version=task.project.model_version)
            if prediction.exists():
                prediction = prediction.first()
                prediction_ser = PredictionSerializer(prediction).data
            else:
                logger.debug(f'User={self.request.user}: there are no predictions for task={task}')
                prediction_ser = {}
            # serialize annotation
            extra_args.update({'prediction': prediction_ser, 'updated_by': user})

        if 'was_cancelled' in self.request.GET:
            extra_args['was_cancelled'] = bool_from_request(self.request.GET, 'was_cancelled', False)

        if 'completed_by' not in ser.validated_data:
            extra_args['completed_by'] = self.request.user

        draft_id = self.request.data.get('draft_id')
        draft = AnnotationDraft.objects.filter(id=draft_id).first()
        if draft:
            # draft permission check
            if draft.task_id != task.id or not draft.has_permission(user) or draft.user_id != user.id:
                raise PermissionDenied(f'You have no permission to draft id:{draft_id}')

        if draft is not None:
            # if the annotation will be created from draft - get created_at from draft to keep continuity of history
            extra_args['draft_created_at'] = draft.created_at

        # create annotation
        logger.debug(f'User={self.request.user}: save annotation')
        annotation = ser.save(**extra_args)

        logger.debug(f'Save activity for user={self.request.user}')
        self.request.user.activity_at = timezone.now()
        self.request.user.save()

        # Release task if it has been taken at work (it should be taken by the same user, or it makes sentry error
        logger.debug(f'User={user} releases task={task}')
        task.release_lock(user)

        # if annotation created from draft - remove this draft
        if draft_id is not None:
            logger.debug(f'Remove draft {draft_id} after creating annotation {annotation.id}')
            self.delete_draft(draft_id, annotation.id)

        if self.request.data.get('ground_truth'):
            annotation.task.ensure_unique_groundtruth(annotation_id=annotation.id)

        fill_history_annotation(user, task, annotation)

        return annotation


@extend_schema(exclude=True)
class AnnotationDraftListAPI(generics.ListCreateAPIView):
    parser_classes = (JSONParser, MultiPartParser, FormParser)
    serializer_class = AnnotationDraftSerializer
    permission_required = ViewClassPermission(
        GET=all_permissions.annotations_view,
        POST=all_permissions.annotations_create,
    )
    queryset = AnnotationDraft.objects.all()

    def filter_queryset(self, queryset):
        task_id = self.kwargs['pk']
        return queryset.filter(task_id=task_id)

    def perform_create(self, serializer):
        task_id = self.kwargs['pk']
        annotation_id = self.kwargs.get('annotation_id')
        user = self.request.user
        logger.debug(f'User {user} is going to create draft for task={task_id}, annotation={annotation_id}')
        # When an annotation_id is supplied in the URL, make sure the annotation still exists before
        # persisting the draft. Otherwise the INSERT violates the annotation_id foreign key (the
        # annotation may have been deleted between the client loading the task and submitting the draft).
        if annotation_id is not None and not Annotation.objects.filter(pk=annotation_id).exists():
            raise NotFound(f'Annotation {annotation_id} does not exist')
        serializer.save(task_id=self.kwargs['pk'], annotation_id=annotation_id, user=self.request.user)


@extend_schema(exclude=True)
class AnnotationDraftAPI(generics.RetrieveUpdateDestroyAPIView):
    parser_classes = (JSONParser, MultiPartParser, FormParser)
    serializer_class = AnnotationDraftSerializer
    queryset = AnnotationDraft.objects.all()
    permission_required = ViewClassPermission(
        GET=all_permissions.annotations_view,
        PUT=all_permissions.annotations_change,
        PATCH=all_permissions.annotations_change,
        DELETE=all_permissions.annotations_delete,
    )


@method_decorator(
    name='list',
    decorator=extend_schema(
        tags=['Predictions'],
        summary='List predictions',
        description='List all predictions and their IDs.',
        parameters=[
            OpenApiParameter(
                name='task',
                type=OpenApiTypes.INT,
                location='query',
                description='Filter predictions by task ID',
            ),
            OpenApiParameter(
                name='project',
                type=OpenApiTypes.INT,
                location='query',
                description='Filter predictions by project ID',
            ),
        ],
        request=None,
        responses={
            '200': OpenApiResponse(
                description='Predictions list',
                response=PredictionSerializer(many=True),
                examples=[
                    OpenApiExample(name='response', value=prediction_response_example, media_type='application/json')
                ],
            )
        },
        extensions={
            'x-fern-sdk-group-name': 'predictions',
            'x-fern-sdk-method-name': 'list',
            'x-fern-audiences': ['public'],
        },
    ),
)
@method_decorator(
    name='create',
    decorator=extend_schema(
        tags=['Predictions'],
        summary='Create prediction',
        description='Create a prediction for a specific task.',
        request=PredictionSerializer,
        responses={
            '201': OpenApiResponse(
                description='Created prediction',
                response=PredictionSerializer,
                examples=[
                    OpenApiExample(name='response', value=prediction_response_example, media_type='application/json')
                ],
            )
        },
        extensions={
            'x-fern-sdk-group-name': 'predictions',
            'x-fern-sdk-method-name': 'create',
            'x-fern-audiences': ['public'],
        },
    ),
)
@method_decorator(
    name='retrieve',
    decorator=extend_schema(
        tags=['Predictions'],
        summary='Get prediction details',
        description='Get details about a specific prediction by its ID.',
        parameters=[
            OpenApiParameter(name='id', type=OpenApiTypes.INT, location='path', description='Prediction ID'),
        ],
        request=None,
        responses={
            '200': OpenApiResponse(
                description='Prediction details',
                response=PredictionSerializer,
                examples=[
                    OpenApiExample(name='response', value=prediction_response_example, media_type='application/json')
                ],
            )
        },
        extensions={
            'x-fern-sdk-group-name': 'predictions',
            'x-fern-sdk-method-name': 'get',
            'x-fern-audiences': ['public'],
        },
    ),
)
@method_decorator(
    name='update',
    decorator=extend_schema(
        tags=['Predictions'],
        summary='Put prediction',
        description='Overwrite prediction data by prediction ID.',
        parameters=[
            OpenApiParameter(name='id', type=OpenApiTypes.INT, location='path', description='Prediction ID'),
        ],
        request=PredictionSerializer,
        responses={
            '200': OpenApiResponse(
                description='Updated prediction',
                response=PredictionSerializer,
                examples=[
                    OpenApiExample(name='response', value=prediction_response_example, media_type='application/json')
                ],
            )
        },
        extensions={
            'x-fern-audiences': ['internal'],
        },
    ),
)
@method_decorator(
    name='partial_update',
    decorator=extend_schema(
        tags=['Predictions'],
        summary='Update prediction',
        description='Update prediction data by prediction ID.',
        parameters=[
            OpenApiParameter(name='id', type=OpenApiTypes.INT, location='path', description='Prediction ID'),
        ],
        request=PredictionSerializer,
        responses={
            '200': OpenApiResponse(
                description='Updated prediction',
                response=PredictionSerializer,
                examples=[
                    OpenApiExample(name='response', value=prediction_response_example, media_type='application/json')
                ],
            )
        },
        extensions={
            'x-fern-sdk-group-name': 'predictions',
            'x-fern-sdk-method-name': 'update',
            'x-fern-audiences': ['public'],
        },
    ),
)
@method_decorator(
    name='destroy',
    decorator=extend_schema(
        tags=['Predictions'],
        summary='Delete prediction',
        description='Delete a prediction by prediction ID.',
        parameters=[
            OpenApiParameter(name='id', type=OpenApiTypes.INT, location='path', description='Prediction ID'),
        ],
        request=None,
        extensions={
            'x-fern-sdk-group-name': 'predictions',
            'x-fern-sdk-method-name': 'delete',
            'x-fern-audiences': ['public'],
        },
    ),
)
class PredictionAPI(viewsets.ModelViewSet):
    queryset = Prediction.objects.none()
    serializer_class = PredictionSerializer
    permission_required = all_permissions.predictions_any
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['task', 'task__project', 'project']

    def get_queryset(self):
        return Prediction.objects.filter(project__organization=self.request.user.active_organization)


@method_decorator(name='get', decorator=extend_schema(exclude=True))
@method_decorator(
    name='post',
    decorator=extend_schema(
        tags=['Annotations'],
        summary='Convert annotation to draft',
        description='Convert annotation to draft',
        extensions={
            'x-fern-audiences': ['internal'],
        },
    ),
)
class AnnotationConvertAPI(generics.RetrieveAPIView):
    permission_required = ViewClassPermission(POST=all_permissions.annotations_change)
    queryset = Annotation.objects.none()

    def get_queryset(self) -> QuerySet[Annotation]:
        return Annotation.objects.for_user(self.request.user)

    def process_intermediate_state(self, annotation, draft):
        pass

    def post(self, request, *args, **kwargs):
        annotation = self.get_object()
        organization = annotation.project.organization
        project = annotation.project

        pk = annotation.pk

        with transaction.atomic():
            draft = AnnotationDraft.objects.create(
                result=annotation.result,
                lead_time=annotation.lead_time,
                task=annotation.task,
                annotation=None,
                user=request.user,
            )

            self.process_intermediate_state(annotation, draft)

            delete_annotation_with_retry(annotation)

        emit_webhooks_for_instance(organization, project, WebhookAction.ANNOTATIONS_DELETED, [pk])
        data = AnnotationDraftSerializer(instance=draft).data
        return Response(status=201, data=data)
