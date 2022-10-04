"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import os
import logging
import pathlib

from django.conf import settings
from django.http import HttpResponse
from django.core.files import File
from drf_yasg import openapi as openapi
from drf_yasg.utils import swagger_auto_schema
from django.utils.decorators import method_decorator
from rest_framework import status, generics
from rest_framework.response import Response
from rest_framework.views import APIView

from core.permissions import all_permissions
from core.utils.common import get_object_with_check_and_log, batch
from projects.models import Project
from tasks.models import Task
from .models import DataExport, Export

from .serializers import ExportDataSerializer, ExportSerializer, ExportCreateSerializer, ExportParamSerializer
from ranged_fileresponse import RangedFileResponse

logger = logging.getLogger(__name__)


@method_decorator(
    name='get',
    decorator=swagger_auto_schema(
        tags=['Export'],
        operation_summary='Get export formats',
        operation_description='Retrieve the available export formats for the current project by ID.',
        manual_parameters=[
            openapi.Parameter(
                name='id',
                type=openapi.TYPE_INTEGER,
                in_=openapi.IN_PATH,
                description='A unique integer value identifying this project.'),
        ],
        responses={
            200: openapi.Response(
                description='Export formats',
                schema=openapi.Schema(
                    title='Format list',
                    description='List of available formats',
                    type=openapi.TYPE_ARRAY,
                    items=openapi.Schema(title="Export format", type=openapi.TYPE_STRING),
                ),
            )
        },
    ),
)
class ExportFormatsListAPI(generics.RetrieveAPIView):
    permission_required = all_permissions.projects_view

    def get_queryset(self):
        return Project.objects.filter(organization=self.request.user.active_organization)

    def get(self, request, *args, **kwargs):
        project = self.get_object()
        formats = DataExport.get_export_formats(project)
        return Response(formats)


@method_decorator(
    name='get',
    decorator=swagger_auto_schema(
        manual_parameters=[
            openapi.Parameter(
                name='export_type',
                type=openapi.TYPE_STRING,
                in_=openapi.IN_QUERY,
                description='Selected export format (JSON by default)',
            ),
            openapi.Parameter(
                name='download_all_tasks',
                type=openapi.TYPE_STRING,
                in_=openapi.IN_QUERY,
                description="""
                          If true, download all tasks regardless of status. If false, download only annotated tasks.
                          """,
            ),
            openapi.Parameter(
                name='download_resources',
                type=openapi.TYPE_BOOLEAN,
                in_=openapi.IN_QUERY,
                description="""
                          If true, download all resource files such as images, audio, and others relevant to the tasks. 
                          """,
            ),
            openapi.Parameter(
                name='ids',
                type=openapi.TYPE_ARRAY,
                items=openapi.Schema(title='Task ID', description='Individual task ID', type=openapi.TYPE_INTEGER),
                in_=openapi.IN_QUERY,
                description="""
                          Specify a list of task IDs to retrieve only the details for those tasks.
                          """,
            ),
            openapi.Parameter(
                name='id',
                type=openapi.TYPE_INTEGER,
                in_=openapi.IN_PATH,
                description='A unique integer value identifying this project.'
            ),
        ],
        tags=['Export'],
        operation_summary='Easy export of tasks and annotations',
        operation_description="""
        <i>Note: if you have a large project it's recommended to use 
        export snapshots, this easy export endpoint might have timeouts.</i><br/><br>
        Export annotated tasks as a file in a specific format. 
        For example, to export JSON annotations for a project to a file called `annotations.json`,
        run the following from the command line:
        ```bash
        curl -X GET {}/api/projects/{{id}}/export?exportType=JSON -H \'Authorization: Token abc123\' --output 'annotations.json'
        ```
        To export all tasks, including skipped tasks and others without annotations, run the following from the command line:
        ```bash
        curl -X GET {}/api/projects/{{id}}/export?exportType=JSON&download_all_tasks=true -H \'Authorization: Token abc123\' --output 'annotations.json'
        ```
        To export specific tasks with IDs of 123 and 345, run the following from the command line:
        ```bash
        curl -X GET {}/api/projects/{{id}}/export?ids[]=123\&ids[]=345 -H \'Authorization: Token abc123\' --output 'annotations.json'
        ```
        """.format(
            settings.HOSTNAME or 'https://localhost:8080',
            settings.HOSTNAME or 'https://localhost:8080',
            settings.HOSTNAME or 'https://localhost:8080',
        ),
        responses={
            200: openapi.Response(
                description='Exported data',
                schema=openapi.Schema(
                    title='Export file', description='Export file with results', type=openapi.TYPE_FILE
                ),
            )
        },
    ),
)
class ExportAPI(generics.RetrieveAPIView):
    permission_required = all_permissions.projects_change

    def get_queryset(self):
        return Project.objects.filter(organization=self.request.user.active_organization)

    def get_task_queryset(self, queryset):
        return queryset.select_related('project').prefetch_related('annotations', 'predictions')

    def get(self, request, *args, **kwargs):
        project = self.get_object()
        query_serializer = ExportParamSerializer(data=request.GET)
        query_serializer.is_valid(raise_exception=True)

        export_type = query_serializer.validated_data.get('exportType') or query_serializer.validated_data['export_type']
        only_finished = not query_serializer.validated_data['download_all_tasks']
        download_resources = query_serializer.validated_data['download_resources']
        interpolate_key_frames = query_serializer.validated_data['interpolate_key_frames']

        tasks_ids = request.GET.getlist('ids[]')

        logger.debug('Get tasks')
        query = Task.objects.filter(project=project)
        if tasks_ids and len(tasks_ids) > 0:
            logger.debug(f'Select only subset of {len(tasks_ids)} tasks')
            query = query.filter(id__in=tasks_ids)
        if only_finished:
            query = query.filter(annotations__isnull=False).distinct()

        task_ids = query.values_list('id', flat=True)

        logger.debug('Serialize tasks for export')
        tasks = []
        for _task_ids in batch(task_ids, 1000):
            tasks += ExportDataSerializer(
                self.get_task_queryset(query.filter(id__in=_task_ids)), many=True, expand=['drafts'],
                context={'interpolate_key_frames': interpolate_key_frames}
            ).data
        logger.debug('Prepare export files')

        export_stream, content_type, filename = DataExport.generate_export_file(
            project, tasks, export_type, download_resources, request.GET
        )

        response = HttpResponse(File(export_stream), content_type=content_type)
        response['Content-Disposition'] = 'attachment; filename="%s"' % filename
        response['filename'] = filename
        return response


