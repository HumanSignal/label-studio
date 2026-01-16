"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license."""

import logging

from core.mixins import GetParentObjectMixin
from core.permissions import ViewClassPermission, all_permissions
from core.utils.common import is_community
from core.utils.params import bool_from_request
from data_manager.api import TaskListAPI as DMTaskListAPI
from data_manager.functions import evaluate_predictions
from data_manager.models import PrepareParams
from data_manager.serializers import DataManagerTaskSerializer
from django.db import models, transaction
from django.db.models import Q
from django.utils import timezone
from django.utils.decorators import method_decorator
from django_filters.rest_framework import DjangoFilterBackend
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiExample, OpenApiParameter, OpenApiResponse, extend_schema
from projects.functions.stream_history import fill_history_annotation
from projects.models import Project
from rest_framework import generics, viewsets
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response
from tasks.models import (
    Annotation,
    AnnotationComment,
    AnnotationDraft,
    AnnotationMetrics,
    AnnotationVersion,
    AuditLog,
    Prediction,
    ProjectChangeLog,
    QualityScore,
    Task,
)
from tasks.openapi_schema import (
    annotation_request_schema,
    annotation_response_example,
    dm_task_response_example,
    prediction_request_schema,
    prediction_response_example,
    task_request_schema,
    task_response_example,
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
        request={
            'application/json': task_request_schema,
        },
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
                '[Data Manager > Create View > see `data` field](#tag/Data-Manager/operation/api_dm_views_create) '
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

        # RBAC: Only project owners can create tasks
        if not project.user_can_manage(self.request.user):
            raise PermissionDenied('Only project owners can create tasks')

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
        request={
            'application/json': task_request_schema,
        },
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

    def prefetch(self, queryset):
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
            'project__ml_backends',
        )

    def get_retrieve_serializer_context(self, request):
        fields = ['drafts', 'predictions', 'annotations']

        return {
            'resolve_uri': True,
            'predictions': 'predictions' in fields,
            'annotations': 'annotations' in fields,
            'drafts': 'drafts' in fields,
            'request': request,
        }

    def get(self, request, pk):
        context = self.get_retrieve_serializer_context(request)
        context['project'] = project = self.task.project

        # get prediction
        if (
            project.evaluate_predictions_automatically or project.show_collab_predictions
        ) and not self.task.predictions.exists():
            evaluate_predictions([self.task])
            # refresh task from db with prefetches
            self.task = self.get_object()

        serializer = self.get_serializer_class()(
            self.task, many=False, context=context, expand=['annotations.completed_by']
        )
        data = serializer.data
        return Response(data)

    def get_excluded_fields_for_evaluation(self):
        return ['annotations_results', 'predictions_results']

    def get_queryset(self):
        task_id = self.request.parser_context['kwargs'].get('pk')
        task = generics.get_object_or_404(Task, pk=task_id)
        review = bool_from_request(self.request.GET, 'review', False)
        selected = {'all': False, 'included': [self.kwargs.get('pk')]}
        if review:
            kwargs = {'fields_for_evaluation': ['annotators', 'reviewed']}
        else:
            kwargs = {
                'all_fields': True,
                'excluded_fields_for_evaluation': self.get_excluded_fields_for_evaluation(),
            }
        project = self.request.query_params.get('project') or self.request.data.get('project')
        if not project:
            project = task.project.id
        return self.prefetch(
            Task.prepared.get_queryset(
                prepare_params=PrepareParams(project=project, selectedItems=selected, request=self.request), **kwargs
            )
        )

    def get_serializer_class(self):
        # GET => task + annotations + predictions + drafts
        if self.request.method == 'GET':
            return DataManagerTaskSerializer

        # POST, PATCH, PUT
        else:
            return TaskSimpleSerializer

    def perform_update(self, serializer):
        task = self.get_object()
        project = task.project

        # RBAC: Only project owners can update tasks
        if not project.user_can_manage(self.request.user):
            raise PermissionDenied('Only project owners can update tasks')

        serializer.save()

    def perform_destroy(self, instance):
        project = instance.project

        # RBAC: Only project owners can delete tasks
        if not project.user_can_manage(self.request.user):
            raise PermissionDenied('Only project owners can delete tasks')

        instance.delete()

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
        request={
            'application/json': annotation_request_schema,
        },
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
    queryset = Annotation.objects.all()

    def perform_destroy(self, annotation):
        project = annotation.task.project

        # RBAC: Annotators can only delete their own annotations
        if not project.user_can_review(self.request.user):
            if annotation.completed_by != self.request.user:
                raise PermissionDenied('Annotators can only delete their own annotations')

        annotation.delete()

    def update(self, request, *args, **kwargs):
        # save user history with annotator_id, time & annotation result
        annotation = self.get_object()
        project = annotation.task.project

        # RBAC: Annotators can only update their own annotations
        if not project.user_can_review(self.request.user):
            if annotation.completed_by != self.request.user:
                raise PermissionDenied('Annotators can only update their own annotations')

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
        annotation = self.get_object()
        project = annotation.task.project

        # RBAC: Annotators can only view their own annotations
        if not project.user_can_review(self.request.user):
            if annotation.completed_by != self.request.user:
                raise PermissionDenied('Annotators can only view their own annotations')

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
                    OpenApiExample(name='response', value=[annotation_response_example], media_type='application/json')
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
        request={
            'application/json': annotation_request_schema,
        },
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
        queryset = Annotation.objects.filter(Q(task=task) & Q(was_cancelled=False)).order_by('pk')

        # RBAC: Annotators can only view their own annotations, reviewers/owners see all
        project = task.project
        if not project.user_can_review(self.request.user):
            # User is an annotator, filter to only their annotations
            queryset = queryset.filter(completed_by=self.request.user)

        return queryset

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
                    OpenApiExample(name='response', value=[prediction_response_example], media_type='application/json')
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
        request={
            'application/json': prediction_request_schema,
        },
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
        request={
            'application/json': prediction_request_schema,
        },
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
        request={
            'application/json': prediction_request_schema,
        },
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
    queryset = Annotation.objects.all()

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

            annotation.delete()

        emit_webhooks_for_instance(organization, project, WebhookAction.ANNOTATIONS_DELETED, [pk])
        data = AnnotationDraftSerializer(instance=draft).data
        return Response(status=201, data=data)


