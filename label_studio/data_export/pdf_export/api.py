"""API Views for PDF ML Export.

This module provides Django REST Framework views for the PDF ML export API.

Endpoints:
- POST /api/projects/{id}/exports/pdf-ml - Create new PDF ML export
- GET /api/projects/{id}/exports/pdf-ml - List PDF ML exports
- GET /api/projects/{id}/exports/pdf-ml/{export_id} - Get export status
- DELETE /api/projects/{id}/exports/pdf-ml/{export_id} - Delete export
- GET /api/exports/pdf-ml/{export_id}/download - Download export ZIP
- GET /api/exports/pdf-ml/{export_id}/manifest - Get export manifest
"""

import json
import logging
import os

from core.permissions import all_permissions
from core.redis import start_job_async_or_sync
from django.http import FileResponse, HttpResponse
from django.utils.decorators import method_decorator
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiParameter, OpenApiResponse, extend_schema
from projects.models import Project
from ranged_fileresponse import RangedFileResponse
from rest_framework import generics, status
from rest_framework.exceptions import NotFound
from rest_framework.response import Response
from rest_framework.views import APIView

from .django_models import PdfExportJob
from .serializers import (
    ExportIndexSerializer,
    PdfExportJobCreateModelSerializer,
    PdfExportJobModelSerializer,
)

logger = logging.getLogger(__name__)


@method_decorator(
    name="get",
    decorator=extend_schema(
        tags=["Export"],
        summary="List PDF ML exports",
        description="Retrieve a list of PDF ML export jobs for a specific project.",
        parameters=[
            OpenApiParameter(
                name="id",
                type=OpenApiTypes.INT,
                location="path",
                description="A unique integer value identifying this project.",
            ),
        ],
        responses={
            200: PdfExportJobModelSerializer(many=True),
        },
        extensions={
            "x-fern-sdk-group-name": ["projects", "exports", "pdf-ml"],
            "x-fern-sdk-method-name": "list",
            "x-fern-audiences": ["public"],
        },
    ),
)
@method_decorator(
    name="post",
    decorator=extend_schema(
        tags=["Export"],
        summary="Create PDF ML export",
        description="""
        Create a new PDF ML export job for a specific project.

        This endpoint initiates an asynchronous export job that:
        - Extracts PDF document layout (words, lines, blocks, tables)
        - Generates deterministic structural IDs
        - Creates annotation records in JSONL format
        - Optionally renders page images at specified DPI
        - Optionally generates W3C Web Annotation format

        The export job runs in the background. Use the status endpoint to
        monitor progress and get the download URL when complete.
        """,
        parameters=[
            OpenApiParameter(
                name="id",
                type=OpenApiTypes.INT,
                location="path",
                description="A unique integer value identifying this project.",
            ),
        ],
        request=PdfExportJobCreateModelSerializer,
        responses={
            201: PdfExportJobModelSerializer,
            400: OpenApiResponse(description="Invalid request parameters"),
        },
        extensions={
            "x-fern-sdk-group-name": ["projects", "exports", "pdf-ml"],
            "x-fern-sdk-method-name": "create",
            "x-fern-audiences": ["public"],
        },
    ),
)
class PdfExportListCreateAPI(generics.ListCreateAPIView):
    """List and create PDF ML export jobs."""

    queryset = PdfExportJob.objects.all().order_by("-created_at")
    permission_required = all_permissions.projects_change

    def get_serializer_class(self):
        if self.request.method == "POST":
            return PdfExportJobCreateModelSerializer
        return PdfExportJobModelSerializer

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["request"] = self.request
        return context

    def _get_project(self):
        project_pk = self.kwargs.get("pk")
        project = generics.get_object_or_404(
            Project.objects.for_user(self.request.user),
            pk=project_pk,
        )
        return project

    def get_queryset(self):
        project = self._get_project()
        return super().get_queryset().filter(project=project)[:100]

    def perform_create(self, serializer):
        from .tasks import run_pdf_ml_export, set_export_failure

        project = self._get_project()

        # Create the export job
        export_job = serializer.save(
            project=project,
            created_by=self.request.user,
        )

        # Start async export job
        start_job_async_or_sync(
            run_pdf_ml_export,
            export_job.id,
            on_failure=set_export_failure,
        )

        logger.info(
            f"PDF ML export job {export_job.export_id} created for project {project.id}"
        )


@method_decorator(
    name="get",
    decorator=extend_schema(
        tags=["Export"],
        summary="Get PDF ML export status",
        description="Retrieve the status and details of a specific PDF ML export job.",
        parameters=[
            OpenApiParameter(
                name="id",
                type=OpenApiTypes.INT,
                location="path",
                description="A unique integer value identifying this project.",
            ),
            OpenApiParameter(
                name="export_id",
                type=OpenApiTypes.STR,
                location="path",
                description="The UUID of the export job.",
            ),
        ],
        responses={
            200: PdfExportJobModelSerializer,
            404: OpenApiResponse(description="Export not found"),
        },
        extensions={
            "x-fern-sdk-group-name": ["projects", "exports", "pdf-ml"],
            "x-fern-sdk-method-name": "get",
            "x-fern-audiences": ["public"],
        },
    ),
)
@method_decorator(
    name="delete",
    decorator=extend_schema(
        tags=["Export"],
        summary="Delete PDF ML export",
        description="Delete a PDF ML export job and its associated files.",
        parameters=[
            OpenApiParameter(
                name="id",
                type=OpenApiTypes.INT,
                location="path",
                description="A unique integer value identifying this project.",
            ),
            OpenApiParameter(
                name="export_id",
                type=OpenApiTypes.STR,
                location="path",
                description="The UUID of the export job.",
            ),
        ],
        responses={
            204: OpenApiResponse(description="Export deleted"),
            404: OpenApiResponse(description="Export not found"),
        },
        extensions={
            "x-fern-sdk-group-name": ["projects", "exports", "pdf-ml"],
            "x-fern-sdk-method-name": "delete",
            "x-fern-audiences": ["public"],
        },
    ),
)
class PdfExportDetailAPI(generics.RetrieveDestroyAPIView):
    """Get or delete a specific PDF ML export job."""

    queryset = PdfExportJob.objects.all()
    serializer_class = PdfExportJobModelSerializer
    lookup_url_kwarg = "export_id"
    lookup_field = "export_id"
    permission_required = all_permissions.projects_change

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["request"] = self.request
        return context

    def _get_project(self):
        project_pk = self.kwargs.get("pk")
        project = generics.get_object_or_404(
            Project.objects.for_user(self.request.user),
            pk=project_pk,
        )
        return project

    def get_queryset(self):
        project = self._get_project()
        return super().get_queryset().filter(project=project)


