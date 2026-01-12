"""Data models for PDF ML Export.

This module defines the core data structures used throughout the PDF export pipeline,
including export options, bounding boxes, geometry, and annotation records.
"""

from dataclasses import dataclass, field
from enum import Enum
from typing import Dict, List, Optional


class ExportFormat(str, Enum):
    """Supported PDF export formats."""

    PDF_ML = "pdf_ml"
    PDF_ML_W3C = "pdf_ml_w3c"


class ExportStatus(str, Enum):
    """Export job status."""

    QUEUED = "queued"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    PARTIAL = "partial"
    FAILED = "failed"


class LayerId(str, Enum):
    """Text layer identifiers."""

    PDF_TEXT = "pdf_text"
    OCR = "ocr"


class BlockType(str, Enum):
    """Block type classifications."""

    PARAGRAPH = "paragraph"
    HEADING = "heading"
    LIST_ITEM = "list_item"
    CAPTION = "caption"
    OTHER = "other"


class AnnotationType(str, Enum):
    """Annotation type classifications."""

    FIELD = "field"
    REGION = "region"
    TABLE_REGION = "table_region"
    TABLE_CELL_FIELD = "table_cell_field"


class AnnotationSource(str, Enum):
    """Annotation source types."""

    MANUAL = "manual"
    MODEL_ASSISTED = "model_assisted"
    IMPORTED = "imported"


@dataclass
class ExportOptions:
    """Configuration options for PDF ML export.

    Attributes:
        format: Export format (pdf_ml or pdf_ml_w3c)
        render_dpi: DPI for page image rendering (default 200)
        include_page_images: Whether to include PNG page renders
        include_w3c: Whether to include W3C Web Annotation format
        task_filter: Optional task filter options
    """

    format: ExportFormat = ExportFormat.PDF_ML
    render_dpi: int = 200
    include_page_images: bool = True
    include_w3c: bool = False
    task_filter: Optional[dict] = None

    def __post_init__(self):
        """Validate export options."""
        if self.render_dpi < 72:
            raise ValueError("render_dpi must be at least 72")
        if self.render_dpi > 600:
            raise ValueError("render_dpi must not exceed 600")


@dataclass
class BBoxXYWH:
    """Bounding box with x, y, width, height format.

    All coordinates are in rendered PNG pixel space, origin top-left.

    Attributes:
        x: Top-left x coordinate (pixels)
        y: Top-left y coordinate (pixels)
        width: Box width (pixels)
        height: Box height (pixels)
    """

    x: int
    y: int
    width: int
    height: int

    def __post_init__(self):
        """Validate bbox values."""
        if self.x < 0:
            raise ValueError("x must be non-negative")
        if self.y < 0:
            raise ValueError("y must be non-negative")
        if self.width <= 0:
            raise ValueError("width must be positive")
        if self.height <= 0:
            raise ValueError("height must be positive")

    def to_dict(self) -> dict:
        """Convert to dictionary format."""
        return {
            "x": self.x,
            "y": self.y,
            "width": self.width,
            "height": self.height,
        }

    @classmethod
    def from_dict(cls, data: dict) -> "BBoxXYWH":
        """Create from dictionary."""
        return cls(
            x=data["x"],
            y=data["y"],
            width=data["width"],
            height=data["height"],
        )

    def contains_point(self, px: int, py: int) -> bool:
        """Check if point is within bbox."""
        return (self.x <= px < self.x + self.width) and (self.y <= py < self.y + self.height)

    def intersects(self, other: "BBoxXYWH") -> bool:
        """Check if this bbox intersects with another."""
        return not (
            self.x + self.width <= other.x
            or other.x + other.width <= self.x
            or self.y + self.height <= other.y
            or other.y + other.height <= self.y
        )

    def union(self, other: "BBoxXYWH") -> "BBoxXYWH":
        """Return union bbox containing both boxes."""
        min_x = min(self.x, other.x)
        min_y = min(self.y, other.y)
        max_x = max(self.x + self.width, other.x + other.width)
        max_y = max(self.y + self.height, other.y + other.height)
        return BBoxXYWH(x=min_x, y=min_y, width=max_x - min_x, height=max_y - min_y)


