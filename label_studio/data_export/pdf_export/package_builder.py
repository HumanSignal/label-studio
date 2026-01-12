"""Export Package Builder for PDF ML Export.

This module provides functions to package PDF ML exports into a complete
bundle with:
- Export index (export_index.json) with document list and statistics
- Annotation sharding for large exports (>100k records)
- Schema files for validation
- Deterministic file ordering for reproducibility
- ZIP archive generation
"""

import json
import logging
import os
import shutil
import zipfile
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
from uuid import uuid4

from . import ANNOTATION_SHARD_THRESHOLD, EXPORT_SCHEMA_VERSION
from .models import (
    AnnotationRecord,
    DocumentManifest,
    ExportError,
    ExportOptions,
    ExportProgress,
    ExportStatus,
)
from .validator import copy_schemas_to_export

logger = logging.getLogger(__name__)


@dataclass
class DocumentEntry:
    """Entry for a document in the export index."""

    doc_id: str
    task_id: int
    status: str  # "completed" or "failed"
    manifest_path: str
    num_pages: int = 0
    num_annotations: int = 0
    num_words: int = 0
    num_tables: int = 0
    error: Optional[str] = None

    def to_dict(self) -> dict:
        """Convert to dictionary."""
        result = {
            "doc_id": self.doc_id,
            "task_id": self.task_id,
            "status": self.status,
            "manifest_path": self.manifest_path,
            "num_pages": self.num_pages,
            "num_annotations": self.num_annotations,
        }
        if self.error:
            result["error"] = self.error
        return result


@dataclass
class AnnotationFileEntry:
    """Entry for an annotation file in the export index."""

    path: str
    record_count: int

    def to_dict(self) -> dict:
        """Convert to dictionary."""
        return {
            "path": self.path,
            "record_count": self.record_count,
        }


@dataclass
class ExportStatistics:
    """Statistics for an export bundle."""

    total_documents: int = 0
    completed_documents: int = 0
    failed_documents: int = 0
    total_pages: int = 0
    total_annotations: int = 0
    total_words: int = 0
    total_tables: int = 0

    def to_dict(self) -> dict:
        """Convert to dictionary."""
        return {
            "total_documents": self.total_documents,
            "completed_documents": self.completed_documents,
            "failed_documents": self.failed_documents,
            "total_pages": self.total_pages,
            "total_annotations": self.total_annotations,
            "total_words": self.total_words,
            "total_tables": self.total_tables,
        }


@dataclass
class ExportIndex:
    """Export index containing all bundle metadata."""

    export_id: str
    export_schema_version: str
    project_id: int
    created_at: str
    status: str
    statistics: ExportStatistics
    documents: List[DocumentEntry] = field(default_factory=list)
    annotation_files: List[AnnotationFileEntry] = field(default_factory=list)
    errors: List[Dict[str, Any]] = field(default_factory=list)
    created_by: Optional[int] = None

    def to_dict(self) -> dict:
        """Convert to dictionary."""
        result = {
            "export_id": self.export_id,
            "export_schema_version": self.export_schema_version,
            "project_id": self.project_id,
            "created_at": self.created_at,
            "status": self.status,
            "statistics": self.statistics.to_dict(),
            "documents": [d.to_dict() for d in self.documents],
            "annotation_files": [f.to_dict() for f in self.annotation_files],
        }
        if self.created_by:
            result["created_by"] = self.created_by
        if self.errors:
            result["errors"] = self.errors
        return result


