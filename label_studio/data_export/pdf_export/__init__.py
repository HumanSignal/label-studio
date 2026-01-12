"""PDF ML Export module for Label Studio.

This module provides machine-readable PDF annotation export with:
- Full document layout context (words, lines, blocks, tables)
- Deterministic structural IDs for reproducible anchoring
- W3C Web Annotation JSON-LD format support
- Page image rendering at configurable DPI

Usage:
    from label_studio.data_export.pdf_export import PdfMlExporter

    exporter = PdfMlExporter(project_id=123, options=export_options)
    result = exporter.export()
"""

# Module version
__version__ = "1.0.0"

# Export schema version (semver)
EXPORT_SCHEMA_VERSION = "1.0.0"

# ID algorithm version for deterministic ID generation
ID_ALGORITHM_VERSION = "sha256_v1"

# Default export options
DEFAULT_DPI = 200
DEFAULT_INCLUDE_PAGE_IMAGES = True
DEFAULT_INCLUDE_W3C = False

# Coverage threshold for canonical layer selection
# If pdf_text coverage >= this threshold, use pdf_text; else use ocr
CANONICAL_COVERAGE_THRESHOLD = 0.7

# Bbox quantization for deterministic ID generation (pixels)
BBOX_QUANTIZATION_PX = 2

# Annotation sharding threshold
ANNOTATION_SHARD_THRESHOLD = 100_000

# Export format registration info
PDF_ML_FORMAT = {
    "name": "PDF_ML",
    "title": "PDF ML Export",
    "description": "Machine-readable PDF annotations with full layout context (words, lines, blocks, tables), deterministic IDs, and optional W3C Web Annotation format",
    "link": "https://labelstud.io/guide/export#pdf-ml-format",
    "tags": ["pdf", "layout", "ml"],
}

# Import core models and utilities
from .models import (
    AnnotationEvidence,
    AnnotationMetadata,
    AnnotationRecord,
    AnnotationSource,
    AnnotationType,
    BBoxPt,
    BBoxXYWH,
    Block,
    BlockType,
    CanonicalIndex,
    CanonicalSelection,
    Cell,
    DocumentManifest,
    ExportError,
    ExportFormat,
    ExportJob,
    ExportOptions,
    ExportProgress,
    ExportStatus,
    LayerId,
    Line,
    PageGeometry,
    PageLayout,
    Table,
    TextLayer,
    Token,
    Word,
)
from .coordinates import (
    apply_rotation_to_bbox,
    bbox_to_xywh_string,
    calculate_render_scale,
    calculate_rendered_dimensions,
    merge_bboxes,
    pdf_points_to_pixels,
    pdfplumber_to_bbox,
    pixels_to_pdf_points,
    quantize_bbox,
)
from .text_utils import (
    clean_word_text,
    compute_text_hash_input,
    extract_quote_context,
    find_word_boundaries,
    fuzzy_match_score,
    is_valid_word,
    join_blocks_to_page,
    join_lines_to_block,
    join_words_to_line,
    levenshtein_distance,
    normalize_unicode,
    normalize_whitespace,
    truncate_text,
)
from .logging_config import (
    get_logger,
    log_document_completed,
    log_document_failed,
    log_document_started,
    log_export_completed,
    log_export_failed,
    log_export_started,
    log_page_processed,
    logged_operation,
    setup_pdf_export_logging,
)

# Phase 3: Layout extraction
from .layout_extractor import (
    calculate_coverage,
    extract_page_geometry,
    extract_pdf_page,
    extract_text_layer,
    extract_tokens_from_page,
    get_pdf_page_count,
    group_lines_into_blocks,
    group_tokens_into_lines,
    select_canonical_layer,
)

# Phase 3: Export orchestration
from .exporter import (
    build_canonical_text_and_index,
    compute_pdf_hash,
    create_document_manifest,
    export_single_document,
    generate_block_id,
    generate_doc_id,
    generate_line_id,
    generate_word_id,
    get_pipeline_versions,
    process_page,
    save_document_manifest,
    save_page_layout,
)

# Phase 3: OCR integration
from .ocr_integration import (
    OcrProvider,
    TesseractOcrProvider,
    extract_ocr_layer,
    get_default_ocr_provider,
)

# Phase 6: Canonical text and annotation building (User Story 4)
from .canonical_text import (
    build_canonical_index,
    build_canonical_text,
    extract_text_from_char_range,
    find_word_ids_in_range,
    get_char_range_for_word_ids,
    rebuild_text_from_elements,
    update_elements_with_positions,
)
from .annotation_builder import (
    JsonlWriter,
    calculate_multi_bboxes,
    convert_ls_annotation_to_records,
    determine_annotation_source,
    determine_annotation_type,
    export_annotations_jsonl,
    find_words_in_bbox,
)

