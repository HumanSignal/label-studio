"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import logging
import drf_yasg.openapi as openapi

from drf_yasg.utils import swagger_auto_schema
from rest_framework import generics, status
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.views import APIView
from rest_framework.response import Response

from core.permissions import BaseRulesPermission, IsBusiness, get_object_with_permissions
from core.utils.common import get_object_with_check_and_log
from projects.models import Project
from ml.serializers import MLBackendSerializer
from ml.models import MLBackend
from core.utils.common import bool_from_request

logger = logging.getLogger(__name__)


class MLBackendAPIBasePermission(BaseRulesPermission):
    perm = 'projects.change_project'


class MLBackendListAPI(generics.ListCreateAPIView):
    parser_classes = (JSONParser, FormParser, MultiPartParser)
    permission_classes = (IsBusiness, MLBackendAPIBasePermission)
    serializer_class = MLBackendSerializer
    swagger_schema = None

    def get_queryset(self):
        project_pk = self.request.query_params.get('project')
        project = get_object_with_check_and_log(self.request, Project, pk=project_pk)
        self.check_object_permissions(self.request, project)
        ml_backends = MLBackend.objects.filter(project_id=project.id)
        for mlb in ml_backends:
            mlb.update_state()
        return ml_backends

    def perform_create(self, serializer):
        ml_backend = serializer.save()
        ml_backend.update_state()


class MLBackendDetailAPI(generics.RetrieveUpdateDestroyAPIView):
    """RUD storage by pk specified in URL"""
    parser_classes = (JSONParser, FormParser, MultiPartParser)
    serializer_class = MLBackendSerializer
    permission_classes = (IsBusiness, MLBackendAPIBasePermission)
    queryset = MLBackend.objects.all()
    swagger_schema = None

    def get_object(self):
        ml_backend = super(MLBackendDetailAPI, self).get_object()
        ml_backend.update_state()
        return ml_backend

    def perform_update(self, serializer):
        ml_backend = serializer.save()
        ml_backend.update_state()


class MLBackendTrainAPI(APIView):
    """Train

    After you've activated an ML backend, call this API to start training with the already-labeled tasks.
    """
    permission_classes = (IsBusiness, MLBackendAPIBasePermission)

    @swagger_auto_schema(
        request_body=openapi.Schema(
            type=openapi.TYPE_OBJECT,
            properties={'use_ground_truth': openapi.Schema(type=openapi.TYPE_BOOLEAN,
                                                        description='Whether to include ground truth annotations in training')}
        ),
        responses={
            200: openapi.Response(
                title='Training OK',
                description='Training has successfully started.'
            ),
            500: openapi.Response(
                description='Training error',
                schema=openapi.Schema(
                    title='Error message',
                    desciption='Error message',
                    type=openapi.TYPE_STRING,
                    example='Server responded with an error.'
                )
            )
        },
        tags=['Machine Learning']
    )
    def post(self, request, *args, **kwargs):
        ml_backend = get_object_with_check_and_log(request, MLBackend, pk=self.kwargs['pk'])
        self.check_object_permissions(self.request, ml_backend)

        ml_backend.train()
        return Response(status=status.HTTP_200_OK)


class MLBackendPredictAPI(APIView):
    """
    post:
    Create predictions

    Create predictions for all tasks in a project to build statistics and an active learning strategy.
    """
    permission_classes = (IsBusiness, MLBackendAPIBasePermission)

    @swagger_auto_schema(
        responses={
            200: openapi.Response(
                title='Predictions OK',
                description='Predictions have successfully started.'
            ),
            500: openapi.Response(
                description='Error',
                schema=openapi.Schema(
                    title='Error message',
                    desciption='Error message',
                    type=openapi.TYPE_STRING,
                    example='Server responded with an error.'
                )
            )
        },
        tags=['Machine Learning']
    )
    def post(self, request, *args, **kwargs):
        ml_backend = get_object_with_check_and_log(request, MLBackend, pk=self.kwargs['pk'])
        self.check_object_permissions(self.request, ml_backend)

        ml_backend.predict_all_tasks()
        return Response(status=status.HTTP_200_OK)
