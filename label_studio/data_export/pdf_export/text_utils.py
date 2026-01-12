"""Text processing utilities for PDF ML Export.

This module provides functions for text normalization, canonicalization,
and processing used throughout the PDF export pipeline.

Key functions:
- Unicode NFC normalization for consistent text representation
- Whitespace normalization for clean output
- Text cleaning for word tokens
"""

import re
import unicodedata
from typing import List, Optional


def normalize_unicode(text: str) -> str:
    """Normalize text to Unicode NFC form.

    NFC (Canonical Decomposition, followed by Canonical Composition)
    ensures consistent representation of characters that can be
    represented in multiple ways (e.g., é as single char vs e + combining accent).

    Args:
        text: Input text string

    Returns:
        NFC-normalized text string

    Example:
        >>> normalize_unicode("café")  # Could be 4 or 5 chars
        "café"  # Always 4 chars with NFC
    """
    if not text:
        return ""
    return unicodedata.normalize("NFC", text)


def normalize_whitespace(text: str) -> str:
    """Normalize whitespace in text.

    Converts all whitespace sequences to single spaces and strips
    leading/trailing whitespace.

    Args:
        text: Input text

    Returns:
        Text with normalized whitespace
    """
    if not text:
        return ""
    # Replace all whitespace sequences with single space
    normalized = re.sub(r"\s+", " ", text)
    return normalized.strip()


def clean_word_text(text: str) -> str:
    """Clean and normalize word text for export.

    Applies:
    1. Unicode NFC normalization
    2. Whitespace stripping
    3. Control character removal

    Args:
        text: Raw word text from PDF extraction

    Returns:
        Cleaned word text
    """
    if not text:
        return ""

    # NFC normalize
    text = normalize_unicode(text)

    # Remove control characters (except common whitespace)
    text = "".join(
        char for char in text
        if not unicodedata.category(char).startswith("C") or char in " \t\n\r"
    )

    # Strip whitespace
    return text.strip()


def is_valid_word(text: str) -> bool:
    """Check if text represents a valid word token.

    A valid word must:
    - Not be empty after cleaning
    - Contain at least one alphanumeric or punctuation character
    - Not be only whitespace

    Args:
        text: Word text to validate

    Returns:
        True if valid word, False otherwise
    """
    if not text or not text.strip():
        return False

    cleaned = clean_word_text(text)
    if not cleaned:
        return False

    # Must have at least one letter, digit, or common punctuation
    return bool(re.search(r"[\w\d.,!?;:'\"-]", cleaned, re.UNICODE))


def join_words_to_line(words: List[str], separator: str = " ") -> str:
    """Join word texts into a line.

    Args:
        words: List of word texts
        separator: Separator between words (default single space)

    Returns:
        Joined line text
    """
    # Filter empty and clean
    cleaned_words = [clean_word_text(w) for w in words if w]
    cleaned_words = [w for w in cleaned_words if w]
    return separator.join(cleaned_words)


def join_lines_to_block(lines: List[str], separator: str = "\n") -> str:
    """Join line texts into a block.

    Args:
        lines: List of line texts
        separator: Separator between lines (default newline)

    Returns:
        Joined block text
    """
    return separator.join(lines)


def join_blocks_to_page(blocks: List[str], separator: str = "\n\n") -> str:
    """Join block texts into page text.

    Args:
        blocks: List of block texts
        separator: Separator between blocks (default double newline)

    Returns:
        Joined page text
    """
    return separator.join(blocks)


def extract_quote_context(
    canonical_text: str,
    char_start: int,
    char_end: int,
    context_chars: int = 30,
) -> tuple:
    """Extract quote with surrounding context for W3C TextQuoteSelector.

    Args:
        canonical_text: Full canonical text of the page
        char_start: Start character position of quote
        char_end: End character position of quote
        context_chars: Number of context characters to extract

    Returns:
        Tuple of (prefix, exact, suffix)
    """
    # Extract the exact quote
    exact = canonical_text[char_start:char_end]

    # Extract prefix (up to context_chars before)
    prefix_start = max(0, char_start - context_chars)
    prefix = canonical_text[prefix_start:char_start]

    # Extract suffix (up to context_chars after)
    suffix_end = min(len(canonical_text), char_end + context_chars)
    suffix = canonical_text[char_end:suffix_end]

    return (prefix, exact, suffix)


def find_word_boundaries(text: str) -> List[tuple]:
    """Find word boundaries in text.

    Returns list of (start, end) tuples for each word.

    Args:
        text: Input text

    Returns:
        List of (start, end) character position tuples
    """
    boundaries = []
    for match in re.finditer(r"\S+", text):
        boundaries.append((match.start(), match.end()))
    return boundaries


def truncate_text(text: str, max_length: int, suffix: str = "...") -> str:
    """Truncate text to maximum length.

    Args:
        text: Input text
        max_length: Maximum length including suffix
        suffix: Suffix to add when truncating

    Returns:
        Truncated text
    """
    if len(text) <= max_length:
        return text

    truncate_at = max_length - len(suffix)
    if truncate_at <= 0:
        return text[:max_length]

    return text[:truncate_at] + suffix


def compute_text_hash_input(
    page_id: str,
    text: str,
    bbox_str: str,
    reading_order: int,
) -> str:
    """Compute the hash input string for deterministic ID generation.

    This creates a consistent string representation for hashing
    that includes all relevant fields.

    Args:
        page_id: Page identifier
        text: Normalized word text
        bbox_str: Bbox as "x,y,w,h" string
        reading_order: Word reading order position

    Returns:
        Hash input string in format "page_id|text|bbox|order"
    """
    # Ensure text is NFC normalized
    normalized_text = normalize_unicode(text)
    return f"{page_id}|{normalized_text}|{bbox_str}|{reading_order}"


def levenshtein_distance(s1: str, s2: str) -> int:
    """Compute Levenshtein edit distance between two strings.

    Useful for fuzzy matching when re-anchoring annotations.

    Args:
        s1: First string
        s2: Second string

    Returns:
        Edit distance (number of insertions, deletions, substitutions)
    """
    if len(s1) < len(s2):
        return levenshtein_distance(s2, s1)

    if len(s2) == 0:
        return len(s1)

    previous_row = range(len(s2) + 1)
    for i, c1 in enumerate(s1):
        current_row = [i + 1]
        for j, c2 in enumerate(s2):
            # j+1 instead of j since previous_row and current_row are one character longer
            insertions = previous_row[j + 1] + 1
            deletions = current_row[j] + 1
            substitutions = previous_row[j] + (c1 != c2)
            current_row.append(min(insertions, deletions, substitutions))
        previous_row = current_row

    return previous_row[-1]


def fuzzy_match_score(s1: str, s2: str) -> float:
    """Compute fuzzy match score between two strings.

    Returns a score from 0.0 (no match) to 1.0 (exact match).

    Args:
        s1: First string
        s2: Second string

    Returns:
        Match score between 0.0 and 1.0
    """
    if not s1 and not s2:
        return 1.0
    if not s1 or not s2:
        return 0.0

    max_len = max(len(s1), len(s2))
    distance = levenshtein_distance(s1, s2)
    return 1.0 - (distance / max_len)
