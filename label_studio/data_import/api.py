"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import time
import logging
import drf_yasg.openapi as openapi
import json
import mimetypes


from django.conf import settings
from django.db import transaction
from django.http import HttpResponse
from drf_yasg.utils import swagger_auto_schema
from django.utils.decorators import method_decorator
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from urllib.parse import unquote, urlparse
from ranged_fileresponse import RangedFileResponse

from core.permissions import all_permissions, ViewClassPermission
from core.utils.common import retry_database_locked
from core.utils.params import list_of_strings_from_request, bool_from_request
from core.utils.exceptions import LabelStudioValidationErrorSentryIgnored
from users.models import User
from projects.models import Project
from tasks.models import Task, Prediction
from .uploader import load_tasks
from .serializers import ImportApiSerializer, FileUploadSerializer, PredictionSerializer
from .models import FileUpload

from webhooks.utils import emit_webhooks_for_instance
from webhooks.models import WebhookAction

logger = logging.getLogger(__name__)


task_create_response_scheme = {
    201: openapi.Response(
        description='Tasks successfully imported',
        schema=openapi.Schema(
            title='Task creation response',
            description='Task creation response',
            type=openapi.TYPE_OBJECT,
            properties={
                'task_count': openapi.Schema(
                    title='task_count',
                    description='Number of tasks added',
                    type=openapi.TYPE_INTEGER
                ),
                'annotation_count': openapi.Schema(
                    title='annotation_count',
                    description='Number of annotations added',
                    type=openapi.TYPE_INTEGER
                ),
                'predictions_count': openapi.Schema(
                    title='predictions_count',
                    description='Number of predictions added',
                    type=openapi.TYPE_INTEGER
                ),
                'duration': openapi.Schema(
                    title='duration',
                    description='Time in seconds to create',
                    type=openapi.TYPE_NUMBER
                ),
                'file_upload_ids': openapi.Schema(
                    title='file_upload_ids',
                    description='Database IDs of uploaded files',
                    type=openapi.TYPE_ARRAY,
                    items=openapi.Schema(title="File Upload IDs", type=openapi.TYPE_INTEGER)
                ),
                'could_be_tasks_list': openapi.Schema(
                    title='could_be_tasks_list',
                    description='Whether uploaded files can contain lists of tasks, like CSV/TSV files',
                    type=openapi.TYPE_BOOLEAN
                ),
                'found_formats': openapi.Schema(
                    title='found_formats',
                    description='The list of found file formats',
                    type=openapi.TYPE_ARRAY,
                    items=openapi.Schema(title="File format", type=openapi.TYPE_STRING)
                ),
                'data_columns': openapi.Schema(
                    title='data_columns',
                    description='The list of found data columns',
                    type=openapi.TYPE_ARRAY,
                    items=openapi.Schema(title="Data column name", type=openapi.TYPE_STRING)
                )
            })
    ),
    400: openapi.Schema(
        title='Incorrect task data',
        description="String with error description",
        type=openapi.TYPE_STRING
    )
}


@method_decorator(name='post', decorator=swagger_auto_schema(
        tags=['Import'],
        responses=task_create_response_scheme,
        manual_parameters=[
            openapi.Parameter(
                name='id',
                type=openapi.TYPE_INTEGER,
                in_=openapi.IN_PATH,
                description='A unique integer value identifying this project.'),
        ],
        operation_summary='Import tasks',
        operation_description="""
            Import data as labeling tasks in bulk using this API endpoint. You can use this API endpoint to import multiple tasks. 
            One POST request is limited at 250K tasks and 200 MB.
            
            **Note:** Imported data is verified against a project *label_config* and must
            include all variables that were used in the *label_config*. For example,
            if the label configuration has a *$text* variable, then each item in a data object
            must include a "text" field.
            <br>
            
            ## POST requests
            <hr style="opacity:0.3">
            
            There are three possible ways to import tasks with this endpoint:
            
            ### 1\. **POST with data**
            Send JSON tasks as POST data. Only JSON is supported for POSTing files directly.
            Update this example to specify your authorization token and Label Studio instance host, then run the following from
            the command line.

            ```bash
            curl -H 'Content-Type: application/json' -H 'Authorization: Token abc123' \\
            -X POST '{host}/api/projects/1/import' --data '[{{"text": "Some text 1"}}, {{"text": "Some text 2"}}]'
            ```
            
            ### 2\. **POST with files**
            Send tasks as files. You can attach multiple files with different names.
            
            - **JSON**: text files in JavaScript object notation format
            - **CSV**: text files with tables in Comma Separated Values format
            - **TSV**: text files with tables in Tab Separated Value format
            - **TXT**: simple text files are similar to CSV with one column and no header, supported for projects with one source only
            
            Update this example to specify your authorization token, Label Studio instance host, and file name and path,
            then run the following from the command line:

            ```bash
            curl -H 'Authorization: Token abc123' \\
            -X POST '{host}/api/projects/1/import' -F ‘file=@path/to/my_file.csv’
            ```
            
            ### 3\. **POST with URL**
            You can also provide a URL to a file with labeling tasks. Supported file formats are the same as in option 2.
            
            ```bash
            curl -H 'Content-Type: application/json' -H 'Authorization: Token abc123' \\
            -X POST '{host}/api/projects/1/import' \\
            --data '[{{"url": "http://example.com/test1.csv"}}, {{"url": "http://example.com/test2.csv"}}]'
            ```
            
            <br>
        """.format(host=(settings.HOSTNAME or 'https://localhost:8080'))
    ))