@dataclass
class BBoxPt:
    """Bounding box in PDF points (x0, y0, x1, y1) format.

    Used for source PDF coordinates before conversion to pixels.

    Attributes:
        x0: Left x coordinate (points)
        y0: Top y coordinate (points, after conversion to top-left origin)
        x1: Right x coordinate (points)
        y1: Bottom y coordinate (points)
    """

    x0: float
    y0: float
    x1: float
    y1: float

    @property
    def width(self) -> float:
        """Width in points."""
        return self.x1 - self.x0

    @property
    def height(self) -> float:
        """Height in points."""
        return self.y1 - self.y0

    def to_list(self) -> list:
        """Convert to [x0, y0, x1, y1] list."""
        return [self.x0, self.y0, self.x1, self.y1]


@dataclass
class PageGeometry:
    """PDF page geometry information.

    Attributes:
        pdf_page_width_pt: Page width in PDF points
        pdf_page_height_pt: Page height in PDF points
        rotation_deg: Page rotation (0, 90, 180, 270)
        media_box_pt: Media box in points
        crop_box_pt: Crop box in points
        render_dpi: Rendering DPI used
        render_scale: Scale factor (dpi / 72)
        rendered_width_px: Rendered image width in pixels
        rendered_height_px: Rendered image height in pixels
    """

    pdf_page_width_pt: float
    pdf_page_height_pt: float
    rotation_deg: int
    media_box_pt: BBoxPt
    crop_box_pt: BBoxPt
    render_dpi: int
    render_scale: float
    rendered_width_px: int
    rendered_height_px: int

    def __post_init__(self):
        """Validate geometry."""
        if self.rotation_deg not in (0, 90, 180, 270):
            raise ValueError("rotation_deg must be 0, 90, 180, or 270")

    def to_dict(self) -> dict:
        """Convert to dictionary format."""
        return {
            "pdf_page_width_pt": self.pdf_page_width_pt,
            "pdf_page_height_pt": self.pdf_page_height_pt,
            "rotation_deg": self.rotation_deg,
            "media_box_pt": self.media_box_pt.to_list(),
            "crop_box_pt": self.crop_box_pt.to_list(),
            "render_dpi": self.render_dpi,
            "render_scale": self.render_scale,
            "rendered_width_px": self.rendered_width_px,
            "rendered_height_px": self.rendered_height_px,
        }


@dataclass
class ExportProgress:
    """Export job progress information.

    Attributes:
        total_tasks: Total number of tasks to export
        processed_tasks: Number of tasks processed
        total_pages: Total number of pages across all tasks
        processed_pages: Number of pages processed
        total_annotations: Total annotations to export
        processed_annotations: Annotations processed
    """

    total_tasks: int = 0
    processed_tasks: int = 0
    total_pages: int = 0
    processed_pages: int = 0
    total_annotations: int = 0
    processed_annotations: int = 0

    @property
    def percent_complete(self) -> float:
        """Calculate completion percentage."""
        if self.total_tasks == 0:
            return 0.0
        return (self.processed_tasks / self.total_tasks) * 100

    def to_dict(self) -> dict:
        """Convert to dictionary format."""
        return {
            "total_tasks": self.total_tasks,
            "processed_tasks": self.processed_tasks,
            "total_pages": self.total_pages,
            "processed_pages": self.processed_pages,
            "total_annotations": self.total_annotations,
            "processed_annotations": self.processed_annotations,
            "percent_complete": self.percent_complete,
        }


@dataclass
class ExportError:
    """Error information for failed document exports.

    Attributes:
        doc_id: Document identifier
        task_id: Label Studio task ID
        error_type: Type of error (e.g., "pdf_corrupt", "extraction_failed")
        error_message: Human-readable error message
        timestamp: ISO8601 timestamp when error occurred
    """

    doc_id: str
    task_id: int
    error_type: str
    error_message: str
    timestamp: str

    def to_dict(self) -> dict:
        """Convert to dictionary format."""
        return {
            "doc_id": self.doc_id,
            "task_id": self.task_id,
            "error_type": self.error_type,
            "error_message": self.error_message,
            "timestamp": self.timestamp,
        }


