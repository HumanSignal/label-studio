"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import os
import logging

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
from core.utils.common import get_object_with_check_and_log, bool_from_request, batch
from projects.models import Project
from tasks.models import Task
from .models import DataExport
from .serializers import ExportDataSerializer

logger = logging.getLogger(__name__)


@method_decorator(name='get', decorator=swagger_auto_schema(
    tags=['Export'],
    operation_summary='Get export formats',
    operation_description='Retrieve the available export formats for the current project.',
    responses={200: openapi.Response(
                description='Export formats',
                schema=openapi.Schema(
                    title='Format list',
                    description='List of available formats',
                    type=openapi.TYPE_ARRAY,
                    items=openapi.Schema(
                        title="Export format",
                        type=openapi.TYPE_STRING)
                             )
            )}
))
class ExportFormatsListAPI(generics.RetrieveAPIView):
    permission_required = all_permissions.projects_view

    def get_queryset(self):
        return Project.objects.filter(organization=self.request.user.active_organization)

    def get(self, request, *args, **kwargs):
        project = self.get_object()
        formats = DataExport.get_export_formats(project)
        return Response(formats)


@method_decorator(name='get', decorator=swagger_auto_schema(
    manual_parameters=[
        openapi.Parameter(name='exportType',
                          type=openapi.TYPE_STRING,
                          in_=openapi.IN_QUERY,
                          description='Selected export format'),
        openapi.Parameter(name='download_all_tasks',
                          type=openapi.TYPE_STRING,
                          in_=openapi.IN_QUERY,
                          description="""
                          If true, download all tasks regardless of status. If false, download only annotated tasks.
                          """
                          )
        ],
    tags=['Export'],
    operation_summary='Export tasks and annotations',
    operation_description="""
        Export annotated tasks as a file in a specific format.
        For example, to export JSON annotations for a project to a file called `annotations.json`,
        run the following from the command line:
        ```bash
        curl -X GET {}/api/projects/{{id}}/export?exportType=JSON -H \'Authorization: Token abc123\' --output annotations.json'
        ```
        To export all tasks, including skipped tasks and others without annotations, run the following from the command line:
        ```bash
        curl -X GET {}/api/projects/{{id}}/export?exportType=JSON&download_all_tasks=true -H \'Authorization: Token abc123\' --output annotations.json'
        ```
        """.format(settings.HOSTNAME or 'https://localhost:8080',settings.HOSTNAME or 'https://localhost:8080'),
    responses={200: openapi.Response(
        description='Exported data',
        schema=openapi.Schema(
            title='Export file',
            description='Export file with results',
            type=openapi.TYPE_FILE
            )
        )}
    ))
class ExportAPI(generics.RetrieveAPIView):
    permission_required = all_permissions.projects_change

    def get_queryset(self):
        return Project.objects.filter(organization=self.request.user.active_organization)

    def get(self, request, *args, **kwargs):
        project = self.get_object()
        export_type = request.GET.get('exportType')
        only_finished = not bool_from_request(request.GET, 'download_all_tasks', False)

        logger.debug('Get tasks')
        query = Task.objects.filter(project=project).select_related('project').prefetch_related('annotations', 'predictions')
        if only_finished:
            query = query.filter(annotations__isnull=False).distinct()

        task_ids = query.values_list('id', flat=True)

        logger.debug('Serialize tasks for export')
        tasks = []
        for _task_ids in batch(task_ids, 1000):
            tasks += ExportDataSerializer(query.filter(id__in=_task_ids), many=True).data
        logger.debug('Prepare export files')

        export_stream, content_type, filename = DataExport.generate_export_file(project, tasks, export_type, request.GET)

        response = HttpResponse(File(export_stream), content_type=content_type)
        response['Content-Disposition'] = 'attachment; filename="%s"' % filename
        response['filename'] = filename
        return response


@method_decorator(name='get', decorator=swagger_auto_schema(
        tags=['Export'],
        operation_summary='Export files',
        operation_description="""
        List of files exported from the Label Studio UI using the Export button on the Data Manager page.
        """,
        ))
class ProjectExportFiles(generics.RetrieveAPIView):
    permission_required = all_permissions.projects_change
    swagger_schema = None # hide export files endpoint from swagger

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
    """ Check auth for nginx auth_request (/api/auth/export/)
    """
    swagger_schema = None
    http_method_names = ['get']
    permission_required = all_permissions.projects_change

    def get(self, request, *args, **kwargs):
        """ Get export files list
        """
        original_url = request.META['HTTP_X_ORIGINAL_URI']
        filename = original_url.replace('/export/', '')
        project_id = filename.split('-')[0]
        try:
            pk = int(project_id)
        except ValueError:
            return Response({'detail': 'Incorrect filename in export'}, status=status.HTTP_422_UNPROCESSABLE_ENTITY)

        generics.get_object_or_404(Project.objects.filter(organization=self.request.user.active_organization), pk=pk)
        return Response({'detail': 'auth ok'}, status=status.HTTP_200_OK)