from tasks.serializers import (
    AnnotationCommentSerializer,
    AnnotationMetricsSerializer,
    AnnotationReviewSerializer,
    AnnotationVersionSerializer,
    AnnotationWithReviewSerializer,
    AnnotatorMetricsSerializer,
    AuditLogExportSerializer,
    AuditLogSerializer,
    ProjectChangeLogSerializer,
    ProjectMetricsSerializer,
    QualityScoreCreateSerializer,
    QualityScoreSerializer,
)


@extend_schema(
    tags=['Annotations'],
    summary='Review annotation',
    description='Submit a review (approve/reject) for an annotation. Only reviewers and owners can review annotations.',
    request=AnnotationReviewSerializer,
    responses={
        200: AnnotationWithReviewSerializer,
    },
)
class AnnotationReviewAPI(generics.UpdateAPIView):
    """API endpoint for reviewing annotations"""
    queryset = Annotation.objects.all()
    serializer_class = AnnotationReviewSerializer
    permission_required = ViewClassPermission(
        POST=all_permissions.annotations_change,
    )

    def post(self, request, *args, **kwargs):
        annotation = self.get_object()
        project = annotation.task.project

        # RBAC: Only reviewers and owners can review annotations
        if not project.user_can_review(request.user):
            raise PermissionDenied('Only project reviewers and owners can review annotations')

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Update annotation with review information
        annotation.review_status = serializer.validated_data['review_status']
        annotation.review_comment = serializer.validated_data.get('review_comment', '')
        annotation.reviewed_by = request.user
        annotation.reviewed_at = timezone.now()
        annotation.save(update_fields=['review_status', 'review_comment', 'reviewed_by', 'reviewed_at'])

        # Return updated annotation with review info
        response_serializer = AnnotationWithReviewSerializer(annotation, context={'request': request})
        return Response(response_serializer.data, status=status.HTTP_200_OK)


