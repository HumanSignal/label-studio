"""Django models for PDF ML Export.

This module provides Django ORM models for tracking PDF ML export jobs.
"""

import logging
import os
from uuid import uuid4

from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _

logger = logging.getLogger(__name__)


class PdfExportJob(models.Model):
    """Django model for tracking PDF ML export jobs.

    This model stores metadata about PDF ML export jobs including:
    - Export configuration (DPI, include images, W3C format)
    - Job status and progress
    - Output file references
    - Error tracking for partial failures
    """

    class Status(models.TextChoices):
        CREATED = "created", _("Created")
        IN_PROGRESS = "in_progress", _("In progress")
        COMPLETED = "completed", _("Completed")
        PARTIAL = "partial", _("Partial success")
        FAILED = "failed", _("Failed")

    # Primary identifiers
    export_id = models.CharField(
        max_length=36,
        unique=True,
        default=uuid4,
        editable=False,
        help_text="Unique export job identifier (UUID)",
    )

    # Relationships
    project = models.ForeignKey(
        "projects.Project",
        related_name="pdf_exports",
        on_delete=models.CASCADE,
        help_text="Label Studio project",
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="+",
        on_delete=models.SET_NULL,
        null=True,
        verbose_name=_("created by"),
        help_text="User who initiated the export",
    )

    # Export configuration
    include_page_images = models.BooleanField(
        default=True,
        help_text="Include rendered page images (PNG)",
    )
    include_w3c = models.BooleanField(
        default=False,
        help_text="Include W3C Web Annotation format",
    )
    render_dpi = models.PositiveIntegerField(
        default=200,
        help_text="DPI for page image rendering",
    )

    # Task filtering
    task_ids = models.JSONField(
        default=list,
        blank=True,
        help_text="Specific task IDs to export (empty = all tasks)",
    )

    # Status tracking
    status = models.CharField(
        max_length=32,
        choices=Status.choices,
        default=Status.CREATED,
        help_text="Export job status",
    )
    progress_percent = models.PositiveIntegerField(
        default=0,
        help_text="Export progress (0-100)",
    )
    progress_message = models.TextField(
        blank=True,
        default="",
        help_text="Human-readable progress message",
    )

    # Statistics
    total_documents = models.PositiveIntegerField(
        default=0,
        help_text="Total documents to export",
    )
    completed_documents = models.PositiveIntegerField(
        default=0,
        help_text="Successfully exported documents",
    )
    failed_documents = models.PositiveIntegerField(
        default=0,
        help_text="Failed documents",
    )
    total_pages = models.PositiveIntegerField(
        default=0,
        help_text="Total pages exported",
    )
    total_annotations = models.PositiveIntegerField(
        default=0,
        help_text="Total annotations exported",
    )

    # Output files
    output_dir = models.CharField(
        max_length=512,
        blank=True,
        default="",
        help_text="Path to export output directory",
    )
    zip_file = models.FileField(
        upload_to=settings.DELAYED_EXPORT_DIR,
        null=True,
        blank=True,
        help_text="ZIP archive of export bundle",
    )
    file_size_bytes = models.BigIntegerField(
        null=True,
        blank=True,
        help_text="Size of ZIP file in bytes",
    )

    # Error tracking
    errors = models.JSONField(
        default=list,
        blank=True,
        help_text="List of export errors",
    )
    traceback = models.TextField(
        blank=True,
        default="",
        help_text="Traceback for fatal errors",
    )

    # Timestamps
    created_at = models.DateTimeField(
        auto_now_add=True,
        help_text="When the export was created",
    )
    started_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When export processing started",
    )
    finished_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When export completed or failed",
    )

    # Export schema version
    export_schema_version = models.CharField(
        max_length=32,
        default="1.0.0",
        help_text="Version of the export schema",
    )

    class Meta:
        app_label = "data_export"
        db_table = "pdf_export_job"
        ordering = ["-created_at"]
        verbose_name = "PDF ML Export Job"
        verbose_name_plural = "PDF ML Export Jobs"
        indexes = [
            models.Index(fields=["project", "-created_at"]),
            models.Index(fields=["status"]),
            models.Index(fields=["export_id"]),
        ]

    def __str__(self):
        return f"PdfExportJob {self.export_id} ({self.status})"

    def get_default_title(self):
        """Generate default title for export."""
        return f"PDF ML Export - Project {self.project_id}"

    def get_output_filename(self):
        """Get the filename for the ZIP archive."""
        return f"pdf-ml-export-{self.export_id}.zip"

    def delete(self, *args, **kwargs):
        """Delete export and associated files."""
        # Delete ZIP file if exists
        if self.zip_file:
            try:
                self.zip_file.delete(save=False)
            except Exception as e:
                logger.error(f"Failed to delete ZIP file: {e}")

        # Delete output directory if exists
        if self.output_dir and os.path.exists(self.output_dir):
            try:
                import shutil

                shutil.rmtree(self.output_dir)
            except Exception as e:
                logger.error(f"Failed to delete output directory: {e}")

        super().delete(*args, **kwargs)

    def update_progress(
        self,
        percent: int,
        message: str = "",
        completed: int = None,
        failed: int = None,
    ):
        """Update export progress.

        Args:
            percent: Progress percentage (0-100)
            message: Human-readable progress message
            completed: Number of completed documents
            failed: Number of failed documents
        """
        self.progress_percent = min(100, max(0, percent))
        if message:
            self.progress_message = message
        if completed is not None:
            self.completed_documents = completed
        if failed is not None:
            self.failed_documents = failed
        self.save(
            update_fields=[
                "progress_percent",
                "progress_message",
                "completed_documents",
                "failed_documents",
            ]
        )

    def mark_started(self):
        """Mark export as started."""
        from django.utils import timezone

        self.status = self.Status.IN_PROGRESS
        self.started_at = timezone.now()
        self.save(update_fields=["status", "started_at"])

    def mark_completed(self, stats: dict = None):
        """Mark export as completed.

        Args:
            stats: Dictionary with export statistics
        """
        from django.utils import timezone

        self.status = self.Status.COMPLETED
        self.finished_at = timezone.now()
        self.progress_percent = 100
        self.progress_message = "Export completed successfully"

        if stats:
            self.total_documents = stats.get("total_documents", self.total_documents)
            self.completed_documents = stats.get(
                "completed_documents", self.completed_documents
            )
            self.failed_documents = stats.get("failed_documents", self.failed_documents)
            self.total_pages = stats.get("total_pages", self.total_pages)
            self.total_annotations = stats.get(
                "total_annotations", self.total_annotations
            )

        self.save()

    def mark_partial(self, stats: dict = None, errors: list = None):
        """Mark export as partially successful.

        Args:
            stats: Dictionary with export statistics
            errors: List of error dictionaries
        """
        from django.utils import timezone

        self.status = self.Status.PARTIAL
        self.finished_at = timezone.now()
        self.progress_percent = 100
        self.progress_message = "Export completed with errors"

        if stats:
            self.total_documents = stats.get("total_documents", self.total_documents)
            self.completed_documents = stats.get(
                "completed_documents", self.completed_documents
            )
            self.failed_documents = stats.get("failed_documents", self.failed_documents)
            self.total_pages = stats.get("total_pages", self.total_pages)
            self.total_annotations = stats.get(
                "total_annotations", self.total_annotations
            )

        if errors:
            self.errors = errors

        self.save()

    def mark_failed(self, error_message: str, traceback_str: str = ""):
        """Mark export as failed.

        Args:
            error_message: Error message
            traceback_str: Full traceback string
        """
        from django.utils import timezone

        self.status = self.Status.FAILED
        self.finished_at = timezone.now()
        self.progress_message = error_message
        self.traceback = traceback_str
        self.save(
            update_fields=["status", "finished_at", "progress_message", "traceback"]
        )