@dataclass
class ExportJob:
    """Export job tracking model.

    Attributes:
        export_id: Unique export identifier (UUID)
        project_id: Label Studio project ID
        status: Current export status
        options: Export configuration options
        progress: Export progress tracking
        errors: List of errors encountered
        created_at: Job creation timestamp
        created_by: User ID who triggered export
        started_at: Processing start timestamp
        finished_at: Processing completion timestamp
        download_url: URL to download completed export
    """

    export_id: str
    project_id: int
    status: ExportStatus
    options: ExportOptions
    progress: ExportProgress = field(default_factory=ExportProgress)
    errors: list = field(default_factory=list)
    created_at: Optional[str] = None
    created_by: Optional[int] = None
    started_at: Optional[str] = None
    finished_at: Optional[str] = None
    download_url: Optional[str] = None

    def to_dict(self) -> dict:
        """Convert to dictionary format for API response."""
        result = {
            "id": self.export_id,
            "project_id": self.project_id,
            "status": self.status.value,
            "progress": self.progress.to_dict(),
            "created_at": self.created_at,
        }
        if self.created_by:
            result["created_by"] = self.created_by
        if self.started_at:
            result["started_at"] = self.started_at
        if self.finished_at:
            result["finished_at"] = self.finished_at
        if self.download_url:
            result["download_url"] = self.download_url
        if self.errors:
            result["error_count"] = len(self.errors)
        return result


@dataclass
class DocumentManifest:
    """Document manifest with PDF geometry and pipeline versions.

    Contains all metadata about a single exported document including
    identifiers, file hashes, pipeline versions, and render settings.

    Attributes:
        doc_id: Deterministic document ID (12-char hex)
        task_id: Label Studio task ID
        pdf_path: Original PDF file path (relative to export)
        sha256: SHA-256 hash of PDF content
        num_pages: Number of pages in the document
        layout_version_id: UUID for this extraction run
        id_algorithm_version: Version of ID generation algorithm
        export_schema_version: Version of export schema
        pipeline: Pipeline version information
        render: Render settings and coordinate system
        layout_files: List of layout file paths (relative)
        page_images: List of page image paths (optional)
        created_at: Export timestamp (ISO8601)
    """

    doc_id: str
    task_id: int
    pdf_path: str
    sha256: str
    num_pages: int
    layout_version_id: str
    id_algorithm_version: str
    export_schema_version: str
    pipeline: Dict[str, str]
    render: Dict[str, any]
    layout_files: List[str]
    page_images: Optional[List[str]] = None
    created_at: Optional[str] = None

    def to_dict(self) -> dict:
        """Convert to dictionary format for JSON serialization."""
        result = {
            "doc_id": self.doc_id,
            "task_id": self.task_id,
            "pdf_path": self.pdf_path,
            "sha256": self.sha256,
            "num_pages": self.num_pages,
            "layout_version_id": self.layout_version_id,
            "id_algorithm_version": self.id_algorithm_version,
            "export_schema_version": self.export_schema_version,
            "pipeline": self.pipeline,
            "render": self.render,
            "layout_files": self.layout_files,
        }
        if self.page_images:
            result["page_images"] = self.page_images
        if self.created_at:
            result["created_at"] = self.created_at
        return result

    @classmethod
    def from_dict(cls, data: dict) -> "DocumentManifest":
        """Create from dictionary."""
        return cls(
            doc_id=data["doc_id"],
            task_id=data["task_id"],
            pdf_path=data["pdf_path"],
            sha256=data["sha256"],
            num_pages=data["num_pages"],
            layout_version_id=data["layout_version_id"],
            id_algorithm_version=data["id_algorithm_version"],
            export_schema_version=data["export_schema_version"],
            pipeline=data["pipeline"],
            render=data["render"],
            layout_files=data["layout_files"],
            page_images=data.get("page_images"),
            created_at=data.get("created_at"),
        )


# =============================================================================
# Phase 3: Layout Structure Models (User Story 1)
# =============================================================================


@dataclass
class Token:
    """Raw text token from PDF extraction.

    Represents a single word/token as extracted from PDF before grouping.

    Attributes:
        token_id: Temporary ID for processing
        text: Token text content
        bbox: Bounding box in pixel coordinates
        confidence: OCR confidence (0.0-1.0), None for pdf_text layer
        font_name: Font name (pdf_text layer only)
        font_size: Font size in points (pdf_text layer only)
        is_bold: Bold font flag (pdf_text layer only)
        is_italic: Italic font flag (pdf_text layer only)
    """

    token_id: str
    text: str
    bbox: "BBoxXYWH"
    confidence: Optional[float] = None
    font_name: Optional[str] = None
    font_size: Optional[float] = None
    is_bold: Optional[bool] = None
    is_italic: Optional[bool] = None

    def to_dict(self) -> dict:
        """Convert to dictionary format."""
        result = {
            "token_id": self.token_id,
            "text": self.text,
            "bbox": self.bbox.to_dict(),
        }
        if self.confidence is not None:
            result["confidence"] = self.confidence
        if self.font_name is not None:
            result["font_name"] = self.font_name
        if self.font_size is not None:
            result["font_size"] = self.font_size
        if self.is_bold is not None:
            result["is_bold"] = self.is_bold
        if self.is_italic is not None:
            result["is_italic"] = self.is_italic
        return result


