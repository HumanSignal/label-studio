"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import logging

from django.db import transaction
from django.db.models import Q
from django.utils import timezone

import drf_yasg.openapi as openapi
from drf_yasg.utils import swagger_auto_schema

from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework import generics
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response

from core.utils.common import get_object_with_check_and_log

from tasks.models import Task, Annotation, Prediction, AnnotationDraft
from core.permissions import (IsAuthenticated, IsBusiness, BaseRulesPermission,
                              get_object_with_permissions, check_object_permissions)
from core.mixins import RequestDebugLogMixin
from core.utils.common import bool_from_request
from tasks.serializers import (
    TaskSerializer, AnnotationSerializer, TaskSimpleSerializer, PredictionSerializer,
    TaskWithAnnotationsAndPredictionsAndDraftsSerializer, AnnotationDraftSerializer)
from projects.models import Project

logger = logging.getLogger(__name__)


class TaskAPIViewTaskPermission(BaseRulesPermission):
    perm = 'tasks.view_task'


class TaskAPIChangeProjectPermission(BaseRulesPermission):
    perm = 'projects.change_project'


class TaskListAPI(generics.ListCreateAPIView):
    """
    post:
    Create task

    Create a new labeling task in Label Studio.
    """
    parser_classes = (JSONParser, FormParser, MultiPartParser)
    permission_classes = (IsAuthenticated, )
    queryset = Task.objects.all()
    serializer_class = TaskSerializer

    @swagger_auto_schema(auto_schema=None)
    def get(self, request, *args, **kwargs):
        return super(TaskListAPI, self).get(request, *args, **kwargs)

    def get_serializer_context(self):
        context = super(TaskListAPI, self).get_serializer_context()
        project_id = self.request.data.get('project')
        if project_id:
            context['project'] = get_object_with_permissions(
                self.request, Project, project_id, TaskAPIChangeProjectPermission.perm)
        return context

    @swagger_auto_schema(tags=['Tasks'], request_body=TaskSerializer)
    def post(self, request, *args, **kwargs):
        return super(TaskListAPI, self).post(request, *args, **kwargs)


class TaskAPI(generics.RetrieveUpdateDestroyAPIView):
    """
    get:
    Get task by ID

    Get task data, metadata, annotations and other attributes for a specific labeling task.

    patch:
    Update task

    Update the attributes of an existing labeling task.

    delete:
    Delete task

    Delete a task in Label Studio. This action cannot be undone!
    """
    parser_classes = (JSONParser, FormParser, MultiPartParser)
    permission_classes = (IsAuthenticated, )
    queryset = Task.objects.all()

    def get_serializer_class(self):
        # GET => task + annotations + predictions + drafts
        if self.request.method == 'GET':
            return TaskWithAnnotationsAndPredictionsAndDraftsSerializer

        # POST, PATCH, PUT
        else:
            return TaskSimpleSerializer
    
    def get_object(self):
        if self.request.method == 'GET':
            obj = get_object_with_permissions(self.request, Task, self.kwargs['pk'], 'tasks.view_task')
        else:
            obj = get_object_with_permissions(self.request, Task, self.kwargs['pk'], 'projects.view_project')
        return obj
    
    def retrieve(self, request, *args, **kwargs):
        task = self.get_object()

        # call machine learning api and format response
        if task.project.show_collab_predictions:
            for ml_backend in task.project.ml_backends.all():
                ml_backend.predict_one_task(task)

        result = self.get_serializer(task).data

        # use proxy inlining to task data (for credential access)
        proxy = bool_from_request(request.GET, 'proxy', True)
        result['data'] = task.resolve_uri(result['data'], proxy=proxy)
        return Response(result)
    
    @swagger_auto_schema(tags=['Tasks'], manual_parameters=[
            openapi.Parameter(name='proxy', type=openapi.TYPE_BOOLEAN, in_=openapi.IN_QUERY,
                              description='Use the proxy parameter inline for credential access to task data')
    ])
    def get(self, request, *args, **kwargs):
        return super(TaskAPI, self).get(request, *args, **kwargs)

    @swagger_auto_schema(tags=['Tasks'], request_body=TaskSimpleSerializer)
    def patch(self, request, *args, **kwargs):
        return super(TaskAPI, self).patch(request, *args, **kwargs)

    @swagger_auto_schema(tags=['Tasks'])
    def delete(self, request, *args, **kwargs):
        return super(TaskAPI, self).delete(request, *args, **kwargs)

    @swagger_auto_schema(auto_schema=None)
    def put(self, request, *args, **kwargs):
        return super(TaskAPI, self).put(request, *args, **kwargs)


class TaskCancelAPI(APIView):
    """
    post:
    Cancel Task

    Set a labeling task as cancelled or skipped. 
    """
    swagger_schema = None
    parser_classes = (JSONParser, FormParser, MultiPartParser)
    permission_classes = (IsAuthenticated,)
    serializer_class = TaskSerializer

    def post(self, request, *args, **kwargs):
        # get the cancelled task
        task = get_object_with_permissions(self.request, Task, self.kwargs['pk'], 'tasks.change_task')

        # validate data from annotation
        annotation = AnnotationSerializer(data=request.data)
        annotation.is_valid(raise_exception=True)

        # set annotator last activity
        user = request.user
        user.activity_at = timezone.now()
        user.save()

        # serialize annotation, update task and save
        com = annotation.save(completed_by=user, was_cancelled=True, task=task)
        task.annotations.add(com)
        task.save()
        return Response(annotation.data, status=status.HTTP_200_OK)


