"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import time
import logging
import drf_yasg.openapi as openapi
import json

from django.conf import settings
from django.db import transaction
from drf_yasg.utils import swagger_auto_schema
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from ranged_fileresponse import RangedFileResponse

from core.permissions import all_permissions, ViewClassPermission
from core.utils.common import bool_from_request, retry_database_locked
from projects.models import Project
from tasks.models import Task
from .uploader import load_tasks
from .serializers import ImportApiSerializer, FileUploadSerializer
from .models import FileUpload

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


# Import
class ImportAPI(generics.CreateAPIView):
    """post:
    Import tasks

    Importing data as labeling tasks in bulk using this API endpoint works the same as using the Import button on the 
    Data Manager page. You can use this API endpoint for importing multiple tasks. One POST request is limited at 250K tasks and 200 MB.

    **Note:** Imported data is verified against a project *label_config* and must
    include all variables that were used in the *label_config*. For example,
    if the label configuration has a *$text* variable, then each item in a data object
    must include a "text" field.


    <br>

    ## POST requests

    <hr style="opacity:0.3">

    There are three possible ways to import tasks with this endpoint:

    1\. **POST with data**: Send JSON tasks as POST data. Only JSON is supported for POSTing files directly.

    ```bash
    curl -H 'Content-Type: application/json' -H 'Authorization: Token abc123' \\
    -X POST 'http://localhost/api/projects/1/import' --data '[{"text": "Some text 1"}, {"text": "Some text 2"}]'
    ```

     2\. **POST with files**: Send tasks as files. You can attach multiple files with different names. 


    - **JSON**: text files in javascript object notation format
    - **CSV**: text files with tables in Comma Separated Values format
    - **TSV**: text files with tables in Tab Separated Value format
    - **TXT**: simple text files are similar to CSV with one column and no header, supported for projects with one source only

    ```bash
    curl -H 'Content-Type: application/json' -H 'Authorization: Token abc123' \\
    -X POST 'http://localhost/api/projects/1/import' -F ‘file=@path/to/my_file.csv’
    ```

    3\. **POST with URL**: You can also provide a URL to a file with labeling tasks. Supported file formats are the same as in option 2.

    ```bash
    curl -H 'Content-Type: application/json' -H 'Authorization: Token abc123' \\
    -X POST 'http://localhost/api/projects/1/import' \\
    --data '[{"url": "http://example.com/test1.csv"}, {"url": "http://example.com/test2.csv"}]'
    ```

    <br>

    """

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

    @swagger_auto_schema(tags=['Import'], responses=task_create_response_scheme)
    def post(self, *args, **kwargs):
        return super(ImportAPI, self).post(*args, **kwargs)

    def _save(self, tasks):
        serializer = self.get_serializer(data=tasks, many=True)
        serializer.is_valid(raise_exception=True)
        return serializer.save(project_id=self.kwargs['pk']), serializer

    def create(self, request, *args, **kwargs):
        start = time.time()
        commit_to_project = bool_from_request(request.query_params, 'commit_to_project', True)

        # check project permissions
        project = generics.get_object_or_404(Project.objects.for_user(self.request.user), pk=self.kwargs['pk'])

        # upload files from request, and parse all tasks
        parsed_data, file_upload_ids, could_be_tasks_lists, found_formats, data_columns = load_tasks(request, project)

        if commit_to_project:
            # Immediately create project tasks and update project states and counters
            tasks, serializer = self._save(parsed_data)
            task_count = len(tasks)
            annotation_count = len(serializer.db_annotations)
            prediction_count = len(serializer.db_predictions)
            # Update tasks states if there are related settings in project
            # after bulk create we can bulk update tasks stats with
            # flag_update_stats=True but they are already updated with signal in same transaction
            # so just update tasks_number_changed
            project.update_tasks_states(
                maximum_annotations_changed=False,
                overlap_cohort_percentage_changed=False,
                tasks_number_changed=True
            )
            logger.info('Tasks bulk_update finished')

            project.summary.update_data_columns(parsed_data)
            # TODO: project.summary.update_created_annotations_and_labels
        else:
            # Do nothing - just output file upload ids for further use
            task_count = len(parsed_data)
            annotation_count = None
            prediction_count = None

        duration = time.time() - start

        return Response({
            'task_count': task_count,
            'annotation_count': annotation_count,
            'prediction_count': prediction_count,
            'duration': duration,
            'file_upload_ids': file_upload_ids,
            'could_be_tasks_list': could_be_tasks_lists,
            'found_formats': found_formats,
            'data_columns': data_columns
        }, status=status.HTTP_201_CREATED)


