"""PDF Layout Extraction for PDF ML Export.

This module provides functions to extract text and layout structure from PDF pages
using pdfplumber. It handles:
- Word-level text extraction with bounding boxes
- Word grouping into lines based on vertical proximity
- Line grouping into blocks based on spacing
- Coverage calculation for layer selection
- Canonical layer selection based on coverage threshold

The extraction produces structured TextLayer objects that are then processed
to generate deterministic Word, Line, and Block objects.
"""

import logging
from typing import List, Optional, Tuple

import pdfplumber

from . import CANONICAL_COVERAGE_THRESHOLD
from .coordinates import calculate_render_scale, pdfplumber_to_bbox
from .models import (
    BBoxPt,
    BBoxXYWH,
    BlockType,
    CanonicalSelection,
    LayerId,
    PageGeometry,
    TextLayer,
    Token,
)
from .text_utils import clean_word_text, is_valid_word

logger = logging.getLogger(__name__)

# Constants for grouping algorithms
LINE_VERTICAL_TOLERANCE_FACTOR = 0.5  # Words within 50% of avg height are same line
BLOCK_GAP_FACTOR = 1.5  # Lines with gap > 1.5x line height start new block
HEADING_FONT_SIZE_FACTOR = 1.2  # Text 20% larger than avg is heading candidate


def extract_page_geometry(page: pdfplumber.page.Page, dpi: int) -> PageGeometry:
    """Extract page geometry information from pdfplumber page.

    Args:
        page: pdfplumber Page object
        dpi: Render DPI for pixel calculations

    Returns:
        PageGeometry with all dimension and coordinate info
    """
    scale = calculate_render_scale(dpi)

    # Get page dimensions
    width_pt = float(page.width)
    height_pt = float(page.height)

    # Get rotation (pdfplumber normalizes to 0, but we track original)
    rotation = int(page.rotation) if hasattr(page, "rotation") else 0

    # Get media box and crop box
    mediabox = page.mediabox if hasattr(page, "mediabox") else (0, 0, width_pt, height_pt)
    cropbox = page.cropbox if hasattr(page, "cropbox") else mediabox

    media_box_pt = BBoxPt(
        x0=float(mediabox[0]),
        y0=float(mediabox[1]),
        x1=float(mediabox[2]),
        y1=float(mediabox[3]),
    )
    crop_box_pt = BBoxPt(
        x0=float(cropbox[0]),
        y0=float(cropbox[1]),
        x1=float(cropbox[2]),
        y1=float(cropbox[3]),
    )

    # Calculate rendered dimensions
    rendered_width_px = int(round(width_pt * scale))
    rendered_height_px = int(round(height_pt * scale))

    return PageGeometry(
        pdf_page_width_pt=width_pt,
        pdf_page_height_pt=height_pt,
        rotation_deg=rotation,
        media_box_pt=media_box_pt,
        crop_box_pt=crop_box_pt,
        render_dpi=dpi,
        render_scale=scale,
        rendered_width_px=rendered_width_px,
        rendered_height_px=rendered_height_px,
    )


