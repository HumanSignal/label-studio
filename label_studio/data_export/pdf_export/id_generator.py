"""Deterministic ID Generation for PDF ML Export.

This module provides functions to generate stable, deterministic IDs for
structural elements (words, lines, blocks) in PDF exports. The IDs are
designed to be:

1. **Deterministic**: Same input always produces same ID
2. **Reproducible**: Re-exporting same PDF produces identical IDs
3. **Robust**: Minor extraction variations don't change IDs (via quantization)
4. **Unique**: Collision-resistant within document scope

Algorithm: SHA-256 hash with 8-character hex truncation
Version: sha256_v1

See schemas/id_algorithm.md for full specification.
"""

import hashlib
from typing import List

from . import BBOX_QUANTIZATION_PX, ID_ALGORITHM_VERSION
from .models import BBoxXYWH
from .text_utils import normalize_unicode

# Export the algorithm version constant
__all__ = [
    "ID_ALGORITHM_VERSION",
    "generate_word_id",
    "generate_line_id",
    "generate_block_id",
    "generate_table_id",
    "generate_cell_id",
    "quantize_value",
    "quantize_bbox",
    "build_word_hash_input",
    "build_line_hash_input",
    "build_block_hash_input",
]


def quantize_value(value: int, grid_size: int = BBOX_QUANTIZATION_PX) -> int:
    """Quantize a single value to a grid.

    Rounds value to nearest multiple of grid_size.

    Args:
        value: Value to quantize
        grid_size: Grid size in pixels (default from module constant)

    Returns:
        Quantized value

    Example:
        >>> quantize_value(103, 2)
        104
        >>> quantize_value(102, 2)
        102
    """
    return round(value / grid_size) * grid_size


def quantize_bbox(bbox: BBoxXYWH, grid_size: int = BBOX_QUANTIZATION_PX) -> BBoxXYWH:
    """Quantize bounding box coordinates to a grid.

    Makes IDs robust to minor extraction variations by rounding
    coordinates to a pixel grid.

    Args:
        bbox: Original bounding box
        grid_size: Grid size in pixels (default 2)

    Returns:
        New BBoxXYWH with quantized coordinates

    Example:
        >>> bbox = BBoxXYWH(x=103, y=205, width=51, height=13)
        >>> quantize_bbox(bbox, 2)
        BBoxXYWH(x=104, y=206, width=52, height=14)
    """
    return BBoxXYWH(
        x=quantize_value(bbox.x, grid_size),
        y=quantize_value(bbox.y, grid_size),
        width=max(grid_size, quantize_value(bbox.width, grid_size)),
        height=max(grid_size, quantize_value(bbox.height, grid_size)),
    )


def build_word_hash_input(
    page_id: str,
    text: str,
    bbox: BBoxXYWH,
    reading_order: int,
) -> str:
    """Build the hash input string for word ID generation.

    Format: "{page_id}|{normalized_text}|{qx},{qy},{qw},{qh}|{reading_order}"

    Args:
        page_id: Page identifier (e.g., "doc_abc123:page_001")
        text: Word text (will be NFC normalized)
        bbox: Word bounding box (should be pre-quantized)
        reading_order: Reading order position

    Returns:
        Hash input string
    """
    normalized_text = normalize_unicode(text)
    bbox_str = f"{bbox.x},{bbox.y},{bbox.width},{bbox.height}"
    return f"{page_id}|{normalized_text}|{bbox_str}|{reading_order}"


def build_line_hash_input(page_id: str, word_ids: List[str]) -> str:
    """Build the hash input string for line ID generation.

    Format: "{page_id}|{sorted_word_ids}"

    Args:
        page_id: Page identifier
        word_ids: List of word IDs in the line

    Returns:
        Hash input string
    """
    return f"{page_id}|{','.join(sorted(word_ids))}"


def build_block_hash_input(page_id: str, line_ids: List[str]) -> str:
    """Build the hash input string for block ID generation.

    Format: "{page_id}|{sorted_line_ids}"

    Args:
        page_id: Page identifier
        line_ids: List of line IDs in the block

    Returns:
        Hash input string
    """
    return f"{page_id}|{','.join(sorted(line_ids))}"


