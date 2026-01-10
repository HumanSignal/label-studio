# This file and its contents are licensed under the Apache License 2.0.
# Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
URL routing for OCR API endpoints.
"""

from django.urls import path

from . import api

app_name = 'ocr'

urlpatterns = [
    # OCR page metadata for a task
    path(
        'tasks/<int:task_id>/pages',
        api.OcrPagesAPI.as_view(),
        name='ocr-pages'
    ),
    # OCR tokens for a specific page
    path(
        'tasks/<int:task_id>/pages/<int:page_index>/tokens',
        api.OcrTokensAPI.as_view(),
        name='ocr-tokens'
    ),
    # OCR tokens within a region (for text extraction)
    path(
        'tasks/<int:task_id>/pages/<int:page_index>/tokens/region',
        api.OcrRegionTokensAPI.as_view(),
        name='ocr-region-tokens'
    ),
    # Import OCR data for a task
    path(
        'tasks/<int:task_id>/import',
        api.OcrImportAPI.as_view(),
        name='ocr-import'
    ),
]