@dataclass
class TextLayer:
    """Collection of text tokens from a single extraction source.

    Represents either the native PDF text layer or OCR results.

    Attributes:
        layer_id: Layer identifier (pdf_text or ocr)
        source_engine: Engine used for extraction (e.g., "pdfplumber/0.10.x")
        coverage: Ratio of page area covered by text (0.0-1.0)
        word_count: Number of words in the layer
        tokens: List of extracted tokens
        avg_confidence: Average OCR confidence (OCR layer only)
    """

    layer_id: LayerId
    source_engine: str
    coverage: float
    word_count: int
    tokens: List[Token] = field(default_factory=list)
    avg_confidence: Optional[float] = None

    def __post_init__(self):
        """Validate layer data."""
        if not 0.0 <= self.coverage <= 1.0:
            raise ValueError("coverage must be between 0.0 and 1.0")
        if self.avg_confidence is not None and not 0.0 <= self.avg_confidence <= 1.0:
            raise ValueError("avg_confidence must be between 0.0 and 1.0")

    def to_dict(self) -> dict:
        """Convert to dictionary format."""
        result = {
            "layer_id": self.layer_id.value,
            "source_engine": self.source_engine,
            "coverage": self.coverage,
            "word_count": self.word_count,
            "tokens": [t.to_dict() for t in self.tokens],
        }
        if self.avg_confidence is not None:
            result["avg_confidence"] = self.avg_confidence
        return result


@dataclass
class Word:
    """Word element with deterministic ID and position information.

    Represents a word after grouping and ID assignment.

    Attributes:
        word_id: Deterministic ID (format: "w_{hash8}")
        text: Word text (Unicode NFC normalized)
        bbox: Bounding box in pixel coordinates
        line_id: Parent line ID
        block_id: Parent block ID
        reading_order: Global reading order within page
        char_start: Start position in canonical text
        char_end: End position in canonical text
        layer_id: Source layer (pdf_text or ocr)
        confidence: OCR confidence (OCR layer only)
    """

    word_id: str
    text: str
    bbox: "BBoxXYWH"
    line_id: str
    block_id: str
    reading_order: int
    char_start: int
    char_end: int
    layer_id: LayerId
    confidence: Optional[float] = None

    def to_dict(self) -> dict:
        """Convert to dictionary format."""
        result = {
            "word_id": self.word_id,
            "text": self.text,
            "bbox": self.bbox.to_dict(),
            "line_id": self.line_id,
            "block_id": self.block_id,
            "reading_order": self.reading_order,
            "char_start": self.char_start,
            "char_end": self.char_end,
            "layer_id": self.layer_id.value,
        }
        if self.confidence is not None:
            result["confidence"] = self.confidence
        return result

    @classmethod
    def from_dict(cls, data: dict) -> "Word":
        """Create from dictionary."""
        return cls(
            word_id=data["word_id"],
            text=data["text"],
            bbox=BBoxXYWH.from_dict(data["bbox"]),
            line_id=data["line_id"],
            block_id=data["block_id"],
            reading_order=data["reading_order"],
            char_start=data["char_start"],
            char_end=data["char_end"],
            layer_id=LayerId(data["layer_id"]),
            confidence=data.get("confidence"),
        )