def generate_word_id(
    page_id: str,
    text: str,
    bbox: BBoxXYWH,
    reading_order: int,
    quantization_px: int = BBOX_QUANTIZATION_PX,
) -> str:
    """Generate a deterministic word ID using SHA-256.

    The ID is generated from:
    - Page identifier
    - NFC-normalized word text
    - Quantized bounding box (x, y, width, height)
    - Reading order position

    Args:
        page_id: Page identifier (e.g., "doc_abc123:page_001")
        text: Word text
        bbox: Word bounding box in pixels
        reading_order: Global reading order within page
        quantization_px: Bbox quantization grid size (default 2)

    Returns:
        Word ID in format "w_{hash8}" (e.g., "w_a1b2c3d4")

    Example:
        >>> bbox = BBoxXYWH(x=100, y=200, width=50, height=12)
        >>> generate_word_id("doc_abc:page_001", "Hello", bbox, 0)
        "w_8f3a2b1c"  # Example output
    """
    # Quantize bbox for robustness
    q_bbox = quantize_bbox(bbox, quantization_px)

    # Build hash input
    hash_input = build_word_hash_input(page_id, text, q_bbox, reading_order)

    # Generate SHA-256 hash and truncate to 8 characters
    hash_hex = hashlib.sha256(hash_input.encode("utf-8")).hexdigest()[:8]

    return f"w_{hash_hex}"


def generate_line_id(page_id: str, word_ids: List[str]) -> str:
    """Generate a deterministic line ID from word IDs.

    The line ID is derived from the sorted list of word IDs it contains,
    making it stable regardless of word processing order.

    Args:
        page_id: Page identifier
        word_ids: List of word IDs in the line

    Returns:
        Line ID in format "l_{hash8}" (e.g., "l_b2c3d4e5")

    Example:
        >>> generate_line_id("doc_abc:page_001", ["w_abc", "w_def", "w_ghi"])
        "l_f7e8d9c0"  # Example output
    """
    if not word_ids:
        raise ValueError("word_ids cannot be empty")

    hash_input = build_line_hash_input(page_id, word_ids)
    hash_hex = hashlib.sha256(hash_input.encode("utf-8")).hexdigest()[:8]

    return f"l_{hash_hex}"


def generate_block_id(page_id: str, line_ids: List[str]) -> str:
    """Generate a deterministic block ID from line IDs.

    The block ID is derived from the sorted list of line IDs it contains.

    Args:
        page_id: Page identifier
        line_ids: List of line IDs in the block

    Returns:
        Block ID in format "b_{hash8}" (e.g., "b_c3d4e5f6")

    Example:
        >>> generate_block_id("doc_abc:page_001", ["l_abc", "l_def"])
        "b_a1b2c3d4"  # Example output
    """
    if not line_ids:
        raise ValueError("line_ids cannot be empty")

    hash_input = build_block_hash_input(page_id, line_ids)
    hash_hex = hashlib.sha256(hash_input.encode("utf-8")).hexdigest()[:8]

    return f"b_{hash_hex}"


def generate_table_id(page_id: str, bbox: BBoxXYWH, table_index: int) -> str:
    """Generate a deterministic table ID.

    Args:
        page_id: Page identifier
        bbox: Table bounding box
        table_index: Table index on page (0-indexed)

    Returns:
        Table ID in format "t_{hash8}"
    """
    q_bbox = quantize_bbox(bbox)
    hash_input = f"{page_id}|table|{q_bbox.x},{q_bbox.y},{q_bbox.width},{q_bbox.height}|{table_index}"
    hash_hex = hashlib.sha256(hash_input.encode("utf-8")).hexdigest()[:8]

    return f"t_{hash_hex}"


def generate_cell_id(table_id: str, row: int, col: int) -> str:
    """Generate a cell ID from table ID and position.

    Cell IDs are not hashed - they use a structured format for readability.

    Args:
        table_id: Parent table ID
        row: Row index (0-indexed)
        col: Column index (0-indexed)

    Returns:
        Cell ID in format "{table_id}:r{NN}c{NN}"

    Example:
        >>> generate_cell_id("t_abc12345", 0, 2)
        "t_abc12345:r00c02"
    """
    return f"{table_id}:r{row:02d}c{col:02d}"


def verify_id_determinism(
    page_id: str,
    text: str,
    bbox: BBoxXYWH,
    reading_order: int,
    expected_id: str,
) -> bool:
    """Verify that ID generation produces expected result.

    Useful for testing determinism across environments.

    Args:
        page_id: Page identifier
        text: Word text
        bbox: Word bounding box
        reading_order: Reading order
        expected_id: Expected word ID

    Returns:
        True if generated ID matches expected
    """
    actual_id = generate_word_id(page_id, text, bbox, reading_order)
    return actual_id == expected_id


def get_id_algorithm_info() -> dict:
    """Get information about the ID generation algorithm.

    Returns:
        Dictionary with algorithm details for manifest inclusion
    """
    return {
        "id_algorithm_version": ID_ALGORITHM_VERSION,
        "hash_function": "sha256",
        "truncation_length": 8,
        "bbox_quantization_px": BBOX_QUANTIZATION_PX,
        "text_normalization": "unicode_nfc",
        "word_id_format": "w_{hash8}",
        "line_id_format": "l_{hash8}",
        "block_id_format": "b_{hash8}",
        "table_id_format": "t_{hash8}",
        "cell_id_format": "{table_id}:r{NN}c{NN}",
    }