@extend_schema(
    tags=['Annotations'],
    summary='Get review queue',
    description='Get list of annotations pending review for a project. Only reviewers and owners can access this.',
    parameters=[
        OpenApiParameter(name='status', type=OpenApiTypes.STR, location='query',
                        description='Filter by review status (pending, approved, rejected, fixed)'),
        OpenApiParameter(name='annotator', type=OpenApiTypes.INT, location='query',
                        description='Filter by annotator user ID'),
    ],
    responses={
        200: AnnotationWithReviewSerializer(many=True),
    },
)
class AnnotationReviewQueueAPI(generics.ListAPIView):
    """API endpoint for getting annotations that need review"""
    serializer_class = AnnotationWithReviewSerializer
    permission_required = all_permissions.annotations_view

    def get_queryset(self):
        project_id = self.kwargs.get('pk')
        project = generics.get_object_or_404(Project, pk=project_id)

        # RBAC: Only reviewers and owners can access review queue
        if not project.user_can_review(self.request.user):
            raise PermissionDenied('Only project reviewers and owners can access the review queue')

        queryset = Annotation.objects.filter(
            project=project,
            was_cancelled=False
        ).select_related('completed_by', 'reviewed_by', 'task').order_by('-created_at')

        # Filter by review status
        review_status = self.request.query_params.get('status')
        if review_status:
            queryset = queryset.filter(review_status=review_status)
        else:
            # Default to pending reviews
            queryset = queryset.filter(review_status='pending')

        # Filter by annotator
        annotator_id = self.request.query_params.get('annotator')
        if annotator_id:
            queryset = queryset.filter(completed_by_id=annotator_id)

        return queryset


@extend_schema(
    tags=['Annotations'],
    summary='Bulk review annotations',
    description='Review multiple annotations at once. Only reviewers and owners can bulk review.',
    request={
        'application/json': {
            'type': 'object',
            'properties': {
                'annotation_ids': {
                    'type': 'array',
                    'items': {'type': 'integer'},
                    'description': 'List of annotation IDs to review'
                },
                'review_status': {
                    'type': 'string',
                    'enum': ['approved', 'rejected', 'fixed'],
                    'description': 'Review status to set for all annotations'
                },
                'review_comment': {
                    'type': 'string',
                    'description': 'Optional comment for all reviews'
                }
            },
            'required': ['annotation_ids', 'review_status']
        }
    },
    responses={
        200: {
            'type': 'object',
            'properties': {
                'updated_count': {'type': 'integer'},
                'annotations': AnnotationWithReviewSerializer(many=True)
            }
        }
    },
)
class AnnotationBulkReviewAPI(generics.GenericAPIView):
    """API endpoint for bulk reviewing annotations"""
    permission_required = all_permissions.annotations_change

    def post(self, request, *args, **kwargs):
        project_id = self.kwargs.get('pk')
        project = generics.get_object_or_404(Project, pk=project_id)

        # RBAC: Only reviewers and owners can bulk review
        if not project.user_can_review(request.user):
            raise PermissionDenied('Only project reviewers and owners can bulk review annotations')

        annotation_ids = request.data.get('annotation_ids', [])
        review_status = request.data.get('review_status')
        review_comment = request.data.get('review_comment', '')

        if not annotation_ids:
            raise ValidationError('annotation_ids is required')

        if review_status not in ['approved', 'rejected', 'fixed']:
            raise ValidationError('review_status must be one of: approved, rejected, fixed')

        # Update annotations
        annotations = Annotation.objects.filter(
            id__in=annotation_ids,
            project=project
        )

        updated_count = annotations.update(
            review_status=review_status,
            review_comment=review_comment,
            reviewed_by=request.user,
            reviewed_at=timezone.now()
        )

        # Fetch updated annotations for response
        updated_annotations = Annotation.objects.filter(id__in=annotation_ids).select_related(
            'completed_by', 'reviewed_by', 'task'
        )

        serializer = AnnotationWithReviewSerializer(updated_annotations, many=True, context={'request': request})

        return Response({
            'updated_count': updated_count,
            'annotations': serializer.data
        }, status=status.HTTP_200_OK)