@dataclass
class Line:
    """Line element grouping words.

    Represents a line of text containing multiple words.

    Attributes:
        line_id: Deterministic ID (format: "l_{hash8}")
        bbox: Bounding box containing all words
        block_id: Parent block ID
        word_ids: Ordered list of word IDs in this line
        text: Space-joined text of all words
        char_start: Start position in canonical text
        char_end: End position in canonical text
        reading_order: Reading order within block
    """

    line_id: str
    bbox: "BBoxXYWH"
    block_id: str
    word_ids: List[str]
    text: str
    char_start: int
    char_end: int
    reading_order: int

    def to_dict(self) -> dict:
        """Convert to dictionary format."""
        return {
            "line_id": self.line_id,
            "bbox": self.bbox.to_dict(),
            "block_id": self.block_id,
            "word_ids": self.word_ids,
            "text": self.text,
            "char_start": self.char_start,
            "char_end": self.char_end,
            "reading_order": self.reading_order,
        }

    @classmethod
    def from_dict(cls, data: dict) -> "Line":
        """Create from dictionary."""
        return cls(
            line_id=data["line_id"],
            bbox=BBoxXYWH.from_dict(data["bbox"]),
            block_id=data["block_id"],
            word_ids=data["word_ids"],
            text=data["text"],
            char_start=data["char_start"],
            char_end=data["char_end"],
            reading_order=data["reading_order"],
        )


@dataclass
class Block:
    """Block element grouping lines.

    Represents a text block (paragraph, heading, etc.) containing lines.

    Attributes:
        block_id: Deterministic ID (format: "b_{hash8}")
        bbox: Bounding box containing all lines
        block_type: Type classification (paragraph, heading, etc.)
        line_ids: Ordered list of line IDs in this block
        text: Lines joined by newlines
        char_start: Start position in canonical text
        char_end: End position in canonical text
        reading_order: Reading order within page
    """

    block_id: str
    bbox: "BBoxXYWH"
    block_type: BlockType
    line_ids: List[str]
    text: str
    char_start: int
    char_end: int
    reading_order: int

    def to_dict(self) -> dict:
        """Convert to dictionary format."""
        return {
            "block_id": self.block_id,
            "bbox": self.bbox.to_dict(),
            "block_type": self.block_type.value,
            "line_ids": self.line_ids,
            "text": self.text,
            "char_start": self.char_start,
            "char_end": self.char_end,
            "reading_order": self.reading_order,
        }

    @classmethod
    def from_dict(cls, data: dict) -> "Block":
        """Create from dictionary."""
        return cls(
            block_id=data["block_id"],
            bbox=BBoxXYWH.from_dict(data["bbox"]),
            block_type=BlockType(data["block_type"]),
            line_ids=data["line_ids"],
            text=data["text"],
            char_start=data["char_start"],
            char_end=data["char_end"],
            reading_order=data["reading_order"],
        )


@dataclass
class CanonicalSelection:
    """Canonical layer selection information.

    Documents which layer was selected as canonical and why.

    Attributes:
        layer_id: Selected layer (pdf_text or ocr)
        reason: Reason for selection (e.g., "pdf_text_coverage >= 0.7")
    """

    layer_id: LayerId
    reason: str

    def to_dict(self) -> dict:
        """Convert to dictionary format."""
        return {
            "layer_id": self.layer_id.value,
            "reason": self.reason,
        }


@dataclass
class CanonicalIndex:
    """Index mapping structural IDs to character positions.

    Enables fast lookup of character offsets for words, lines, blocks.

    Attributes:
        words: Word ID to (char_start, char_end) mapping
        lines: Line ID to (char_start, char_end) mapping
        blocks: Block ID to (char_start, char_end) mapping
    """

    words: Dict[str, tuple] = field(default_factory=dict)
    lines: Dict[str, tuple] = field(default_factory=dict)
    blocks: Dict[str, tuple] = field(default_factory=dict)

    def to_dict(self) -> dict:
        """Convert to dictionary format."""
        return {
            "words": {k: {"char_start": v[0], "char_end": v[1]} for k, v in self.words.items()},
            "lines": {k: {"char_start": v[0], "char_end": v[1]} for k, v in self.lines.items()},
            "blocks": {k: {"char_start": v[0], "char_end": v[1]} for k, v in self.blocks.items()},
        }

    def add_word(self, word_id: str, char_start: int, char_end: int) -> None:
        """Add word to index."""
        self.words[word_id] = (char_start, char_end)

    def add_line(self, line_id: str, char_start: int, char_end: int) -> None:
        """Add line to index."""
        self.lines[line_id] = (char_start, char_end)

    def add_block(self, block_id: str, char_start: int, char_end: int) -> None:
        """Add block to index."""
        self.blocks[block_id] = (char_start, char_end)


