"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import logging

from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from django.utils.decorators import method_decorator
from django_filters.rest_framework import DjangoFilterBackend
import drf_yasg.openapi as openapi
from drf_yasg.utils import swagger_auto_schema
from rest_framework import generics, viewsets, views
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response

from core.permissions import ViewClassPermission, all_permissions
from core.utils.common import DjangoFilterDescriptionInspector
from core.utils.params import bool_from_request
from core.mixins import GetParentObjectMixin
from data_manager.api import TaskListAPI as DMTaskListAPI
from data_manager.functions import evaluate_predictions
from data_manager.models import PrepareParams
from data_manager.serializers import DataManagerTaskSerializer
from projects.models import Project
from projects.functions.stream_history import fill_history_annotation
from tasks.models import Annotation, AnnotationDraft, Prediction, Task
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
@method_decorator(name='post', decorator=swagger_auto_schema(
        tags=['Tasks'],
        operation_summary='Create task',
        operation_description='Create a new labeling task in Label Studio.',
        request_body=TaskSerializer))
@method_decorator(name='get', decorator=swagger_auto_schema(
    tags=['Tasks'],
    operation_summary='Get tasks list',
    operation_description="""
    Retrieve a list of tasks with pagination for a specific view or project, by using filters and ordering.
    """,
    manual_parameters=[
        openapi.Parameter(
            name='view',
            type=openapi.TYPE_INTEGER,
            in_=openapi.IN_QUERY,
            description='View ID'),
        openapi.Parameter(
            name='project',
            type=openapi.TYPE_INTEGER,
            in_=openapi.IN_QUERY,
            description='Project ID'),
        openapi.Parameter(
            name='resolve_uri',
            type=openapi.TYPE_BOOLEAN,
            in_=openapi.IN_QUERY,
            description='Resolve task data URIs using Cloud Storage'),
    ],
))
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
        emit_webhooks_for_instance(self.request.user.active_organization, project, WebhookAction.TASKS_CREATED, [instance])


@method_decorator(name='get', decorator=swagger_auto_schema(
        tags=['Tasks'],
        operation_summary='Get task',
        operation_description="""
        Get task data, metadata, annotations and other attributes for a specific labeling task by task ID.
        """,
        manual_parameters=[
            openapi.Parameter(
                name='id',
                type=openapi.TYPE_STRING,
                in_=openapi.IN_PATH,
                description='Task ID'
            ),
        ]))
@method_decorator(name='patch', decorator=swagger_auto_schema(
        tags=['Tasks'],
        operation_summary='Update task',
        operation_description='Update the attributes of an existing labeling task.',
        manual_parameters=[
            openapi.Parameter(
                name='id',
                type=openapi.TYPE_STRING,
                in_=openapi.IN_PATH,
                description='Task ID'
            ),
        ],
        request_body=TaskSimpleSerializer))
@method_decorator(name='delete', decorator=swagger_auto_schema(
        tags=['Tasks'],
        operation_summary='Delete task',
        operation_description='Delete a task in Label Studio. This action cannot be undone!',
        manual_parameters=[
            openapi.Parameter(
                name='id',
                type=openapi.TYPE_STRING,
                in_=openapi.IN_PATH,
                description='Task ID'
            ),
        ],
        ))