# Import
class ImportAPI(generics.CreateAPIView):
    permission_required = all_permissions.projects_change
    parser_classes = (JSONParser, MultiPartParser, FormParser)
    serializer_class = ImportApiSerializer
    queryset = Task.objects.all()

    def get_serializer_context(self):
        project_id = self.kwargs.get('pk')
        if project_id:
            project = generics.get_object_or_404(Project.objects.for_user(self.request.user), pk=project_id)
        else:
            project = None
        return {'project': project, 'user': self.request.user}

    def post(self, *args, **kwargs):
        return super(ImportAPI, self).post(*args, **kwargs)

    def _save(self, tasks):
        serializer = self.get_serializer(data=tasks, many=True)
        serializer.is_valid(raise_exception=True)
        task_instances = serializer.save(project_id=self.kwargs['pk'])
        project = generics.get_object_or_404(Project.objects.for_user(self.request.user), pk=self.kwargs['pk'])
        emit_webhooks_for_instance(self.request.user.active_organization, project, WebhookAction.TASKS_CREATED, task_instances)
        return task_instances, serializer

    def _reformat_predictions(self, tasks, preannotated_from_fields):
        new_tasks = []
        for task in tasks:
            if 'data' in task:
                task = task['data']
            predictions = [{'result': task.pop(field)} for field in preannotated_from_fields]
            new_tasks.append({
                'data': task,
                'predictions': predictions
            })
        return new_tasks

    def create(self, request, *args, **kwargs):
        start = time.time()
        commit_to_project = bool_from_request(request.query_params, 'commit_to_project', True)
        return_task_ids = bool_from_request(request.query_params, 'return_task_ids', False)
        preannotated_from_fields = list_of_strings_from_request(request.query_params, 'preannotated_from_fields', None)

        # check project permissions
        project = generics.get_object_or_404(Project.objects.for_user(self.request.user), pk=self.kwargs['pk'])

        # upload files from request, and parse all tasks
        # TODO: Stop passing request to load_tasks function, make all validation before
        parsed_data, file_upload_ids, could_be_tasks_lists, found_formats, data_columns = load_tasks(request, project)

        if preannotated_from_fields:
            # turn flat task JSONs {"column1": value, "column2": value} into {"data": {"column1"..}, "predictions": [{..."column2"}]  # noqa
            parsed_data = self._reformat_predictions(parsed_data, preannotated_from_fields)

        if commit_to_project:
            # Immediately create project tasks and update project states and counters
            tasks, serializer = self._save(parsed_data)
            task_count = len(tasks)
            annotation_count = len(serializer.db_annotations)
            prediction_count = len(serializer.db_predictions)
            # Update counters (like total_annotations) for new tasks and after bulk update tasks stats. It should be a
            # single operation as counters affect bulk is_labeled update
            project.update_tasks_counters_and_task_states(tasks_queryset=tasks, maximum_annotations_changed=False,
                                                          overlap_cohort_percentage_changed=False,
                                                          tasks_number_changed=True)
            logger.info('Tasks bulk_update finished')

            project.summary.update_data_columns(parsed_data)
            # TODO: project.summary.update_created_annotations_and_labels
        else:
            # Do nothing - just output file upload ids for further use
            task_count = len(parsed_data)
            annotation_count = None
            prediction_count = None

        duration = time.time() - start

        response = {
            'task_count': task_count,
            'annotation_count': annotation_count,
            'prediction_count': prediction_count,
            'duration': duration,
            'file_upload_ids': file_upload_ids,
            'could_be_tasks_list': could_be_tasks_lists,
            'found_formats': found_formats,
            'data_columns': data_columns
        }
        if return_task_ids:
            response['task_ids'] = [task.id for task in tasks]

        return Response(response, status=status.HTTP_201_CREATED)