# Phase 7: W3C Web Annotation converter (User Story 5)
from .w3c_converter import (
    FragmentSelector,
    SpecificResource,
    TextPositionSelector,
    TextQuoteSelector,
    W3CAnnotation,
    convert_annotation_to_w3c,
    convert_records_to_w3c,
    export_w3c_annotations,
    extract_prefix_suffix,
)

# Phase 8: Page rendering (User Story 6)
from .page_renderer import (
    calculate_render_dimensions,
    get_rendered_dimensions,
    is_rendering_available,
    render_all_pages,
    render_and_save_page,
    render_document_pages,
    render_page,
    save_page_image,
    verify_page_image,
)

# Phase 9: Table handling (User Story 7)
from .table_handler import (
    calculate_structure_confidence,
    detect_header_rows,
    detect_merged_cells,
    detect_tables,
    extract_tables_from_page,
    find_words_in_cells,
)

# Phase 10: Schema validation and export packaging (User Story 8)
from .validator import (
    ExportValidator,
    copy_schemas_to_export,
    get_schema_dir,
    load_schema,
    validate_annotation_record,
    validate_export_index,
    validate_file,
    validate_json,
    validate_jsonl_file,
    validate_manifest,
    validate_page_layout,
)
from .package_builder import (
    AnnotationFileEntry,
    AnnotationSharder,
    DocumentEntry,
    ExportIndex,
    ExportPackageBuilder,
    ExportStatistics,
    create_export_package,
)

# Phase 13: Performance utilities and security
from .security import (
    MAX_PDF_SIZE_BYTES,
    MAX_ANNOTATION_FILE_SIZE,
    PathSecurityError,
    SecurePathContext,
    compute_file_checksum,
    is_path_safe,
    log_security_event,
    sanitize_filename,
    validate_file_size,
    validate_output_path,
    validate_path_within_root,
    validate_pdf_path,
    verify_file_integrity,
)
from .performance import (
    BatchConfig,
    ProgressTracker,
    StreamingJsonlReader,
    StreamingJsonlWriter,
    batch_iterator,
    chunk_pages,
    estimate_memory_usage,
    process_in_batches,
    process_pages_streaming,
    process_pdf_in_chunks,
    should_use_streaming,
    stream_pages,
    track_progress,
)

# Phase 11: Django models and API (conditional import to avoid Django dependency issues)
try:
    from .django_models import PdfExportJob
    from .api import (
        PdfExportDetailAPI,
        PdfExportDownloadAPI,
        PdfExportListCreateAPI,
        PdfExportManifestAPI,
    )
    from .tasks import run_pdf_ml_export
except ImportError:
    # Django not configured - skip these imports
    PdfExportJob = None
    PdfExportDetailAPI = None
    PdfExportDownloadAPI = None
    PdfExportListCreateAPI = None
    PdfExportManifestAPI = None
    run_pdf_ml_export = None