class TaskAPI(generics.RetrieveUpdateDestroyAPIView):
    parser_classes = (JSONParser, FormParser, MultiPartParser)
    permission_required = ViewClassPermission(
        GET=all_permissions.tasks_view,
        PUT=all_permissions.tasks_change,
        PATCH=all_permissions.tasks_change,
        DELETE=all_permissions.tasks_delete,
    )

    @staticmethod
    def prefetch(queryset):
        return queryset.prefetch_related(
            'annotations', 'predictions', 'annotations__completed_by', 'project',
            'io_storages_azureblobimportstoragelink',
            'io_storages_gcsimportstoragelink',
            'io_storages_localfilesimportstoragelink',
            'io_storages_redisimportstoragelink',
            'io_storages_s3importstoragelink',
            'file_upload', 'project__ml_backends'
        )

    def get_retrieve_serializer_context(self, request):
        fields = ['drafts', 'predictions', 'annotations']

        return {
            'resolve_uri': True,
            'predictions': 'predictions' in fields,
            'annotations': 'annotations' in fields,
            'drafts': 'drafts' in fields,
            'request': request
        }

    def get(self, request, pk):
        self.task = self.get_object()

        context = self.get_retrieve_serializer_context(request)
        context['project'] = project = self.task.project

        # get prediction
        if (project.evaluate_predictions_automatically or project.show_collab_predictions) \
                and not self.task.predictions.exists():
            evaluate_predictions([self.task])

        serializer = self.get_serializer_class()(self.task, many=False, context=context, expand=['annotations.completed_by'])
        data = serializer.data
        return Response(data)

    def get_queryset(self):
        task_id = self.request.parser_context['kwargs'].get('pk')
        task = generics.get_object_or_404(Task, pk=task_id)
        review = bool_from_request(self.request.GET, 'review', False)
        selected = {"all": False, "included": [self.kwargs.get("pk")]}
        if review:
            kwargs = {
                'fields_for_evaluation': ['annotators', 'reviewed']
            }
        else:
            kwargs = {'all_fields': True}
        project = self.request.query_params.get('project') or self.request.data.get('project')
        if not project:
            project = task.project.id
        return self.prefetch(
            Task.prepared.get_queryset(
                prepare_params=PrepareParams(project=project, selectedItems=selected, request=self.request),
                **kwargs
            ))

    def get_serializer_class(self):
        # GET => task + annotations + predictions + drafts
        if self.request.method == 'GET':
            return DataManagerTaskSerializer

        # POST, PATCH, PUT
        else:
            return TaskSimpleSerializer
    
    def retrieve(self, request, *args, **kwargs):
        task = self.get_object()
        project = task.project

        # call machine learning api and format response
        if project.evaluate_predictions_automatically:
            for ml_backend in task.project.ml_backends.all():
                ml_backend.predict_tasks([task])

        result = self.get_serializer(task).data

        # use proxy inlining to task data (for credential access)
        result['data'] = task.resolve_uri(result['data'], project)
        return Response(result)

    def patch(self, request, *args, **kwargs):
        return super(TaskAPI, self).patch(request, *args, **kwargs)

    @api_webhook_for_delete(WebhookAction.TASKS_DELETED)
    def delete(self, request, *args, **kwargs):
        return super(TaskAPI, self).delete(request, *args, **kwargs)

    @swagger_auto_schema(auto_schema=None)
    def put(self, request, *args, **kwargs):
        return super(TaskAPI, self).put(request, *args, **kwargs)


@method_decorator(name='get', decorator=swagger_auto_schema(
        tags=['Annotations'],
        operation_summary='Get annotation by its ID',
        operation_description='Retrieve a specific annotation for a task using the annotation result ID.',
        ))
@method_decorator(name='patch', decorator=swagger_auto_schema(
        tags=['Annotations'],
        operation_summary='Update annotation',
        operation_description='Update existing attributes on an annotation.',
        request_body=AnnotationSerializer))
@method_decorator(name='delete', decorator=swagger_auto_schema(
        tags=['Annotations'],
        operation_summary='Delete annotation',
        operation_description='Delete an annotation. This action can\'t be undone!',
        ))
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
        annotation.delete()

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
    @swagger_auto_schema(auto_schema=None)
    def put(self, request, *args, **kwargs):
        return super(AnnotationAPI, self).put(request, *args, **kwargs)

    @api_webhook(WebhookAction.ANNOTATION_UPDATED)
    def patch(self, request, *args, **kwargs):
        return super(AnnotationAPI, self).patch(request, *args, **kwargs)

    @api_webhook_for_delete(WebhookAction.ANNOTATIONS_DELETED)
    def delete(self, request, *args, **kwargs):
        return super(AnnotationAPI, self).delete(request, *args, **kwargs)


@method_decorator(name='get', decorator=swagger_auto_schema(
        tags=['Annotations'],
        operation_summary='Get all task annotations',
        operation_description='List all annotations for a task.',
        manual_parameters=[
            openapi.Parameter(
                name='id',
                type=openapi.TYPE_INTEGER,
                in_=openapi.IN_PATH,
                description='Task ID'),
        ],
        ))