@method_decorator(
    name='get',
    decorator=swagger_auto_schema(
        tags=['Export'],
        operation_summary='List exported files',
        operation_description="""
        Retrieve a list of files exported from the Label Studio UI using the Export button on the Data Manager page.
        To retrieve the files themselves, see [Download export file](/api#operation/api_projects_exports_download_read).
        """,
    ),
)
class ProjectExportFiles(generics.RetrieveAPIView):
    permission_required = all_permissions.projects_change
    swagger_schema = None  # hide export files endpoint from swagger

    def get_queryset(self):
        return Project.objects.filter(organization=self.request.user.active_organization)

    def get(self, request, *args, **kwargs):
        project = self.get_object()
        project = get_object_with_check_and_log(request, Project, pk=self.kwargs['pk'])
        self.check_object_permissions(self.request, project)

        paths = []
        for name in os.listdir(settings.EXPORT_DIR):
            if name.endswith('.json') and not name.endswith('-info.json'):
                project_id = name.split('-')[0]
                if str(kwargs['pk']) == project_id:
                    paths.append(settings.EXPORT_URL_ROOT + name)

        items = [{'name': p.split('/')[2].split('.')[0], 'url': p} for p in sorted(paths)[::-1]]
        return Response({'export_files': items}, status=status.HTTP_200_OK)


class ProjectExportFilesAuthCheck(APIView):
    """Check auth for nginx auth_request (/api/auth/export/)"""

    swagger_schema = None
    http_method_names = ['get']
    permission_required = all_permissions.projects_change

    def get(self, request, *args, **kwargs):
        """Get export files list"""
        original_url = request.META['HTTP_X_ORIGINAL_URI']
        filename = original_url.replace('/export/', '')
        project_id = filename.split('-')[0]
        try:
            pk = int(project_id)
        except ValueError:
            return Response({'detail': 'Incorrect filename in export'}, status=status.HTTP_422_UNPROCESSABLE_ENTITY)

        generics.get_object_or_404(Project.objects.filter(organization=self.request.user.active_organization), pk=pk)
        return Response({'detail': 'auth ok'}, status=status.HTTP_200_OK)


@method_decorator(
    name='get',
    decorator=swagger_auto_schema(
        tags=['Export'],
        operation_summary='List all export snapshots',
        operation_description="""
        Returns a list of exported files for a specific project by ID.
        """,
        manual_parameters=[
            openapi.Parameter(
                name='id',
                type=openapi.TYPE_INTEGER,
                in_=openapi.IN_PATH,
                description='A unique integer value identifying this project.')
        ]
    ),
)
@method_decorator(
    name='post',
    decorator=swagger_auto_schema(
        tags=['Export'],
        operation_summary='Create new export snapshot',
        operation_description="""
        Create a new export request to start a background task and generate an export file for a specific project by ID.
        """,
        manual_parameters=[
            openapi.Parameter(
                name='id',
                type=openapi.TYPE_INTEGER,
                in_=openapi.IN_PATH,
                description='A unique integer value identifying this project.')
        ]
    ),
)
class ExportListAPI(generics.ListCreateAPIView):
    queryset = Export.objects.all().order_by('-created_at')
    project_model = Project
    serializer_class = ExportSerializer
    permission_required = all_permissions.projects_change

    def get_serializer_class(self):
        if self.request.method == 'GET':
            return ExportSerializer
        if self.request.method == 'POST':
            return ExportCreateSerializer
        return super().get_serializer_class()

    def _get_project(self):
        project_pk = self.kwargs.get('pk')
        project = generics.get_object_or_404(
            self.project_model.objects.for_user(self.request.user),
            pk=project_pk,
        )
        return project

    def perform_create(self, serializer):
        task_filter_options = serializer.validated_data.pop('task_filter_options')
        annotation_filter_options = serializer.validated_data.pop('annotation_filter_options')
        serialization_options = serializer.validated_data.pop('serialization_options')

        project = self._get_project()
        serializer.save(project=project, created_by=self.request.user)
        instance = serializer.instance

        instance.run_file_exporting(
            task_filter_options=task_filter_options,
            annotation_filter_options=annotation_filter_options,
            serialization_options=serialization_options,
        )

    def get_queryset(self):
        project = self._get_project()
        return super().get_queryset().filter(project=project)


