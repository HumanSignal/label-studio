# This file and its contents are licensed under the Apache License 2.0.
# Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
OCR data models.

Note: OCR token data is stored as JSON files in storage backends (S3, GCS, local).
This module contains optional cache models for performance optimization.
No new database tables are required for core functionality.
"""

from django.db import models
from tasks.models import Task


class OcrPageCache(models.Model):
    """
    Optional cache for frequently accessed OCR page data.

    This model provides caching for OCR tokens to reduce storage backend
    round-trips for frequently annotated documents.
    """

    task = models.ForeignKey(
        Task,
        on_delete=models.CASCADE,
        related_name='ocr_cache',
        help_text='Task this OCR data belongs to'
    )
    page_index = models.IntegerField(
        help_text='0-based page number'
    )
    token_count = models.IntegerField(
        default=0,
        help_text='Number of tokens on this page'
    )
    data = models.JSONField(
        help_text='OcrPageData as JSON'
    )
    fetched_at = models.DateTimeField(
        auto_now_add=True,
        help_text='When this cache entry was created'
    )

    class Meta:
        unique_together = ['task', 'page_index']
        indexes = [
            models.Index(fields=['task', 'page_index']),
        ]
        verbose_name = 'OCR Page Cache'
        verbose_name_plural = 'OCR Page Caches'

    def __str__(self):
        return f'OCR Cache: Task {self.task_id}, Page {self.page_index}'
