"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import logging
import drf_yasg.openapi as openapi
from drf_yasg.utils import swagger_auto_schema
from django.utils.decorators import method_decorator
from django.conf import settings

from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import generics, status
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.views import APIView
from rest_framework.response import Response

from core.feature_flags import flag_set
from core.permissions import all_permissions, ViewClassPermission
from core.utils.common import get_object_with_check_and_log
from projects.models import Project, Task
from ml.serializers import MLBackendSerializer, MLInteractiveAnnotatingRequest
from ml.models import MLBackend

logger = logging.getLogger(__name__)


@method_decorator(
    name='post',
    decorator=swagger_auto_schema(
        tags=['Machine Learning'],
        operation_summary='Add ML Backend',
        operation_description="""
    Add an ML backend to a project using the Label Studio UI or by sending a POST request using the following cURL 
    command:
    ```bash
    curl -X POST -H 'Content-type: application/json' {host}/api/ml -H 'Authorization: Token abc123'\\
    --data '{{"url": "http://localhost:9090", "project": {{project_id}}}}' 
    """.format(
            host=(settings.HOSTNAME or 'https://localhost:8080')
        ),
        request_body=openapi.Schema(
            type=openapi.TYPE_OBJECT,
            properties={
                'project': openapi.Schema(
                    type=openapi.TYPE_INTEGER,
                    description='Project ID'
                ),
                'url': openapi.Schema(
                    type=openapi.TYPE_STRING,
                    description='ML backend URL'
                ),
            },
        ),
    ),
)
@method_decorator(
    name='get',
    decorator=swagger_auto_schema(
        tags=['Machine Learning'],
        operation_summary='List ML backends',
        operation_description="""
    List all configured ML backends for a specific project by ID.
    Use the following cURL command:
    ```bash
    curl {host}/api/ml?project={{project_id}} -H 'Authorization: Token abc123'
    """.format(
            host=(settings.HOSTNAME or 'https://localhost:8080')
        ),
        manual_parameters=[
            openapi.Parameter(
                name='project',
                type=openapi.TYPE_INTEGER,
                in_=openapi.IN_QUERY,
                description='Project ID'),
        ],
    ))
class MLBackendListAPI(generics.ListCreateAPIView):
    parser_classes = (JSONParser, FormParser, MultiPartParser)
    permission_required = ViewClassPermission(
        GET=all_permissions.projects_view,
        POST=all_permissions.projects_change,
    )
    serializer_class = MLBackendSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["is_interactive"]

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


@method_decorator(
    name='patch',
    decorator=swagger_auto_schema(
        tags=['Machine Learning'],
        operation_summary='Update ML Backend',
        operation_description="""
    Update ML backend parameters using the Label Studio UI or by sending a PATCH request using the following cURL command:
    ```bash
    curl -X PATCH -H 'Content-type: application/json' {host}/api/ml/{{ml_backend_ID}} -H 'Authorization: Token abc123'\\
    --data '{{"url": "http://localhost:9091"}}' 
    """.format(
            host=(settings.HOSTNAME or 'https://localhost:8080')
        ),
    ),
)
@method_decorator(
    name='get',
    decorator=swagger_auto_schema(
        tags=['Machine Learning'],
        operation_summary='Get ML Backend',
        operation_description="""
    Get details about a specific ML backend connection by ID. For example, make a GET request using the
    following cURL command:
    ```bash
    curl {host}/api/ml/{{ml_backend_ID}} -H 'Authorization: Token abc123'
    """.format(
            host=(settings.HOSTNAME or 'https://localhost:8080')
        ),
    ),
)
@method_decorator(
    name='delete',
    decorator=swagger_auto_schema(
        tags=['Machine Learning'],
        operation_summary='Remove ML Backend',
        operation_description="""
    Remove an existing ML backend connection by ID. For example, use the
    following cURL command:
    ```bash
    curl -X DELETE {host}/api/ml/{{ml_backend_ID}} -H 'Authorization: Token abc123'
    """.format(
            host=(settings.HOSTNAME or 'https://localhost:8080')
        ),
    ),
)
@method_decorator(name='put', decorator=swagger_auto_schema(auto_schema=None))
class MLBackendDetailAPI(generics.RetrieveUpdateDestroyAPIView):
    parser_classes = (JSONParser, FormParser, MultiPartParser)
    serializer_class = MLBackendSerializer
    permission_required = all_permissions.projects_change
    queryset = MLBackend.objects.all()

    def get_object(self):
        ml_backend = super(MLBackendDetailAPI, self).get_object()
        ml_backend.update_state()
        return ml_backend

    def perform_update(self, serializer):
        ml_backend = serializer.save()
        ml_backend.update_state()


