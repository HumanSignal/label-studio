"""Table Handler for PDF ML Export.

This module provides functions to detect and extract table structures
from PDF pages using pdfplumber's table detection capabilities.

Features:
- Table detection using pdfplumber find_tables()
- Cell extraction with text and bounding boxes
- Header row detection heuristics
- Merged cell detection (rowspan, colspan)
- Structure confidence calculation
"""

import logging
from typing import Any, Dict, List, Optional, Tuple

import pdfplumber

from .coordinates import calculate_render_scale, pdfplumber_to_bbox
from .id_generator import generate_cell_id, generate_table_id
from .models import BBoxXYWH, Cell, PageGeometry, Table, Word

logger = logging.getLogger(__name__)

# Confidence thresholds
MIN_CONFIDENCE_FOR_STRUCTURE = 0.5  # Below this, include structure_reason
HIGH_CONFIDENCE_THRESHOLD = 0.8  # Above this, structure is reliable


def detect_tables(
    page: pdfplumber.page.Page,
    geometry: PageGeometry,
    page_id: str,
) -> List[Table]:
    """Detect tables on a PDF page.

    Uses pdfplumber's find_tables() method for detection.

    Args:
        page: pdfplumber Page object
        geometry: Page geometry for coordinate conversion
        page_id: Page identifier for ID generation

    Returns:
        List of Table objects
    """
    tables = []

    try:
        # Use pdfplumber's table detection
        detected_tables = page.find_tables()

        for table_idx, pdfp_table in enumerate(detected_tables):
            table = _process_pdfplumber_table(
                pdfp_table,
                page,
                geometry,
                page_id,
                table_idx,
            )
            if table:
                tables.append(table)

    except Exception as e:
        logger.warning(f"Table detection failed for {page_id}: {e}")

    return tables


def _process_pdfplumber_table(
    pdfp_table: Any,
    page: pdfplumber.page.Page,
    geometry: PageGeometry,
    page_id: str,
    table_index: int,
) -> Optional[Table]:
    """Process a pdfplumber table object into our Table model.

    Args:
        pdfp_table: pdfplumber Table object
        page: pdfplumber Page object
        geometry: Page geometry
        page_id: Page identifier
        table_index: Table index on page

    Returns:
        Table object or None if processing fails
    """
    try:
        # Get table bounding box
        bbox_coords = pdfp_table.bbox  # (x0, y0, x1, y1)
        table_bbox = _convert_pdfplumber_bbox(
            bbox_coords,
            geometry.pdf_page_height_pt,
            geometry.render_scale,
        )

        # Generate table ID
        table_id = generate_table_id(page_id, table_bbox, table_index)

        # Extract table data
        table_data = pdfp_table.extract()
        if not table_data:
            return None

        n_rows = len(table_data)
        n_cols = max(len(row) for row in table_data) if table_data else 0

        # Get cell bounding boxes from pdfplumber
        cells_with_bboxes = _extract_cells_with_bboxes(
            pdfp_table,
            table_data,
            table_id,
            geometry,
        )

        # Detect header rows
        header_rows = detect_header_rows(table_data, cells_with_bboxes)

        # Mark header cells
        for cell in cells_with_bboxes:
            if cell.row in header_rows:
                cell.is_header = True

        # Detect merged cells
        cells_with_bboxes = detect_merged_cells(cells_with_bboxes, n_rows, n_cols)

        # Calculate structure confidence
        confidence, reason = calculate_structure_confidence(
            table_data,
            cells_with_bboxes,
            n_rows,
            n_cols,
        )

        return Table(
            table_id=table_id,
            bbox=table_bbox,
            page_id=page_id,
            n_rows=n_rows,
            n_cols=n_cols,
            cells=cells_with_bboxes,
            structure_confidence=confidence,
            reading_order=table_index,
            structure_reason=reason if confidence < MIN_CONFIDENCE_FOR_STRUCTURE else None,
        )

    except Exception as e:
        logger.warning(f"Failed to process table {table_index}: {e}")
        return None


def _convert_pdfplumber_bbox(
    bbox: Tuple[float, float, float, float],
    page_height_pt: float,
    scale: float,
) -> BBoxXYWH:
    """Convert pdfplumber bbox to our BBoxXYWH format.

    Args:
        bbox: (x0, y0, x1, y1) in PDF points
        page_height_pt: Page height in points
        scale: Render scale

    Returns:
        BBoxXYWH in pixel coordinates
    """
    x0, y0, x1, y1 = bbox

    # Convert to top-left origin
    x = int(x0 * scale)
    y = int((page_height_pt - y1) * scale)  # Flip Y
    width = int((x1 - x0) * scale)
    height = int((y1 - y0) * scale)

    # Ensure minimum dimensions
    width = max(1, width)
    height = max(1, height)

    return BBoxXYWH(x=x, y=y, width=width, height=height)