@method_decorator(
    name='get',
    decorator=swagger_auto_schema(
        tags=['Export'],
        operation_summary='Get export snapshot by ID',
        operation_description="""
        Retrieve information about an export file by export ID for a specific project.
        """,
        manual_parameters=[
            openapi.Parameter(
                name='id',
                type=openapi.TYPE_INTEGER,
                in_=openapi.IN_PATH,
                description='A unique integer value identifying this project.'),
            openapi.Parameter(
                name='export_pk',
                type=openapi.TYPE_STRING,
                in_=openapi.IN_PATH,
                description='Primary key identifying the export file.'),
        ]
    ),
)
@method_decorator(
    name='delete',
    decorator=swagger_auto_schema(
        tags=['Export'],
        operation_summary='Delete export snapshot',
        operation_description="""
        Delete an export file by specified export ID.
        """,
        manual_parameters=[
            openapi.Parameter(
                name='id',
                type=openapi.TYPE_INTEGER,
                in_=openapi.IN_PATH,
                description='A unique integer value identifying this project.'),
            openapi.Parameter(
                name='export_pk',
                type=openapi.TYPE_STRING,
                in_=openapi.IN_PATH,
                description='Primary key identifying the export file.'),
        ]
    ),
)
class ExportDetailAPI(generics.RetrieveDestroyAPIView):
    queryset = Export.objects.all()
    project_model = Project
    serializer_class = ExportSerializer
    lookup_url_kwarg = 'export_pk'
    permission_required = all_permissions.projects_change

    def _get_project(self):
        project_pk = self.kwargs.get('pk')
        project = generics.get_object_or_404(
            self.project_model.objects.for_user(self.request.user),
            pk=project_pk,
        )
        return project

    def get_queryset(self):
        project = self._get_project()
        return super().get_queryset().filter(project=project)


@method_decorator(
    name='get',
    decorator=swagger_auto_schema(
        tags=['Export'],
        operation_summary='Download export snapshot as file in specified format',
        operation_description="""
        Download an export file in the specified format for a specific project. Specify the project ID with the `id` 
        parameter in the path and the ID of the export file you want to download using the `export_pk` parameter 
        in the path. 
        
        Get the `export_pk` from the response of the request to [Create new export](/api#operation/api_projects_exports_create)
        or after [listing export files](/api#operation/api_projects_exports_list).
        """,
        manual_parameters=[
            openapi.Parameter(
                name='exportType',
                type=openapi.TYPE_STRING,
                in_=openapi.IN_QUERY,
                description='Selected export format',
            ),
            openapi.Parameter(
                name='id',
                type=openapi.TYPE_INTEGER,
                in_=openapi.IN_PATH,
                description='A unique integer value identifying this project.'),
            openapi.Parameter(
                name='export_pk',
                type=openapi.TYPE_STRING,
                in_=openapi.IN_PATH,
                description='Primary key identifying the export file.'),
        ],
    ),
)
class ExportDownloadAPI(generics.RetrieveAPIView):
    queryset = Export.objects.all()
    project_model = Project
    serializer_class = None
    lookup_url_kwarg = 'export_pk'
    permission_required = all_permissions.projects_change

    def _get_project(self):
        project_pk = self.kwargs.get('pk')
        project = generics.get_object_or_404(
            self.project_model.objects.for_user(self.request.user),
            pk=project_pk,
        )
        return project

    def get_queryset(self):
        project = self._get_project()
        return super().get_queryset().filter(project=project)

    def get(self, request, *args, **kwargs):
        instance = self.get_object()
        export_type = request.GET.get('exportType')

        if instance.status != Export.Status.COMPLETED:
            return HttpResponse('Export is not completed', status=404)

        if export_type is None:
            file_ = instance.file
        else:
            file_ = instance.convert_file(export_type)
        
        if file_ is None:
            return HttpResponse("Can't get file", status=404)

        ext = file_.name.split('.')[-1]

        response = RangedFileResponse(request, file_, content_type=f'application/{ext}')
        response['Content-Disposition'] = f'attachment; filename="{file_.name}"'
        response['filename'] = file_.name
        return response