class AnnotationCommentsListAPI(generics.ListCreateAPIView):
    """API endpoint for listing and creating annotation comments"""
    permission_required = all_permissions.annotations_view
    serializer_class = AnnotationCommentSerializer

    def get_queryset(self):
        annotation_id = self.kwargs.get('pk')
        annotation = generics.get_object_or_404(Annotation, pk=annotation_id)

        # Check project permissions
        project = annotation.project
        if not project.has_permission(self.request.user):
            raise PermissionDenied('You do not have permission to access this annotation')

        # Return only top-level comments (no parent), replies are nested in serializer
        return AnnotationComment.objects.filter(
            annotation=annotation,
            parent__isnull=True
        ).select_related('author').prefetch_related('replies__author')

    def perform_create(self, serializer):
        annotation_id = self.kwargs.get('pk')
        annotation = generics.get_object_or_404(Annotation, pk=annotation_id)

        # Check project permissions
        project = annotation.project
        if not project.has_permission(self.request.user):
            raise PermissionDenied('You do not have permission to comment on this annotation')

        # Handle parent comment if provided
        parent_id = self.request.data.get('parent')
        parent = None
        if parent_id:
            parent = generics.get_object_or_404(AnnotationComment, pk=parent_id)
            # Ensure parent belongs to same annotation
            if parent.annotation_id != annotation.id:
                raise ValidationError('Parent comment must belong to the same annotation')

        serializer.save(
            annotation=annotation,
            author=self.request.user,
            parent=parent
        )


class AnnotationCommentDetailAPI(generics.RetrieveUpdateDestroyAPIView):
    """API endpoint for retrieving, updating, and deleting a comment"""
    permission_required = all_permissions.annotations_view
    serializer_class = AnnotationCommentSerializer
    queryset = AnnotationComment.objects.select_related('author').prefetch_related('replies__author')

    def get_object(self):
        obj = super().get_object()

        # Check project permissions
        project = obj.annotation.project
        if not project.has_permission(self.request.user):
            raise PermissionDenied('You do not have permission to access this comment')

        return obj

    def perform_update(self, serializer):
        comment = self.get_object()

        # Only author or project owners can edit comments
        project = comment.annotation.project
        if comment.author != self.request.user and not project.user_can_manage(self.request.user):
            raise PermissionDenied('You can only edit your own comments or be a project owner')

        serializer.save()

    def perform_destroy(self, instance):
        # Only author or project owners can delete comments
        project = instance.annotation.project
        if instance.author != self.request.user and not project.user_can_manage(self.request.user):
            raise PermissionDenied('You can only delete your own comments or be a project owner')

        instance.delete()


class AnnotationCommentResolveAPI(generics.GenericAPIView):
    """API endpoint for resolving/unresolving comment threads"""
    permission_required = all_permissions.annotations_view

    def post(self, request, *args, **kwargs):
        comment_id = self.kwargs.get('pk')
        comment = generics.get_object_or_404(AnnotationComment, pk=comment_id)

        # Check project permissions
        project = comment.annotation.project
        if not project.has_permission(request.user):
            raise PermissionDenied('You do not have permission to access this comment')

        # Get resolve status from request
        is_resolved = request.data.get('is_resolved', True)

        # Get root comment of thread
        root_comment = comment.get_thread_root()
        root_comment.is_resolved = is_resolved
        root_comment.save()

        serializer = AnnotationCommentSerializer(root_comment)
        return Response(serializer.data, status=status.HTTP_200_OK)