def _extract_cells_with_bboxes(
    pdfp_table: Any,
    table_data: List[List[str]],
    table_id: str,
    geometry: PageGeometry,
) -> List[Cell]:
    """Extract cells with bounding boxes from pdfplumber table.

    Args:
        pdfp_table: pdfplumber Table object
        table_data: Extracted table data (2D list)
        table_id: Table ID for cell ID generation
        geometry: Page geometry

    Returns:
        List of Cell objects
    """
    cells = []

    # Try to get cell bounding boxes from pdfplumber
    try:
        # pdfplumber stores cells in table.cells
        pdfp_cells = pdfp_table.cells if hasattr(pdfp_table, "cells") else []
    except Exception:
        pdfp_cells = []

    # Map cell positions to bboxes
    cell_bbox_map: Dict[Tuple[int, int], BBoxXYWH] = {}
    for cell_bbox in pdfp_cells:
        # pdfp_cells contains (x0, y0, x1, y1) tuples
        if len(cell_bbox) >= 4:
            bbox = _convert_pdfplumber_bbox(
                cell_bbox,
                geometry.pdf_page_height_pt,
                geometry.render_scale,
            )
            # We'll associate by position later

    # Create cells from table data
    for row_idx, row in enumerate(table_data):
        for col_idx, cell_text in enumerate(row):
            if cell_text is None:
                cell_text = ""

            # Generate cell ID
            cell_id = generate_cell_id(table_id, row_idx, col_idx)

            # Get or estimate bbox
            bbox = cell_bbox_map.get(
                (row_idx, col_idx),
                _estimate_cell_bbox(row_idx, col_idx, len(table_data), len(row), geometry),
            )

            cell = Cell(
                cell_id=cell_id,
                row=row_idx,
                col=col_idx,
                bbox=bbox,
                text=str(cell_text).strip(),
            )
            cells.append(cell)

    return cells


def _estimate_cell_bbox(
    row: int,
    col: int,
    n_rows: int,
    n_cols: int,
    geometry: PageGeometry,
) -> BBoxXYWH:
    """Estimate cell bbox when pdfplumber doesn't provide it.

    Creates a placeholder bbox based on grid position.

    Args:
        row: Row index
        col: Column index
        n_rows: Total rows
        n_cols: Total columns
        geometry: Page geometry

    Returns:
        Estimated BBoxXYWH
    """
    # Use page dimensions to estimate
    cell_width = geometry.rendered_width_px // max(n_cols, 1)
    cell_height = 20  # Approximate row height

    return BBoxXYWH(
        x=col * cell_width,
        y=row * cell_height,
        width=max(1, cell_width),
        height=max(1, cell_height),
    )


def detect_header_rows(
    table_data: List[List[str]],
    cells: List[Cell],
) -> List[int]:
    """Detect header rows using heuristics.

    Heuristics:
    - First row if it has distinct formatting
    - Rows with all-caps or bold text (when detected)
    - Rows without numeric data when others have it

    Args:
        table_data: 2D list of cell text
        cells: Cell objects

    Returns:
        List of row indices that are headers
    """
    if not table_data:
        return []

    header_rows = []

    # Heuristic 1: Check first row
    first_row = table_data[0] if table_data else []

    # Check if first row differs from rest
    if len(table_data) > 1:
        first_row_numeric = _count_numeric_cells(first_row)
        other_rows_numeric = sum(
            _count_numeric_cells(row) for row in table_data[1:]
        ) / max(len(table_data) - 1, 1)

        # If first row has significantly fewer numeric values, likely header
        if first_row_numeric < other_rows_numeric * 0.3:
            header_rows.append(0)

    # Heuristic 2: Check for all-caps rows
    for row_idx, row in enumerate(table_data):
        if row and all(
            cell is None or str(cell).upper() == str(cell)
            for cell in row
            if cell and str(cell).strip()
        ):
            # Count non-empty cells
            non_empty = sum(1 for cell in row if cell and str(cell).strip())
            if non_empty > 0 and row_idx not in header_rows:
                # Check if row looks like a header
                avg_len = sum(len(str(cell or "")) for cell in row) / max(non_empty, 1)
                if avg_len < 30:  # Header cells tend to be shorter
                    header_rows.append(row_idx)

    # Deduplicate and sort
    return sorted(set(header_rows))


def _count_numeric_cells(row: List[str]) -> int:
    """Count cells containing numeric values."""
    count = 0
    for cell in row:
        if cell:
            text = str(cell).strip()
            # Check if mostly numeric
            digits = sum(c.isdigit() for c in text)
            if digits > len(text) * 0.5 and len(text) > 0:
                count += 1
    return count


