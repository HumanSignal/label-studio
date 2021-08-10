"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import logging

from django.db.models import Q
from django.utils import timezone

import drf_yasg.openapi as openapi
from drf_yasg.utils import swagger_auto_schema
from django.utils.decorators import method_decorator
from django_filters.rest_framework import DjangoFilterBackend

from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework import generics, viewsets
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied as DRFPermissionDenied

from core.utils.common import get_object_with_check_and_log, DjangoFilterDescriptionInspector
from core.permissions import all_permissions, ViewClassPermission

from tasks.models import Task, Annotation, Prediction, AnnotationDraft
from core.utils.common import bool_from_request, int_from_request
from tasks.serializers import (
    TaskSerializer, AnnotationSerializer, TaskSimpleSerializer, PredictionSerializer,
    TaskWithAnnotationsAndPredictionsAndDraftsSerializer, AnnotationDraftSerializer, PredictionQuerySerializer)
from projects.models import Project

logger = logging.getLogger(__name__)


@method_decorator(name='post', decorator=swagger_auto_schema(
        tags=['Tasks'],
        operation_summary='Create task',
        operation_description='Create a new labeling task in Label Studio.',
        request_body=TaskSerializer))
class TaskListAPI(generics.ListCreateAPIView):
    parser_classes = (JSONParser, FormParser, MultiPartParser)
    queryset = Task.objects.all()
    permission_required = ViewClassPermission(
        GET=all_permissions.tasks_view,
        POST=all_permissions.tasks_create,
    )
    serializer_class = TaskSerializer

    def filter_queryset(self, queryset):
        return queryset.filter(project__organization=self.request.user.active_organization)

    @swagger_auto_schema(auto_schema=None)
    def get(self, request, *args, **kwargs):
        return super(TaskListAPI, self).get(request, *args, **kwargs)

    def get_serializer_context(self):
        context = super(TaskListAPI, self).get_serializer_context()
        project_id = self.request.data.get('project')
        if project_id:
            context['project'] = generics.get_object_or_404(Project, pk=project_id)
        return context

    def post(self, request, *args, **kwargs):
        return super(TaskListAPI, self).post(request, *args, **kwargs)


@method_decorator(name='get', decorator=swagger_auto_schema(
        tags=['Tasks'],
        operation_summary='Get task',
        operation_description="""
        Get task data, metadata, annotations and other attributes for a specific labeling task by task ID.
        """,
        manual_parameters=[
            openapi.Parameter(name='proxy', type=openapi.TYPE_BOOLEAN, in_=openapi.IN_QUERY,
                          description='Use the proxy parameter inline for credential access to task data')
        ]))
@method_decorator(name='patch', decorator=swagger_auto_schema(
        tags=['Tasks'],
        operation_summary='Update task',
        operation_description='Update the attributes of an existing labeling task.',
        request_body=TaskSimpleSerializer))
@method_decorator(name='delete', decorator=swagger_auto_schema(
        tags=['Tasks'],
        operation_summary='Delete task',
        operation_description='Delete a task in Label Studio. This action cannot be undone!',
        ))
class TaskAPI(generics.RetrieveUpdateDestroyAPIView):
    parser_classes = (JSONParser, FormParser, MultiPartParser)
    permission_required = ViewClassPermission(
        GET=all_permissions.tasks_view,
        PUT=all_permissions.tasks_change,
        PATCH=all_permissions.tasks_change,
        DELETE=all_permissions.tasks_delete,
    )

    def get_queryset(self):
        return Task.objects.filter(project__organization=self.request.user.active_organization)


    def get_serializer_class(self):
        # GET => task + annotations + predictions + drafts
        if self.request.method == 'GET':
            return TaskWithAnnotationsAndPredictionsAndDraftsSerializer

        # POST, PATCH, PUT
        else:
            return TaskSimpleSerializer
    
    def retrieve(self, request, *args, **kwargs):
        task = self.get_object()

        # call machine learning api and format response
        if task.project.evaluate_predictions_automatically:
            for ml_backend in task.project.ml_backends.all():
                ml_backend.predict_one_task(task)

        result = self.get_serializer(task).data

        # use proxy inlining to task data (for credential access)
        proxy = bool_from_request(request.GET, 'proxy', True)
        result['data'] = task.resolve_uri(result['data'], proxy=proxy)
        return Response(result)

    def get(self, request, *args, **kwargs):
        return super(TaskAPI, self).get(request, *args, **kwargs)

    def patch(self, request, *args, **kwargs):
        return super(TaskAPI, self).patch(request, *args, **kwargs)

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
        annotation_id = self.kwargs['pk']
        annotation = get_object_with_check_and_log(request, Annotation, pk=annotation_id)

        annotation.task.save()  # refresh task metrics

        if self.request.data.get('ground_truth'):
            annotation.task.ensure_unique_groundtruth(annotation_id=annotation.id)

        return super(AnnotationAPI, self).update(request, *args, **kwargs)

    def get(self, request, *args, **kwargs):
        return super(AnnotationAPI, self).get(request, *args, **kwargs)

    @swagger_auto_schema(auto_schema=None)
    def put(self, request, *args, **kwargs):
        return super(AnnotationAPI, self).put(request, *args, **kwargs)

    def patch(self, request, *args, **kwargs):
        return super(AnnotationAPI, self).patch(request, *args, **kwargs)

    def delete(self, request, *args, **kwargs):
        return super(AnnotationAPI, self).delete(request, *args, **kwargs)