@dataclass
class PageLayout:
    """Complete page layout with all structural elements.

    Contains text layers, structural elements (words, lines, blocks),
    canonical text, and geometry information.

    Attributes:
        page_id: Page identifier (format: "{doc_id}:page_{NNN}")
        page_number: Page number (1-indexed)
        doc_id: Parent document ID
        layout_version_id: UUID for this extraction run
        geometry: Page geometry information
        layers: Text layers (pdf_text and/or ocr)
        canonical: Canonical layer selection info
        canonical_text: Full page text with normalized formatting
        canonical_index: Character offset index
        words: All words on the page
        lines: All lines on the page
        blocks: All blocks on the page
        tables: All tables on the page (populated in Phase 7)
    """

    page_id: str
    page_number: int
    doc_id: str
    layout_version_id: str
    geometry: PageGeometry
    layers: Dict[str, TextLayer]
    canonical: CanonicalSelection
    canonical_text: str
    canonical_index: CanonicalIndex
    words: List[Word]
    lines: List[Line]
    blocks: List[Block]
    tables: List = field(default_factory=list)  # Table type defined in Phase 7

    def to_dict(self) -> dict:
        """Convert to dictionary format for JSON serialization."""
        return {
            "page_id": self.page_id,
            "page_number": self.page_number,
            "doc_id": self.doc_id,
            "layout_version_id": self.layout_version_id,
            "geometry": self.geometry.to_dict(),
            "layers": {k: v.to_dict() for k, v in self.layers.items()},
            "canonical": self.canonical.to_dict(),
            "canonical_text": self.canonical_text,
            "canonical_index": self.canonical_index.to_dict(),
            "words": [w.to_dict() for w in self.words],
            "lines": [l.to_dict() for l in self.lines],
            "blocks": [b.to_dict() for b in self.blocks],
            "tables": [t.to_dict() if hasattr(t, "to_dict") else t for t in self.tables],
        }

    def get_word_by_id(self, word_id: str) -> Optional[Word]:
        """Find word by ID."""
        for word in self.words:
            if word.word_id == word_id:
                return word
        return None

    def get_line_by_id(self, line_id: str) -> Optional[Line]:
        """Find line by ID."""
        for line in self.lines:
            if line.line_id == line_id:
                return line
        return None

    def get_block_by_id(self, block_id: str) -> Optional[Block]:
        """Find block by ID."""
        for block in self.blocks:
            if block.block_id == block_id:
                return block
        return None

    def get_words_in_line(self, line_id: str) -> List[Word]:
        """Get all words in a line."""
        line = self.get_line_by_id(line_id)
        if not line:
            return []
        return [w for w in self.words if w.word_id in line.word_ids]

    def get_lines_in_block(self, block_id: str) -> List[Line]:
        """Get all lines in a block."""
        block = self.get_block_by_id(block_id)
        if not block:
            return []
        return [l for l in self.lines if l.line_id in block.line_ids]


# =============================================================================
# Phase 6: Annotation Models (User Story 4 - JSONL Export)
# =============================================================================


@dataclass
class AnnotationEvidence:
    """Evidence supporting an annotation with multi-span bbox support.

    Contains all spatial and textual evidence for an annotation, including
    support for multi-line highlights via multiple bboxes.

    Attributes:
        bboxes: List of bounding boxes (one per text fragment/line)
        word_ids: List of word IDs covered by this annotation
        quote: Exact text content of the annotation
        char_start: Start position in canonical text
        char_end: End position in canonical text
        page_id: Page identifier where annotation appears
        layer_id: Source layer (pdf_text or ocr)
    """

    bboxes: List[BBoxXYWH]
    word_ids: List[str]
    quote: str
    char_start: int
    char_end: int
    page_id: str
    layer_id: LayerId

    def to_dict(self) -> dict:
        """Convert to dictionary format."""
        return {
            "bboxes": [b.to_dict() for b in self.bboxes],
            "word_ids": self.word_ids,
            "quote": self.quote,
            "char_start": self.char_start,
            "char_end": self.char_end,
            "page_id": self.page_id,
            "layer_id": self.layer_id.value,
        }

    @classmethod
    def from_dict(cls, data: dict) -> "AnnotationEvidence":
        """Create from dictionary."""
        return cls(
            bboxes=[BBoxXYWH.from_dict(b) for b in data["bboxes"]],
            word_ids=data["word_ids"],
            quote=data["quote"],
            char_start=data["char_start"],
            char_end=data["char_end"],
            page_id=data["page_id"],
            layer_id=LayerId(data["layer_id"]),
        )