def extract_tokens_from_page(
    page: pdfplumber.page.Page,
    scale: float,
    page_height_pt: float,
) -> List[Token]:
    """Extract word tokens from a pdfplumber page.

    Args:
        page: pdfplumber Page object
        scale: Render scale (dpi / 72)
        page_height_pt: Page height in points

    Returns:
        List of Token objects with text and bbox
    """
    tokens = []

    # Extract words with font attributes
    try:
        words = page.extract_words(
            extra_attrs=["fontname", "size"],
            keep_blank_chars=False,
            use_text_flow=True,
        )
    except Exception as e:
        logger.warning(f"Failed to extract words with extra_attrs: {e}")
        # Fallback without extra attributes
        words = page.extract_words(keep_blank_chars=False, use_text_flow=True)

    for idx, word in enumerate(words):
        text = word.get("text", "")

        # Skip invalid words
        if not is_valid_word(text):
            continue

        # Clean the text
        cleaned_text = clean_word_text(text)
        if not cleaned_text:
            continue

        # Convert bbox to pixel coordinates
        bbox = pdfplumber_to_bbox(word, page_height_pt, scale)

        # Extract font info if available
        font_name = word.get("fontname")
        font_size = word.get("size")

        # Detect bold/italic from font name heuristics
        is_bold = None
        is_italic = None
        if font_name:
            font_lower = font_name.lower()
            is_bold = "bold" in font_lower or "black" in font_lower
            is_italic = "italic" in font_lower or "oblique" in font_lower

        token = Token(
            token_id=f"tok_{idx:06d}",
            text=cleaned_text,
            bbox=bbox,
            font_name=font_name,
            font_size=float(font_size) if font_size else None,
            is_bold=is_bold,
            is_italic=is_italic,
        )
        tokens.append(token)

    return tokens


def calculate_coverage(
    tokens: List[Token],
    page_width_px: int,
    page_height_px: int,
) -> float:
    """Calculate text coverage ratio for a page.

    Coverage is the ratio of page area covered by text bounding boxes.
    Used for canonical layer selection.

    Args:
        tokens: List of tokens with bboxes
        page_width_px: Page width in pixels
        page_height_px: Page height in pixels

    Returns:
        Coverage ratio (0.0 to 1.0)
    """
    if not tokens or page_width_px <= 0 or page_height_px <= 0:
        return 0.0

    # Calculate total text area (simple sum, ignoring overlaps)
    text_area = sum(t.bbox.width * t.bbox.height for t in tokens)

    # Calculate page area
    page_area = page_width_px * page_height_px

    # Return coverage ratio, capped at 1.0
    return min(1.0, text_area / page_area)


def extract_text_layer(
    page: pdfplumber.page.Page,
    geometry: PageGeometry,
    layer_id: LayerId = LayerId.PDF_TEXT,
) -> TextLayer:
    """Extract a text layer from a PDF page.

    Args:
        page: pdfplumber Page object
        geometry: Page geometry information
        layer_id: Layer identifier (pdf_text or ocr)

    Returns:
        TextLayer with tokens and coverage information
    """
    # Get pdfplumber version for source_engine
    try:
        source_engine = f"pdfplumber/{pdfplumber.__version__}"
    except AttributeError:
        source_engine = "pdfplumber/unknown"

    # Extract tokens
    tokens = extract_tokens_from_page(
        page,
        geometry.render_scale,
        geometry.pdf_page_height_pt,
    )

    # Calculate coverage
    coverage = calculate_coverage(
        tokens,
        geometry.rendered_width_px,
        geometry.rendered_height_px,
    )

    return TextLayer(
        layer_id=layer_id,
        source_engine=source_engine,
        coverage=coverage,
        word_count=len(tokens),
        tokens=tokens,
    )


def group_tokens_into_lines(
    tokens: List[Token],
) -> List[List[Token]]:
    """Group tokens into lines based on vertical proximity.

    Tokens on the same horizontal baseline (within tolerance) are grouped.

    Args:
        tokens: List of tokens sorted by reading order

    Returns:
        List of lines, each line being a list of tokens
    """
    if not tokens:
        return []

    # Calculate average token height for tolerance
    avg_height = sum(t.bbox.height for t in tokens) / len(tokens)
    tolerance = avg_height * LINE_VERTICAL_TOLERANCE_FACTOR

    # Sort tokens by y position (top), then x position (left)
    sorted_tokens = sorted(tokens, key=lambda t: (t.bbox.y, t.bbox.x))

    lines = []
    current_line = [sorted_tokens[0]]
    current_baseline = sorted_tokens[0].bbox.y + sorted_tokens[0].bbox.height / 2

    for token in sorted_tokens[1:]:
        token_baseline = token.bbox.y + token.bbox.height / 2

        # Check if token is on the same line (within vertical tolerance)
        if abs(token_baseline - current_baseline) <= tolerance:
            current_line.append(token)
        else:
            # Start new line
            # Sort current line by x position (reading order)
            current_line.sort(key=lambda t: t.bbox.x)
            lines.append(current_line)
            current_line = [token]
            current_baseline = token_baseline

    # Don't forget the last line
    if current_line:
        current_line.sort(key=lambda t: t.bbox.x)
        lines.append(current_line)

    return lines


