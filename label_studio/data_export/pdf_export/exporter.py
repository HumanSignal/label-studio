"""PDF ML Export orchestration.

This module provides the main export orchestration for PDF ML exports.
It coordinates the extraction of layout, generation of IDs, and output
of the export bundle.
"""

import hashlib
import json
import logging
import os
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

import pdfplumber

from . import (
    CANONICAL_COVERAGE_THRESHOLD,
    EXPORT_SCHEMA_VERSION,
    ID_ALGORITHM_VERSION,
)
from .coordinates import calculate_render_scale, merge_bboxes
from .id_generator import (
    generate_block_id,
    generate_line_id,
    generate_word_id,
    get_id_algorithm_info,
)
from .layout_extractor import (
    extract_page_geometry,
    extract_text_layer,
    get_pdf_page_count,
    group_lines_into_blocks,
    group_tokens_into_lines,
    select_canonical_layer,
)
from .logging_config import (
    log_document_completed,
    log_document_failed,
    log_document_started,
    log_export_completed,
    log_export_failed,
    log_export_started,
    log_page_processed,
)
from .models import (
    BBoxXYWH,
    Block,
    BlockType,
    CanonicalIndex,
    CanonicalSelection,
    DocumentManifest,
    ExportError,
    ExportJob,
    ExportOptions,
    ExportProgress,
    ExportStatus,
    LayerId,
    Line,
    PageGeometry,
    PageLayout,
    TextLayer,
    Token,
    Word,
)
from .text_utils import clean_word_text, compute_text_hash_input, normalize_unicode

logger = logging.getLogger(__name__)


def generate_doc_id(task_id: int, pdf_hash: str) -> str:
    """Generate deterministic document ID.

    Args:
        task_id: Label Studio task ID
        pdf_hash: SHA-256 hash of PDF content

    Returns:
        Document ID (12 character hex string)
    """
    hash_input = f"{task_id}:{pdf_hash}"
    return hashlib.sha256(hash_input.encode()).hexdigest()[:12]


def compute_pdf_hash(pdf_path: str) -> str:
    """Compute SHA-256 hash of PDF file.

    Args:
        pdf_path: Path to PDF file

    Returns:
        Hex-encoded SHA-256 hash
    """
    sha256 = hashlib.sha256()
    with open(pdf_path, "rb") as f:
        for chunk in iter(lambda: f.read(8192), b""):
            sha256.update(chunk)
    return sha256.hexdigest()


# Note: generate_word_id, generate_line_id, generate_block_id are imported from id_generator


def build_canonical_text_and_index(
    blocks: List[Block],
    lines: List[Line],
    words: List[Word],
) -> Tuple[str, CanonicalIndex]:
    """Build canonical text and character offset index.

    Constructs canonical text following the rules:
    - Words joined by single space
    - Lines end with \\n
    - Blocks separated by \\n\\n

    Args:
        blocks: Block objects (ordered by reading_order)
        lines: Line objects
        words: Word objects

    Returns:
        Tuple of (canonical_text, canonical_index)
    """
    canonical_text = ""
    index = CanonicalIndex()

    # Create lookup maps
    line_map = {l.line_id: l for l in lines}
    word_map = {w.word_id: w for w in words}

    # Sort blocks by reading order
    sorted_blocks = sorted(blocks, key=lambda b: b.reading_order)

    for block_idx, block in enumerate(sorted_blocks):
        if block_idx > 0:
            canonical_text += "\n\n"  # Block boundary

        block_start = len(canonical_text)

        # Get lines in this block
        block_lines = [line_map[lid] for lid in block.line_ids if lid in line_map]
        block_lines.sort(key=lambda l: l.reading_order)

        for line_idx, line in enumerate(block_lines):
            if line_idx > 0:
                canonical_text += "\n"  # Line break

            line_start = len(canonical_text)

            # Get words in this line
            line_words = [word_map[wid] for wid in line.word_ids if wid in word_map]
            line_words.sort(key=lambda w: w.reading_order)

            for word_idx, word in enumerate(line_words):
                if word_idx > 0:
                    canonical_text += " "  # Word space

                word_start = len(canonical_text)
                canonical_text += word.text
                word_end = len(canonical_text)

                # Update word with char positions
                index.add_word(word.word_id, word_start, word_end)

            line_end = len(canonical_text)
            index.add_line(line.line_id, line_start, line_end)

        block_end = len(canonical_text)
        index.add_block(block.block_id, block_start, block_end)

    return canonical_text, index