class BulkResolveCommentsAPI(generics.GenericAPIView):
    """API endpoint for bulk resolving comments"""
    permission_required = all_permissions.annotations_view

    def post(self, request, *args, **kwargs):
        annotation_id = self.kwargs.get('pk')
        annotation = generics.get_object_or_404(Annotation, pk=annotation_id)

        # Check project permissions
        project = annotation.project
        if not project.has_permission(request.user):
            raise PermissionDenied('You do not have permission to access this annotation')

        comment_ids = request.data.get('comment_ids', [])
        is_resolved = request.data.get('is_resolved', True)

        if not comment_ids:
            raise ValidationError('comment_ids is required')

        # Update comments
        updated_count = AnnotationComment.objects.filter(
            id__in=comment_ids,
            annotation=annotation
        ).update(is_resolved=is_resolved)

        return Response({
            'updated_count': updated_count,
            'is_resolved': is_resolved
        }, status=status.HTTP_200_OK)


# ================== Quality Control and Metrics APIs ==================


class AnnotationMetricsAPI(generics.RetrieveUpdateAPIView):
    """API endpoint for annotation metrics"""
    permission_required = all_permissions.annotations_view
    serializer_class = AnnotationMetricsSerializer

    def get_object(self):
        annotation_id = self.kwargs.get('pk')
        annotation = generics.get_object_or_404(Annotation, pk=annotation_id)

        # Check project permissions
        project = annotation.project
        if not project.has_permission(self.request.user):
            raise PermissionDenied('You do not have permission to access this annotation')

        # Get or create metrics
        metrics, created = AnnotationMetrics.objects.get_or_create(annotation=annotation)
        return metrics


class AnnotationQualityScoresAPI(generics.ListCreateAPIView):
    """API endpoint for listing and creating quality scores"""
    permission_required = all_permissions.annotations_view
    serializer_class = QualityScoreSerializer

    def get_queryset(self):
        annotation_id = self.kwargs.get('pk')
        annotation = generics.get_object_or_404(Annotation, pk=annotation_id)

        # Check project permissions
        project = annotation.project
        if not project.has_permission(self.request.user):
            raise PermissionDenied('You do not have permission to access this annotation')

        return QualityScore.objects.filter(annotation=annotation).select_related('reviewer')

    def perform_create(self, serializer):
        annotation_id = self.kwargs.get('pk')
        annotation = generics.get_object_or_404(Annotation, pk=annotation_id)

        # Check project permissions - only reviewers can score
        project = annotation.project
        if not project.user_can_review(self.request.user):
            raise PermissionDenied('Only project reviewers and owners can submit quality scores')

        # Create or update quality score
        quality_score, created = QualityScore.objects.update_or_create(
            annotation=annotation,
            reviewer=self.request.user,
            defaults={
                'score': self.request.data.get('score'),
                'completeness_score': self.request.data.get('completeness_score'),
                'accuracy_score': self.request.data.get('accuracy_score'),
                'consistency_score': self.request.data.get('consistency_score'),
                'feedback': self.request.data.get('feedback', ''),
            }
        )

        # Update annotation metrics
        _update_annotation_quality_metrics(annotation)


class ProjectMetricsAPI(generics.GenericAPIView):
    """API endpoint for project-level metrics"""
    permission_required = all_permissions.projects_view

    def get(self, request, *args, **kwargs):
        project_id = self.kwargs.get('pk')
        project = generics.get_object_or_404(Project, pk=project_id)

        # Check project permissions
        if not project.has_permission(request.user):
            raise PermissionDenied('You do not have permission to access this project')

        # Calculate project metrics
        annotations = Annotation.objects.filter(project=project)
        tasks = Task.objects.filter(project=project)
        metrics_qs = AnnotationMetrics.objects.filter(annotation__project=project)

        total_annotations = annotations.count()
        total_tasks = tasks.count()
        completion_rate = (total_annotations / total_tasks * 100) if total_tasks > 0 else 0

        # Quality metrics
        avg_quality = metrics_qs.aggregate(models.Avg('quality_score'))['quality_score__avg'] or 0
        avg_agreement = metrics_qs.aggregate(models.Avg('agreement_score'))['agreement_score__avg'] or 0

        # Flags
        needs_review_count = metrics_qs.filter(needs_review=True).count()
        outlier_count = metrics_qs.filter(is_outlier=True).count()

        # Annotator stats
        annotators = annotations.values('completed_by').distinct().count()
        avg_per_annotator = (total_annotations / annotators) if annotators > 0 else 0

        metrics_data = {
            'total_annotations': total_annotations,
            'total_tasks': total_tasks,
            'completion_rate': round(completion_rate, 2),
            'average_quality_score': round(avg_quality, 2),
            'average_agreement_score': round(avg_agreement, 2),
            'annotations_needing_review': needs_review_count,
            'outlier_count': outlier_count,
            'annotator_count': annotators,
            'avg_annotations_per_annotator': round(avg_per_annotator, 2),
        }

        serializer = ProjectMetricsSerializer(metrics_data)
        return Response(serializer.data, status=status.HTTP_200_OK)


