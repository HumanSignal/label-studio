"""Coordinate conversion utilities for PDF ML Export.

This module provides functions to convert between PDF coordinate systems
and rendered PNG pixel coordinates.

PDF uses a coordinate system with:
- Origin at bottom-left
- Units in points (1 point = 1/72 inch)

PNG images use:
- Origin at top-left
- Units in pixels

The conversion requires knowing the page height and render scale (DPI / 72).
"""

from typing import Tuple

from .models import BBoxPt, BBoxXYWH


def pdf_points_to_pixels(
    x_pt: float,
    y_pt: float,
    w_pt: float,
    h_pt: float,
    page_height_pt: float,
    scale: float,
) -> BBoxXYWH:
    """Convert PDF coordinates to PNG pixel coordinates.

    PDF origin is bottom-left; PNG origin is top-left.
    This function handles the y-axis flip and scaling.

    Args:
        x_pt: X coordinate in PDF points (from left)
        y_pt: Y coordinate in PDF points (from bottom)
        w_pt: Width in PDF points
        h_pt: Height in PDF points
        page_height_pt: Total page height in PDF points
        scale: Scale factor (render_dpi / 72)

    Returns:
        BBoxXYWH with pixel coordinates, origin top-left

    Example:
        >>> # Page is 612x792 points (letter size), render at 200 DPI
        >>> scale = 200 / 72  # ~2.78
        >>> bbox = pdf_points_to_pixels(72, 720, 100, 12, 792, scale)
        >>> # y flipped: 792 - 720 - 12 = 60 points from top
    """
    # Convert y from bottom-left origin to top-left origin
    y_top_pt = page_height_pt - y_pt - h_pt

    # Scale to pixels and round to integers
    return BBoxXYWH(
        x=int(round(x_pt * scale)),
        y=int(round(y_top_pt * scale)),
        width=int(round(w_pt * scale)),
        height=int(round(h_pt * scale)),
    )


def pixels_to_pdf_points(
    x_px: int,
    y_px: int,
    w_px: int,
    h_px: int,
    page_height_pt: float,
    scale: float,
) -> Tuple[float, float, float, float]:
    """Convert PNG pixel coordinates back to PDF points.

    Inverse of pdf_points_to_pixels.

    Args:
        x_px: X coordinate in pixels (from left)
        y_px: Y coordinate in pixels (from top)
        w_px: Width in pixels
        h_px: Height in pixels
        page_height_pt: Total page height in PDF points
        scale: Scale factor (render_dpi / 72)

    Returns:
        Tuple of (x_pt, y_pt, w_pt, h_pt) in PDF coordinates
    """
    # Scale pixels to points
    x_pt = x_px / scale
    y_top_pt = y_px / scale
    w_pt = w_px / scale
    h_pt = h_px / scale

    # Convert y from top-left origin back to bottom-left origin
    y_pt = page_height_pt - y_top_pt - h_pt

    return (x_pt, y_pt, w_pt, h_pt)


def calculate_render_scale(dpi: int) -> float:
    """Calculate the render scale factor from DPI.

    PDF points are 1/72 inch, so scale = DPI / 72.

    Args:
        dpi: Rendering DPI (dots per inch)

    Returns:
        Scale factor for coordinate conversion
    """
    return dpi / 72.0


def calculate_rendered_dimensions(
    page_width_pt: float,
    page_height_pt: float,
    dpi: int,
) -> Tuple[int, int]:
    """Calculate rendered image dimensions in pixels.

    Args:
        page_width_pt: Page width in PDF points
        page_height_pt: Page height in PDF points
        dpi: Rendering DPI

    Returns:
        Tuple of (width_px, height_px)
    """
    scale = calculate_render_scale(dpi)
    width_px = int(round(page_width_pt * scale))
    height_px = int(round(page_height_pt * scale))
    return (width_px, height_px)


