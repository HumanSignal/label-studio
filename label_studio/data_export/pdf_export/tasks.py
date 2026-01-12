"""Background tasks for PDF ML Export.

This module provides django-rq tasks for asynchronous PDF ML export processing.
"""

import logging
import os
import shutil
import traceback as tb
from datetime import datetime
from pathlib import Path
from typing import Optional
from uuid import uuid4

from django.conf import settings
from django.core.files import File

from .django_models import PdfExportJob

logger = logging.getLogger(__name__)


def run_pdf_ml_export(export_job_id: int):
    """Run PDF ML export job.

    This is the main entry point for the async export task.
    It orchestrates the full export pipeline:
    1. Load project and tasks
    2. Extract layout from each PDF document
    3. Convert annotations to export format
    4. Generate W3C format (if enabled)
    5. Render page images (if enabled)
    6. Create export package with schemas
    7. Generate ZIP archive

    Args:
        export_job_id: ID of the PdfExportJob model instance
    """
    try:
        export_job = PdfExportJob.objects.get(id=export_job_id)
    except PdfExportJob.DoesNotExist:
        logger.error(f"Export job {export_job_id} not found")
        return

    logger.info(f"Starting PDF ML export {export_job.export_id}")
    export_job.mark_started()

    try:
        # Import here to avoid circular imports
        from tasks.models import Task

        from . import EXPORT_SCHEMA_VERSION
        from .exporter import (
            build_canonical_text_and_index,
            compute_pdf_hash,
            create_document_manifest,
            export_single_document,
            generate_doc_id,
            process_page,
            save_document_manifest,
            save_page_layout,
        )
        from .package_builder import ExportPackageBuilder

        # Get output directory
        output_dir = _get_output_directory(export_job)
        export_job.output_dir = str(output_dir)
        export_job.save(update_fields=["output_dir"])

        # Initialize package builder
        builder = ExportPackageBuilder(
            output_dir=str(output_dir),
            project_id=export_job.project_id,
            export_id=str(export_job.export_id),
            created_by=export_job.created_by_id,
        )
        builder.initialize()

        # Get tasks to export
        tasks = _get_tasks_to_export(export_job)
        total_tasks = tasks.count()

        if total_tasks == 0:
            logger.warning(f"No tasks to export for job {export_job.export_id}")
            export_job.mark_completed(
                stats={
                    "total_documents": 0,
                    "completed_documents": 0,
                    "failed_documents": 0,
                    "total_pages": 0,
                    "total_annotations": 0,
                }
            )
            return

        export_job.total_documents = total_tasks
        export_job.save(update_fields=["total_documents"])

        # Import logging utilities
        from .logging_config import (
            log_document_completed,
            log_document_failed,
        )

        # Process each task
        completed = 0
        failed = 0
        errors = []

        for idx, task in enumerate(tasks):
            doc_id = f"task_{task.id}"  # Temporary doc_id for error tracking
            try:
                _process_task(
                    task=task,
                    export_job=export_job,
                    builder=builder,
                )
                completed += 1
                log_document_completed(
                    str(export_job.export_id),
                    task.id,
                    doc_id,
                    0,  # num_pages (not available here)
                    0,  # num_annotations (not available here)
                )

            except PdfExportError as e:
                # Handle known PDF export errors (recoverable)
                logger.warning(
                    f"Recoverable error exporting task {task.id}: {e}",
                    exc_info=False,
                )
                failed += 1
                error_entry = {
                    "task_id": task.id,
                    "doc_id": doc_id,
                    "error_type": e.error_type,
                    "error_message": str(e),
                    "timestamp": datetime.utcnow().isoformat() + "Z",
                }
                errors.append(error_entry)

                # Add to package builder as failed document
                from .models import ExportError

                builder.add_failed_document(
                    doc_id=doc_id,
                    task_id=task.id,
                    error=ExportError(
                        doc_id=doc_id,
                        task_id=task.id,
                        error_type=e.error_type,
                        error_message=str(e),
                        timestamp=datetime.utcnow().isoformat() + "Z",
                    ),
                )

                log_document_failed(
                    str(export_job.export_id),
                    task.id,
                    doc_id,
                    str(e),
                )

            except Exception as e:
                # Handle unexpected errors
                logger.error(
                    f"Unexpected error exporting task {task.id}: {e}",
                    exc_info=True,
                )
                failed += 1
                error_entry = {
                    "task_id": task.id,
                    "doc_id": doc_id,
                    "error_type": "unexpected_error",
                    "error_message": str(e),
                    "timestamp": datetime.utcnow().isoformat() + "Z",
                }
                errors.append(error_entry)

                # Add to package builder as failed document
                from .models import ExportError

                builder.add_failed_document(
                    doc_id=doc_id,
                    task_id=task.id,
                    error=ExportError(
                        doc_id=doc_id,
                        task_id=task.id,
                        error_type="unexpected_error",
                        error_message=str(e),
                        timestamp=datetime.utcnow().isoformat() + "Z",
                    ),
                )

                log_document_failed(
                    str(export_job.export_id),
                    task.id,
                    doc_id,
                    str(e),
                )

            # Update progress
            progress = int((idx + 1) / total_tasks * 90)  # Reserve 10% for packaging
            export_job.update_progress(
                percent=progress,
                message=f"Processing document {idx + 1} of {total_tasks}",
                completed=completed,
                failed=failed,
            )

        # Finalize export package
        export_job.update_progress(
            percent=95,
            message="Finalizing export package...",
        )

        export_index = builder.finalize()

        # Create ZIP archive
        export_job.update_progress(
            percent=98,
            message="Creating ZIP archive...",
        )

        zip_path = builder.create_zip_archive()

        # Save ZIP file to model
        if os.path.exists(zip_path):
            with open(zip_path, "rb") as f:
                file_name = f"pdf-ml-export-{export_job.export_id}.zip"
                file_path = f"{export_job.project_id}/{file_name}"
                export_job.zip_file.save(file_path, File(f))
                export_job.file_size_bytes = os.path.getsize(zip_path)
            # Clean up temp zip file (but keep output_dir for manifest access)
            os.remove(zip_path)

        # Final statistics
        stats = {
            "total_documents": total_tasks,
            "completed_documents": completed,
            "failed_documents": failed,
            "total_pages": export_index.statistics.total_pages,
            "total_annotations": export_index.statistics.total_annotations,
        }

        if failed > 0:
            export_job.mark_partial(stats=stats, errors=errors)
        else:
            export_job.mark_completed(stats=stats)

        logger.info(
            f"PDF ML export {export_job.export_id} completed: "
            f"{completed} documents, {failed} errors"
        )

    except Exception as e:
        logger.exception(f"PDF ML export {export_job.export_id} failed: {e}")
        export_job.mark_failed(
            error_message=str(e),
            traceback_str=tb.format_exc(),
        )


