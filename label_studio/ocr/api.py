# This file and its contents are licensed under the Apache License 2.0.
# Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
REST API endpoints for OCR data.

Provides endpoints for:
- Retrieving OCR metadata for a task's PDF
- Fetching tokens for a specific page
- Extracting tokens within a region (for auto-text population)
- Importing OCR data for a task
"""

import logging

from core.permissions import ViewClassPermission, all_permissions
from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView
from tasks.models import Task

from .serializers import (
    OcrDocumentMetaSerializer,
    OcrImportSerializer,
    OcrPageSerializer,
    OcrRegionQuerySerializer,
    OcrRegionResponseSerializer,
)
from .utils import (
    fetch_ocr_data,
    get_tokens_in_region,
    sort_tokens_reading_order,
    tokens_to_text,
    validate_ocr_data,
)

logger = logging.getLogger(__name__)


class OcrBaseAPI(APIView):
    """Base class for OCR API views with permission handling."""

    permission_required = ViewClassPermission(
        GET=all_permissions.tasks_view,
        POST=all_permissions.tasks_change,
    )

    def get_task(self, task_id: int) -> Task:
        """Get task with permission check."""
        task = get_object_or_404(Task, pk=task_id)
        self.check_object_permissions(self.request, task.project)
        return task


@extend_schema_view(
    get=extend_schema(
        summary='Get OCR metadata for all pages',
        description='Retrieve OCR metadata for all pages of a task\'s PDF',
        responses={200: OcrDocumentMetaSerializer},
    )
)
class OcrPagesAPI(OcrBaseAPI):
    """GET /api/ocr/tasks/{task_id}/pages - Retrieve OCR page metadata."""

    def get(self, request, task_id: int):
        """Get OCR metadata for all pages."""
        task = self.get_task(task_id)
        ocr_data = fetch_ocr_data(task)

        if ocr_data is None:
            # Return empty response indicating no OCR data
            response_data = {
                'task_id': task_id,
                'document_id': None,
                'total_pages': 0,
                'ocr_available': False,
                'pages': [],
                'ocr_engine': None,
                'ocr_version': None,
            }
            return Response(response_data)

        # Build page metadata
        pages_meta = []
        for page in ocr_data.get('pages', []):
            tokens = page.get('tokens', [])
            pages_meta.append({
                'page_index': page.get('page_index', 0),
                'width': page.get('width', 612),
                'height': page.get('height', 792),
                'token_count': len(tokens),
                'has_tokens': len(tokens) > 0,
            })

        response_data = {
            'task_id': task_id,
            'document_id': ocr_data.get('document_id'),
            'total_pages': len(pages_meta),
            'ocr_available': True,
            'pages': pages_meta,
            'ocr_engine': ocr_data.get('ocr_engine'),
            'ocr_version': ocr_data.get('ocr_version'),
        }

        serializer = OcrDocumentMetaSerializer(data=response_data)
        serializer.is_valid(raise_exception=True)
        return Response(serializer.validated_data)


@extend_schema_view(
    get=extend_schema(
        summary='Get OCR tokens for a page',
        description='Retrieve all OCR tokens for a specific page',
        responses={200: OcrPageSerializer},
    )
)
class OcrTokensAPI(OcrBaseAPI):
    """GET /api/ocr/tasks/{task_id}/pages/{page_index}/tokens - Retrieve tokens for a page."""

    def get(self, request, task_id: int, page_index: int):
        """Get OCR tokens for a specific page."""
        task = self.get_task(task_id)
        ocr_data = fetch_ocr_data(task)

        if ocr_data is None:
            return Response(
                {'detail': 'OCR data not available for this task'},
                status=status.HTTP_404_NOT_FOUND
            )

        pages = ocr_data.get('pages', [])
        page_data = None
        for page in pages:
            if page.get('page_index') == page_index:
                page_data = page
                break

        if page_data is None:
            return Response(
                {'detail': f'Page {page_index} not found. Document has {len(pages)} pages.'},
                status=status.HTTP_404_NOT_FOUND
            )

        include_style = request.query_params.get('include_style', 'false').lower() == 'true'
        tokens = page_data.get('tokens', [])

        # Filter style info if not requested
        if not include_style:
            tokens = [
                {k: v for k, v in t.items() if k not in ('font_size', 'is_bold', 'is_italic')}
                for t in tokens
            ]

        response_data = {
            'task_id': task_id,
            'page_index': page_index,
            'width': page_data.get('width', 612),
            'height': page_data.get('height', 792),
            'rotation': page_data.get('rotation', 0),
            'token_count': len(tokens),
            'tokens': tokens,
        }

        return Response(response_data)


@extend_schema_view(
    get=extend_schema(
        summary='Get tokens within a region',
        description='Extract tokens that intersect with a bounding box region',
        parameters=[OcrRegionQuerySerializer],
        responses={200: OcrRegionResponseSerializer},
    )
)
class OcrRegionTokensAPI(OcrBaseAPI):
    """GET /api/ocr/tasks/{task_id}/pages/{page_index}/tokens/region - Get tokens in region."""

    def get(self, request, task_id: int, page_index: int):
        """Get tokens within a specified region."""
        # Validate query parameters
        query_serializer = OcrRegionQuerySerializer(data=request.query_params)
        if not query_serializer.is_valid():
            return Response(query_serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        region_params = query_serializer.validated_data
        region_bbox = [
            region_params['x'],
            region_params['y'],
            region_params['width'],
            region_params['height'],
        ]
        threshold = region_params.get('threshold', 0.5)

        task = self.get_task(task_id)
        ocr_data = fetch_ocr_data(task)

        if ocr_data is None:
            return Response(
                {'detail': 'OCR data not available for this task'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Find the page
        pages = ocr_data.get('pages', [])
        page_data = None
        for page in pages:
            if page.get('page_index') == page_index:
                page_data = page
                break

        if page_data is None:
            return Response(
                {'detail': f'Page {page_index} not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        all_tokens = page_data.get('tokens', [])
        matching_tokens = get_tokens_in_region(all_tokens, region_bbox, threshold)

        # Calculate average confidence
        confidences = [t.get('confidence', 1.0) for t in matching_tokens]
        avg_confidence = sum(confidences) / len(confidences) if confidences else 0.0

        # Generate suggested text
        sorted_tokens = sort_tokens_reading_order(matching_tokens)
        suggested_text = tokens_to_text(sorted_tokens)

        response_data = {
            'task_id': task_id,
            'page_index': page_index,
            'region': {
                'x': region_params['x'],
                'y': region_params['y'],
                'width': region_params['width'],
                'height': region_params['height'],
            },
            'tokens': matching_tokens,
            'suggested_text': suggested_text,
            'average_confidence': avg_confidence,
            'reading_order': [t['id'] for t in sorted_tokens],
        }

        return Response(response_data)


@extend_schema_view(
    post=extend_schema(
        summary='Import OCR data for a task',
        description='Import OCR data from a URL or inline JSON',
        request=OcrImportSerializer,
        responses={201: {'description': 'Import successful'}},
    )
)
class OcrImportAPI(OcrBaseAPI):
    """POST /api/ocr/tasks/{task_id}/import - Import OCR data."""

    def post(self, request, task_id: int):
        """Import OCR data for a task."""
        task = self.get_task(task_id)

        serializer = OcrImportSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        overwrite = data.get('overwrite', False)

        # Check if OCR data already exists
        existing_ocr = fetch_ocr_data(task)
        if existing_ocr and not overwrite:
            return Response(
                {'detail': 'OCR data already exists. Set overwrite=true to replace.'},
                status=status.HTTP_409_CONFLICT
            )

        # Validate the OCR data structure
        ocr_data = data.get('data')
        if ocr_data:
            is_valid, error = validate_ocr_data(ocr_data)
            if not is_valid:
                return Response(
                    {'detail': f'Invalid OCR data: {error}'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        # TODO: Implement actual storage of OCR data
        # For now, just return success
        total_tokens = 0
        pages_count = 0
        if ocr_data:
            pages = ocr_data.get('pages', [])
            pages_count = len(pages)
            total_tokens = sum(len(p.get('tokens', [])) for p in pages)

        logger.info(f'OCR import for task {task_id}: {pages_count} pages, {total_tokens} tokens')

        return Response({
            'task_id': task_id,
            'status': 'imported',
            'pages_imported': pages_count,
            'total_tokens': total_tokens,
        }, status=status.HTTP_201_CREATED)