class AnnotationAPI(RequestDebugLogMixin, generics.RetrieveUpdateDestroyAPIView):
    """
    get:
    Get annotation by its ID

    Retrieve a specific annotation for a task.

    patch:
    Update annotation

    Update existing attributes on an annotation. 

    delete:
    Delete annotation

    Delete an annotation. This action can't be undone! 
    """
    parser_classes = (JSONParser, FormParser, MultiPartParser)
    permission_classes = (IsAuthenticated, )
    serializer_class = AnnotationSerializer

    def get_object(self):
        return get_object_with_permissions(
            self.request, Annotation, self.kwargs['pk'], 'annotations.view_annotation')

    def perform_destroy(self, annotation):
        check_object_permissions(self.request, annotation, 'annotations.delete_annotation')
        annotation.delete()

    def update(self, request, *args, **kwargs):
        # save user history with annotator_id, time & annotation result
        update_id = self.request.user.id
        annotation_id = self.kwargs['pk']
        annotation = get_object_with_check_and_log(request, Annotation, pk=annotation_id)
        task = annotation.task

        task.save()  # refresh task metrics

        return super(AnnotationAPI, self).update(request, *args, **kwargs)

    @swagger_auto_schema(tags=['Annotations'])
    def get(self, request, *args, **kwargs):
        return super(AnnotationAPI, self).get(request, *args, **kwargs)

    @swagger_auto_schema(tags=['Annotations'], auto_schema=None)
    def put(self, request, *args, **kwargs):
        return super(AnnotationAPI, self).put(request, *args, **kwargs)

    @swagger_auto_schema(tags=['Annotations'], request_body=AnnotationSerializer)
    def patch(self, request, *args, **kwargs):
        return super(AnnotationAPI, self).patch(request, *args, **kwargs)

    @swagger_auto_schema(tags=['Annotations'])
    def delete(self, request, *args, **kwargs):
        return super(AnnotationAPI, self).delete(request, *args, **kwargs)

        
class AnnotationsListAPI(RequestDebugLogMixin, generics.ListCreateAPIView):
    """
    get:
    Get all task annotations

    List all annotations for a task.

    post:
    Create new annotation

    Add annotations to a task like an annotator does.
    """
    parser_classes = (JSONParser, FormParser, MultiPartParser)
    # Be careful: order of Permission Classes is important! It's lazy call of them.
    # If HasAnnotatorProjectAccess is True, no more calls will be done. No raise exception about business.is_approved.
    permission_classes = (IsBusiness, )
    serializer_class = AnnotationSerializer

    @swagger_auto_schema(tags=['Annotations'])
    def get(self, request, *args, **kwargs):
        return super(AnnotationsListAPI, self).get(request, *args, **kwargs)

    @swagger_auto_schema(tags=['Annotations'], request_body=AnnotationSerializer)
    def post(self, request, *args, **kwargs):
        return super(AnnotationsListAPI, self).post(request, *args, **kwargs)

    def get_queryset(self):
        task = get_object_with_permissions(self.request, Task, self.kwargs.get('pk', 0), 'tasks.view_task')
        return Annotation.objects.filter(Q(task=task) & Q(was_cancelled=False)).order_by('pk')

    def perform_create(self, ser):
        task = get_object_with_check_and_log(self.request, Task, pk=self.kwargs['pk'])
        # annotator has write access only to annotations and it can't be checked it after serializer.save()
        check_object_permissions(self.request, Annotation(task=task), 'annotations.change_annotation')
        user = self.request.user
        # Release task if it has been taken at work (it should be taken by the same user, or it makes sentry error
        logger.debug(f'User={user} releases task={task}')
        task.release_lock(user)

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

        # if annotation created from draft - remove this draft
        draft_id = self.request.data.get('draft_id')
        if draft_id is not None:
            logger.debug(f'Remove draft {draft_id} after creating annotation {annotation.id}')
            AnnotationDraft.objects.filter(id=draft_id).delete()

        return annotation


class AnnotationDraftListAPI(RequestDebugLogMixin, generics.ListCreateAPIView):

    parser_classes = (JSONParser, MultiPartParser, FormParser)
    permission_classes = (TaskAPIViewTaskPermission, )
    serializer_class = AnnotationDraftSerializer
    queryset = AnnotationDraft.objects.all()
    swagger_schema = None

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


class AnnotationDraftAPI(RequestDebugLogMixin, generics.RetrieveUpdateDestroyAPIView):

    parser_classes = (JSONParser, MultiPartParser, FormParser)
    permission_classes = (TaskAPIViewTaskPermission, )
    serializer_class = AnnotationDraftSerializer
    queryset = AnnotationDraft.objects.all()
    swagger_schema = None