def set_export_failure(job, connection, type, value, traceback_obj):
    """Callback for RQ job failure.

    Args:
        job: RQ job object
        connection: Redis connection
        type: Exception type
        value: Exception value
        traceback_obj: Traceback object
    """
    export_job_id = job.args[0]

    try:
        trace = "".join(tb.format_exception(type, value, traceback_obj))
    except Exception:
        trace = "Failed to format traceback"

    try:
        export_job = PdfExportJob.objects.get(id=export_job_id)
        export_job.mark_failed(
            error_message=str(value),
            traceback_str=trace,
        )
    except PdfExportJob.DoesNotExist:
        logger.error(f"Export job {export_job_id} not found for failure callback")


def _get_output_directory(export_job: PdfExportJob) -> Path:
    """Get or create output directory for export.

    Args:
        export_job: Export job model

    Returns:
        Path to output directory
    """
    # Use configured export directory or temp directory
    base_dir = getattr(settings, "PDF_EXPORT_DIR", None)
    if not base_dir:
        base_dir = os.path.join(settings.MEDIA_ROOT, "pdf_exports")

    output_dir = Path(base_dir) / str(export_job.project_id) / str(export_job.export_id)
    output_dir.mkdir(parents=True, exist_ok=True)

    return output_dir


def _get_tasks_to_export(export_job: PdfExportJob):
    """Get tasks to export based on job configuration.

    Args:
        export_job: Export job model

    Returns:
        QuerySet of tasks to export
    """
    from tasks.models import Task

    queryset = Task.objects.filter(project_id=export_job.project_id)

    # Filter by specific task IDs if provided
    if export_job.task_ids:
        queryset = queryset.filter(id__in=export_job.task_ids)

    # Only export tasks with PDF data
    queryset = queryset.filter(data__has_key="pdf")

    return queryset.order_by("id")


