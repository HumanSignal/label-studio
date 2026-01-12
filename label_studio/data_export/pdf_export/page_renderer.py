"""Page Rendering for PDF ML Export.

This module provides functions to render PDF pages to PNG images
at configurable DPI for inclusion in export bundles.

Uses pdf2image (which wraps poppler) for high-quality PDF rendering.
"""

import logging
import os
from typing import List, Optional, Tuple

from .models import ExportOptions, PageGeometry

logger = logging.getLogger(__name__)

# Try to import pdf2image
try:
    from pdf2image import convert_from_path
    from pdf2image.exceptions import PDFPageCountError, PDFSyntaxError

    PDF2IMAGE_AVAILABLE = True
except ImportError:
    PDF2IMAGE_AVAILABLE = False
    logger.warning("pdf2image not available - page rendering disabled")


def is_rendering_available() -> bool:
    """Check if page rendering is available.

    Returns:
        True if pdf2image is installed and functional
    """
    return PDF2IMAGE_AVAILABLE


def render_page(
    pdf_path: str,
    page_number: int,
    dpi: int = 200,
) -> Optional["Image"]:
    """Render a single PDF page to PIL Image.

    Args:
        pdf_path: Path to PDF file
        page_number: Page number (1-indexed)
        dpi: Render DPI (default 200)

    Returns:
        PIL Image object or None if rendering failed
    """
    if not PDF2IMAGE_AVAILABLE:
        logger.error("pdf2image not available for rendering")
        return None

    try:
        # Render single page
        images = convert_from_path(
            pdf_path,
            dpi=dpi,
            first_page=page_number,
            last_page=page_number,
            fmt="png",
        )

        if images:
            return images[0]
        else:
            logger.warning(f"No image returned for page {page_number}")
            return None

    except PDFPageCountError as e:
        logger.error(f"Invalid page number {page_number}: {e}")
        return None
    except PDFSyntaxError as e:
        logger.error(f"PDF syntax error: {e}")
        return None
    except Exception as e:
        logger.exception(f"Failed to render page {page_number}: {e}")
        return None


def render_all_pages(
    pdf_path: str,
    dpi: int = 200,
) -> List["Image"]:
    """Render all pages of a PDF to PIL Images.

    Args:
        pdf_path: Path to PDF file
        dpi: Render DPI (default 200)

    Returns:
        List of PIL Image objects (empty if rendering failed)
    """
    if not PDF2IMAGE_AVAILABLE:
        logger.error("pdf2image not available for rendering")
        return []

    try:
        images = convert_from_path(
            pdf_path,
            dpi=dpi,
            fmt="png",
        )
        return images

    except Exception as e:
        logger.exception(f"Failed to render PDF pages: {e}")
        return []


def save_page_image(
    image: "Image",
    output_path: str,
    optimize: bool = True,
) -> str:
    """Save PIL Image to PNG file.

    Args:
        image: PIL Image object
        output_path: Output file path
        optimize: Whether to optimize PNG (default True)

    Returns:
        Path to saved file
    """
    # Ensure directory exists
    os.makedirs(os.path.dirname(output_path) or ".", exist_ok=True)

    # Save as PNG
    image.save(output_path, format="PNG", optimize=optimize)

    return output_path


def render_and_save_page(
    pdf_path: str,
    page_number: int,
    output_path: str,
    dpi: int = 200,
) -> Optional[str]:
    """Render a PDF page and save to file.

    Args:
        pdf_path: Path to PDF file
        page_number: Page number (1-indexed)
        output_path: Output file path
        dpi: Render DPI (default 200)

    Returns:
        Path to saved file or None if failed
    """
    image = render_page(pdf_path, page_number, dpi)
    if image is None:
        return None

    return save_page_image(image, output_path)


def render_document_pages(
    pdf_path: str,
    output_dir: str,
    options: ExportOptions,
) -> List[str]:
    """Render all pages of a document to PNG files.

    Creates PNG files in output_dir/pages/page_NNN.png format.

    Args:
        pdf_path: Path to PDF file
        output_dir: Output directory for document
        options: Export options (includes dpi setting)

    Returns:
        List of paths to rendered page images
    """
    if not options.include_page_images:
        return []

    if not PDF2IMAGE_AVAILABLE:
        logger.warning("Page rendering skipped - pdf2image not available")
        return []

    # Create pages directory
    pages_dir = os.path.join(output_dir, "pages")
    os.makedirs(pages_dir, exist_ok=True)

    # Render all pages
    images = render_all_pages(pdf_path, options.render_dpi)

    saved_paths = []
    for idx, image in enumerate(images):
        page_num = idx + 1
        output_path = os.path.join(pages_dir, f"page_{page_num:03d}.png")

        try:
            save_page_image(image, output_path)
            saved_paths.append(output_path)
            logger.debug(f"Saved page {page_num} to {output_path}")
        except Exception as e:
            logger.error(f"Failed to save page {page_num}: {e}")

    return saved_paths


def get_rendered_dimensions(
    geometry: PageGeometry,
) -> Tuple[int, int]:
    """Get rendered image dimensions from page geometry.

    Args:
        geometry: Page geometry with render settings

    Returns:
        Tuple of (width_px, height_px)
    """
    return (geometry.rendered_width_px, geometry.rendered_height_px)


def calculate_render_dimensions(
    pdf_width_pt: float,
    pdf_height_pt: float,
    dpi: int,
    rotation_deg: int = 0,
) -> Tuple[int, int]:
    """Calculate rendered image dimensions.

    Args:
        pdf_width_pt: PDF page width in points
        pdf_height_pt: PDF page height in points
        dpi: Render DPI
        rotation_deg: Page rotation (0, 90, 180, 270)

    Returns:
        Tuple of (width_px, height_px)
    """
    scale = dpi / 72.0

    # Calculate base dimensions
    width_px = int(round(pdf_width_pt * scale))
    height_px = int(round(pdf_height_pt * scale))

    # Apply rotation swap for 90/270
    if rotation_deg in (90, 270):
        width_px, height_px = height_px, width_px

    return (width_px, height_px)


def verify_page_image(
    image_path: str,
    expected_width: int,
    expected_height: int,
    tolerance: int = 2,
) -> bool:
    """Verify rendered page image dimensions.

    Args:
        image_path: Path to rendered image
        expected_width: Expected width in pixels
        expected_height: Expected height in pixels
        tolerance: Allowed pixel difference (default 2)

    Returns:
        True if dimensions match within tolerance
    """
    try:
        from PIL import Image

        with Image.open(image_path) as img:
            width, height = img.size

        width_ok = abs(width - expected_width) <= tolerance
        height_ok = abs(height - expected_height) <= tolerance

        if not width_ok or not height_ok:
            logger.warning(
                f"Image dimensions mismatch: "
                f"got {width}x{height}, expected {expected_width}x{expected_height}"
            )
            return False

        return True

    except Exception as e:
        logger.error(f"Failed to verify image {image_path}: {e}")
        return False
