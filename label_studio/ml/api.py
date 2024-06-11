"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import logging

import drf_yasg.openapi as openapi
from core.feature_flags import flag_set
from core.permissions import ViewClassPermission, all_permissions
from django.conf import settings
from django.http import Http404
from django.utils.decorators import method_decorator
from django_filters.rest_framework import DjangoFilterBackend
from drf_yasg.utils import no_body, swagger_auto_schema
from ml.models import MLBackend
from ml.serializers import MLBackendSerializer, MLInteractiveAnnotatingRequest
from projects.models import Project, Task
from rest_framework import generics, status
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

logger = logging.getLogger(__name__)

_ml_backend_schema = openapi.Schema(
    type=openapi.TYPE_OBJECT,
    properties={
        'url': openapi.Schema(type=openapi.TYPE_STRING, description='ML backend URL'),
        'project': openapi.Schema(type=openapi.TYPE_INTEGER, description='Project ID'),
        'is_interactive': openapi.Schema(type=openapi.TYPE_BOOLEAN, description='Is interactive'),
        'title': openapi.Schema(type=openapi.TYPE_STRING, description='Title'),
        'description': openapi.Schema(type=openapi.TYPE_STRING, description='Description'),
        'auth_method': openapi.Schema(
            type=openapi.TYPE_STRING, description='Auth method', enum=['NONE', 'BASIC_AUTH']
        ),
        'basic_auth_user': openapi.Schema(type=openapi.TYPE_STRING, description='Basic auth user'),
        'basic_auth_pass': openapi.Schema(type=openapi.TYPE_STRING, description='Basic auth password'),
        'extra_params': openapi.Schema(type=openapi.TYPE_OBJECT, description='Extra parameters'),
        'timeout': openapi.Schema(type=openapi.TYPE_INTEGER, description='Response model timeout'),
    },
    required=[],
)


@method_decorator(
    name='post',
    decorator=swagger_auto_schema(
        tags=['Machine Learning'],
        x_fern_sdk_group_name='ml',
        x_fern_sdk_method_name='create',
        x_fern_audiences=['public'],
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
        request_body=_ml_backend_schema,
    ),
)
@method_decorator(
    name='get',
    decorator=swagger_auto_schema(
        tags=['Machine Learning'],
        x_fern_sdk_group_name='ml',
        x_fern_sdk_method_name='list',
        x_fern_audiences=['public'],
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
                name='project', type=openapi.TYPE_INTEGER, in_=openapi.IN_QUERY, description='Project ID'
            ),
        ],
        request_body=no_body,
    ),
)
class MLBackendListAPI(generics.ListCreateAPIView):
    parser_classes = (JSONParser, FormParser, MultiPartParser)
    permission_required = ViewClassPermission(
        GET=all_permissions.projects_view,
        POST=all_permissions.projects_change,
    )
    serializer_class = MLBackendSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['is_interactive']

    def get_queryset(self):
        project_pk = self.request.query_params.get('project')
        project = generics.get_object_or_404(Project, pk=project_pk)

        self.check_object_permissions(self.request, project)

        ml_backends = project.update_ml_backends_state()

        return ml_backends

    def perform_create(self, serializer):
        ml_backend = serializer.save()
        ml_backend.update_state()

        project = ml_backend.project

        # In case we are adding the model, let's set it as the default
        # to obtain predictions. This approach is consistent with uploading
        # offline predictions, which would be set automatically.
        if project.show_collab_predictions and not project.model_version:
            project.model_version = ml_backend.title
            project.save(update_fields=['model_version'])