@dataclass
class AnnotationMetadata:
    """Metadata about an annotation's provenance.

    Tracks who created the annotation, when, and how it was created.

    Attributes:
        annotator_id: User ID who created the annotation
        annotator_email: Optional email of annotator
        created_at: Creation timestamp (ISO8601)
        updated_at: Last update timestamp (ISO8601)
        source: How annotation was created (manual, model_assisted, imported)
        lead_time_seconds: Time spent on annotation (if tracked)
    """

    annotator_id: int
    source: AnnotationSource
    created_at: str
    updated_at: Optional[str] = None
    annotator_email: Optional[str] = None
    lead_time_seconds: Optional[float] = None

    def to_dict(self) -> dict:
        """Convert to dictionary format."""
        result = {
            "annotator_id": self.annotator_id,
            "source": self.source.value,
            "created_at": self.created_at,
        }
        if self.updated_at:
            result["updated_at"] = self.updated_at
        if self.annotator_email:
            result["annotator_email"] = self.annotator_email
        if self.lead_time_seconds is not None:
            result["lead_time_seconds"] = self.lead_time_seconds
        return result

    @classmethod
    def from_dict(cls, data: dict) -> "AnnotationMetadata":
        """Create from dictionary."""
        return cls(
            annotator_id=data["annotator_id"],
            source=AnnotationSource(data["source"]),
            created_at=data["created_at"],
            updated_at=data.get("updated_at"),
            annotator_email=data.get("annotator_email"),
            lead_time_seconds=data.get("lead_time_seconds"),
        )


@dataclass
class AnnotationRecord:
    """Complete annotation record for JSONL export.

    Combines the annotation type/value with evidence and metadata
    for machine-readable export.

    Attributes:
        annotation_id: Unique annotation identifier
        task_id: Label Studio task ID
        doc_id: Document ID
        annotation_type: Type classification (field, region, table_region, table_cell_field)
        label: Annotation label/tag name
        value: Annotation value (for fields) or None
        evidence: Spatial and textual evidence
        metadata: Provenance information
        result_id: Label Studio result ID within annotation
        from_name: Label Studio control tag name
        to_name: Label Studio object tag name
    """

    annotation_id: str
    task_id: int
    doc_id: str
    annotation_type: AnnotationType
    label: str
    evidence: AnnotationEvidence
    metadata: AnnotationMetadata
    value: Optional[str] = None
    result_id: Optional[str] = None
    from_name: Optional[str] = None
    to_name: Optional[str] = None

    def to_dict(self) -> dict:
        """Convert to dictionary format for JSONL export."""
        result = {
            "annotation_id": self.annotation_id,
            "task_id": self.task_id,
            "doc_id": self.doc_id,
            "annotation_type": self.annotation_type.value,
            "label": self.label,
            "evidence": self.evidence.to_dict(),
            "metadata": self.metadata.to_dict(),
        }
        if self.value is not None:
            result["value"] = self.value
        if self.result_id:
            result["result_id"] = self.result_id
        if self.from_name:
            result["from_name"] = self.from_name
        if self.to_name:
            result["to_name"] = self.to_name
        return result

    @classmethod
    def from_dict(cls, data: dict) -> "AnnotationRecord":
        """Create from dictionary."""
        return cls(
            annotation_id=data["annotation_id"],
            task_id=data["task_id"],
            doc_id=data["doc_id"],
            annotation_type=AnnotationType(data["annotation_type"]),
            label=data["label"],
            evidence=AnnotationEvidence.from_dict(data["evidence"]),
            metadata=AnnotationMetadata.from_dict(data["metadata"]),
            value=data.get("value"),
            result_id=data.get("result_id"),
            from_name=data.get("from_name"),
            to_name=data.get("to_name"),
        )

    def to_jsonl_line(self) -> str:
        """Convert to JSONL line (single line JSON)."""
        import json

        return json.dumps(self.to_dict(), ensure_ascii=False)


# =============================================================================
# Phase 9: Table Structure Models (User Story 7)
# =============================================================================