def apply_rotation_to_bbox(
    bbox: BBoxXYWH,
    rotation_deg: int,
    page_width_px: int,
    page_height_px: int,
) -> BBoxXYWH:
    """Apply page rotation to a bounding box.

    When a PDF page is rotated, coordinates need to be transformed
    to match the rendered image orientation.

    Args:
        bbox: Original bounding box
        rotation_deg: Page rotation (0, 90, 180, 270)
        page_width_px: Page width in pixels (before rotation)
        page_height_px: Page height in pixels (before rotation)

    Returns:
        Transformed bounding box

    Note:
        After 90 or 270 degree rotation, width and height are swapped.
    """
    if rotation_deg == 0:
        return bbox

    x, y, w, h = bbox.x, bbox.y, bbox.width, bbox.height

    if rotation_deg == 90:
        # 90 CW: (x, y) -> (page_height - y - h, x)
        new_x = page_height_px - y - h
        new_y = x
        return BBoxXYWH(x=new_x, y=new_y, width=h, height=w)

    elif rotation_deg == 180:
        # 180: (x, y) -> (page_width - x - w, page_height - y - h)
        new_x = page_width_px - x - w
        new_y = page_height_px - y - h
        return BBoxXYWH(x=new_x, y=new_y, width=w, height=h)

    elif rotation_deg == 270:
        # 270 CW (90 CCW): (x, y) -> (y, page_width - x - w)
        new_x = y
        new_y = page_width_px - x - w
        return BBoxXYWH(x=new_x, y=new_y, width=h, height=w)

    else:
        raise ValueError(f"Invalid rotation: {rotation_deg}. Must be 0, 90, 180, or 270.")


def pdfplumber_to_bbox(
    word: dict,
    page_height_pt: float,
    scale: float,
) -> BBoxXYWH:
    """Convert pdfplumber word dict to BBoxXYWH.

    pdfplumber returns words with: x0, top, x1, bottom
    where top/bottom are already in top-left origin.

    Args:
        word: pdfplumber word dict with x0, top, x1, bottom
        page_height_pt: Page height in points (unused, for compatibility)
        scale: Render scale factor

    Returns:
        BBoxXYWH in pixel coordinates
    """
    x0 = word["x0"]
    top = word["top"]
    x1 = word["x1"]
    bottom = word["bottom"]

    # pdfplumber already uses top-left origin via 'top' attribute
    # Just need to scale to pixels
    return BBoxXYWH(
        x=int(round(x0 * scale)),
        y=int(round(top * scale)),
        width=int(round((x1 - x0) * scale)),
        height=int(round((bottom - top) * scale)),
    )


def bbox_to_xywh_string(bbox: BBoxXYWH) -> str:
    """Convert bbox to W3C Media Fragment xywh format.

    Used for W3C Web Annotation FragmentSelector.

    Args:
        bbox: Bounding box

    Returns:
        String in format "xywh=x,y,w,h"
    """
    return f"xywh={bbox.x},{bbox.y},{bbox.width},{bbox.height}"


def quantize_bbox(bbox: BBoxXYWH, grid_px: int = 2) -> BBoxXYWH:
    """Quantize bbox coordinates to a pixel grid.

    Used for deterministic ID generation to make IDs robust
    to minor extraction variations.

    Args:
        bbox: Original bounding box
        grid_px: Grid size in pixels (default 2)

    Returns:
        Quantized bounding box with coordinates rounded to grid
    """
    def quantize(value: int) -> int:
        return round(value / grid_px) * grid_px

    return BBoxXYWH(
        x=quantize(bbox.x),
        y=quantize(bbox.y),
        width=max(grid_px, quantize(bbox.width)),  # Ensure non-zero
        height=max(grid_px, quantize(bbox.height)),
    )


def merge_bboxes(bboxes: list) -> BBoxXYWH:
    """Merge multiple bboxes into a single bounding box.

    Computes the union (smallest box containing all inputs).

    Args:
        bboxes: List of BBoxXYWH objects

    Returns:
        Single BBoxXYWH containing all input boxes

    Raises:
        ValueError: If bboxes list is empty
    """
    if not bboxes:
        raise ValueError("Cannot merge empty list of bboxes")

    result = bboxes[0]
    for bbox in bboxes[1:]:
        result = result.union(bbox)
    return result