__all__ = [
    # Constants
    "__version__",
    "EXPORT_SCHEMA_VERSION",
    "ID_ALGORITHM_VERSION",
    "DEFAULT_DPI",
    "DEFAULT_INCLUDE_PAGE_IMAGES",
    "DEFAULT_INCLUDE_W3C",
    "CANONICAL_COVERAGE_THRESHOLD",
    "BBOX_QUANTIZATION_PX",
    "ANNOTATION_SHARD_THRESHOLD",
    "PDF_ML_FORMAT",
    # Models - Core
    "ExportFormat",
    "ExportStatus",
    "LayerId",
    "BlockType",
    "AnnotationType",
    "AnnotationSource",
    "ExportOptions",
    "BBoxXYWH",
    "BBoxPt",
    "PageGeometry",
    "ExportProgress",
    "ExportError",
    "ExportJob",
    "DocumentManifest",
    # Models - Layout (Phase 3)
    "Token",
    "TextLayer",
    "Word",
    "Line",
    "Block",
    "CanonicalSelection",
    "CanonicalIndex",
    "PageLayout",
    # Coordinate utilities
    "pdf_points_to_pixels",
    "pixels_to_pdf_points",
    "calculate_render_scale",
    "calculate_rendered_dimensions",
    "apply_rotation_to_bbox",
    "pdfplumber_to_bbox",
    "bbox_to_xywh_string",
    "quantize_bbox",
    "merge_bboxes",
    # Text utilities
    "normalize_unicode",
    "normalize_whitespace",
    "clean_word_text",
    "is_valid_word",
    "join_words_to_line",
    "join_lines_to_block",
    "join_blocks_to_page",
    "extract_quote_context",
    "find_word_boundaries",
    "truncate_text",
    "compute_text_hash_input",
    "levenshtein_distance",
    "fuzzy_match_score",
    # Logging
    "get_logger",
    "setup_pdf_export_logging",
    "log_export_started",
    "log_export_completed",
    "log_export_failed",
    "log_document_started",
    "log_document_completed",
    "log_document_failed",
    "log_page_processed",
    "logged_operation",
    # Layout extraction (Phase 3)
    "extract_page_geometry",
    "extract_tokens_from_page",
    "extract_text_layer",
    "extract_pdf_page",
    "get_pdf_page_count",
    "calculate_coverage",
    "group_tokens_into_lines",
    "group_lines_into_blocks",
    "select_canonical_layer",
    # Export orchestration (Phase 3)
    "generate_doc_id",
    "generate_word_id",
    "generate_line_id",
    "generate_block_id",
    "compute_pdf_hash",
    "build_canonical_text_and_index",
    "process_page",
    "export_single_document",
    "save_page_layout",
    "create_document_manifest",
    "save_document_manifest",
    "get_pipeline_versions",
    # OCR integration (Phase 3)
    "OcrProvider",
    "TesseractOcrProvider",
    "get_default_ocr_provider",
    "extract_ocr_layer",
    # Annotation models (Phase 6)
    "AnnotationEvidence",
    "AnnotationMetadata",
    "AnnotationRecord",
    # Canonical text (Phase 6)
    "build_canonical_text",
    "build_canonical_index",
    "get_char_range_for_word_ids",
    "extract_text_from_char_range",
    "find_word_ids_in_range",
    "update_elements_with_positions",
    "rebuild_text_from_elements",
    # Annotation builder (Phase 6)
    "calculate_multi_bboxes",
    "find_words_in_bbox",
    "determine_annotation_type",
    "determine_annotation_source",
    "convert_ls_annotation_to_records",
    "JsonlWriter",
    "export_annotations_jsonl",
    # W3C Web Annotation (Phase 7)
    "TextQuoteSelector",
    "TextPositionSelector",
    "FragmentSelector",
    "SpecificResource",
    "W3CAnnotation",
    "extract_prefix_suffix",
    "convert_annotation_to_w3c",
    "convert_records_to_w3c",
    "export_w3c_annotations",
    # Page rendering (Phase 8)
    "is_rendering_available",
    "render_page",
    "render_all_pages",
    "save_page_image",
    "render_and_save_page",
    "render_document_pages",
    "get_rendered_dimensions",
    "calculate_render_dimensions",
    "verify_page_image",
    # Table handling (Phase 9)
    "Cell",
    "Table",
    "detect_tables",
    "detect_header_rows",
    "detect_merged_cells",
    "calculate_structure_confidence",
    "find_words_in_cells",
    "extract_tables_from_page",
    # Schema validation (Phase 10)
    "get_schema_dir",
    "load_schema",
    "validate_json",
    "validate_manifest",
    "validate_page_layout",
    "validate_annotation_record",
    "validate_export_index",
    "validate_file",
    "validate_jsonl_file",
    "ExportValidator",
    "copy_schemas_to_export",
    # Export packaging (Phase 10)
    "DocumentEntry",
    "AnnotationFileEntry",
    "ExportStatistics",
    "ExportIndex",
    "AnnotationSharder",
    "ExportPackageBuilder",
    "create_export_package",
    # Django models (Phase 11)
    "PdfExportJob",
    # API endpoints (Phase 11)
    "PdfExportListCreateAPI",
    "PdfExportDetailAPI",
    "PdfExportDownloadAPI",
    "PdfExportManifestAPI",
    # Async tasks (Phase 11)
    "run_pdf_ml_export",
    # Performance utilities (Phase 13)
    "BatchConfig",
    "ProgressTracker",
    "StreamingJsonlReader",
    "StreamingJsonlWriter",
    "batch_iterator",
    "chunk_pages",
    "estimate_memory_usage",
    "process_in_batches",
    "process_pages_streaming",
    "process_pdf_in_chunks",
    "should_use_streaming",
    "stream_pages",
    "track_progress",
    # Security utilities (Phase 13)
    "MAX_PDF_SIZE_BYTES",
    "MAX_ANNOTATION_FILE_SIZE",
    "PathSecurityError",
    "SecurePathContext",
    "compute_file_checksum",
    "is_path_safe",
    "log_security_event",
    "sanitize_filename",
    "validate_file_size",
    "validate_output_path",
    "validate_path_within_root",
    "validate_pdf_path",
    "verify_file_integrity",
]