class PdfExportError(Exception):
    """Base exception for PDF export errors."""

    def __init__(self, message: str, error_type: str = "export_error"):
        super().__init__(message)
        self.error_type = error_type


class PdfCorruptError(PdfExportError):
    """Exception for corrupted or invalid PDF files."""

    def __init__(self, message: str):
        super().__init__(message, error_type="pdf_corrupt")


class PdfNotFoundError(PdfExportError):
    """Exception for missing PDF files."""

    def __init__(self, message: str):
        super().__init__(message, error_type="pdf_not_found")


class ExtractionFailedError(PdfExportError):
    """Exception for PDF extraction failures."""

    def __init__(self, message: str):
        super().__init__(message, error_type="extraction_failed")


def _process_task(
    task,
    export_job: PdfExportJob,
    builder,
):
    """Process a single task for export.

    This function handles a single task, extracting layout from PDF,
    converting annotations, and adding to the export package.

    Error handling:
    - Missing PDF files: Raises PdfNotFoundError
    - Corrupted PDFs: Raises PdfCorruptError
    - Extraction failures: Raises ExtractionFailedError

    Args:
        task: Task model instance
        export_job: Export job model
        builder: ExportPackageBuilder instance

    Raises:
        PdfNotFoundError: When PDF file is not found
        PdfCorruptError: When PDF is corrupted or invalid
        ExtractionFailedError: When layout extraction fails
    """
    from . import EXPORT_SCHEMA_VERSION, ID_ALGORITHM_VERSION
    from .annotation_builder import convert_ls_annotation_to_records
    from .exporter import (
        build_canonical_text_and_index,
        compute_pdf_hash,
        generate_doc_id,
        get_pipeline_versions,
        process_page,
        save_page_layout,
    )
    from .layout_extractor import get_pdf_page_count
    from .logging_config import (
        log_document_completed,
        log_document_failed,
        log_document_started,
    )
    from .models import DocumentManifest, ExportError, ExportOptions
    from .page_renderer import render_document_pages

    # Log document start
    log_document_started(str(export_job.export_id), task.id, "")

    # Get PDF path from task data
    pdf_path = _get_pdf_path_from_task(task)
    if not pdf_path:
        raise PdfNotFoundError(f"No PDF file found for task {task.id}")

    # Verify PDF file exists
    if not os.path.exists(pdf_path):
        raise PdfNotFoundError(f"PDF file does not exist: {pdf_path}")

    # Validate PDF and get basic info with corruption detection
    try:
        # Compute document ID and hash
        pdf_hash = compute_pdf_hash(pdf_path)
        doc_id = generate_doc_id(pdf_hash, task.id)

        # Get page count (this will fail for corrupted PDFs)
        num_pages = get_pdf_page_count(pdf_path)

        if num_pages == 0:
            raise PdfCorruptError(f"PDF has 0 pages: {pdf_path}")

    except PdfCorruptError:
        raise
    except Exception as e:
        # Catch pdfplumber/PyPDF2 errors for corrupted PDFs
        error_msg = str(e).lower()
        if any(
            indicator in error_msg
            for indicator in [
                "corrupt",
                "invalid",
                "encrypted",
                "password",
                "damaged",
                "malformed",
                "eof marker",
                "startxref",
            ]
        ):
            raise PdfCorruptError(f"PDF appears to be corrupted: {e}")
        raise ExtractionFailedError(f"Failed to read PDF: {e}")

    # Create export options
    options = ExportOptions(
        include_page_images=export_job.include_page_images,
        include_w3c=export_job.include_w3c,
        render_dpi=export_job.render_dpi,
    )

    # Generate layout version ID
    layout_version_id = str(uuid4())

    # Process each page
    page_layouts = []
    layout_files = []
    total_words = 0
    total_tables = 0

    for page_num in range(1, num_pages + 1):
        page_layout = process_page(
            pdf_path=pdf_path,
            page_number=page_num,
            doc_id=doc_id,
            layout_version_id=layout_version_id,
            render_dpi=options.render_dpi,
        )
        page_layouts.append(page_layout)

        # Count words and tables
        total_words += len(page_layout.words)
        total_tables += len(page_layout.tables) if page_layout.tables else 0

        # Save page layout file
        doc_dir = builder.add_document(
            manifest=DocumentManifest(
                doc_id=doc_id,
                task_id=task.id,
                pdf_path=pdf_path,
                sha256=pdf_hash,
                num_pages=num_pages,
                layout_version_id=layout_version_id,
                id_algorithm_version=ID_ALGORITHM_VERSION,
                export_schema_version=EXPORT_SCHEMA_VERSION,
                pipeline=get_pipeline_versions(),
                render={"dpi": options.render_dpi, "coordinate_system": "pixels"},
                layout_files=[],
            ),
            num_words=total_words,
            num_tables=total_tables,
        ) if page_num == num_pages else None

    # Save layout files
    doc_dir = str(builder.output_dir / "docs" / doc_id)
    for i, page_layout in enumerate(page_layouts):
        layout_path = save_page_layout(page_layout, doc_dir)
        layout_files.append(os.path.basename(layout_path))

    # Render page images if enabled
    page_images = []
    if options.include_page_images:
        page_images = render_document_pages(
            pdf_path=pdf_path,
            doc_id=doc_id,
            output_dir=doc_dir,
            dpi=options.render_dpi,
        )

    # Update manifest with layout files and images
    manifest = DocumentManifest(
        doc_id=doc_id,
        task_id=task.id,
        pdf_path=pdf_path,
        sha256=pdf_hash,
        num_pages=num_pages,
        layout_version_id=layout_version_id,
        id_algorithm_version=ID_ALGORITHM_VERSION,
        export_schema_version=EXPORT_SCHEMA_VERSION,
        pipeline=get_pipeline_versions(),
        render={"dpi": options.render_dpi, "coordinate_system": "pixels"},
        layout_files=layout_files,
        page_images=page_images if page_images else None,
        created_at=datetime.utcnow().isoformat() + "Z",
    )

    # Save manifest
    import json

    manifest_path = os.path.join(doc_dir, "manifest.json")
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest.to_dict(), f, ensure_ascii=False, indent=2)

    # Convert annotations to records
    annotations = task.annotations.all()
    for annotation in annotations:
        records = convert_ls_annotation_to_records(
            annotation=annotation,
            doc_id=doc_id,
            task_id=task.id,
            page_layouts=page_layouts,
        )
        for record in records:
            builder.add_annotation(record)


