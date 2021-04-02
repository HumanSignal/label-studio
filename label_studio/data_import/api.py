"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import time
import logging
import drf_yasg.openapi as openapi
import json

from django.db import transaction
from drf_yasg.utils import swagger_auto_schema
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser

from core.permissions import IsBusiness, get_object_with_permissions
from core.utils.common import bool_from_request, conditional_atomic, retry_database_locked
from projects.models import Project
from tasks.models import Task
from .uploader import load_tasks
from .serializers import ImportApiSerializer, FileUploadSerializer
from .models import FileUpload

logger = logging.getLogger(__name__)


task_create_response_scheme = {
    201: openapi.Schema(
        title='Task creation response',
        description='Task creation response',
        type=openapi.TYPE_OBJECT,
        properies={
            'task_count': openapi.Schema(
                title='task count',
                description='Number of tasks added',
                type=openapi.TYPE_INTEGER
            ),
            'annotation_count': openapi.Schema(
                title='annotation count',
                description='Number of annotations added',
                type=openapi.TYPE_INTEGER
            ),
            'predictions_count': openapi.Schema(
                title='predictions count',
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
            )
        },
        example={
            'task_count': 50,
            'annotation_count': 200,
            'predictions_count': 100,
            'duration': 3.5,
            'file_upload_ids': [1, 2, 3]
        }
    ),
    400: openapi.Schema(title='Incorrect task data', type=openapi.TYPE_ARRAY,
                        items=openapi.Schema(title="String with error description", type=openapi.TYPE_STRING))
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
    -X POST 'https://app.heartex.ai/api/projects/1/tasks/bulk/' --data '[{"text": "Some text 1"}, {"text": "Some text 2"}]'
    ```

     2\. **POST with files**: Send tasks as files. You can attach multiple files with different names. 


    - **JSON**: text files in javascript object notation format
    - **CSV**: text files with tables in Comma Separated Values format
    - **TSV**: text files with tables in Tab Separated Value format
    - **TXT**: simple text files are similar to CSV with one column and no header, supported for projects with one source only
    - **ZIP / RAR** with one or multiple files inside from the list below, e.g.: "zip archive.zip *.json"

    ```bash
    curl -H 'Content-Type: application/json' -H 'Authorization: Token abc123' \\
    -X POST 'https://app.heartex.ai/api/projects/1/tasks/bulk/' --data @my_file.csv
    ```

    3\. **POST with URL**: You can also provide a URL to a file with labeling tasks. Supported file formats are the same as in option 2.

    ```bash
    curl -H 'Content-Type: application/json' -H 'Authorization: Token abc123' \\
    -X POST 'https://app.heartex.ai/api/projects/1/tasks/bulk/' \\
    --data '[{"url": "http://example.com/test1.csv"}, {"url": "http://example.com/test2.csv"}]'
    ```


    <br>

    ## Import annotations: import already-labeled tasks and ground truths

    <hr style="opacity:0.3">

    1\. You can import already-labeled tasks and mark them as ground truths:
    **combine task data with annotations**.

    - The annotation is a JSON dict
    - You can find descriptions of all annotation fields in the request body schema below,
    - We recommend specifying only the "result" field.
    - Empty annotation example:
          { "ground_truth": true, "result": [] }
    - Empty task and annotation example:
          {
            "data": {"image": "https://app.heartex.ai/static/samples/kittens2.jpg"},
            "annotations": [{"ground_truth": true, "result": [] }]
          }
    - More complex examples are below.

    2\. "result"

    - A JSON array that depends on the labeling configuration for a project. Each array item contains a labeled region
    (single bounding box, a segment of audio, part of the text).
    - To quickly get the result format, open your Project -> Data Manager -> Click the pencil icon for a specific
    task and create a new annotation. Click the "Result" button in the top right corner to get the result in JSON format.

    3\. "ground_truth" (optional)

    - It's **true by default**.
    - To import existing labels as regular annotations, then set "ground_truth": false.


    <br>

    ## Import predictions: pre-labeling, statistics and machine learning

    <hr style="opacity:0.3">

    1\. Predictions are very similar to annotations in structure, so **learn about annotations first**.
    You can use predictions in the labeling workflow as pre-labels, for Active Learning to evaluate Machine Learning 
    statistics and more.

    - You can find descriptions of all of the prediction fields in the request body scheme below.
    - We recommend specifying only the "result", "model_version" and "score" fields.
    - Empty task and prediction example:
          {
            "data": {"image": "https://app.heartex.ai/static/samples/kittens2.jpg"},
            "prediction": [{"model_version": "version 1", "score": 1.0, "result": [] }]
          }

    2\. "result"

    - The same as "result" in annotations.

    3\. "model_version"

    - Must be a string with text.

    <br>

    ## Examples

    <hr style="opacity:0.3">

    - my_file.json (with 2 tasks)
    ```json
    [{ "text": "Some text 1", "image": "https://app.heartex.ai/static/samples/kittens1.jpg" },
     { "text": "Some text 2", "image": "https://app.heartex.ai/static/samples/kittens2.jpg" }]
    ```

    - my_file.csv (with 2 tasks)
    ```csv
    text,image
    Some text 1,https://app.heartex.ai/static/samples/kittens1.jpg
    Some text 2,https://app.heartex.ai/static/samples/kittens2.jpg
    ```


    - task_with_annotation.json (image classification project)
    ```
    [{
        "data": {
            "image": "https://app.heartex.ai/static/samples/kittens.jpg"
        },
        "annotations": [{
            "ground_truth": true,

            "result": [{
                "id": "1",
                "from_name": "my_image_class",
                "to_name": "my_image",
                "type": "choices",
                "value": {
                    "choices": [
                        "Dog"
                    ]
                }
            }]
        }]
    }]

    - task_with_prediction.json (image classification project)
    ```
    [{
        "data": {
            "image": "https://app.heartex.ai/static/samples/kittens.jpg"
        },
        "predictions": [{
            "model_version": "version_1",
            "score": 1.0,

            "result": [{
                "id": "1",
                "from_name": "my_image_class",
                "to_name": "my_image",
                "type": "choices",
                "value": {
                    "choices": [
                        "Cat"
                    ]
                }
            }]
        }]
    }]
    ```

    <br/>

    """

    parser_classes = (JSONParser, MultiPartParser, FormParser)
    permission_classes = (IsBusiness, )
    serializer_class = ImportApiSerializer
    queryset = Task.objects.all()

    def get_serializer_context(self):
        project_id = self.kwargs.get('pk')
        if project_id:
            project = get_object_with_permissions(self.request, Project, project_id, 'projects.change_project')
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
        project = get_object_with_permissions(self.request, Project, self.kwargs['pk'], 'projects.change_project')

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
    @retry_database_locked()
    def create(self, request, *args, **kwargs):
        start = time.time()
        files_as_tasks_list = bool_from_request(request.data, 'files_as_tasks_list', True)

        # check project permissions
        project = get_object_with_permissions(self.request, Project, self.kwargs['pk'], 'projects.change_project')
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

    @swagger_auto_schema(tags=['Import'], responses=task_create_response_scheme)
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
    permission_classes = (IsBusiness, )
    serializer_class = FileUploadSerializer
    queryset = FileUpload.objects.all()

    def get_queryset(self):
        project = get_object_with_permissions(self.request, Project, self.kwargs.get('pk', 0), 'projects.view_project')
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
        project = get_object_with_permissions(self.request, Project, self.kwargs['pk'], 'projects.view_project')
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
    permission_classes = (IsBusiness, )
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