@method_decorator(
    name='post',
    decorator=swagger_auto_schema(
        tags=['Machine Learning'],
        operation_summary='Train',
        operation_description="""
        After you add an ML backend, call this API with the ML backend ID to start training with 
        already-labeled tasks. 
        
        Get the ML backend ID by [listing the ML backends for a project](https://labelstud.io/api/#operation/api_ml_list).
        """,
        manual_parameters=[
            openapi.Parameter(
                name='id',
                type=openapi.TYPE_INTEGER,
                in_=openapi.IN_PATH,
                description='A unique integer value identifying this ML backend.'),
        ],
        request_body=openapi.Schema(
            type=openapi.TYPE_OBJECT,
            properties={
                'use_ground_truth': openapi.Schema(
                    type=openapi.TYPE_BOOLEAN, description='Whether to include ground truth annotations in training'
                )
            },
        ),
        responses={
            200: openapi.Response(title='Training OK', description='Training has successfully started.'),
            500: openapi.Response(
                description='Training error',
                schema=openapi.Schema(
                    title='Error message',
                    description='Error message',
                    type=openapi.TYPE_STRING,
                    example='Server responded with an error.',
                ),
            ),
        },
    ),
)
class MLBackendTrainAPI(APIView):

    permission_required = all_permissions.projects_change

    def post(self, request, *args, **kwargs):
        ml_backend = get_object_with_check_and_log(request, MLBackend, pk=self.kwargs['pk'])
        self.check_object_permissions(self.request, ml_backend)

        ml_backend.train()
        return Response(status=status.HTTP_200_OK)


@method_decorator(
    name='post',
    decorator=swagger_auto_schema(
        tags=['Machine Learning'],
        operation_summary='Request Interactive Annotation',
        operation_description="""
        Send a request to the machine learning backend set up to be used for interactive preannotations to retrieve a
        predicted region based on annotator input. 
        See [set up machine learning](labelstud.io/guide/ml.html#Get-interactive-preannotations) for more.
        """,
        manual_parameters=[
            openapi.Parameter(
                name='id',
                type=openapi.TYPE_INTEGER,
                in_=openapi.IN_PATH,
                description='A unique integer value identifying this ML backend.'),
        ],
        request_body=MLInteractiveAnnotatingRequest,
        responses={
            200: openapi.Response(title='Annotating OK', description='Interactive annotation has succeeded.'),
        },
    ),
)
class MLBackendInteractiveAnnotating(APIView):

    permission_required = all_permissions.tasks_view

    def post(self, request, *args, **kwargs):
        ml_backend = get_object_with_check_and_log(request, MLBackend, pk=self.kwargs['pk'])
        self.check_object_permissions(self.request, ml_backend)
        serializer = MLInteractiveAnnotatingRequest(data=request.data)
        serializer.is_valid(raise_exception=True)
        validated_data = serializer.validated_data

        task = get_object_with_check_and_log(request, Task, pk=validated_data['task'], project=ml_backend.project)
        context = validated_data.get('context')

        if flag_set('ff_back_dev_2362_project_credentials_060722_short', request.user):
            context['project_credentials_login'] = task.project.task_data_login
            context['project_credentials_password'] = task.project.task_data_password

        result = ml_backend.interactive_annotating(task, context, user=request.user)

        return Response(
            result,
            status=status.HTTP_200_OK,
        )


@method_decorator(
    name='get',
    decorator=swagger_auto_schema(
        tags=['Machine Learning'],
        operation_summary='Get model versions',
        operation_description='Get available versions of the model.',
        responses={"200": "List of available versions."},
    ),
)
class MLBackendVersionsAPI(generics.RetrieveAPIView):

    permission_required = all_permissions.projects_change

    def get(self, request, *args, **kwargs):
        ml_backend = get_object_with_check_and_log(request, MLBackend, pk=self.kwargs['pk'])
        self.check_object_permissions(self.request, ml_backend)
        versions_response = ml_backend.get_versions()
        if versions_response.status_code == 200:
            result = {'versions': versions_response.response.get("versions", [])}
            return Response(data=result, status=200)
        elif versions_response.status_code == 404:
            result = {'versions': [ml_backend.model_version], 'message': 'Upgrade your ML backend version to latest.'}
            return Response(data=result, status=200)
        else:
            result = {'error': str(versions_response.error_message)}
            status_code = versions_response.status_code if versions_response.status_code > 0 else 500
            return Response(data=result, status=status_code)