@dataclass
class Cell:
    """Table cell with position, span, and content information.

    Represents a single cell in a detected table structure.

    Attributes:
        cell_id: Cell identifier (format: "{table_id}:r{NN}c{NN}")
        row: Row index (0-indexed)
        col: Column index (0-indexed)
        rowspan: Number of rows cell spans (default 1)
        colspan: Number of columns cell spans (default 1)
        bbox: Bounding box of cell
        text: Cell text content
        is_header: Whether this is a header cell
        word_ids: List of word IDs in this cell
    """

    cell_id: str
    row: int
    col: int
    bbox: BBoxXYWH
    text: str
    rowspan: int = 1
    colspan: int = 1
    is_header: bool = False
    word_ids: List[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        """Convert to dictionary format."""
        return {
            "cell_id": self.cell_id,
            "row": self.row,
            "col": self.col,
            "rowspan": self.rowspan,
            "colspan": self.colspan,
            "bbox": self.bbox.to_dict(),
            "text": self.text,
            "is_header": self.is_header,
            "word_ids": self.word_ids,
        }

    @classmethod
    def from_dict(cls, data: dict) -> "Cell":
        """Create from dictionary."""
        return cls(
            cell_id=data["cell_id"],
            row=data["row"],
            col=data["col"],
            rowspan=data.get("rowspan", 1),
            colspan=data.get("colspan", 1),
            bbox=BBoxXYWH.from_dict(data["bbox"]),
            text=data["text"],
            is_header=data.get("is_header", False),
            word_ids=data.get("word_ids", []),
        )


@dataclass
class Table:
    """Detected table with structure and cells.

    Represents a table detected on a PDF page with full structure
    information including cells, headers, and confidence.

    Attributes:
        table_id: Deterministic table ID (format: "t_{hash8}")
        bbox: Bounding box of entire table
        page_id: Parent page identifier
        n_rows: Number of rows
        n_cols: Number of columns
        cells: List of Cell objects
        structure_confidence: Confidence in structure detection (0.0-1.0)
        structure_reason: Explanation when confidence < 0.5
        reading_order: Reading order position on page
    """

    table_id: str
    bbox: BBoxXYWH
    page_id: str
    n_rows: int
    n_cols: int
    cells: List[Cell]
    structure_confidence: float
    reading_order: int
    structure_reason: Optional[str] = None

    def __post_init__(self):
        """Validate table structure."""
        if not 0.0 <= self.structure_confidence <= 1.0:
            raise ValueError("structure_confidence must be between 0.0 and 1.0")
        if self.n_rows < 0:
            raise ValueError("n_rows must be non-negative")
        if self.n_cols < 0:
            raise ValueError("n_cols must be non-negative")

    def to_dict(self) -> dict:
        """Convert to dictionary format."""
        result = {
            "table_id": self.table_id,
            "bbox": self.bbox.to_dict(),
            "page_id": self.page_id,
            "n_rows": self.n_rows,
            "n_cols": self.n_cols,
            "cells": [c.to_dict() for c in self.cells],
            "structure_confidence": self.structure_confidence,
            "reading_order": self.reading_order,
        }
        if self.structure_reason:
            result["structure_reason"] = self.structure_reason
        return result

    @classmethod
    def from_dict(cls, data: dict) -> "Table":
        """Create from dictionary."""
        return cls(
            table_id=data["table_id"],
            bbox=BBoxXYWH.from_dict(data["bbox"]),
            page_id=data["page_id"],
            n_rows=data["n_rows"],
            n_cols=data["n_cols"],
            cells=[Cell.from_dict(c) for c in data["cells"]],
            structure_confidence=data["structure_confidence"],
            reading_order=data["reading_order"],
            structure_reason=data.get("structure_reason"),
        )

    def get_cell(self, row: int, col: int) -> Optional[Cell]:
        """Get cell at specific position."""
        for cell in self.cells:
            if cell.row == row and cell.col == col:
                return cell
        return None

    def get_row(self, row: int) -> List[Cell]:
        """Get all cells in a row."""
        return [c for c in self.cells if c.row == row]

    def get_column(self, col: int) -> List[Cell]:
        """Get all cells in a column."""
        return [c for c in self.cells if c.col == col]

    def get_header_cells(self) -> List[Cell]:
        """Get all header cells."""
        return [c for c in self.cells if c.is_header]

    @property
    def has_headers(self) -> bool:
        """Check if table has detected header cells."""
        return any(c.is_header for c in self.cells)