@method_decorator(name='post', decorator=swagger_auto_schema(
        tags=['Annotations'],
        operation_summary='Create annotation',
        operation_description="""
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
        manual_parameters=[
            openapi.Parameter(
                name='id',
                type=openapi.TYPE_INTEGER,
                in_=openapi.IN_PATH,
                description='Task ID'),
        ],
        request_body=AnnotationSerializer
        ))
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

    def delete_draft(self, draft_id, annotation_id):
        return AnnotationDraft.objects.filter(id=draft_id).delete()

    def perform_create(self, ser):
        task = self.get_parent_object()
        # annotator has write access only to annotations and it can't be checked it after serializer.save()
        user = self.request.user

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
            extra_args.update({
                'prediction': prediction_ser,
                'updated_by': user
            })

        if 'was_cancelled' in self.request.GET:
            extra_args['was_cancelled'] = bool_from_request(self.request.GET, 'was_cancelled', False)

        if 'completed_by' not in ser.validated_data:
            extra_args['completed_by'] = self.request.user

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
        draft_id = self.request.data.get('draft_id')
        if draft_id is not None:
            logger.debug(f'Remove draft {draft_id} after creating annotation {annotation.id}')
            self.delete_draft(draft_id, annotation.id)

        if self.request.data.get('ground_truth'):
            annotation.task.ensure_unique_groundtruth(annotation_id=annotation.id)

        fill_history_annotation(user, task, annotation)

        return annotation


class AnnotationDraftListAPI(generics.ListCreateAPIView):

    parser_classes = (JSONParser, MultiPartParser, FormParser)
    serializer_class = AnnotationDraftSerializer
    permission_required = ViewClassPermission(
        GET=all_permissions.annotations_view,
        POST=all_permissions.annotations_create,
    )
    queryset = AnnotationDraft.objects.all()
    swagger_schema = None

    def filter_queryset(self, queryset):
        task_id = self.kwargs['pk']
        return queryset.filter(task_id=task_id)

    def perform_create(self, serializer):
        task_id = self.kwargs['pk']
        annotation_id = self.kwargs.get('annotation_id')
        user = self.request.user
        logger.debug(f'User {user} is going to create draft for task={task_id}, annotation={annotation_id}')
        serializer.save(
            task_id=self.kwargs['pk'],
            annotation_id=annotation_id,
            user=self.request.user
        )


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
    swagger_schema = None


@method_decorator(name='list', decorator=swagger_auto_schema(
    tags=['Predictions'],
    operation_summary="List predictions",
    filter_inspectors=[DjangoFilterDescriptionInspector],
    operation_description="List all predictions and their IDs.",
))
@method_decorator(name='create', decorator=swagger_auto_schema(
    tags=['Predictions'],
    operation_summary="Create prediction",
    operation_description="Create a prediction for a specific task.",
))
@method_decorator(name='retrieve', decorator=swagger_auto_schema(
    tags=['Predictions'],
    operation_summary="Get prediction details",
    operation_description="Get details about a specific prediction by its ID.",
    manual_parameters=[
        openapi.Parameter(
            name='id',
            type=openapi.TYPE_INTEGER,
            in_=openapi.IN_PATH,
            description='Prediction ID'),
    ],
))
@method_decorator(name='update', decorator=swagger_auto_schema(
    tags=['Predictions'],
    operation_summary="Put prediction",
    operation_description="Overwrite prediction data by prediction ID.",
    manual_parameters=[
        openapi.Parameter(
            name='id',
            type=openapi.TYPE_INTEGER,
            in_=openapi.IN_PATH,
            description='Prediction ID'),
    ],
))
@method_decorator(name='partial_update', decorator=swagger_auto_schema(
    tags=['Predictions'],
    operation_summary="Update prediction",
    operation_description="Update prediction data by prediction ID.",
    manual_parameters=[
        openapi.Parameter(
            name='id',
            type=openapi.TYPE_INTEGER,
            in_=openapi.IN_PATH,
            description='Prediction ID'),
    ],
))
@method_decorator(name='destroy', decorator=swagger_auto_schema(
    tags=['Predictions'],
    operation_summary="Delete prediction",
    operation_description="Delete a prediction by prediction ID.",
    manual_parameters=[
        openapi.Parameter(
            name='id',
            type=openapi.TYPE_INTEGER,
            in_=openapi.IN_PATH,
            description='Prediction ID'),
    ],
))
class PredictionAPI(viewsets.ModelViewSet):
    serializer_class = PredictionSerializer
    permission_required = all_permissions.predictions_any
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['task', 'task__project']

    def get_queryset(self):
        return Prediction.objects.filter(task__project__organization=self.request.user.active_organization)


@method_decorator(name='get', decorator=swagger_auto_schema(auto_schema=None))
@method_decorator(name='post', decorator=swagger_auto_schema(
        tags=['Annotations'],
        operation_summary='Convert annotation to draft',
        operation_description='Convert annotation to draft',
        ))
class AnnotationConvertAPI(generics.RetrieveAPIView):
    permission_required = ViewClassPermission(
        POST=all_permissions.annotations_change
    )
    queryset = Annotation.objects.all()

    def process_intermediate_state(self, annotation, draft):
        pass

    @swagger_auto_schema(auto_schema=None)
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