def process_page(
    page: pdfplumber.page.Page,
    page_number: int,
    doc_id: str,
    layout_version_id: str,
    dpi: int,
    layer_id: LayerId = LayerId.PDF_TEXT,
) -> PageLayout:
    """Process a single PDF page and extract layout.

    Args:
        page: pdfplumber Page object
        page_number: Page number (1-indexed)
        doc_id: Document ID
        layout_version_id: UUID for this extraction run
        dpi: Render DPI
        layer_id: Text layer to use

    Returns:
        Complete PageLayout object
    """
    page_id = f"{doc_id}:page_{page_number:03d}"

    # Extract geometry
    geometry = extract_page_geometry(page, dpi)

    # Extract text layer
    text_layer = extract_text_layer(page, geometry, layer_id)

    # Group tokens into lines and blocks
    lines_of_tokens = group_tokens_into_lines(text_layer.tokens)
    blocks_of_lines = group_lines_into_blocks(lines_of_tokens)

    # Build Word, Line, Block objects with deterministic IDs
    all_words: List[Word] = []
    all_lines: List[Line] = []
    all_blocks: List[Block] = []

    global_word_order = 0

    for block_idx, (block_lines, block_type) in enumerate(blocks_of_lines):
        block_word_ids = []
        block_line_ids = []
        block_bboxes = []

        for line_idx, line_tokens in enumerate(block_lines):
            line_word_ids = []
            line_bboxes = []

            for token in line_tokens:
                # Generate deterministic word ID
                word_id = generate_word_id(
                    page_id,
                    token.text,
                    token.bbox,
                    global_word_order,
                )

                word = Word(
                    word_id=word_id,
                    text=token.text,
                    bbox=token.bbox,
                    line_id="",  # Will be set after line ID is generated
                    block_id="",  # Will be set after block ID is generated
                    reading_order=global_word_order,
                    char_start=0,  # Will be set during canonical text build
                    char_end=0,
                    layer_id=layer_id,
                    confidence=token.confidence,
                )
                all_words.append(word)
                line_word_ids.append(word_id)
                line_bboxes.append(token.bbox)
                global_word_order += 1

            # Generate line ID and create Line object
            if line_word_ids:
                line_id = generate_line_id(page_id, line_word_ids)
                line_bbox = merge_bboxes(line_bboxes) if line_bboxes else BBoxXYWH(0, 0, 1, 1)
                line_text = " ".join(t.text for t in line_tokens)

                line = Line(
                    line_id=line_id,
                    bbox=line_bbox,
                    block_id="",  # Will be set after block ID is generated
                    word_ids=line_word_ids,
                    text=line_text,
                    char_start=0,
                    char_end=0,
                    reading_order=line_idx,
                )
                all_lines.append(line)
                block_line_ids.append(line_id)
                block_bboxes.extend(line_bboxes)

                # Update words with line_id
                for word in all_words:
                    if word.word_id in line_word_ids:
                        word.line_id = line_id

        # Generate block ID and create Block object
        if block_line_ids:
            block_id = generate_block_id(page_id, block_line_ids)
            block_bbox = merge_bboxes(block_bboxes) if block_bboxes else BBoxXYWH(0, 0, 1, 1)

            # Get block text (lines joined by newline)
            block_lines_text = []
            for line in all_lines:
                if line.line_id in block_line_ids:
                    block_lines_text.append(line.text)
            block_text = "\n".join(block_lines_text)

            block = Block(
                block_id=block_id,
                bbox=block_bbox,
                block_type=block_type,
                line_ids=block_line_ids,
                text=block_text,
                char_start=0,
                char_end=0,
                reading_order=block_idx,
            )
            all_blocks.append(block)

            # Update lines and words with block_id
            for line in all_lines:
                if line.line_id in block_line_ids:
                    line.block_id = block_id
            for word in all_words:
                if word.line_id in block_line_ids:
                    word.block_id = block_id

    # Build canonical text and index
    canonical_text, canonical_index = build_canonical_text_and_index(
        all_blocks, all_lines, all_words
    )

    # Update char positions from index
    for word in all_words:
        if word.word_id in canonical_index.words:
            word.char_start, word.char_end = canonical_index.words[word.word_id]
    for line in all_lines:
        if line.line_id in canonical_index.lines:
            line.char_start, line.char_end = canonical_index.lines[line.line_id]
    for block in all_blocks:
        if block.block_id in canonical_index.blocks:
            block.char_start, block.char_end = canonical_index.blocks[block.block_id]

    # Create canonical selection
    canonical = CanonicalSelection(
        layer_id=layer_id,
        reason=f"selected_layer_{layer_id.value}",
    )

    # Build layers dict
    layers = {layer_id.value: text_layer}

    return PageLayout(
        page_id=page_id,
        page_number=page_number,
        doc_id=doc_id,
        layout_version_id=layout_version_id,
        geometry=geometry,
        layers=layers,
        canonical=canonical,
        canonical_text=canonical_text,
        canonical_index=canonical_index,
        words=all_words,
        lines=all_lines,
        blocks=all_blocks,
    )


