"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import logging

from core.feature_flags import flag_set
from core.permissions import ViewClassPermission, all_permissions
from django.conf import settings
from django.utils.decorators import method_decorator
from django_filters.rest_framework import DjangoFilterBackend
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiParameter, OpenApiResponse, extend_schema
from ml.models import MLBackend
from ml.serializers import MLBackendSerializer, MLInteractiveAnnotatingRequest
from projects.models import Project, Task
from rest_framework import generics, status
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView
import os
import json

logger = logging.getLogger(__name__)

_ml_backend_schema = {
    'type': 'object',
    'properties': {
        'url': {
            'type': 'string',
            'description': 'ML backend URL',
        },
        'project': {
            'type': 'integer',
            'description': 'Project ID',
        },
        'is_interactive': {
            'type': 'boolean',
            'description': 'Is interactive',
        },
        'title': {
            'type': 'string',
            'description': 'Title',
        },
        'description': {
            'type': 'string',
            'description': 'Description',
        },
        'auth_method': {
            'type': 'string',
            'description': 'Auth method',
            'enum': ['NONE', 'BASIC_AUTH'],
        },
        'basic_auth_user': {
            'type': 'string',
            'description': 'Basic auth user',
        },
        'basic_auth_pass': {
            'type': 'string',
            'description': 'Basic auth password',
        },
        'extra_params': {
            'type': 'object',
            'description': 'Extra parameters',
        },
        'timeout': {
            'type': 'integer',
            'description': 'Response model timeout',
        },
    },
    'required': [],
}