# Import
class ImportPredictionsAPI(generics.CreateAPIView):
    permission_required = all_permissions.projects_change
    parser_classes = (JSONParser, MultiPartParser, FormParser)
    serializer_class = PredictionSerializer
    queryset = Project.objects.all()
    swagger_schema = None  # TODO: create API schema

    def create(self, request, *args, **kwargs):
        # check project permissions
        project = self.get_object()
        tasks_ids = set(Task.objects.filter(project=project).values_list('id', flat=True))
        logger.debug(f'Importing {len(self.request.data)} predictions to project {project} with {len(tasks_ids)} tasks')
        predictions = []
        for item in self.request.data:
            if item.get('task') not in tasks_ids:
                raise LabelStudioValidationErrorSentryIgnored(
                    f'{item} contains invalid "task" field: corresponding task ID couldn\'t be retrieved '
                    f'from project {project} tasks')
            predictions.append(Prediction(
                task_id=item['task'],
                result=Prediction.prepare_prediction_result(item.get('result'), project),
                score=item.get('score'),
                model_version=item.get('model_version', 'undefined')
            ))
        predictions_obj = Prediction.objects.bulk_create(predictions, batch_size=settings.BATCH_SIZE)
        project.update_tasks_counters(Task.objects.filter(id__in=tasks_ids))
        return Response({'created': len(predictions_obj)}, status=status.HTTP_201_CREATED)


class TasksBulkCreateAPI(ImportAPI):
    # just for compatibility - can be safely removed
    swagger_schema = None


class ReImportAPI(ImportAPI):
    permission_required = all_permissions.projects_change

    @retry_database_locked()
    def create(self, request, *args, **kwargs):
        start = time.time()
        files_as_tasks_list = bool_from_request(request.data, 'files_as_tasks_list', True)
        file_upload_ids = self.request.data.get('file_upload_ids')

        # check project permissions
        project = generics.get_object_or_404(Project.objects.for_user(self.request.user), pk=self.kwargs['pk'])
        
        if not file_upload_ids:
            return Response({
                'task_count': 0,
                'annotation_count': 0,
                'prediction_count': 0,
                'duration': 0,
                'file_upload_ids': [],
                'found_formats': {},
                'data_columns': []
            }, status=status.HTTP_200_OK)

        tasks, found_formats, data_columns = FileUpload.load_tasks_from_uploaded_files(
            project, file_upload_ids,  files_as_tasks_list=files_as_tasks_list)

        with transaction.atomic():
            project.remove_tasks_by_file_uploads(file_upload_ids)
            tasks, serializer = self._save(tasks)
        duration = time.time() - start

        # Update counters (like total_annotations) for new tasks and after bulk update tasks stats. It should be a
        # single operation as counters affect bulk is_labeled update
        project.update_tasks_counters_and_task_states(tasks_queryset=tasks, maximum_annotations_changed=False,
                                                      overlap_cohort_percentage_changed=False,
                                                      tasks_number_changed=True)
        logger.info('Tasks bulk_update finished')

        project.summary.update_data_columns(tasks)
        # TODO: project.summary.update_created_annotations_and_labels

        return Response({
            'task_count': len(tasks),
            'annotation_count': len(serializer.db_annotations),
            'prediction_count': len(serializer.db_predictions),
            'duration': duration,
            'file_upload_ids': file_upload_ids,
            'found_formats': found_formats,
            'data_columns': data_columns
        }, status=status.HTTP_201_CREATED)

    @swagger_auto_schema(
        auto_schema=None,
        operation_summary='Re-import tasks',
        operation_description="""
        Re-import tasks using the specified file upload IDs for a specific project.
        """
    )
    def post(self, *args, **kwargs):
        return super(ReImportAPI, self).post(*args, **kwargs)


@method_decorator(name='get', decorator=swagger_auto_schema(
        tags=['Import'],
        operation_summary='Get files list',
        operation_description="""
        Retrieve the list of uploaded files used to create labeling tasks for a specific project.
        """
        ))
@method_decorator(name='delete', decorator=swagger_auto_schema(
        tags=['Import'],
        operation_summary='Delete files',
        operation_description="""
        Delete uploaded files for a specific project.
        """
        ))
