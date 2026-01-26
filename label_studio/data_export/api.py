"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
import logging
import os
import traceback as tb
from datetime import datetime
from urllib.parse import urlparse

from core.feature_flags import flag_set
from core.permissions import all_permissions
from core.redis import start_job_async_or_sync
from core.utils.common import batch
from core.utils.exceptions import extract_message
from django.conf import settings
from django.core.files import File
from django.core.files.storage import FileSystemStorage
from django.db import transaction
from django.db.models import Prefetch
from django.http import FileResponse, HttpResponse
from django.utils.decorators import method_decorator
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiParameter, OpenApiResponse, extend_schema
from projects.models import Project
from ranged_fileresponse import RangedFileResponse
from rest_framework import generics, status
from rest_framework.exceptions import NotFound, ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView
from tasks.models import Task

from .models import ConvertedFormat, DataExport, Export
from .serializers import (
    ExportConvertSerializer,
    ExportCreateSerializer,
    ExportDataSerializer,
    ExportParamSerializer,
    ExportSerializer,
)

logger = logging.getLogger(__name__)


@method_decorator(
    name='get',
    decorator=extend_schema(
        tags=['Export'],
        summary='[Deprecated] Get export formats',
        description="""
        This endpoint is deprecated in Enterprise. Use the async export API instead:
        POST /api/projects/{{id}}/exports/ (see [Create new export](/api#operation/api_projects_exports_create)).

        In Label Studio Enterprise, this endpoint will always return a 404 Not Found response with instructions to use the async export API.

        Retrieve the available export formats for the current project by ID.""",
        deprecated=True,
        parameters=[
            OpenApiParameter(
                name='id',
                type=OpenApiTypes.INT,
                location='path',
                description='A unique integer value identifying this project.',
            ),
        ],
        responses={
            200: OpenApiResponse(
                description='Export formats',
                response={
                    'type': 'array',
                    'items': {'type': 'string', 'title': 'Export format'},
                    'description': 'List of available formats',
                    'title': 'Format list',
                },
            )
        },
        extensions={
            'x-fern-sdk-group-name': ['projects', 'exports'],
            'x-fern-sdk-method-name': 'list_formats',
            'x-fern-audiences': ['public'],
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
    decorator=extend_schema(
        parameters=[
            OpenApiParameter(
                name='export_type',
                type=OpenApiTypes.STR,
                location='query',
                description='Selected export format (JSON by default)',
            ),
            OpenApiParameter(
                name='download_all_tasks',
                type=OpenApiTypes.BOOL,
                location='query',
                description='If true, download all tasks regardless of status. If false, download only annotated tasks.',
            ),
            OpenApiParameter(
                name='download_resources',
                type=OpenApiTypes.BOOL,
                location='query',
                description='If true, download all resource files such as images, audio, and others relevant to the tasks.',
            ),
            OpenApiParameter(
                name='ids',
                many=True,
                location='query',
                description='Specify a list of task IDs to retrieve only the details for those tasks.',
            ),
            OpenApiParameter(
                name='id',
                type=OpenApiTypes.INT,
                location='path',
                description='A unique integer value identifying this project.',
            ),
        ],
        tags=['Export'],
        summary='[Deprecated] Easy export of tasks and annotations',
        description="""
        This endpoint is deprecated in Enterprise. Use the async export API instead:
        POST /api/projects/{{id}}/exports/ (see [Create new export](/api#operation/api_projects_exports_create)).

        In Label Studio Enterprise, this endpoint will always return a 404 Not Found response with instructions to use the async export API.

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
        curl -X GET '{}/api/projects/{{id}}/export?ids[]=123&ids[]=345' -H 'Authorization: Token abc123' --output 'annotations.json'
        ```
        """.format(
            settings.HOSTNAME or 'https://localhost:8080',
            settings.HOSTNAME or 'https://localhost:8080',
            settings.HOSTNAME or 'https://localhost:8080',
        ),
        deprecated=True,
        responses={
            200: OpenApiResponse(
                description='Exported data',
                response={
                    'title': 'Export file',
                    'description': 'Export file with results',
                    'type': 'string',
                    'format': 'binary',
                },
            )
        },
        extensions={
            'x-fern-sdk-group-name': ['projects', 'exports'],
            'x-fern-sdk-method-name': 'download_sync',
            'x-fern-audiences': ['public'],
        },
    ),
)
class ExportAPI(generics.RetrieveAPIView):
    permission_required = all_permissions.projects_change

    def get_queryset(self):
        return Project.objects.filter(organization=self.request.user.active_organization)

    def get_task_queryset(self, queryset):
        # Import here to avoid circular dependencies
        from core.feature_flags import flag_set
        from tasks.models import Annotation

        # Create a prefetch for annotations with FSM state
        annotations_qs = Annotation.objects.all()

        # Only annotate FSM state if both feature flags are enabled
        user = getattr(self.request, 'user', None)
        if (
            flag_set('fflag_feat_fit_568_finite_state_management', user=user)
            and flag_set('fflag_feat_fit_710_fsm_state_fields', user=user)
            and hasattr(annotations_qs, 'with_state')
        ):
            annotations_qs = annotations_qs.with_state()

        qs = queryset.select_related('project').prefetch_related(
            Prefetch('annotations', queryset=annotations_qs), 'predictions'
        )

        # Add FSM state annotation to tasks as well to avoid N+1 queries during export
        if (
            flag_set('fflag_feat_fit_568_finite_state_management', user=user)
            and flag_set('fflag_feat_fit_710_fsm_state_fields', user=user)
            and hasattr(qs, 'with_state')
        ):
            qs = qs.with_state()
        return qs

    def get(self, request, *args, **kwargs):
        project = self.get_object()
        query_serializer = ExportParamSerializer(data=request.GET)
        query_serializer.is_valid(raise_exception=True)

        export_type = (
            query_serializer.validated_data.get('exportType') or query_serializer.validated_data['export_type']
        )
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
                self.get_task_queryset(query.filter(id__in=_task_ids)),
                many=True,
                expand=['drafts'],
                context={'interpolate_key_frames': interpolate_key_frames},
            ).data
        logger.debug('Prepare export files')

        export_file, content_type, filename = DataExport.generate_export_file(
            project, tasks, export_type, download_resources, request.GET, hostname=request.build_absolute_uri('/')
        )

        r = FileResponse(export_file, as_attachment=True, content_type=content_type, filename=filename)
        r['filename'] = filename
        return r


# @method_decorator(
#     name='get',
#     decorator=extend_schema(
#         tags=['Export'],
#         summary='List exported files',
#         description="""
#         Retrieve a list of files exported from the Label Studio UI using the Export button on the Data Manager page.
#         To retrieve the files themselves, see [Download export file](/api#operation/api_projects_exports_download_read).
#         """,
#     ),
# ) just in case we put it back in swagger API docs
@extend_schema(exclude=True)
class ProjectExportFiles(generics.RetrieveAPIView):
    permission_required = all_permissions.projects_change

    def get_queryset(self):
        return Project.objects.filter(organization=self.request.user.active_organization)

    def get(self, request, *args, **kwargs):
        # project permission check
        self.get_object()

        paths = []
        for name in os.listdir(settings.EXPORT_DIR):
            if name.endswith('.json') and not name.endswith('-info.json'):
                project_id = name.split('-')[0]
                if str(kwargs['pk']) == project_id:
                    paths.append(settings.EXPORT_URL_ROOT + name)

        items = [{'name': p.split('/')[2].split('.')[0], 'url': p} for p in sorted(paths)[::-1]]
        return Response({'export_files': items}, status=status.HTTP_200_OK)


@extend_schema(exclude=True)
class ProjectExportFilesAuthCheck(APIView):
    """Check auth for nginx auth_request (/api/auth/export/)"""

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
    decorator=extend_schema(
        tags=['Export'],
        summary='List all export snapshots',
        description='Returns a list of exported files for a specific project by ID.',
        parameters=[
            OpenApiParameter(
                name='id',
                type=OpenApiTypes.INT,
                location='path',
                description='A unique integer value identifying this project.',
            )
        ],
        extensions={
            'x-fern-sdk-group-name': ['projects', 'exports'],
            'x-fern-sdk-method-name': 'list',
            'x-fern-audiences': ['public'],
        },
    ),
)
@method_decorator(
    name='post',
    decorator=extend_schema(
        tags=['Export'],
        summary='Create new export snapshot',
        description='Create a new export request to start a background task and generate an export file for a specific project by ID.',
        parameters=[
            OpenApiParameter(
                name='id',
                type=OpenApiTypes.INT,
                location='path',
                description='A unique integer value identifying this project.',
            )
        ],
        extensions={
            'x-fern-sdk-group-name': ['projects', 'exports'],
            'x-fern-sdk-method-name': 'create',
            'x-fern-audiences': ['public'],
        },
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

    def get_serializer_context(self):
        context = super(ExportListAPI, self).get_serializer_context()
        context['user'] = self.request.user
        return context

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

    def filter_queryset(self, queryset):
        queryset = super().filter_queryset(queryset)

        return queryset.order_by('-created_at')[:100]


@method_decorator(
    name='get',
    decorator=extend_schema(
        tags=['Export'],
        summary='Get export snapshot by ID',
        description='Retrieve information about an export file by export ID for a specific project.',
        parameters=[
            OpenApiParameter(
                name='id',
                type=OpenApiTypes.INT,
                location='path',
                description='A unique integer value identifying this project.',
            ),
            OpenApiParameter(
                name='export_pk',
                type=OpenApiTypes.INT,
                location='path',
                description='Primary key identifying the export file.',
            ),
        ],
        extensions={
            'x-fern-sdk-group-name': ['projects', 'exports'],
            'x-fern-sdk-method-name': 'get',
            'x-fern-audiences': ['public'],
        },
    ),
)
@method_decorator(
    name='delete',
    decorator=extend_schema(
        tags=['Export'],
        summary='Delete export snapshot',
        description='Delete an export file by specified export ID.',
        parameters=[
            OpenApiParameter(
                name='id',
                type=OpenApiTypes.INT,
                location='path',
                description='A unique integer value identifying this project.',
            ),
            OpenApiParameter(
                name='export_pk',
                type=OpenApiTypes.INT,
                location='path',
                description='Primary key identifying the export file.',
            ),
        ],
        extensions={
            'x-fern-sdk-group-name': ['projects', 'exports'],
            'x-fern-sdk-method-name': 'delete',
            'x-fern-audiences': ['public'],
        },
    ),
)
class ExportDetailAPI(generics.RetrieveDestroyAPIView):
    queryset = Export.objects.all()
    project_model = Project
    serializer_class = ExportSerializer
    lookup_url_kwarg = 'export_pk'
    permission_required = all_permissions.projects_change

    def delete(self, *args, **kwargs):
        if flag_set('ff_back_dev_4664_remove_storage_file_on_export_delete_29032023_short'):
            try:
                export = self.get_object()
                export.file.delete()

                for converted_format in export.converted_formats.all():
                    if converted_format.file:
                        converted_format.file.delete()
            except Exception as e:
                return Response(
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    data={
                        'detail': 'Could not delete file from storage. Check that your user has permissions to delete files: %s'
                        % extract_message(e)
                    },
                )

        return super().delete(*args, **kwargs)

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
    decorator=extend_schema(
        tags=['Export'],
        summary='Download export snapshot as file in specified format',
        description="""
        Download an export file in the specified format for a specific project. Specify the project ID with the `id`
        parameter in the path and the ID of the export file you want to download using the `export_pk` parameter
        in the path.

        Get the `export_pk` from the response of the request to [Create new export](/api#operation/api_projects_exports_create)
        or after [listing export files](/api#operation/api_projects_exports_list).
        """,
        parameters=[
            OpenApiParameter(
                name='exportType',
                type=OpenApiTypes.STR,
                location='query',
                description='Selected export format',
            ),
            OpenApiParameter(
                name='id',
                type=OpenApiTypes.INT,
                location='path',
                description='A unique integer value identifying this project.',
            ),
            OpenApiParameter(
                name='export_pk',
                type=OpenApiTypes.INT,
                location='path',
                description='Primary key identifying the export file.',
            ),
        ],
        responses={
            (200, 'application/*'): OpenApiResponse(
                description='Export file',
                response={
                    'type': 'string',
                    'format': 'binary',
                },
            ),
        },
        extensions={
            'x-fern-sdk-group-name': ['projects', 'exports'],
            'x-fern-sdk-method-name': 'download',
            'x-fern-audiences': ['public'],
        },
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
        snapshot = self.get_object()
        export_type = request.GET.get('exportType')

        if snapshot.status != Export.Status.COMPLETED:
            return HttpResponse('Export is not completed', status=404)

        if flag_set('fflag_fix_all_lsdv_4813_async_export_conversion_22032023_short', request.user):
            file = snapshot.file
            if export_type is not None and export_type != 'JSON':
                converted_file = snapshot.converted_formats.filter(export_type=export_type).first()
                if converted_file is None:
                    raise NotFound(f'{export_type} format is not converted yet')
                file = converted_file.file

            if isinstance(file.storage, FileSystemStorage):
                url = file.storage.url(file.name)
            else:
                url = file.storage.url(file.name, storage_url=True)
            protocol = urlparse(url).scheme

            # NGINX downloads are a solid way to make uwsgi workers free
            if settings.USE_NGINX_FOR_EXPORT_DOWNLOADS:
                # let NGINX handle it
                response = HttpResponse()
                # below header tells NGINX to catch it and serve, see docker-config/nginx-app.conf
                redirect = '/file_download/' + protocol + '/' + url.replace(protocol + '://', '')
                response['X-Accel-Redirect'] = redirect
                response['Content-Disposition'] = 'attachment; filename="{}"'.format(file.name)
                response['filename'] = os.path.basename(file.name)
                return response

            # No NGINX: standard way for export downloads in the community edition
            else:
                ext = file.name.split('.')[-1]
                response = RangedFileResponse(request, file, content_type=f'application/{ext}')
                response['Content-Disposition'] = f'attachment; filename="{file.name}"'
                response['filename'] = os.path.basename(file.name)
                return response
        else:
            if export_type is None:
                file_ = snapshot.file
            else:
                file_ = snapshot.convert_file(export_type)

            if file_ is None:
                return HttpResponse("Can't get file", status=404)

            ext = file_.name.split('.')[-1]

            response = RangedFileResponse(request, file_, content_type=f'application/{ext}')
            response['Content-Disposition'] = f'attachment; filename="{file_.name}"'
            response['filename'] = file_.name
            return response


def async_convert(converted_format_id, export_type, project, hostname, download_resources=False, **kwargs):
    with transaction.atomic():
        try:
            converted_format = ConvertedFormat.objects.get(id=converted_format_id)
        except ConvertedFormat.DoesNotExist:
            logger.error(f'ConvertedFormat with id {converted_format_id} not found, conversion failed')
            return
        if converted_format.status != ConvertedFormat.Status.CREATED:
            logger.error(f'Conversion for export id {converted_format.export.id} to {export_type} already started')
            return
        converted_format.status = ConvertedFormat.Status.IN_PROGRESS
        converted_format.save(update_fields=['status'])

    snapshot = converted_format.export
    converted_file = snapshot.convert_file(export_type, download_resources=download_resources, hostname=hostname)
    if converted_file is None:
        raise ValidationError('No converted file found, probably there are no annotations in the export snapshot')
    md5 = Export.eval_md5(converted_file)
    ext = converted_file.name.split('.')[-1]

    now = datetime.now()
    file_name = f'project-{project.id}-at-{now.strftime("%Y-%m-%d-%H-%M")}-{md5[0:8]}.{ext}'
    file_path = f'{project.id}/{file_name}'  # finally file will be in settings.DELAYED_EXPORT_DIR/project.id/file_name
    file_ = File(converted_file, name=file_path)
    converted_format.file.save(file_path, file_)
    converted_format.status = ConvertedFormat.Status.COMPLETED
    converted_format.save(update_fields=['file', 'status'])


def set_convert_background_failure(job, connection, type, value, traceback_obj):
    from data_export.models import ConvertedFormat

    convert_id = job.args[0]
    try:
        trace = ''.join(tb.format_exception(type, value, traceback_obj))
    except Exception as e:
        if flag_set('fflag_fix_back_leap_1818_set_convert_background_failure_logging_02062025_short'):
            logger.error(f'Failed to format traceback: {job=} {type=} {value=} {traceback_obj=} {e=}', exc_info=True)
        trace = 'Exception while processing traceback. See stderr for details'
    ConvertedFormat.objects.filter(id=convert_id).update(status=Export.Status.FAILED, traceback=trace)


@method_decorator(
    name='post',
    decorator=extend_schema(
        tags=['Export'],
        summary='Export conversion',
        description='Convert export snapshot to selected format',
        request=ExportConvertSerializer,
        parameters=[
            OpenApiParameter(
                name='id',
                type=OpenApiTypes.INT,
                location='path',
                description='A unique integer value identifying this project.',
            ),
            OpenApiParameter(
                name='export_pk',
                type=OpenApiTypes.INT,
                location='path',
                description='Primary key identifying the export file.',
            ),
        ],
        responses={
            200: OpenApiResponse(
                response={
                    'type': 'object',
                    'properties': {
                        'export_type': {'type': 'string'},
                        'converted_format': {'type': 'integer'},
                    },
                },
            ),
        },
        extensions={
            'x-fern-sdk-group-name': ['projects', 'exports'],
            'x-fern-sdk-method-name': 'convert',
            'x-fern-audiences': ['public'],
        },
    ),
)
class ExportConvertAPI(generics.CreateAPIView):
    queryset = Export.objects.all()
    lookup_url_kwarg = 'export_pk'
    permission_required = all_permissions.projects_change

    def post(self, request, *args, **kwargs):
        snapshot = self.get_object()
        serializer = ExportConvertSerializer(data=request.data, context={'project': snapshot.project})
        serializer.is_valid(raise_exception=True)
        export_type = serializer.validated_data['export_type']
        download_resources = serializer.validated_data.get('download_resources')

        converted_format, created = ConvertedFormat.objects.exclude(
            status=ConvertedFormat.Status.FAILED
        ).get_or_create(export=snapshot, export_type=export_type)

        if not created:
            raise ValidationError(f'Conversion to {export_type} already started')

        start_job_async_or_sync(
            async_convert,
            converted_format.id,
            export_type,
            snapshot.project,
            request.build_absolute_uri('/'),
            download_resources=download_resources,
            on_failure=set_convert_background_failure,
        )
        return Response({'export_type': export_type, 'converted_format': converted_format.id})
