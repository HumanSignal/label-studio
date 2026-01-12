"""Canonical Text Construction for PDF ML Export.

This module provides functions to build canonical text representations
from document layout structures. The canonical text follows specific rules
for word, line, and block joining to create a predictable, reconstructible
text representation.

Canonical Text Rules:
- Words within a line are joined by single space
- Lines within a block are joined by single newline (\\n)
- Blocks are separated by double newline (\\n\\n)
- Text is Unicode NFC normalized

See schemas/canonical_text_rules.md for full specification.
"""

import logging
from typing import Dict, List, Tuple

from .models import (
    BBoxXYWH,
    Block,
    CanonicalIndex,
    Line,
    Word,
)
from .text_utils import normalize_unicode

logger = logging.getLogger(__name__)


def build_canonical_text(
    blocks: List[Block],
    lines: List[Line],
    words: List[Word],
) -> str:
    """Build canonical text from layout elements.

    Constructs text following canonical rules:
    - Words joined by single space
    - Lines end with \\n
    - Blocks separated by \\n\\n

    Args:
        blocks: Block objects (will be sorted by reading_order)
        lines: Line objects
        words: Word objects

    Returns:
        Canonical text string
    """
    if not blocks:
        return ""

    # Create lookup maps
    line_map = {l.line_id: l for l in lines}
    word_map = {w.word_id: w for w in words}

    # Sort blocks by reading order
    sorted_blocks = sorted(blocks, key=lambda b: b.reading_order)

    text_parts = []

    for block in sorted_blocks:
        # Get lines in this block, sorted by reading order
        block_lines = [line_map[lid] for lid in block.line_ids if lid in line_map]
        block_lines.sort(key=lambda l: l.reading_order)

        line_texts = []
        for line in block_lines:
            # Get words in this line, sorted by reading order
            line_words = [word_map[wid] for wid in line.word_ids if wid in word_map]
            line_words.sort(key=lambda w: w.reading_order)

            # Join words with single space
            line_text = " ".join(w.text for w in line_words)
            line_texts.append(line_text)

        # Join lines with single newline
        block_text = "\n".join(line_texts)
        text_parts.append(block_text)

    # Join blocks with double newline
    return "\n\n".join(text_parts)


def build_canonical_index(
    blocks: List[Block],
    lines: List[Line],
    words: List[Word],
) -> Tuple[str, CanonicalIndex]:
    """Build canonical text and character offset index.

    Constructs canonical text and simultaneously builds an index
    mapping word_ids, line_ids, and block_ids to their character
    positions (char_start, char_end) in the canonical text.

    Args:
        blocks: Block objects (will be sorted by reading_order)
        lines: Line objects
        words: Word objects

    Returns:
        Tuple of (canonical_text, CanonicalIndex)
    """
    index = CanonicalIndex()

    if not blocks:
        return "", index

    # Create lookup maps
    line_map = {l.line_id: l for l in lines}
    word_map = {w.word_id: w for w in words}

    # Sort blocks by reading order
    sorted_blocks = sorted(blocks, key=lambda b: b.reading_order)

    canonical_text = ""

    for block_idx, block in enumerate(sorted_blocks):
        # Add block separator (except for first block)
        if block_idx > 0:
            canonical_text += "\n\n"

        block_start = len(canonical_text)

        # Get lines in this block
        block_lines = [line_map[lid] for lid in block.line_ids if lid in line_map]
        block_lines.sort(key=lambda l: l.reading_order)

        for line_idx, line in enumerate(block_lines):
            # Add line separator (except for first line in block)
            if line_idx > 0:
                canonical_text += "\n"

            line_start = len(canonical_text)

            # Get words in this line
            line_words = [word_map[wid] for wid in line.word_ids if wid in word_map]
            line_words.sort(key=lambda w: w.reading_order)

            for word_idx, word in enumerate(line_words):
                # Add word separator (except for first word in line)
                if word_idx > 0:
                    canonical_text += " "

                word_start = len(canonical_text)
                canonical_text += word.text
                word_end = len(canonical_text)

                # Add word to index
                index.add_word(word.word_id, word_start, word_end)

            line_end = len(canonical_text)
            index.add_line(line.line_id, line_start, line_end)

        block_end = len(canonical_text)
        index.add_block(block.block_id, block_start, block_end)

    return canonical_text, index