def export_single_document(
    pdf_path: str,
    task_id: int,
    output_dir: str,
    options: ExportOptions,
) -> Tuple[str, List[PageLayout], Optional[ExportError]]:
    """Export a single PDF document.

    Args:
        pdf_path: Path to PDF file
        task_id: Label Studio task ID
        output_dir: Output directory for export files
        options: Export configuration options

    Returns:
        Tuple of (doc_id, page_layouts, error)
        error is None on success
    """
    # Generate document ID
    try:
        pdf_hash = compute_pdf_hash(pdf_path)
        doc_id = generate_doc_id(task_id, pdf_hash)
    except Exception as e:
        error = ExportError(
            doc_id="unknown",
            task_id=task_id,
            error_type="pdf_hash_failed",
            error_message=str(e),
            timestamp=datetime.utcnow().isoformat() + "Z",
        )
        return "unknown", [], error

    layout_version_id = str(uuid.uuid4())
    page_layouts = []

    try:
        with pdfplumber.open(pdf_path) as pdf:
            num_pages = len(pdf.pages)
            log_document_started("", doc_id, task_id, num_pages)

            for page_num in range(1, num_pages + 1):
                page = pdf.pages[page_num - 1]

                page_layout = process_page(
                    page=page,
                    page_number=page_num,
                    doc_id=doc_id,
                    layout_version_id=layout_version_id,
                    dpi=options.render_dpi,
                )
                page_layouts.append(page_layout)

                log_page_processed(
                    "",
                    doc_id,
                    page_num,
                    len(page_layout.words),
                    len(page_layout.tables),
                )

        return doc_id, page_layouts, None

    except Exception as e:
        logger.exception(f"Failed to process document {pdf_path}")
        error = ExportError(
            doc_id=doc_id,
            task_id=task_id,
            error_type="extraction_failed",
            error_message=str(e),
            timestamp=datetime.utcnow().isoformat() + "Z",
        )
        return doc_id, page_layouts, error


def save_page_layout(
    page_layout: PageLayout,
    output_dir: str,
) -> str:
    """Save page layout to JSON file.

    Args:
        page_layout: PageLayout object
        output_dir: Output directory

    Returns:
        Path to saved file
    """
    # Create layout directory
    layout_dir = os.path.join(output_dir, "layout")
    os.makedirs(layout_dir, exist_ok=True)

    # Generate filename
    filename = f"page_{page_layout.page_number:03d}.json"
    filepath = os.path.join(layout_dir, filename)

    # Serialize and save
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(page_layout.to_dict(), f, ensure_ascii=False, indent=2)

    return filepath


def get_pipeline_versions(include_ocr: bool = False) -> Dict[str, str]:
    """Get pipeline version information.

    Args:
        include_ocr: Whether to include OCR engine version

    Returns:
        Dictionary with engine versions
    """
    # Get pdfplumber version
    try:
        pdf_text_engine = f"pdfplumber/{pdfplumber.__version__}"
    except Exception:
        pdf_text_engine = "pdfplumber/unknown"

    pipeline = {
        "pdf_text_engine": pdf_text_engine,
        "layout_engine": f"label-studio-pdf-export/{EXPORT_SCHEMA_VERSION}",
    }

    # Add OCR engine if requested
    if include_ocr:
        try:
            import pytesseract

            tesseract_version = pytesseract.get_tesseract_version()
            pipeline["ocr_engine"] = f"tesseract/{tesseract_version}"
        except Exception:
            pipeline["ocr_engine"] = None

    return pipeline


def create_document_manifest(
    doc_id: str,
    task_id: int,
    pdf_path: str,
    pdf_hash: str,
    num_pages: int,
    layout_version_id: str,
    page_layouts: List[PageLayout],
    options: ExportOptions,
    include_ocr: bool = False,
) -> "DocumentManifest":
    """Create document manifest.

    Args:
        doc_id: Document ID
        task_id: Label Studio task ID
        pdf_path: Original PDF path
        pdf_hash: PDF content hash
        num_pages: Number of pages
        layout_version_id: Layout extraction UUID
        page_layouts: List of page layouts
        options: Export options
        include_ocr: Whether OCR was used

    Returns:
        DocumentManifest dataclass
    """
    # Get pipeline versions
    pipeline = get_pipeline_versions(include_ocr=include_ocr)

    # Build render settings
    render = {
        "dpi": options.render_dpi,
        "coordinate_system": "pixel_top_left_xywh",
    }

    # Build layout file list
    layout_files = [f"layout/page_{i+1:03d}.json" for i in range(num_pages)]

    # Build page image list if included
    page_images = None
    if options.include_page_images:
        page_images = [f"pages/page_{i+1:03d}.png" for i in range(num_pages)]

    return DocumentManifest(
        doc_id=doc_id,
        task_id=task_id,
        pdf_path=pdf_path,
        sha256=pdf_hash,
        num_pages=num_pages,
        layout_version_id=layout_version_id,
        id_algorithm_version=ID_ALGORITHM_VERSION,
        export_schema_version=EXPORT_SCHEMA_VERSION,
        pipeline=pipeline,
        render=render,
        layout_files=layout_files,
        page_images=page_images,
        created_at=datetime.utcnow().isoformat() + "Z",
    )


def save_document_manifest(
    manifest: "DocumentManifest",
    output_dir: str,
) -> str:
    """Save document manifest to JSON file.

    Args:
        manifest: DocumentManifest object
        output_dir: Output directory for the document

    Returns:
        Path to saved manifest file
    """
    filepath = os.path.join(output_dir, "manifest.json")

    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(manifest.to_dict(), f, ensure_ascii=False, indent=2)

    return filepath