def _get_pdf_path_from_task(task) -> Optional[str]:
    """Extract PDF file path from task data.

    Args:
        task: Task model instance

    Returns:
        Absolute path to PDF file, or None if not found
    """
    from django.conf import settings

    data = task.data or {}

    # Check for 'pdf' key in task data
    pdf_url = data.get("pdf") or data.get("$pdf$")
    if not pdf_url:
        # Check for other common keys
        for key in ["document", "file", "url"]:
            if key in data and str(data[key]).lower().endswith(".pdf"):
                pdf_url = data[key]
                break

    if not pdf_url:
        return None

    # Handle local file paths
    if pdf_url.startswith("/"):
        return pdf_url

    # Handle /data/local-files/ URLs
    if pdf_url.startswith("/data/local-files/"):
        local_path = pdf_url.replace("/data/local-files/", "")
        base_dir = getattr(settings, "LOCAL_FILES_DOCUMENT_ROOT", None)
        if base_dir:
            return os.path.join(base_dir, local_path)

    # Handle /data/upload/ URLs
    if pdf_url.startswith("/data/upload/"):
        upload_path = pdf_url.replace("/data/upload/", "")
        return os.path.join(settings.MEDIA_ROOT, settings.UPLOAD_DIR, upload_path)

    # Handle s3:// or gs:// URLs - these need to be downloaded
    if pdf_url.startswith(("s3://", "gs://", "http://", "https://")):
        # For cloud storage, we would need to download the file first
        # This is a placeholder for future implementation
        logger.warning(f"Cloud storage URLs not yet supported: {pdf_url}")
        return None

    return None