def group_lines_into_blocks(
    lines: List[List[Token]],
) -> List[Tuple[List[List[Token]], BlockType]]:
    """Group lines into blocks based on vertical spacing.

    Lines with larger gaps between them start new blocks.
    Also classifies block type based on font characteristics.

    Args:
        lines: List of lines (each line is a list of tokens)

    Returns:
        List of (block_lines, block_type) tuples
    """
    if not lines:
        return []

    # Calculate average line height and spacing
    line_heights = []
    line_gaps = []

    for i, line in enumerate(lines):
        if line:
            line_top = min(t.bbox.y for t in line)
            line_bottom = max(t.bbox.y + t.bbox.height for t in line)
            line_heights.append(line_bottom - line_top)

            if i > 0 and lines[i - 1]:
                prev_bottom = max(t.bbox.y + t.bbox.height for t in lines[i - 1])
                gap = line_top - prev_bottom
                if gap > 0:
                    line_gaps.append(gap)

    avg_line_height = sum(line_heights) / len(line_heights) if line_heights else 20
    avg_gap = sum(line_gaps) / len(line_gaps) if line_gaps else avg_line_height * 0.5
    block_gap_threshold = avg_gap * BLOCK_GAP_FACTOR

    # Calculate average font size for heading detection
    all_font_sizes = []
    for line in lines:
        for token in line:
            if token.font_size:
                all_font_sizes.append(token.font_size)
    avg_font_size = sum(all_font_sizes) / len(all_font_sizes) if all_font_sizes else 12
    heading_threshold = avg_font_size * HEADING_FONT_SIZE_FACTOR

    blocks = []
    current_block_lines = [lines[0]]

    for i in range(1, len(lines)):
        line = lines[i]
        prev_line = lines[i - 1]

        # Calculate gap between lines
        if line and prev_line:
            prev_bottom = max(t.bbox.y + t.bbox.height for t in prev_line)
            current_top = min(t.bbox.y for t in line)
            gap = current_top - prev_bottom
        else:
            gap = 0

        # Check if we should start a new block
        if gap > block_gap_threshold:
            # Classify and save current block
            block_type = _classify_block(current_block_lines, heading_threshold)
            blocks.append((current_block_lines, block_type))
            current_block_lines = [line]
        else:
            current_block_lines.append(line)

    # Don't forget the last block
    if current_block_lines:
        block_type = _classify_block(current_block_lines, heading_threshold)
        blocks.append((current_block_lines, block_type))

    return blocks