class FileUploadListAPI(generics.mixins.ListModelMixin,
                        generics.mixins.DestroyModelMixin,
                        generics.GenericAPIView):
    parser_classes = (JSONParser, MultiPartParser, FormParser)
    serializer_class = FileUploadSerializer
    permission_required = ViewClassPermission(
        GET=all_permissions.projects_view,
        DELETE=all_permissions.projects_change,
    )
    queryset = FileUpload.objects.all()

    def get_queryset(self):
        project = generics.get_object_or_404(Project.objects.for_user(self.request.user), pk=self.kwargs.get('pk', 0))
        if project.is_draft:
            # If project is in draft state, we return all uploaded files, ignoring queried ids
            logger.debug(f'Return all uploaded files for draft project {project}')
            return FileUpload.objects.filter(project_id=project.id, user=self.request.user)

        # If requested in regular import, only queried IDs are returned to avoid showing previously imported
        ids = json.loads(self.request.query_params.get('ids', '[]'))
        logger.debug(f'File Upload IDs found: {ids}')
        return FileUpload.objects.filter(project_id=project.id, id__in=ids, user=self.request.user)

    def get(self, request, *args, **kwargs):
        return self.list(request, *args, **kwargs)

    def delete(self, request, *args, **kwargs):
        project = generics.get_object_or_404(Project.objects.for_user(self.request.user),  pk=self.kwargs['pk'])
        ids = self.request.data.get('file_upload_ids')
        if ids is None:
            deleted, _ = FileUpload.objects.filter(project=project).delete()
        elif isinstance(ids, list):
            deleted, _ = FileUpload.objects.filter(project=project, id__in=ids).delete()
        else:
            raise ValueError('"file_upload_ids" parameter must be a list of integers')
        return Response({'deleted': deleted}, status=status.HTTP_200_OK)


@method_decorator(name='get', decorator=swagger_auto_schema(
        tags=['Import'],
        operation_summary='Get file upload',
        operation_description='Retrieve details about a specific uploaded file.'
    ))
@method_decorator(name='patch', decorator=swagger_auto_schema(
        tags=['Import'],
        operation_summary='Update file upload',
        operation_description='Update a specific uploaded file.',
        request_body=FileUploadSerializer
    ))
@method_decorator(name='delete', decorator=swagger_auto_schema(
        tags=['Import'],
        operation_summary='Delete file upload',
        operation_description='Delete a specific uploaded file.'))
class FileUploadAPI(generics.RetrieveUpdateDestroyAPIView):
    parser_classes = (JSONParser, MultiPartParser, FormParser)
    permission_classes = (IsAuthenticated, )
    serializer_class = FileUploadSerializer
    queryset = FileUpload.objects.all()

    def get(self, *args, **kwargs):
        return super(FileUploadAPI, self).get(*args, **kwargs)

    def patch(self, *args, **kwargs):
        return super(FileUploadAPI, self).patch(*args, **kwargs)

    def delete(self, *args, **kwargs):
        return super(FileUploadAPI, self).delete(*args, **kwargs)

    @swagger_auto_schema(auto_schema=None)
    def put(self, *args, **kwargs):
        return super(FileUploadAPI, self).put(*args, **kwargs)


class UploadedFileResponse(generics.RetrieveAPIView):
    permission_classes = (IsAuthenticated, )

    @swagger_auto_schema(auto_schema=None)
    def get(self, *args, **kwargs):
        request = self.request
        filename = kwargs['filename']
        # XXX needed, on windows os.path.join generates '\' which breaks FileUpload
        file = settings.UPLOAD_DIR + ('/' if not settings.UPLOAD_DIR.endswith('/') else '') + filename
        logger.debug(f'Fetch uploaded file by user {request.user} => {file}')
        file_upload = FileUpload.objects.filter(file=file).last()

        if not file_upload.has_permission(request.user):
            return Response(status=status.HTTP_403_FORBIDDEN)

        file = file_upload.file
        if file.storage.exists(file.name):
            content_type, encoding = mimetypes.guess_type(str(file.name))
            content_type = content_type or 'application/octet-stream'
            return RangedFileResponse(request, file.open(mode='rb'), content_type=content_type)
        else:
            return Response(status=status.HTTP_404_NOT_FOUND)


class DownloadStorageData(APIView):
    """ Check auth for nginx auth_request
    """
    swagger_schema = None
    http_method_names = ['get']
    permission_classes = (IsAuthenticated, )

    def get(self, request, *args, **kwargs):
        """ Get export files list
        """
        request = self.request
        filepath = unquote(request.GET['filepath'])

        url = None
        if filepath.startswith(settings.UPLOAD_DIR):
            logger.debug(f'Fetch uploaded file by user {request.user} => {filepath}')
            file_upload = FileUpload.objects.filter(file=filepath).last()

            if file_upload is not None and file_upload.has_permission(request.user):
                url = file_upload.file.storage.url(file_upload.file.name, storage_url=True)
        elif filepath.startswith(settings.AVATAR_PATH):
            user = User.objects.filter(avatar=filepath).first()
            if user is not None and request.user.active_organization.has_user(user):
                url = user.avatar.storage.url(user.avatar.name, storage_url=True)

        if url is None:
            return Response(status=status.HTTP_403_FORBIDDEN)

        protocol = urlparse(url).scheme

        # Let NGINX handle it
        response = HttpResponse()
        # The below header tells NGINX to catch it and serve, see docker-config/nginx-app.conf
        redirect = '/file_download/' + protocol + '/' + url.replace(protocol + '://', '')

        response['X-Accel-Redirect'] = redirect
        response['Content-Disposition'] = 'attachment; filename="{}"'.format(filepath)
        return response