class AnnotationSharder:
    """Handles sharding of large annotation files.

    Splits annotation records across multiple JSONL files when
    the count exceeds the shard threshold.
    """

    def __init__(
        self,
        output_dir: str,
        shard_threshold: int = ANNOTATION_SHARD_THRESHOLD,
    ):
        """Initialize sharder.

        Args:
            output_dir: Output directory for shard files
            shard_threshold: Records per shard (default 100,000)
        """
        self.output_dir = Path(output_dir)
        self.shard_threshold = shard_threshold
        self.current_shard = 0
        self.current_count = 0
        self.current_file = None
        self.shard_files: List[AnnotationFileEntry] = []

    def _get_shard_path(self, shard_num: int) -> Path:
        """Get path for a shard file."""
        if shard_num == 0:
            return self.output_dir / "annotations.jsonl"
        return self.output_dir / f"annotations_part_{shard_num:04d}.jsonl"

    def _open_new_shard(self) -> None:
        """Open a new shard file."""
        if self.current_file:
            self.current_file.close()
            # Record the completed shard
            if self.current_count > 0:
                path = self._get_shard_path(self.current_shard)
                self.shard_files.append(
                    AnnotationFileEntry(
                        path=path.name,
                        record_count=self.current_count,
                    )
                )
            self.current_shard += 1

        path = self._get_shard_path(self.current_shard)
        self.current_file = open(path, "w", encoding="utf-8")
        self.current_count = 0

    def write(self, record: AnnotationRecord) -> None:
        """Write an annotation record.

        Automatically creates new shard when threshold is reached.

        Args:
            record: Annotation record to write
        """
        if self.current_file is None:
            self._open_new_shard()

        if self.current_count >= self.shard_threshold:
            self._open_new_shard()

        line = json.dumps(record.to_dict(), ensure_ascii=False)
        self.current_file.write(line)
        self.current_file.write("\n")
        self.current_count += 1

    def close(self) -> List[AnnotationFileEntry]:
        """Close the sharder and return file entries.

        Returns:
            List of annotation file entries for export index
        """
        if self.current_file:
            self.current_file.close()
            if self.current_count > 0:
                path = self._get_shard_path(self.current_shard)
                self.shard_files.append(
                    AnnotationFileEntry(
                        path=path.name,
                        record_count=self.current_count,
                    )
                )
            self.current_file = None

        return self.shard_files


class ExportPackageBuilder:
    """Builds complete export packages with all required files.

    Handles:
    - Document organization
    - Annotation sharding
    - Export index generation
    - Schema file copying
    - ZIP archive creation
    """

    def __init__(
        self,
        output_dir: str,
        project_id: int,
        export_id: Optional[str] = None,
        created_by: Optional[int] = None,
    ):
        """Initialize package builder.

        Args:
            output_dir: Output directory for export
            project_id: Label Studio project ID
            export_id: Export ID (generated if not provided)
            created_by: User ID who triggered export
        """
        self.output_dir = Path(output_dir)
        self.project_id = project_id
        self.export_id = export_id or str(uuid4())
        self.created_by = created_by

        self.statistics = ExportStatistics()
        self.documents: List[DocumentEntry] = []
        self.errors: List[Dict[str, Any]] = []
        self.annotation_sharder: Optional[AnnotationSharder] = None

    def initialize(self) -> None:
        """Initialize the export package directory structure."""
        self.output_dir.mkdir(parents=True, exist_ok=True)

        # Create subdirectories
        (self.output_dir / "docs").mkdir(exist_ok=True)
        (self.output_dir / "schemas").mkdir(exist_ok=True)

        # Initialize annotation sharder
        self.annotation_sharder = AnnotationSharder(self.output_dir)

        # Copy schema files
        copy_schemas_to_export(str(self.output_dir))

    def add_document(
        self,
        manifest: DocumentManifest,
        num_words: int = 0,
        num_tables: int = 0,
    ) -> str:
        """Add a completed document to the package.

        Args:
            manifest: Document manifest
            num_words: Total words in document
            num_tables: Total tables in document

        Returns:
            Path to document directory
        """
        doc_dir = self.output_dir / "docs" / manifest.doc_id
        doc_dir.mkdir(parents=True, exist_ok=True)

        # Create document entry
        entry = DocumentEntry(
            doc_id=manifest.doc_id,
            task_id=manifest.task_id,
            status="completed",
            manifest_path=f"docs/{manifest.doc_id}/manifest.json",
            num_pages=manifest.num_pages,
            num_words=num_words,
            num_tables=num_tables,
        )
        self.documents.append(entry)

        # Update statistics
        self.statistics.total_documents += 1
        self.statistics.completed_documents += 1
        self.statistics.total_pages += manifest.num_pages
        self.statistics.total_words += num_words
        self.statistics.total_tables += num_tables

        return str(doc_dir)

    def add_failed_document(
        self,
        doc_id: str,
        task_id: int,
        error: ExportError,
    ) -> None:
        """Add a failed document to the package.

        Args:
            doc_id: Document ID
            task_id: Task ID
            error: Export error
        """
        entry = DocumentEntry(
            doc_id=doc_id,
            task_id=task_id,
            status="failed",
            manifest_path="",
            error=error.error_message,
        )
        self.documents.append(entry)
        self.errors.append(error.to_dict())

        self.statistics.total_documents += 1
        self.statistics.failed_documents += 1

    def add_annotation(self, record: AnnotationRecord) -> None:
        """Add an annotation record.

        Args:
            record: Annotation record
        """
        if self.annotation_sharder:
            self.annotation_sharder.write(record)
            self.statistics.total_annotations += 1

    def add_annotations(self, records: List[AnnotationRecord]) -> None:
        """Add multiple annotation records.

        Args:
            records: List of annotation records
        """
        for record in records:
            self.add_annotation(record)

    def finalize(self) -> ExportIndex:
        """Finalize the export package and create export index.

        Returns:
            Export index object
        """
        # Close annotation sharder
        annotation_files = []
        if self.annotation_sharder:
            annotation_files = self.annotation_sharder.close()

        # Update document annotation counts
        # (In a real implementation, this would track per-document counts)

        # Determine export status
        if self.statistics.failed_documents == 0:
            status = "completed"
        elif self.statistics.completed_documents > 0:
            status = "partial"
        else:
            status = "failed"

        # Sort documents for deterministic ordering
        self.documents.sort(key=lambda d: (d.task_id, d.doc_id))

        # Create export index
        index = ExportIndex(
            export_id=self.export_id,
            export_schema_version=EXPORT_SCHEMA_VERSION,
            project_id=self.project_id,
            created_at=datetime.utcnow().isoformat() + "Z",
            status=status,
            statistics=self.statistics,
            documents=self.documents,
            annotation_files=annotation_files,
            errors=self.errors,
            created_by=self.created_by,
        )

        # Write export index
        index_path = self.output_dir / "export_index.json"
        with open(index_path, "w", encoding="utf-8") as f:
            json.dump(index.to_dict(), f, ensure_ascii=False, indent=2)

        return index

    def create_zip_archive(
        self,
        zip_path: Optional[str] = None,
    ) -> str:
        """Create ZIP archive of the export bundle.

        Args:
            zip_path: Path for ZIP file (auto-generated if not provided)

        Returns:
            Path to created ZIP file
        """
        if zip_path is None:
            zip_path = str(self.output_dir) + ".zip"

        # Get all files in deterministic order
        files_to_add = []
        for root, dirs, files in os.walk(self.output_dir):
            # Sort directories for deterministic order
            dirs.sort()
            for filename in sorted(files):
                filepath = Path(root) / filename
                arcname = filepath.relative_to(self.output_dir)
                files_to_add.append((filepath, arcname))

        # Create ZIP with deterministic ordering
        with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
            for filepath, arcname in files_to_add:
                zf.write(filepath, arcname)

        return zip_path