class TasksBulkCreateAPI(ImportAPI):
    # just for compatibility - can be safely removed
    swagger_schema = None


class ReImportAPI(ImportAPI):
    """post:
    Re-import tasks

    Re-import tasks using the specified file upload IDs for a specific project.
    """
    permission_required = all_permissions.projects_change

    @retry_database_locked()
    def create(self, request, *args, **kwargs):
        start = time.time()
        files_as_tasks_list = bool_from_request(request.data, 'files_as_tasks_list', True)

        # check project permissions
        project = generics.get_object_or_404(Project.objects.for_user(self.request.user), pk=self.kwargs['pk'])
        file_upload_ids = self.request.data.get('file_upload_ids')
        tasks, found_formats, data_columns = FileUpload.load_tasks_from_uploaded_files(
            project, file_upload_ids,  files_as_tasks_list=files_as_tasks_list)

        with transaction.atomic():
            project.remove_tasks_by_file_uploads(file_upload_ids)
            tasks, serializer = self._save(tasks)
        duration = time.time() - start

        # Update task states if there are related settings in project
        # after bulk create we can bulk update task stats with
        # flag_update_stats=True but they are already updated with signal in same transaction
        # so just update tasks_number_changed
        project.update_tasks_states(
            maximum_annotations_changed=False,
            overlap_cohort_percentage_changed=False,
            tasks_number_changed=True
        )
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

    @swagger_auto_schema(auto_schema=None)
    def post(self, *args, **kwargs):
        return super(ReImportAPI, self).post(*args, **kwargs)


class FileUploadListAPI(generics.mixins.ListModelMixin,
                        generics.mixins.DestroyModelMixin,
                        generics.GenericAPIView):
    """
    get:
    Get files list

    Retrieve the list of uploaded files used to create labeling tasks for a specific project.

    delete:
    Delete files

    Delete uploaded files for a specific project.
    """

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

    @swagger_auto_schema(tags=['Import'])
    def get(self, request, *args, **kwargs):
        return self.list(request, *args, **kwargs)

    @swagger_auto_schema(tags=['Import'])
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


class FileUploadAPI(generics.RetrieveUpdateDestroyAPIView):
    parser_classes = (JSONParser, MultiPartParser, FormParser)
    permission_classes = (IsAuthenticated, )
    serializer_class = FileUploadSerializer
    queryset = FileUpload.objects.all()

    @swagger_auto_schema(tags=['Import'], operation_summary='Get file upload', operation_description='Retrieve details about a specific uploaded file.')
    def get(self, *args, **kwargs):
        return super(FileUploadAPI, self).get(*args, **kwargs)

    @swagger_auto_schema(tags=['Import'], operation_summary='Update file upload', operation_description='Update a specific uploaded file.', request_body=FileUploadSerializer)
    def patch(self, *args, **kwargs):
        return super(FileUploadAPI, self).patch(*args, **kwargs)

    @swagger_auto_schema(tags=['Import'], operation_summary='Delete file upload', operation_description='Delete a specific uploaded file.')
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
        file = settings.UPLOAD_DIR + ('/' if not settings.UPLOAD_DIR.endswith('/') else '') + filename
        logger.debug(f'Fetch uploaded file by user {request.user} => {file}')
        file_upload = FileUpload.objects.get(file=file)

        return RangedFileResponse(request, open(file_upload.file.path, mode='rb'))
