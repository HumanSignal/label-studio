"""Logging configuration for PDF ML Export.

This module provides logging setup and utilities for the PDF export pipeline.
Following the observability requirements (FR-OBS-001, FR-OBS-002), we log:
- Export job lifecycle events (started, completed, failed)
- Per-document processing events
- Errors with full context for debugging
"""

import logging
from functools import wraps
from typing import Any, Callable, Optional

# Logger for the pdf_export module
logger = logging.getLogger("label_studio.data_export.pdf_export")


def setup_pdf_export_logging(level: int = logging.INFO) -> logging.Logger:
    """Configure logging for PDF export module.

    Args:
        level: Logging level (default INFO)

    Returns:
        Configured logger instance
    """
    logger.setLevel(level)

    # Only add handler if none exists
    if not logger.handlers:
        handler = logging.StreamHandler()
        handler.setLevel(level)
        formatter = logging.Formatter(
            "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
        )
        handler.setFormatter(formatter)
        logger.addHandler(handler)

    return logger


def get_logger() -> logging.Logger:
    """Get the PDF export logger instance.

    Returns:
        Logger for pdf_export module
    """
    return logger


def log_export_started(
    export_id: str,
    project_id: int,
    task_count: int,
    options: Optional[dict] = None,
) -> None:
    """Log export job start event.

    Args:
        export_id: Unique export identifier
        project_id: Label Studio project ID
        task_count: Number of tasks to export
        options: Export options dict
    """
    logger.info(
        "PDF export started",
        extra={
            "export_id": export_id,
            "project_id": project_id,
            "task_count": task_count,
            "options": options or {},
        },
    )


def log_export_completed(
    export_id: str,
    project_id: int,
    task_count: int,
    page_count: int,
    annotation_count: int,
    duration_seconds: float,
    status: str = "completed",
) -> None:
    """Log export job completion event.

    Args:
        export_id: Unique export identifier
        project_id: Label Studio project ID
        task_count: Number of tasks exported
        page_count: Total pages processed
        annotation_count: Total annotations exported
        duration_seconds: Export duration
        status: Final status (completed or partial)
    """
    logger.info(
        "PDF export completed",
        extra={
            "export_id": export_id,
            "project_id": project_id,
            "task_count": task_count,
            "page_count": page_count,
            "annotation_count": annotation_count,
            "duration_seconds": duration_seconds,
            "status": status,
        },
    )


def log_export_failed(
    export_id: str,
    project_id: int,
    error_type: str,
    error_message: str,
    duration_seconds: Optional[float] = None,
) -> None:
    """Log export job failure event.

    Args:
        export_id: Unique export identifier
        project_id: Label Studio project ID
        error_type: Type of error
        error_message: Error description
        duration_seconds: Duration before failure
    """
    logger.error(
        "PDF export failed",
        extra={
            "export_id": export_id,
            "project_id": project_id,
            "error_type": error_type,
            "error_message": error_message,
            "duration_seconds": duration_seconds,
        },
    )


def log_document_started(
    export_id: str,
    doc_id: str,
    task_id: int,
    page_count: int,
) -> None:
    """Log document processing start.

    Args:
        export_id: Export job ID
        doc_id: Document identifier
        task_id: Label Studio task ID
        page_count: Number of pages in document
    """
    logger.debug(
        "Processing document started",
        extra={
            "export_id": export_id,
            "doc_id": doc_id,
            "task_id": task_id,
            "page_count": page_count,
        },
    )


def log_document_completed(
    export_id: str,
    doc_id: str,
    task_id: int,
    page_count: int,
    annotation_count: int,
    duration_seconds: float,
) -> None:
    """Log document processing completion.

    Args:
        export_id: Export job ID
        doc_id: Document identifier
        task_id: Label Studio task ID
        page_count: Pages processed
        annotation_count: Annotations exported
        duration_seconds: Processing duration
    """
    logger.debug(
        "Processing document completed",
        extra={
            "export_id": export_id,
            "doc_id": doc_id,
            "task_id": task_id,
            "page_count": page_count,
            "annotation_count": annotation_count,
            "duration_seconds": duration_seconds,
        },
    )


def log_document_failed(
    export_id: str,
    doc_id: str,
    task_id: int,
    error_type: str,
    error_message: str,
) -> None:
    """Log document processing failure.

    Args:
        export_id: Export job ID
        doc_id: Document identifier
        task_id: Label Studio task ID
        error_type: Type of error
        error_message: Error description
    """
    logger.warning(
        "Processing document failed",
        extra={
            "export_id": export_id,
            "doc_id": doc_id,
            "task_id": task_id,
            "error_type": error_type,
            "error_message": error_message,
        },
    )


def log_page_processed(
    export_id: str,
    doc_id: str,
    page_number: int,
    word_count: int,
    table_count: int,
) -> None:
    """Log page processing completion.

    Args:
        export_id: Export job ID
        doc_id: Document identifier
        page_number: Page number (1-indexed)
        word_count: Number of words extracted
        table_count: Number of tables detected
    """
    logger.debug(
        "Page processed",
        extra={
            "export_id": export_id,
            "doc_id": doc_id,
            "page_number": page_number,
            "word_count": word_count,
            "table_count": table_count,
        },
    )


def logged_operation(operation_name: str) -> Callable:
    """Decorator to log function entry, exit, and errors.

    Args:
        operation_name: Name to use in log messages

    Returns:
        Decorator function
    """

    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args: Any, **kwargs: Any) -> Any:
            logger.debug(f"{operation_name} started")
            try:
                result = func(*args, **kwargs)
                logger.debug(f"{operation_name} completed")
                return result
            except Exception as e:
                logger.error(f"{operation_name} failed: {e}")
                raise

        return wrapper

    return decorator