def create_export_package(
    output_dir: str,
    project_id: int,
    documents: List[Tuple[DocumentManifest, List[AnnotationRecord]]],
    errors: Optional[List[ExportError]] = None,
    export_id: Optional[str] = None,
    created_by: Optional[int] = None,
    create_zip: bool = True,
) -> Tuple[ExportIndex, Optional[str]]:
    """High-level function to create a complete export package.

    Args:
        output_dir: Output directory
        project_id: Label Studio project ID
        documents: List of (manifest, annotations) tuples
        errors: Optional list of export errors
        export_id: Export ID
        created_by: User who triggered export
        create_zip: Whether to create ZIP archive

    Returns:
        Tuple of (ExportIndex, zip_path or None)
    """
    builder = ExportPackageBuilder(
        output_dir=output_dir,
        project_id=project_id,
        export_id=export_id,
        created_by=created_by,
    )

    builder.initialize()

    # Add documents and annotations
    for manifest, annotations in documents:
        doc_dir = builder.add_document(manifest)

        # Write manifest
        manifest_path = Path(doc_dir) / "manifest.json"
        with open(manifest_path, "w", encoding="utf-8") as f:
            json.dump(manifest.to_dict(), f, ensure_ascii=False, indent=2)

        # Add annotations
        builder.add_annotations(annotations)

    # Add errors
    if errors:
        for error in errors:
            builder.add_failed_document(
                doc_id=error.doc_id,
                task_id=error.task_id,
                error=error,
            )

    # Finalize
    index = builder.finalize()

    # Create ZIP if requested
    zip_path = None
    if create_zip:
        zip_path = builder.create_zip_archive()

    return index, zip_path