def _classify_block(
    block_lines: List[List[Token]],
    heading_threshold: float,
) -> BlockType:
    """Classify block type based on content characteristics.

    Args:
        block_lines: Lines in the block
        heading_threshold: Font size threshold for heading detection

    Returns:
        BlockType classification
    """
    if not block_lines or not any(block_lines):
        return BlockType.OTHER

    # Collect font sizes and text from block
    font_sizes = []
    texts = []
    for line in block_lines:
        for token in line:
            if token.font_size:
                font_sizes.append(token.font_size)
            texts.append(token.text)

    # Check for heading (larger font, typically short)
    if font_sizes:
        avg_block_font = sum(font_sizes) / len(font_sizes)
        if avg_block_font >= heading_threshold and len(block_lines) <= 2:
            return BlockType.HEADING

    # Check for list item (starts with bullet or number)
    first_text = texts[0] if texts else ""
    if first_text:
        # Common list markers
        if first_text in ("•", "-", "–", "—", "*", "○", "●"):
            return BlockType.LIST_ITEM
        # Numbered list (e.g., "1.", "1)", "(1)")
        if (
            len(first_text) <= 4
            and (first_text.rstrip(".").rstrip(")").lstrip("(").isdigit())
        ):
            return BlockType.LIST_ITEM

    # Check for caption (typically short, under images/tables)
    total_text = " ".join(texts)
    if len(total_text) < 100 and len(block_lines) == 1:
        lower_text = total_text.lower()
        if any(
            marker in lower_text
            for marker in ["figure", "fig.", "table", "chart", "graph"]
        ):
            return BlockType.CAPTION

    # Default to paragraph
    return BlockType.PARAGRAPH


def select_canonical_layer(
    pdf_text_layer: Optional[TextLayer],
    ocr_layer: Optional[TextLayer],
    coverage_threshold: float = CANONICAL_COVERAGE_THRESHOLD,
) -> CanonicalSelection:
    """Select the canonical text layer based on coverage.

    If pdf_text layer has coverage >= threshold, use it.
    Otherwise, fall back to OCR layer.

    Args:
        pdf_text_layer: Native PDF text layer (may be None)
        ocr_layer: OCR text layer (may be None)
        coverage_threshold: Minimum coverage for pdf_text preference

    Returns:
        CanonicalSelection with selected layer and reason
    """
    # If we only have one layer, use it
    if pdf_text_layer is None and ocr_layer is None:
        # No layers available - shouldn't happen but handle gracefully
        return CanonicalSelection(
            layer_id=LayerId.PDF_TEXT,
            reason="no_layers_available",
        )

    if pdf_text_layer is None:
        return CanonicalSelection(
            layer_id=LayerId.OCR,
            reason="pdf_text_layer_unavailable",
        )

    if ocr_layer is None:
        return CanonicalSelection(
            layer_id=LayerId.PDF_TEXT,
            reason="ocr_layer_unavailable",
        )

    # Both layers available - select based on coverage
    if pdf_text_layer.coverage >= coverage_threshold:
        return CanonicalSelection(
            layer_id=LayerId.PDF_TEXT,
            reason=f"pdf_text_coverage >= {coverage_threshold} ({pdf_text_layer.coverage:.2f})",
        )
    else:
        return CanonicalSelection(
            layer_id=LayerId.OCR,
            reason=f"pdf_text_coverage < {coverage_threshold} ({pdf_text_layer.coverage:.2f})",
        )


def extract_pdf_page(
    pdf_path: str,
    page_number: int,
    dpi: int = 200,
) -> Tuple[PageGeometry, TextLayer]:
    """Extract layout from a single PDF page.

    High-level function that opens a PDF, extracts geometry and text layer.

    Args:
        pdf_path: Path to PDF file
        page_number: Page number (1-indexed)
        dpi: Render DPI

    Returns:
        Tuple of (PageGeometry, TextLayer)
    """
    with pdfplumber.open(pdf_path) as pdf:
        if page_number < 1 or page_number > len(pdf.pages):
            raise ValueError(
                f"Page {page_number} out of range (1-{len(pdf.pages)})"
            )

        page = pdf.pages[page_number - 1]  # pdfplumber uses 0-indexing

        # Extract geometry
        geometry = extract_page_geometry(page, dpi)

        # Extract text layer
        text_layer = extract_text_layer(page, geometry, LayerId.PDF_TEXT)

        return geometry, text_layer


def get_pdf_page_count(pdf_path: str) -> int:
    """Get the number of pages in a PDF.

    Args:
        pdf_path: Path to PDF file

    Returns:
        Number of pages
    """
    with pdfplumber.open(pdf_path) as pdf:
        return len(pdf.pages)
