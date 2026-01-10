# This file and its contents are licensed under the Apache License 2.0.
# Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
OCR utility functions.

Provides:
- OCR data fetching from storage backends
- Reading order sorting algorithm
- Token-region intersection utilities
- Token clustering for table gridline suggestions
"""

import logging
from typing import Any

import ujson as json

logger = logging.getLogger(__name__)


def fetch_ocr_data(task) -> dict | None:
    """
    Fetch OCR JSON data for a task from storage.

    Args:
        task: Task model instance with data containing ocr_url

    Returns:
        Parsed OCR document data or None if unavailable
    """
    ocr_url = task.data.get('ocr_url')
    if not ocr_url:
        logger.debug(f'No ocr_url in task {task.id} data')
        return None

    try:
        # Use Label Studio's storage resolution to fetch the file
        from io_storages.functions import get_uri_via_regex

        # Resolve the URL through storage backends
        resolved_uri = get_uri_via_regex(ocr_url, task=task)
        if not resolved_uri:
            logger.warning(f'Could not resolve OCR URL: {ocr_url}')
            return None

        # TODO: Implement actual file fetching from storage
        # For now, return None - will be implemented when storage integration is complete
        logger.info(f'OCR URL resolved to: {resolved_uri}')
        return None

    except Exception as e:
        logger.error(f'Error fetching OCR data for task {task.id}: {e}')
        return None


def sort_tokens_reading_order(tokens: list[dict]) -> list[dict]:
    """
    Sort tokens into reading order (top-to-bottom, left-to-right within lines).

    Groups tokens by line_id if available, otherwise uses spatial clustering
    based on y-coordinate proximity.

    Args:
        tokens: List of token dicts with bbox [x, y, width, height]

    Returns:
        Tokens sorted in reading order
    """
    if not tokens:
        return []

    # If tokens have line_id, group by line first
    if tokens[0].get('line_id'):
        lines: dict[str, list] = {}
        for token in tokens:
            line_id = token.get('line_id', 'default')
            if line_id not in lines:
                lines[line_id] = []
            lines[line_id].append(token)

        # Sort tokens within each line by x coordinate
        for line_tokens in lines.values():
            line_tokens.sort(key=lambda t: t['bbox'][0])

        # Sort lines by average y coordinate
        sorted_lines = sorted(
            lines.values(),
            key=lambda line: sum(t['bbox'][1] for t in line) / len(line)
        )

        # Flatten
        return [token for line in sorted_lines for token in line]

    # Fallback: spatial clustering by y-coordinate
    # Group tokens into lines based on y-coordinate proximity
    line_threshold = 0.02  # 2% of page height
    sorted_by_y = sorted(tokens, key=lambda t: t['bbox'][1])

    lines: list[list] = []
    current_line: list = []
    current_y = None

    for token in sorted_by_y:
        token_y = token['bbox'][1]
        if current_y is None or abs(token_y - current_y) <= line_threshold:
            current_line.append(token)
            if current_y is None:
                current_y = token_y
            else:
                current_y = (current_y + token_y) / 2  # Running average
        else:
            if current_line:
                lines.append(current_line)
            current_line = [token]
            current_y = token_y

    if current_line:
        lines.append(current_line)

    # Sort tokens within each line by x coordinate
    for line in lines:
        line.sort(key=lambda t: t['bbox'][0])

    # Flatten
    return [token for line in lines for token in line]


def tokens_to_text(tokens: list[dict]) -> str:
    """
    Join tokens into text string with appropriate spacing.

    Args:
        tokens: List of token dicts in reading order

    Returns:
        Joined text string
    """
    if not tokens:
        return ''

    result = []
    prev_line_id = None

    for token in tokens:
        line_id = token.get('line_id')
        text = token.get('text', '')

        # Add newline when line changes
        if prev_line_id is not None and line_id != prev_line_id:
            result.append('\n')
        elif result:  # Add space between tokens on same line
            result.append(' ')

        result.append(text)
        prev_line_id = line_id

    return ''.join(result)


def calculate_intersection_ratio(token_bbox: list[float], region_bbox: list[float]) -> float:
    """
    Calculate the intersection ratio of a token with a region.

    Args:
        token_bbox: Token bounding box [x, y, width, height]
        region_bbox: Region bounding box [x, y, width, height]

    Returns:
        Ratio of token area that intersects with region (0-1)
    """
    tx, ty, tw, th = token_bbox
    rx, ry, rw, rh = region_bbox

    # Calculate intersection rectangle
    ix = max(tx, rx)
    iy = max(ty, ry)
    ix2 = min(tx + tw, rx + rw)
    iy2 = min(ty + th, ry + rh)

    # Check if there's no intersection
    if ix >= ix2 or iy >= iy2:
        return 0.0

    intersection_area = (ix2 - ix) * (iy2 - iy)
    token_area = tw * th

    if token_area == 0:
        return 0.0

    return intersection_area / token_area


def get_tokens_in_region(
    tokens: list[dict],
    region_bbox: list[float],
    threshold: float = 0.5
) -> list[dict]:
    """
    Get tokens that intersect with a region above the threshold.

    Args:
        tokens: List of token dicts with bbox
        region_bbox: Region bounding box [x, y, width, height] normalized 0-1
        threshold: Minimum intersection ratio to include (0-1)

    Returns:
        List of tokens that intersect the region, sorted in reading order
    """
    matching_tokens = []

    for token in tokens:
        bbox = token.get('bbox', [0, 0, 0, 0])
        ratio = calculate_intersection_ratio(bbox, region_bbox)
        if ratio >= threshold:
            matching_tokens.append(token)

    return sort_tokens_reading_order(matching_tokens)


def cluster_tokens_for_gridlines(
    tokens: list[dict],
    axis: str = 'horizontal'
) -> list[float]:
    """
    Cluster tokens to suggest table gridline positions.

    Analyzes token boundaries to find natural row or column separations.

    Args:
        tokens: List of token dicts with bbox
        axis: 'horizontal' for row lines, 'vertical' for column lines

    Returns:
        List of suggested gridline positions (0-1 normalized)
    """
    if not tokens:
        return [0.0, 1.0]

    # Collect all boundary positions
    boundaries: list[float] = []

    for token in tokens:
        bbox = token.get('bbox', [0, 0, 0, 0])
        if axis == 'horizontal':
            # For row lines, use y coordinates
            boundaries.append(bbox[1])  # top
            boundaries.append(bbox[1] + bbox[3])  # bottom
        else:
            # For column lines, use x coordinates
            boundaries.append(bbox[0])  # left
            boundaries.append(bbox[0] + bbox[2])  # right

    if not boundaries:
        return [0.0, 1.0]

    # Sort and deduplicate with clustering
    boundaries.sort()
    cluster_threshold = 0.01  # 1% of dimension

    clustered: list[float] = [0.0]  # Always start at 0
    last_pos = 0.0

    for pos in boundaries:
        if pos - last_pos > cluster_threshold:
            # Check if this is a significant gap (potential separator)
            clustered.append(pos)
            last_pos = pos

    # Always end at 1
    if clustered[-1] < 0.99:
        clustered.append(1.0)

    return clustered


def normalize_bbox(bbox: list, page_width: float, page_height: float) -> list[float]:
    """
    Normalize bbox coordinates to 0-1 range.

    Args:
        bbox: [x, y, width, height] in absolute coordinates
        page_width: Page width in same units as bbox
        page_height: Page height in same units as bbox

    Returns:
        Normalized [x, y, width, height] in 0-1 range
    """
    x, y, w, h = bbox
    return [
        x / page_width,
        y / page_height,
        w / page_width,
        h / page_height,
    ]


def denormalize_bbox_to_percent(normalized: list[float]) -> list[float]:
    """
    Convert normalized (0-1) bbox to percentage (0-100) range.

    Args:
        normalized: [x, y, width, height] in 0-1 range

    Returns:
        [x, y, width, height] in 0-100 percentage range
    """
    return [v * 100 for v in normalized]


def sort_tokens_by_reading_order(tokens: list[dict]) -> list[dict]:
    """
    Alias for sort_tokens_reading_order for API consistency.
    """
    return sort_tokens_reading_order(tokens)


def join_tokens_to_text(tokens: list[dict]) -> str:
    """
    Alias for tokens_to_text for API consistency.
    """
    return tokens_to_text(tokens)


def fetch_ocr_metadata(task_id: int) -> dict | None:
    """
    Fetch OCR metadata for a task.

    Args:
        task_id: Task ID to fetch metadata for

    Returns:
        OCR metadata dict or None if unavailable
    """
    # TODO: Implement actual fetching
    # This is a placeholder that will be implemented with storage integration
    return None


def fetch_page_tokens(task_id: int, page_index: int) -> dict | None:
    """
    Fetch tokens for a specific page.

    Args:
        task_id: Task ID
        page_index: 0-based page index

    Returns:
        Page tokens dict or None if unavailable
    """
    # TODO: Implement actual fetching
    return None


def get_region_tokens(
    task_id: int,
    page_index: int,
    x: float,
    y: float,
    width: float,
    height: float,
    threshold: float = 0.5
) -> dict:
    """
    Get tokens within a region.

    Args:
        task_id: Task ID
        page_index: 0-based page index
        x, y, width, height: Region bounds (0-1 normalized)
        threshold: Intersection threshold

    Returns:
        Dict with tokens and suggested_text
    """
    # TODO: Implement actual fetching and filtering
    return {
        'tokens': [],
        'suggested_text': '',
    }


def import_ocr_data(task_id: int, ocr_data: dict) -> bool:
    """
    Import OCR data for a task.

    Args:
        task_id: Task ID
        ocr_data: OCR document data

    Returns:
        True if successful, False otherwise
    """
    is_valid, error = validate_ocr_data(ocr_data)
    if not is_valid:
        logger.error(f'Invalid OCR data for task {task_id}: {error}')
        return False

    # TODO: Implement actual storage
    return True


def validate_ocr_data(data: dict) -> tuple[bool, str | None]:
    """
    Validate OCR data structure.

    Args:
        data: OCR document data dict

    Returns:
        Tuple of (is_valid, error_message)
    """
    if not isinstance(data, dict):
        return False, 'OCR data must be a dictionary'

    pages = data.get('pages', [])
    if not isinstance(pages, list):
        return False, 'pages must be a list'

    for i, page in enumerate(pages):
        if not isinstance(page, dict):
            return False, f'Page {i} must be a dictionary'

        if 'page_index' not in page:
            return False, f'Page {i} missing page_index'

        if 'tokens' not in page:
            return False, f'Page {i} missing tokens'

        tokens = page.get('tokens', [])
        if not isinstance(tokens, list):
            return False, f'Page {i} tokens must be a list'

        for j, token in enumerate(tokens):
            if not isinstance(token, dict):
                return False, f'Page {i} token {j} must be a dictionary'

            required_fields = ['id', 'text', 'bbox']
            for field in required_fields:
                if field not in token:
                    return False, f'Page {i} token {j} missing {field}'

            bbox = token.get('bbox', [])
            if not isinstance(bbox, list) or len(bbox) != 4:
                return False, f'Page {i} token {j} bbox must be [x, y, w, h]'

            for k, val in enumerate(bbox):
                if not isinstance(val, (int, float)):
                    return False, f'Page {i} token {j} bbox[{k}] must be numeric'
                if val < 0 or val > 1:
                    return False, f'Page {i} token {j} bbox[{k}] must be 0-1'

    return True, None
