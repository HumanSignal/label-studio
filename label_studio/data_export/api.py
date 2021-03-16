"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import os
import logging

from django.conf import settings
from django.http import HttpResponse
from django.core.files import File
from drf_yasg import openapi as openapi
from drf_yasg.utils import swagger_auto_schema
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from core.permissions import IsBusiness, get_object_with_permissions
from core.utils.common import get_object_with_check_and_log, bool_from_request
from projects.api import ProjectAPIBasePermission
from projects.models import Project
from tasks.models import Task
from .models import DataExport
from .serializers import ExportDataSerializer

logger = logging.getLogger(__name__)


class ExportFormatsListAPI(APIView):
    permission_classes = (IsBusiness, ProjectAPIBasePermission)

    @swagger_auto_schema(tags=['Export'], 
                         operation_summary='Get export formats', 
                         operation_description='Retrieve the available export formats for the current project.',
                         responses={200: openapi.Response(
                             description='Export formats',
                             schema=openapi.Schema(
                                 title='Format list',
                                 description='List of available formats',
                                 type=openapi.TYPE_ARRAY,
                                 items=openapi.Schema(title="Export format", type=openapi.TYPE_STRING)
                             )
                         )})
    def get(self, request, *args, **kwargs):
        project = get_object_with_permissions(request, Project, kwargs['pk'], ProjectAPIBasePermission.perm)
        formats = DataExport.get_export_formats(project)
        return Response(formats)


class DownloadResultsAPI(APIView):
    permission_classes = (IsBusiness, ProjectAPIBasePermission)

    @swagger_auto_schema(
        manual_parameters=[
            openapi.Parameter(name='exportType', type=openapi.TYPE_STRING, in_=openapi.IN_QUERY,
                              description='Selected export format')
        ],
        tags=['Export'],
        operation_summary='Export annotations',
        operation_description='Export annotated tasks as a file in a specific format.',
        responses={200: openapi.Response(
            description='Exported data',
            schema=openapi.Schema(
                title='Export file',
                description='Export file with results',
                type=openapi.TYPE_FILE
            )
        )}
    )
    def get(self, request, *args, **kwargs):
        project = get_object_with_permissions(request, Project, kwargs['pk'], ProjectAPIBasePermission.perm)
        export_type = request.GET.get('exportType')
        is_labeled = not bool_from_request(request.GET, 'download_all_tasks', False)

        logger.debug('Get tasks')
        query = Task.objects.filter(project=project, is_labeled=is_labeled)
        logger.debug('Serialize tasks for export')
        tasks = ExportDataSerializer(query, many=True).data
        logger.debug('Prepare export files')
        export_stream, content_type, filename = DataExport.generate_export_file(project, tasks, export_type, request.GET)

        response = HttpResponse(File(export_stream), content_type=content_type)
        response['Content-Disposition'] = 'attachment; filename="%s"' % filename
        response['filename'] = filename
        return response


class ProjectExportFiles(APIView):
    """
    get:
    Export files

    List of files exported from the Label Studio UI using the Export button on the Data Manager page.
    """
    permission_classes = (IsBusiness, ProjectAPIBasePermission)

    @swagger_auto_schema(tags=['Export'])
    def get(self, request, *args, **kwargs):
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
    permission_classes = (IsBusiness, ProjectAPIBasePermission)

    def get(self, request, *args, **kwargs):
        """ Get export files list
        """
        original_url = request.META['HTTP_X_ORIGINAL_URI']
        filename = original_url.replace('/export/', '')
        project_id = filename.split('-')[0]
        try:
            pk = int(project_id)
        except ValueError:
            return Response("Incorrect filename in export", status=status.HTTP_422_UNPROCESSABLE_ENTITY)

        project = get_object_with_check_and_log(request, Project, pk=pk)
        self.check_object_permissions(self.request, project)
        return Response("auth ok", status=status.HTTP_200_OK)