def get_char_range_for_word_ids(
    word_ids: List[str],
    index: CanonicalIndex,
) -> Tuple[int, int]:
    """Get character range covering multiple word IDs.

    Finds the minimum char_start and maximum char_end across
    all specified word IDs.

    Args:
        word_ids: List of word IDs to cover
        index: Canonical index with word positions

    Returns:
        Tuple of (char_start, char_end) for the range

    Raises:
        ValueError: If no valid word IDs found in index
    """
    if not word_ids:
        raise ValueError("word_ids cannot be empty")

    positions = []
    for word_id in word_ids:
        if word_id in index.words:
            positions.append(index.words[word_id])

    if not positions:
        raise ValueError(f"No word IDs found in index: {word_ids}")

    char_start = min(p[0] for p in positions)
    char_end = max(p[1] for p in positions)

    return char_start, char_end


def extract_text_from_char_range(
    canonical_text: str,
    char_start: int,
    char_end: int,
) -> str:
    """Extract text from canonical text by character range.

    Args:
        canonical_text: Full canonical text
        char_start: Start character position
        char_end: End character position

    Returns:
        Extracted text substring
    """
    return canonical_text[char_start:char_end]


def find_word_ids_in_range(
    char_start: int,
    char_end: int,
    index: CanonicalIndex,
) -> List[str]:
    """Find all word IDs that overlap with a character range.

    A word overlaps if any part of it falls within the range.

    Args:
        char_start: Start of character range
        char_end: End of character range
        index: Canonical index with word positions

    Returns:
        List of word IDs overlapping the range (in document order)
    """
    overlapping = []

    for word_id, (w_start, w_end) in index.words.items():
        # Check if word overlaps with range
        if w_start < char_end and w_end > char_start:
            overlapping.append((word_id, w_start))

    # Sort by position and return just IDs
    overlapping.sort(key=lambda x: x[1])
    return [wid for wid, _ in overlapping]


def update_elements_with_positions(
    blocks: List[Block],
    lines: List[Line],
    words: List[Word],
    index: CanonicalIndex,
) -> None:
    """Update elements in-place with character positions from index.

    Modifies the char_start and char_end attributes of words, lines,
    and blocks based on the canonical index.

    Args:
        blocks: Block objects to update
        lines: Line objects to update
        words: Word objects to update
        index: Canonical index with positions
    """
    # Update words
    for word in words:
        if word.word_id in index.words:
            word.char_start, word.char_end = index.words[word.word_id]

    # Update lines
    for line in lines:
        if line.line_id in index.lines:
            line.char_start, line.char_end = index.lines[line.line_id]

    # Update blocks
    for block in blocks:
        if block.block_id in index.blocks:
            block.char_start, block.char_end = index.blocks[block.block_id]


def rebuild_text_from_elements(
    word_ids: List[str],
    words: List[Word],
    lines: List[Line],
) -> str:
    """Rebuild text from word IDs preserving line breaks.

    Reconstructs text from a list of word IDs, inserting line breaks
    where words belong to different lines.

    Args:
        word_ids: Ordered list of word IDs
        words: All word objects
        lines: All line objects

    Returns:
        Reconstructed text with appropriate spacing
    """
    if not word_ids:
        return ""

    # Create lookup maps
    word_map = {w.word_id: w for w in words}

    # Build line -> word_ids map for line break detection
    line_to_words: Dict[str, List[str]] = {}
    for line in lines:
        line_to_words[line.line_id] = line.word_ids

    # Get word objects in order
    word_objs = [word_map[wid] for wid in word_ids if wid in word_map]
    if not word_objs:
        return ""

    result = []
    prev_line_id = None

    for word in word_objs:
        if prev_line_id is not None and word.line_id != prev_line_id:
            # Line break between words
            result.append("\n")
            result.append(word.text)
        elif result:
            # Same line, add space
            result.append(" ")
            result.append(word.text)
        else:
            # First word
            result.append(word.text)

        prev_line_id = word.line_id

    return "".join(result)