@method_decorator(name='get', decorator=swagger_auto_schema(
        tags=['Annotations'],
        operation_summary='Get all task annotations',
        operation_description='List all annotations for a task.',
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
        "completed_by": {"id": 1, "email": "heartex@example.com", "first_name": "", "last_name": ""}
        } 
        ```
        """,
        request_body=AnnotationSerializer
        ))
class AnnotationsListAPI(generics.ListCreateAPIView):
    parser_classes = (JSONParser, FormParser, MultiPartParser)
    permission_required = ViewClassPermission(
        GET=all_permissions.annotations_view,
        POST=all_permissions.annotations_create,
    )

    serializer_class = AnnotationSerializer

    def get(self, request, *args, **kwargs):
        return super(AnnotationsListAPI, self).get(request, *args, **kwargs)

    def post(self, request, *args, **kwargs):
        return super(AnnotationsListAPI, self).post(request, *args, **kwargs)

    def get_queryset(self):
        task = generics.get_object_or_404(Task.objects.for_user(self.request.user), pk=self.kwargs.get('pk', 0))
        return Annotation.objects.filter(Q(task=task) & Q(was_cancelled=False)).order_by('pk')

    def perform_create(self, ser):
        task = get_object_with_check_and_log(self.request, Task, pk=self.kwargs['pk'])
        # annotator has write access only to annotations and it can't be checked it after serializer.save()
        user = self.request.user

        # updates history
        update_id = self.request.user.id
        result = ser.validated_data.get('result')
        extra_args = {'task_id': self.kwargs['pk']}

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
            AnnotationDraft.objects.filter(id=draft_id).delete()

        if self.request.data.get('ground_truth'):
            annotation.task.ensure_unique_groundtruth(annotation_id=annotation.id)

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
    tags=['Predictions'], operation_summary="List predictions", 
    filter_inspectors=[DjangoFilterDescriptionInspector],
    operation_description="List all predictions."))
@method_decorator(name='create', decorator=swagger_auto_schema(
    tags=['Predictions'],
    operation_summary="Create prediction",
    operation_description="Create a prediction."))
@method_decorator(name='retrieve', decorator=swagger_auto_schema(
    tags=['Predictions'],
    operation_summary="Get prediction",
    operation_description="Get all predictions in an organization, or for a specific task or project by ID."))
@method_decorator(name='update', decorator=swagger_auto_schema(
    tags=['Predictions'],
    operation_summary="Put prediction",
    operation_description="Overwrite prediction data by prediction ID."))
@method_decorator(name='partial_update', decorator=swagger_auto_schema(
    tags=['Predictions'],
    operation_summary="Update prediction",
    operation_description="Update prediction data by prediction ID."))
@method_decorator(name='destroy', decorator=swagger_auto_schema(
    tags=['Predictions'],
    operation_summary="Delete prediction",
    operation_description="Delete a prediction by prediction ID."))
class PredictionAPI(viewsets.ModelViewSet):
    serializer_class = PredictionSerializer
    permission_required = all_permissions.predictions_any
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['task', 'task__project']

    def get_queryset(self):
        return Prediction.objects.filter(task__project__organization=self.request.user.active_organization)