def detect_merged_cells(
    cells: List[Cell],
    n_rows: int,
    n_cols: int,
) -> List[Cell]:
    """Detect and mark merged cells based on bbox analysis.

    Looks for cells whose bounding boxes span multiple row/column positions.

    Args:
        cells: List of Cell objects
        n_rows: Number of rows
        n_cols: Number of columns

    Returns:
        Updated list of Cell objects with rowspan/colspan set
    """
    if not cells or n_rows <= 0 or n_cols <= 0:
        return cells

    # Group cells by row
    cells_by_row: Dict[int, List[Cell]] = {}
    for cell in cells:
        if cell.row not in cells_by_row:
            cells_by_row[cell.row] = []
        cells_by_row[cell.row].append(cell)

    # Analyze column widths to detect spans
    col_positions: List[int] = []
    if 0 in cells_by_row:
        first_row_cells = sorted(cells_by_row[0], key=lambda c: c.col)
        for cell in first_row_cells:
            col_positions.append(cell.bbox.x)

    # Analyze row heights
    row_heights: Dict[int, int] = {}
    for cell in cells:
        if cell.row not in row_heights:
            row_heights[cell.row] = cell.bbox.height
        else:
            row_heights[cell.row] = max(row_heights[cell.row], cell.bbox.height)

    # Detect spans based on bbox size
    avg_row_height = sum(row_heights.values()) / max(len(row_heights), 1)
    avg_col_width = (col_positions[-1] - col_positions[0]) / max(n_cols - 1, 1) if len(col_positions) > 1 else 100

    for cell in cells:
        # Detect rowspan
        if cell.bbox.height > avg_row_height * 1.5:
            estimated_span = round(cell.bbox.height / avg_row_height)
            cell.rowspan = max(1, min(estimated_span, n_rows - cell.row))

        # Detect colspan
        if cell.bbox.width > avg_col_width * 1.5:
            estimated_span = round(cell.bbox.width / avg_col_width)
            cell.colspan = max(1, min(estimated_span, n_cols - cell.col))

    return cells


def calculate_structure_confidence(
    table_data: List[List[str]],
    cells: List[Cell],
    n_rows: int,
    n_cols: int,
) -> Tuple[float, str]:
    """Calculate confidence score for table structure.

    Factors:
    - Row/column consistency
    - Cell bbox alignment
    - Empty cell ratio
    - Header detection success

    Args:
        table_data: 2D table data
        cells: Cell objects
        n_rows: Number of rows
        n_cols: Number of columns

    Returns:
        Tuple of (confidence_score, reason_string)
    """
    if not table_data or n_rows == 0 or n_cols == 0:
        return 0.0, "empty_table"

    confidence = 1.0
    reasons = []

    # Factor 1: Row consistency (all rows same length?)
    row_lengths = [len(row) for row in table_data]
    if row_lengths:
        max_len = max(row_lengths)
        min_len = min(row_lengths)
        if max_len != min_len:
            consistency = min_len / max_len
            confidence *= (0.7 + 0.3 * consistency)
            if consistency < 0.8:
                reasons.append("inconsistent_row_lengths")

    # Factor 2: Empty cell ratio
    total_cells = n_rows * n_cols
    empty_cells = sum(
        1 for row in table_data for cell in row
        if cell is None or str(cell).strip() == ""
    )
    empty_ratio = empty_cells / max(total_cells, 1)
    if empty_ratio > 0.5:
        confidence *= (1.0 - empty_ratio * 0.5)
        reasons.append("high_empty_ratio")

    # Factor 3: Cell count matches expected
    expected_cells = n_rows * n_cols
    actual_cells = len(cells)
    if actual_cells != expected_cells:
        cell_match = min(actual_cells, expected_cells) / max(actual_cells, expected_cells, 1)
        confidence *= cell_match
        if cell_match < 0.9:
            reasons.append("cell_count_mismatch")

    # Factor 4: Minimum size requirements
    if n_rows < 2 or n_cols < 2:
        confidence *= 0.7
        reasons.append("small_table")

    # Clamp to valid range
    confidence = max(0.0, min(1.0, confidence))

    reason = "; ".join(reasons) if reasons else "structure_valid"
    return confidence, reason


def find_words_in_cells(
    tables: List[Table],
    words: List[Word],
) -> List[Table]:
    """Associate words with table cells based on bbox overlap.

    Updates cell.word_ids with words contained in each cell.

    Args:
        tables: List of Table objects
        words: List of Word objects

    Returns:
        Updated tables with word_ids populated in cells
    """
    for table in tables:
        for cell in table.cells:
            cell_words = []
            for word in words:
                # Check if word center is in cell
                word_cx = word.bbox.x + word.bbox.width // 2
                word_cy = word.bbox.y + word.bbox.height // 2

                if (cell.bbox.x <= word_cx < cell.bbox.x + cell.bbox.width and
                    cell.bbox.y <= word_cy < cell.bbox.y + cell.bbox.height):
                    cell_words.append(word.word_id)

            cell.word_ids = cell_words

    return tables


def extract_tables_from_page(
    page: pdfplumber.page.Page,
    geometry: PageGeometry,
    page_id: str,
    words: Optional[List[Word]] = None,
) -> List[Table]:
    """High-level function to extract tables from a page.

    Combines table detection, cell extraction, and word association.

    Args:
        page: pdfplumber Page object
        geometry: Page geometry
        page_id: Page identifier
        words: Optional list of Word objects for association

    Returns:
        List of Table objects with complete structure
    """
    tables = detect_tables(page, geometry, page_id)

    if words:
        tables = find_words_in_cells(tables, words)

    return tables