@method_decorator(
    name='patch',
    decorator=swagger_auto_schema(
        tags=['Machine Learning'],
        x_fern_sdk_group_name='ml',
        x_fern_sdk_method_name='update',
        x_fern_audiences=['public'],
        operation_summary='Update ML Backend',
        operation_description="""
    Update ML backend parameters using the Label Studio UI or by sending a PATCH request using the following cURL command:
    ```bash
    curl -X PATCH -H 'Content-type: application/json' {host}/api/ml/{{ml_backend_ID}} -H 'Authorization: Token abc123'\\
    --data '{{"url": "http://localhost:9091"}}' 
    """.format(
            host=(settings.HOSTNAME or 'https://localhost:8080')
        ),
        request_body=_ml_backend_schema,
    ),
)
@method_decorator(
    name='get',
    decorator=swagger_auto_schema(
        tags=['Machine Learning'],
        x_fern_sdk_group_name='ml',
        x_fern_sdk_method_name='get',
        x_fern_audiences=['public'],
        operation_summary='Get ML Backend',
        operation_description="""
    Get details about a specific ML backend connection by ID. For example, make a GET request using the
    following cURL command:
    ```bash
    curl {host}/api/ml/{{ml_backend_ID}} -H 'Authorization: Token abc123'
    """.format(
            host=(settings.HOSTNAME or 'https://localhost:8080')
        ),
        request_body=no_body,
    ),
)
@method_decorator(
    name='delete',
    decorator=swagger_auto_schema(
        tags=['Machine Learning'],
        x_fern_sdk_group_name='ml',
        x_fern_sdk_method_name='delete',
        x_fern_audiences=['public'],
        operation_summary='Remove ML Backend',
        operation_description="""
    Remove an existing ML backend connection by ID. For example, use the
    following cURL command:
    ```bash
    curl -X DELETE {host}/api/ml/{{ml_backend_ID}} -H 'Authorization: Token abc123'
    """.format(
            host=(settings.HOSTNAME or 'https://localhost:8080')
        ),
        request_body=no_body,
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
        x_fern_sdk_group_name='ml',
        x_fern_sdk_method_name='train',
        x_fern_audiences=['public'],
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
                description='A unique integer value identifying this ML backend.',
            ),
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
            200: openapi.Response(description='Training has successfully started.'),
            500: openapi.Response(
                description='Training error',
                schema=openapi.Schema(
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
        ml_backend = generics.get_object_or_404(MLBackend, pk=self.kwargs['pk'])
        self.check_object_permissions(self.request, ml_backend)

        ml_backend.train()
        return Response(status=status.HTTP_200_OK)


@method_decorator(
    name='post',
    decorator=swagger_auto_schema(
        tags=['Machine Learning'],
        x_fern_sdk_group_name='ml',
        x_fern_sdk_method_name='test_predict',
        x_fern_audiences=['internal'],
        operation_summary='Test prediction',
        operation_description="""
        After you add an ML backend, call this API with the ML backend ID to run a test prediction on specific task data               
        """,
        manual_parameters=[
            openapi.Parameter(
                name='id',
                type=openapi.TYPE_INTEGER,
                in_=openapi.IN_PATH,
                description='A unique integer value identifying this ML backend.',
            ),
        ],
        responses={
            200: openapi.Response(description='Predicting has successfully started.'),
            500: openapi.Response(
                description='Predicting error',
                schema=openapi.Schema(
                    description='Error message',
                    type=openapi.TYPE_STRING,
                    example='Server responded with an error.',
                ),
            ),
        },
    ),
)
class MLBackendPredictTestAPI(APIView):
    serializer_class = MLBackendSerializer
    permission_required = all_permissions.projects_change

    def post(self, request, *args, **kwargs):
        ml_backend = generics.get_object_or_404(MLBackend, pk=self.kwargs['pk'])
        self.check_object_permissions(self.request, ml_backend)

        random = request.query_params.get('random', False)
        if random:
            task = Task.get_random(project=ml_backend.project)
            if not task:
                raise Http404

            kwargs = ml_backend._predict(task)
            return Response(**kwargs)

        else:
            return Response(
                status=status.HTTP_501_NOT_IMPLEMENTED,
                data={'error': 'Not implemented - you must provide random=true query parameter'},
            )


@method_decorator(
    name='post',
    decorator=swagger_auto_schema(
        tags=['Machine Learning'],
        x_fern_sdk_group_name='ml',
        x_fern_sdk_method_name='predict_interactive',
        x_fern_audiences=['public'],
        operation_summary='Request Interactive Annotation',
        operation_description="""
        Send a request to the machine learning backend set up to be used for interactive preannotations to retrieve a
        predicted region based on annotator input. 
        See [set up machine learning](https://labelstud.io/guide/ml.html#Get-interactive-preannotations) for more.
        """,
        manual_parameters=[
            openapi.Parameter(
                name='id',
                type=openapi.TYPE_INTEGER,
                in_=openapi.IN_PATH,
                description='A unique integer value identifying this ML backend.',
            ),
        ],
        request_body=MLInteractiveAnnotatingRequest,
        responses={
            200: openapi.Response(description='Interactive annotation has succeeded.'),
        },
    ),
)
class MLBackendInteractiveAnnotating(APIView):
    """
    Send a request to the machine learning backend set up to be used for interactive preannotations to retrieve a
    predicted region based on annotator input.
    """

    permission_required = all_permissions.tasks_view

    def _error_response(self, message, log_function=logger.info):
        log_function(message)
        return Response({'errors': [message]}, status=status.HTTP_200_OK)

    def _get_task(self, ml_backend, validated_data):
        return generics.get_object_or_404(Task, pk=validated_data['task'], project=ml_backend.project)

    def _get_credentials(self, request, context, project):
        if flag_set('ff_back_dev_2362_project_credentials_060722_short', request.user):
            context.update(
                project_credentials_login=project.task_data_login,
                project_credentials_password=project.task_data_password,
            )
        return context

    def post(self, request, *args, **kwargs):
        """
        Send a request to the machine learning backend set up to be used for interactive preannotations to retrieve a
        predicted region based on annotator input.
        """
        ml_backend = generics.get_object_or_404(MLBackend, pk=self.kwargs['pk'])
        self.check_object_permissions(self.request, ml_backend)
        serializer = MLInteractiveAnnotatingRequest(data=request.data)
        serializer.is_valid(raise_exception=True)

        task = self._get_task(ml_backend, serializer.validated_data)
        context = self._get_credentials(request, serializer.validated_data.get('context', {}), task.project)

        result = ml_backend.interactive_annotating(task, context, user=request.user)

        return Response(
            result,
            status=status.HTTP_200_OK,
        )


@method_decorator(
    name='get',
    decorator=swagger_auto_schema(
        tags=['Machine Learning'],
        x_fern_sdk_group_name='ml',
        x_fern_sdk_method_name='list_model_versions',
        x_fern_audiences=['public'],
        operation_summary='Get model versions',
        operation_description='Get available versions of the model.',
        responses={'200': 'List of available versions.'},
    ),
)
class MLBackendVersionsAPI(generics.RetrieveAPIView):

    permission_required = all_permissions.projects_change

    def get(self, request, *args, **kwargs):
        ml_backend = generics.get_object_or_404(MLBackend, pk=self.kwargs['pk'])
        self.check_object_permissions(self.request, ml_backend)
        versions_response = ml_backend.get_versions()
        if versions_response.status_code == 200:
            result = {'versions': versions_response.response.get('versions', [])}
            return Response(data=result, status=200)
        elif versions_response.status_code == 404:
            result = {'versions': [ml_backend.model_version], 'message': 'Upgrade your ML backend version to latest.'}
            return Response(data=result, status=200)
        else:
            result = {'error': str(versions_response.error_message)}
            status_code = versions_response.status_code if versions_response.status_code > 0 else 500
            return Response(data=result, status=status_code)