class AnnotatorMetricsAPI(generics.GenericAPIView):
    """API endpoint for per-annotator metrics"""
    permission_required = all_permissions.projects_view

    def get(self, request, *args, **kwargs):
        project_id = self.kwargs.get('pk')
        project = generics.get_object_or_404(Project, pk=project_id)

        # Check project permissions
        if not project.has_permission(request.user):
            raise PermissionDenied('You do not have permission to access this project')

        # Get all annotators for this project
        annotators_data = []
        annotations = Annotation.objects.filter(project=project).select_related('completed_by')

        # Group by annotator
        from django.db.models import Avg, Count, F
        annotator_stats = annotations.values(
            'completed_by',
            'completed_by__first_name',
            'completed_by__last_name'
        ).annotate(
            total=Count('id')
        )

        for annotator in annotator_stats:
            annotator_id = annotator['completed_by']
            if not annotator_id:
                continue

            annotator_annotations = annotations.filter(completed_by_id=annotator_id)
            metrics = AnnotationMetrics.objects.filter(annotation__in=annotator_annotations)

            # Calculate metrics
            avg_quality = metrics.aggregate(Avg('quality_score'))['quality_score__avg'] or 0
            avg_accuracy = metrics.aggregate(Avg('accuracy_score'))['accuracy_score__avg'] or 0
            avg_time = metrics.aggregate(Avg('time_spent'))['time_spent__avg'] or 0

            # Review metrics
            approved = annotator_annotations.filter(review_status='approved').count()
            rejected = annotator_annotations.filter(review_status='rejected').count()
            total = annotator['total']

            approval_rate = (approved / total * 100) if total > 0 else 0
            rejection_rate = (rejected / total * 100) if total > 0 else 0

            # Time-based metrics
            import datetime
            from django.utils import timezone
            days_active = (timezone.now() - annotator_annotations.order_by('created_at').first().created_at).days or 1
            annotations_per_day = total / days_active if days_active > 0 else 0

            annotators_data.append({
                'annotator_id': annotator_id,
                'annotator_name': f"{annotator['completed_by__first_name']} {annotator['completed_by__last_name']}",
                'total_annotations': total,
                'average_quality_score': round(avg_quality, 2),
                'average_accuracy_score': round(avg_accuracy, 2),
                'average_time_spent': round(avg_time, 2),
                'approval_rate': round(approval_rate, 2),
                'rejection_rate': round(rejection_rate, 2),
                'annotations_per_day': round(annotations_per_day, 2),
            })

        serializer = AnnotatorMetricsSerializer(annotators_data, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


def _update_annotation_quality_metrics(annotation):
    """Helper function to update annotation quality metrics"""
    metrics, created = AnnotationMetrics.objects.get_or_create(annotation=annotation)

    # Calculate average quality score from all quality scores
    quality_scores = QualityScore.objects.filter(annotation=annotation)
    if quality_scores.exists():
        avg_score = quality_scores.aggregate(models.Avg('score'))['score__avg']
        metrics.quality_score = (avg_score / 5.0) * 100  # Convert to 0-100 scale

        # Update other scores
        avg_completeness = quality_scores.aggregate(models.Avg('completeness_score'))['completeness_score__avg']
        avg_accuracy = quality_scores.aggregate(models.Avg('accuracy_score'))['accuracy_score__avg']

        if avg_accuracy:
            metrics.accuracy_score = (avg_accuracy / 5.0) * 100

        # Flag for review if quality is low
        if metrics.quality_score and metrics.quality_score < 60:
            metrics.needs_review = True

    # Count regions in annotation result
    if annotation.result:
        metrics.num_regions = len(annotation.result)

    metrics.save()


# ================== Audit Logs and Activity Tracking APIs ==================


class AuditLogListAPI(generics.ListAPIView):
    """API endpoint for listing audit logs with filters"""
    permission_required = all_permissions.projects_view
    serializer_class = AuditLogSerializer
    pagination_class = PageNumberPagination

    def get_queryset(self):
        project_id = self.request.GET.get('project')
        if project_id:
            project = generics.get_object_or_404(Project, pk=project_id)
            if not project.has_permission(self.request.user):
                raise PermissionDenied('You do not have permission to access this project')

            queryset = AuditLog.objects.filter(project=project)
        else:
            # If no project specified, show logs for all projects user has access to
            # This requires checking permissions, which can be expensive
            # For now, require project ID
            raise ValidationError('project parameter is required')

        # Apply filters
        action = self.request.GET.get('action')
        if action:
            queryset = queryset.filter(action=action)

        entity_type = self.request.GET.get('entity_type')
        if entity_type:
            queryset = queryset.filter(entity_type=entity_type)

        user_id = self.request.GET.get('user_id')
        if user_id:
            queryset = queryset.filter(user_id=user_id)

        start_date = self.request.GET.get('start_date')
        if start_date:
            queryset = queryset.filter(created_at__gte=start_date)

        end_date = self.request.GET.get('end_date')
        if end_date:
            queryset = queryset.filter(created_at__lte=end_date)

        return queryset.select_related('user', 'project')


class AuditLogExportAPI(generics.GenericAPIView):
    """API endpoint for exporting audit logs"""
    permission_required = all_permissions.projects_view

    def post(self, request, *args, **kwargs):
        project_id = self.kwargs.get('pk')
        project = generics.get_object_or_404(Project, pk=project_id)

        if not project.has_permission(request.user):
            raise PermissionDenied('You do not have permission to access this project')

        # Get filters from request
        serializer = AuditLogExportSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        queryset = AuditLog.objects.filter(project=project)

        # Apply filters
        if serializer.validated_data.get('start_date'):
            queryset = queryset.filter(created_at__gte=serializer.validated_data['start_date'])

        if serializer.validated_data.get('end_date'):
            queryset = queryset.filter(created_at__lte=serializer.validated_data['end_date'])

        if serializer.validated_data.get('action'):
            queryset = queryset.filter(action=serializer.validated_data['action'])

        if serializer.validated_data.get('entity_type'):
            queryset = queryset.filter(entity_type=serializer.validated_data['entity_type'])

        if serializer.validated_data.get('user_id'):
            queryset = queryset.filter(user_id=serializer.validated_data['user_id'])

        export_format = serializer.validated_data.get('format', 'json')

        if export_format == 'json':
            logs = AuditLogSerializer(queryset, many=True).data
            return Response(logs, status=status.HTTP_200_OK)
        elif export_format == 'csv':
            import csv
            from django.http import HttpResponse

            response = HttpResponse(content_type='text/csv')
            response['Content-Disposition'] = f'attachment; filename="audit_log_{project_id}.csv"'

            writer = csv.writer(response)
            writer.writerow(['ID', 'User', 'Action', 'Entity Type', 'Entity ID', 'Description', 'Created At'])

            for log in queryset:
                writer.writerow([
                    log.id,
                    f"{log.user.first_name} {log.user.last_name}" if log.user else 'System',
                    log.get_action_display(),
                    log.get_entity_type_display(),
                    log.entity_id,
                    log.description,
                    log.created_at.isoformat(),
                ])

            return response


class AnnotationHistoryAPI(generics.ListAPIView):
    """API endpoint for annotation version history"""
    permission_required = all_permissions.annotations_view
    serializer_class = AnnotationVersionSerializer

    def get_queryset(self):
        annotation_id = self.kwargs.get('pk')
        annotation = generics.get_object_or_404(Annotation, pk=annotation_id)

        # Check project permissions
        project = annotation.project
        if not project.has_permission(self.request.user):
            raise PermissionDenied('You do not have permission to access this annotation')

        return AnnotationVersion.objects.filter(annotation=annotation).select_related('created_by')


class AnnotationRollbackAPI(generics.GenericAPIView):
    """API endpoint for rolling back annotation to a previous version"""
    permission_required = all_permissions.annotations_change

    def post(self, request, *args, **kwargs):
        annotation_id = self.kwargs.get('pk')
        version_number = request.data.get('version_number')

        if not version_number:
            raise ValidationError('version_number is required')

        annotation = generics.get_object_or_404(Annotation, pk=annotation_id)

        # Check project permissions
        project = annotation.project
        if not project.has_permission(request.user):
            raise PermissionDenied('You do not have permission to access this annotation')

        # Get the version to rollback to
        version = generics.get_object_or_404(
            AnnotationVersion,
            annotation=annotation,
            version_number=version_number
        )

        # Save current state as a new version before rollback
        current_version_number = annotation.versions.count() + 1
        AnnotationVersion.objects.create(
            annotation=annotation,
            version_number=current_version_number,
            result=annotation.result,
            lead_time=annotation.lead_time,
            created_by=request.user,
            change_summary=f'Saved before rollback to version {version_number}',
        )

        # Rollback annotation to the specified version
        annotation.result = version.result
        annotation.lead_time = version.lead_time
        annotation.save()

        # Create a new version for the rollback
        rollback_version_number = current_version_number + 1
        AnnotationVersion.objects.create(
            annotation=annotation,
            version_number=rollback_version_number,
            result=version.result,
            lead_time=version.lead_time,
            created_by=request.user,
            change_summary=f'Rolled back to version {version_number}',
            is_rollback=True,
            rolled_back_from_version=version_number,
        )

        # Create audit log entry
        AuditLog.objects.create(
            user=request.user,
            action='rollback',
            entity_type='annotation',
            entity_id=annotation.id,
            project=project,
            description=f'Rolled back annotation {annotation.id} to version {version_number}',
            changes={
                'from_version': current_version_number,
                'to_version': version_number,
            },
        )

        serializer = AnnotationSerializer(annotation)
        return Response(serializer.data, status=status.HTTP_200_OK)


class ProjectChangeLogAPI(generics.ListAPIView):
    """API endpoint for project change history"""
    permission_required = all_permissions.projects_view
    serializer_class = ProjectChangeLogSerializer

    def get_queryset(self):
        project_id = self.kwargs.get('pk')
        project = generics.get_object_or_404(Project, pk=project_id)

        if not project.has_permission(self.request.user):
            raise PermissionDenied('You do not have permission to access this project')

        queryset = ProjectChangeLog.objects.filter(project=project).select_related('user')

        # Apply filters
        change_type = self.request.GET.get('change_type')
        if change_type:
            queryset = queryset.filter(change_type=change_type)

        return queryset


def create_audit_log(user, action, entity_type, entity_id, project=None, description='', changes=None, metadata=None):
    """Helper function to create audit log entries"""
    AuditLog.objects.create(
        user=user,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        project=project,
        description=description,
        changes=changes or {},
        metadata=metadata or {},
    )


def create_annotation_version(annotation, user, change_summary=''):
    """Helper function to create annotation version snapshots"""
    version_number = annotation.versions.count() + 1
    AnnotationVersion.objects.create(
        annotation=annotation,
        version_number=version_number,
        result=annotation.result,
        lead_time=annotation.lead_time,
        created_by=user,
        change_summary=change_summary,
    )