@method_decorator(
    name='post',
    decorator=extend_schema(
        tags=['Machine Learning'],
        summary='Add ML Backend',
        description="""
    Add an ML backend to a project using the Label Studio UI or by sending a POST request using the following cURL 
    command:
    ```bash
    curl -X POST -H 'Content-type: application/json' {host}/api/ml -H 'Authorization: Token abc123'\\
    --data '{{"url": "http://localhost:9090", "project": {{project_id}}}}' 
    """.format(
            host=(settings.HOSTNAME or 'https://localhost:8080')
        ),
        request={
            'application/json': _ml_backend_schema,
        },
        extensions={
            'x-fern-sdk-group-name': 'ml',
            'x-fern-sdk-method-name': 'create',
            'x-fern-audiences': ['public'],
        },
    ),
)
@method_decorator(
    name='get',
    decorator=extend_schema(
        tags=['Machine Learning'],
        summary='List ML backends',
        description="""
    List all configured ML backends for a specific project by ID.
    Use the following cURL command:
    ```bash
    curl {host}/api/ml?project={{project_id}} -H 'Authorization: Token abc123'
    """.format(
            host=(settings.HOSTNAME or 'https://localhost:8080')
        ),
        parameters=[
            OpenApiParameter(name='project', type=OpenApiTypes.INT, location='query', description='Project ID'),
        ],
        extensions={
            'x-fern-sdk-group-name': 'ml',
            'x-fern-sdk-method-name': 'list',
            'x-fern-audiences': ['public'],
        },
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
    decorator=extend_schema(
        tags=['Machine Learning'],
        summary='Update ML Backend',
        description="""
    Update ML backend parameters using the Label Studio UI or by sending a PATCH request using the following cURL command:
    ```bash
    curl -X PATCH -H 'Content-type: application/json' {host}/api/ml/{{ml_backend_ID}} -H 'Authorization: Token abc123'\\
    --data '{{"url": "http://localhost:9091"}}' 
    """.format(
            host=(settings.HOSTNAME or 'https://localhost:8080')
        ),
        request={
            'application/json': _ml_backend_schema,
        },
        extensions={
            'x-fern-sdk-group-name': 'ml',
            'x-fern-sdk-method-name': 'update',
            'x-fern-audiences': ['public'],
        },
    ),
)
@method_decorator(
    name='get',
    decorator=extend_schema(
        tags=['Machine Learning'],
        summary='Get ML Backend',
        description="""
    Get details about a specific ML backend connection by ID. For example, make a GET request using the
    following cURL command:
    ```bash
    curl {host}/api/ml/{{ml_backend_ID}} -H 'Authorization: Token abc123'
    """.format(
            host=(settings.HOSTNAME or 'https://localhost:8080')
        ),
        request=None,
        extensions={
            'x-fern-sdk-group-name': 'ml',
            'x-fern-sdk-method-name': 'get',
            'x-fern-audiences': ['public'],
        },
    ),
)
@method_decorator(
    name='delete',
    decorator=extend_schema(
        tags=['Machine Learning'],
        summary='Remove ML Backend',
        description="""
    Remove an existing ML backend connection by ID. For example, use the
    following cURL command:
    ```bash
    curl -X DELETE {host}/api/ml/{{ml_backend_ID}} -H 'Authorization: Token abc123'
    """.format(
            host=(settings.HOSTNAME or 'https://localhost:8080')
        ),
        request=None,
        extensions={
            'x-fern-sdk-group-name': 'ml',
            'x-fern-sdk-method-name': 'delete',
            'x-fern-audiences': ['public'],
        },
    ),
)
@method_decorator(name='put', decorator=extend_schema(exclude=True))
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
    decorator=extend_schema(
        tags=['Machine Learning'],
        summary='Train',
        description="""
        After you add an ML backend, call this API with the ML backend ID to start training with 
        already-labeled tasks. 
        
        Get the ML backend ID by [listing the ML backends for a project](https://labelstud.io/api/#operation/api_ml_list).
        """,
        parameters=[
            OpenApiParameter(
                name='id',
                type=OpenApiTypes.INT,
                location='path',
                description='A unique integer value identifying this ML backend.',
            ),
        ],
        request={
            'application/json': {
                'type': 'object',
                'properties': {
                    'use_ground_truth': {
                        'type': 'boolean',
                        'description': 'Whether to include ground truth annotations in training',
                    },
                },
            },
        },
        responses={
            200: OpenApiResponse(description='Training has successfully started.'),
            500: OpenApiResponse(
                description='Training error',
                response={
                    'description': 'Error message',
                    'type': 'string',
                    'example': 'Server responded with an error.',
                },
            ),
        },
        extensions={
            'x-fern-sdk-group-name': 'ml',
            'x-fern-sdk-method-name': 'train',
            'x-fern-audiences': ['public'],
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
    decorator=extend_schema(
        tags=['Machine Learning'],
        summary='Test prediction',
        description="""
        After you add an ML backend, call this API with the ML backend ID to run a test prediction on specific task data               
        """,
        parameters=[
            OpenApiParameter(
                name='id',
                type=OpenApiTypes.INT,
                location='path',
                description='A unique integer value identifying this ML backend.',
            ),
        ],
        responses={
            200: OpenApiResponse(description='Predicting has successfully started.'),
            500: OpenApiResponse(
                description='Predicting error',
                response={
                    'description': 'Error message',
                    'type': 'string',
                    'example': 'Server responded with an error.',
                },
            ),
        },
        extensions={
            'x-fern-sdk-group-name': 'ml',
            'x-fern-sdk-method-name': 'test_predict',
            'x-fern-audiences': ['internal'],
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
                return Response(
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    data={
                        'detail': 'Project has no tasks to run prediction on, import at least 1 task to run prediction'
                    },
                )

            kwargs = ml_backend._predict(task)
            if not kwargs:
                return Response(
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    data={
                        'detail': 'ML backend did not return any predictions, check ML backend logs for more details'
                    },
                )
            return Response(**kwargs)

        else:
            return Response(
                status=status.HTTP_501_NOT_IMPLEMENTED,
                data={'error': 'Not implemented - you must provide random=true query parameter'},
            )


@method_decorator(
    name='post',
    decorator=extend_schema(
        tags=['Machine Learning'],
        summary='Request Interactive Annotation',
        description="""
        Send a request to the machine learning backend set up to be used for interactive preannotations to retrieve a
        predicted region based on annotator input. 
        See [set up machine learning](https://labelstud.io/guide/ml.html#Get-interactive-preannotations) for more.
        """,
        parameters=[
            OpenApiParameter(
                name='id',
                type=OpenApiTypes.INT,
                location='path',
                description='A unique integer value identifying this ML backend.',
            ),
        ],
        request=MLInteractiveAnnotatingRequest,
        responses={
            200: OpenApiResponse(description='Interactive annotation has succeeded.'),
        },
        extensions={
            'x-fern-sdk-group-name': 'ml',
            'x-fern-sdk-method-name': 'predict_interactive',
            'x-fern-audiences': ['public'],
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
    decorator=extend_schema(
        tags=['Machine Learning'],
        summary='Get model versions',
        description='Get available versions of the model.',
        responses={
            200: OpenApiResponse(
                description='List of available versions.',
                response={
                    'type': 'object',
                    'properties': {
                        'versions': {
                            'type': 'array',
                            'items': {
                                'type': 'string',
                            },
                        },
                        'message': {
                            'type': 'string',
                        },
                    },
                },
            ),
        },
        extensions={
            'x-fern-sdk-group-name': 'ml',
            'x-fern-sdk-method-name': 'list_model_versions',
            'x-fern-audiences': ['public'],
        },
    ),
)
class MLBackendVersionsAPI(generics.RetrieveAPIView):
    # TODO(jo): implement this view with a serializer and replace the handwritten schema above with it
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


@method_decorator(
    name='get',
    decorator=extend_schema(
        tags=['Machine Learning'],
        summary='Get hot-reload ML config',
        description='Return current ML hot-reload config from the ML backend config file.',
    ),
)
@method_decorator(
    name='post',
    decorator=extend_schema(
        tags=['Machine Learning'],
        summary='Update hot-reload ML config',
        description='Update ML hot-reload config file with provided values (model_path, conf, version, labels).',
        request={
            'application/json': {
                'type': 'object',
                'properties': {
                    'model_path': {'type': 'string'},
                    'conf': {'type': 'number'},
                    'version': {'type': 'string'},
                    'labels': {'type': 'object'},
                },
            }
        },
    ),
)
class MLHotReloadConfigAPI(APIView):
    permission_required = all_permissions.projects_change

    def _config_path_from_backend(self):
        # Try to locate HOT_RELOAD_CONFIG_FILE from known ml backend modules
        candidates = [
            'label_studio_ml.defv2.model',
            'label_studio_ml.model',
        ]
        for mod_name in candidates:
            try:
                from importlib import import_module

                mod = import_module(mod_name)
                config_path = getattr(mod, 'HOT_RELOAD_CONFIG_FILE', None)
                if config_path:
                    return config_path
            except Exception:
                continue

        # Fallback: try environment or django settings
        config_env = os.environ.get('HOT_RELOAD_CONFIG_FILE')
        if config_env:
            return config_env

        return getattr(settings, 'HOT_RELOAD_CONFIG_FILE', None)

    def _resolve_config_file(self, request, payload_config_file=None):
        """Resolve config file path from query param, payload or backend defaults.

        Priority: query param `config_file` > payload `config_file` > known backend constant/env/settings
        Returns absolute path or None.
        """
        # prefer explicit query param
        q = request.query_params.get('config_file') if hasattr(request, 'query_params') else None
        if q:
            return os.path.abspath(q)

        # next prefer payload value passed from POST body
        if payload_config_file:
            return os.path.abspath(payload_config_file)

        # last, fallback to backend-discovered path
        return self._config_path_from_backend()

    def get(self, request, *args, **kwargs):
        config_file = self._resolve_config_file(request)
        if not config_file:
            return Response({'error': 'HOT_RELOAD_CONFIG_FILE not found'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        try:
            with open(config_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
        except Exception as e:
            return Response({'error': f'Failed to read config: {e}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        # return both config contents and the resolved path for the frontend UI
        return Response({'config': data, 'config_file': config_file}, status=status.HTTP_200_OK)

    def post(self, request, *args, **kwargs):
        payload = request.data
        # allow passing config_file in payload to select which file to update
        payload_config_file = payload.get('config_file') if isinstance(payload, dict) else None
        allowed_keys = {'model_path', 'conf', 'version', 'labels'}
        data = {k: v for k, v in payload.items() if k in allowed_keys}

        if 'conf' in data:
            try:
                conf = float(data['conf'])
                if conf < 0.0 or conf > 1.0:
                    return Response({'error': 'conf must be between 0 and 1'}, status=status.HTTP_400_BAD_REQUEST)
                data['conf'] = conf
            except Exception:
                return Response({'error': 'conf must be a number'}, status=status.HTTP_400_BAD_REQUEST)

        if 'model_path' in data:
            model_path = data['model_path']
            if not os.path.isabs(model_path):
                model_path = os.path.abspath(model_path)
                data['model_path'] = model_path
            if not os.path.exists(model_path):
                return Response({'error': f'model_path does not exist: {model_path}'}, status=status.HTTP_400_BAD_REQUEST)

        config_file = self._resolve_config_file(request, payload_config_file=payload_config_file)
        if not config_file:
            return Response({'error': 'HOT_RELOAD_CONFIG_FILE not found'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        # Ensure config_file is absolute path
        config_file = os.path.abspath(config_file)

        # Basic permission/validations: parent dir must exist
        parent = os.path.dirname(config_file)
        if not os.path.isdir(parent):
            return Response({'error': f'Config parent directory does not exist: {parent}'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            if os.path.exists(config_file):
                with open(config_file, 'r', encoding='utf-8') as f:
                    current = json.load(f)
            else:
                current = {}
        except Exception as e:
            return Response({'error': f'Failed to read existing config: {e}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        current.update(data)
        try:
            with open(config_file, 'w', encoding='utf-8') as f:
                json.dump(current, f, indent=2)
        except Exception as e:
            return Response({'error': f'Failed to write config: {e}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return Response({'status': 'ok', 'config': current}, status=status.HTTP_200_OK)


class MLResourcesAPI(APIView):
    permission_required = all_permissions.projects_view

    def get(self, request, *args, **kwargs):
        """Return GPU info using nvidia-smi if available."""
        try:
            import subprocess

            cmd = ["nvidia-smi", "--query-gpu=index,name,memory.total,memory.used,utilization.gpu,temperature.gpu", "--format=csv,noheader,nounits"]
            proc = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, timeout=5)
            if proc.returncode != 0:
                return Response({'error': 'nvidia-smi failed', 'detail': proc.stderr.strip()}, status=status.HTTP_200_OK)

            gpus = []
            for line in proc.stdout.strip().splitlines():
                parts = [p.strip() for p in line.split(',')]
                if len(parts) >= 6:
                    idx, name, mem_total, mem_used, util, temp = parts[:6]
                    gpus.append({
                        'index': int(idx),
                        'name': name,
                        'memory_total_mb': float(mem_total),
                        'memory_used_mb': float(mem_used),
                        'utilization_percent': float(util),
                        'temperature_c': float(temp),
                    })

            return Response({'gpus': gpus}, status=status.HTTP_200_OK)
        except FileNotFoundError:
            return Response({'error': 'nvidia-smi not found on server'}, status=status.HTTP_200_OK)
        except Exception as e:
            logger.exception('Failed to query GPU status')
            return Response({'error': f'Failed to query GPU status: {e}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