@method_decorator(
    name="get",
    decorator=extend_schema(
        tags=["Export"],
        summary="Download PDF ML export",
        description="""
        Download the completed PDF ML export as a ZIP archive.

        The export must be in 'completed' or 'partial' status.
        Returns a ZIP file containing:
        - export_index.json - Master index file
        - docs/{doc_id}/manifest.json - Document manifests
        - docs/{doc_id}/layout/page_NNN.json - Page layout files
        - docs/{doc_id}/images/page_NNN.png - Page images (if enabled)
        - annotations.jsonl - Annotation records
        - schemas/ - JSON Schema files for validation
        """,
        parameters=[
            OpenApiParameter(
                name="export_id",
                type=OpenApiTypes.STR,
                location="path",
                description="The UUID of the export job.",
            ),
        ],
        responses={
            (200, "application/zip"): OpenApiResponse(
                description="ZIP archive of export bundle",
                response={
                    "type": "string",
                    "format": "binary",
                },
            ),
            404: OpenApiResponse(description="Export not found or not ready"),
        },
        extensions={
            "x-fern-sdk-group-name": ["exports", "pdf-ml"],
            "x-fern-sdk-method-name": "download",
            "x-fern-audiences": ["public"],
        },
    ),
)
class PdfExportDownloadAPI(APIView):
    """Download PDF ML export ZIP file."""

    permission_required = all_permissions.projects_view

    def get(self, request, export_id):
        try:
            export_job = PdfExportJob.objects.get(export_id=export_id)
        except PdfExportJob.DoesNotExist:
            raise NotFound(f"Export {export_id} not found")

        # Check user has access to project
        if not Project.objects.for_user(request.user).filter(
            pk=export_job.project_id
        ).exists():
            raise NotFound(f"Export {export_id} not found")

        # Check export is complete
        if export_job.status not in [
            PdfExportJob.Status.COMPLETED,
            PdfExportJob.Status.PARTIAL,
        ]:
            return HttpResponse(
                f"Export is not ready for download (status: {export_job.status})",
                status=404,
            )

        # Check ZIP file exists
        if not export_job.zip_file:
            return HttpResponse("Export file not found", status=404)

        # Return file response
        filename = export_job.get_output_filename()
        response = RangedFileResponse(
            request,
            export_job.zip_file,
            content_type="application/zip",
        )
        response["Content-Disposition"] = f'attachment; filename="{filename}"'
        response["filename"] = filename
        return response


@method_decorator(
    name="get",
    decorator=extend_schema(
        tags=["Export"],
        summary="Get PDF ML export manifest",
        description="""
        Retrieve the export index (manifest) for a completed PDF ML export.

        Returns the contents of export_index.json which includes:
        - Export metadata (ID, schema version, timestamps)
        - Statistics (document counts, page counts, annotation counts)
        - Document list with paths to manifests
        - Annotation file list (may be sharded)
        - Error list for partial exports
        """,
        parameters=[
            OpenApiParameter(
                name="export_id",
                type=OpenApiTypes.STR,
                location="path",
                description="The UUID of the export job.",
            ),
        ],
        responses={
            200: ExportIndexSerializer,
            404: OpenApiResponse(description="Export not found or not ready"),
        },
        extensions={
            "x-fern-sdk-group-name": ["exports", "pdf-ml"],
            "x-fern-sdk-method-name": "get_manifest",
            "x-fern-audiences": ["public"],
        },
    ),
)
class PdfExportManifestAPI(APIView):
    """Get PDF ML export manifest (export_index.json)."""

    permission_required = all_permissions.projects_view

    def get(self, request, export_id):
        try:
            export_job = PdfExportJob.objects.get(export_id=export_id)
        except PdfExportJob.DoesNotExist:
            raise NotFound(f"Export {export_id} not found")

        # Check user has access to project
        if not Project.objects.for_user(request.user).filter(
            pk=export_job.project_id
        ).exists():
            raise NotFound(f"Export {export_id} not found")

        # Check export is complete
        if export_job.status not in [
            PdfExportJob.Status.COMPLETED,
            PdfExportJob.Status.PARTIAL,
        ]:
            return HttpResponse(
                f"Export is not ready (status: {export_job.status})",
                status=404,
            )

        # Read export index from output directory
        export_index_path = os.path.join(export_job.output_dir, "export_index.json")
        if not os.path.exists(export_index_path):
            return HttpResponse("Export manifest not found", status=404)

        try:
            with open(export_index_path, "r", encoding="utf-8") as f:
                export_index = json.load(f)
        except Exception as e:
            logger.error(f"Failed to read export manifest: {e}")
            return HttpResponse("Failed to read export manifest", status=500)

        serializer = ExportIndexSerializer(data=export_index)
        if serializer.is_valid():
            return Response(serializer.validated_data)
        return Response(export_index)
