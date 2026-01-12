"""OCR Integration for PDF ML Export.

This module provides OCR fallback integration for cases where native PDF text
extraction has low coverage. It integrates with Label Studio's existing OCR
module when available.

Note: This is a stub implementation. Full OCR integration will be implemented
when connecting with the label_studio/ocr/ module infrastructure.
"""

import logging
from typing import List, Optional

from .models import BBoxXYWH, LayerId, TextLayer, Token

logger = logging.getLogger(__name__)


class OcrProvider:
    """Abstract base class for OCR providers."""

    def extract_text(
        self,
        image_path: str,
        language: str = "eng",
    ) -> List[Token]:
        """Extract text tokens from an image.

        Args:
            image_path: Path to image file (PNG)
            language: OCR language code

        Returns:
            List of Token objects with text and bboxes
        """
        raise NotImplementedError("Subclasses must implement extract_text")

    def get_engine_name(self) -> str:
        """Get the OCR engine identifier.

        Returns:
            Engine name string (e.g., "tesseract/5.x")
        """
        raise NotImplementedError("Subclasses must implement get_engine_name")


class TesseractOcrProvider(OcrProvider):
    """OCR provider using Tesseract.

    This is a stub implementation. In production, this would connect to
    the label_studio/ocr/ module or pytesseract.
    """

    def __init__(self):
        """Initialize Tesseract OCR provider."""
        self._available = self._check_tesseract_available()

    def _check_tesseract_available(self) -> bool:
        """Check if Tesseract is available on the system."""
        try:
            import pytesseract

            pytesseract.get_tesseract_version()
            return True
        except Exception:
            return False

    @property
    def is_available(self) -> bool:
        """Check if this OCR provider is available."""
        return self._available

    def extract_text(
        self,
        image_path: str,
        language: str = "eng",
    ) -> List[Token]:
        """Extract text tokens from an image using Tesseract.

        Args:
            image_path: Path to image file (PNG)
            language: Tesseract language code (e.g., "eng", "deu")

        Returns:
            List of Token objects with text and bboxes
        """
        if not self._available:
            logger.warning("Tesseract OCR not available, returning empty tokens")
            return []

        try:
            import pytesseract
            from PIL import Image

            # Open image
            img = Image.open(image_path)

            # Get word-level bboxes using Tesseract's TSV output
            data = pytesseract.image_to_data(
                img,
                lang=language,
                output_type=pytesseract.Output.DICT,
            )

            tokens = []
            n_boxes = len(data["text"])

            for i in range(n_boxes):
                text = data["text"][i]
                conf = data["conf"][i]

                # Skip empty or low-confidence results
                if not text or not text.strip() or conf < 0:
                    continue

                # Extract bbox
                x = data["left"][i]
                y = data["top"][i]
                w = data["width"][i]
                h = data["height"][i]

                # Skip invalid bboxes
                if w <= 0 or h <= 0:
                    continue

                bbox = BBoxXYWH(x=x, y=y, width=w, height=h)
                confidence = conf / 100.0  # Convert to 0-1 range

                token = Token(
                    token_id=f"ocr_{i:06d}",
                    text=text.strip(),
                    bbox=bbox,
                    confidence=confidence,
                )
                tokens.append(token)

            return tokens

        except Exception as e:
            logger.exception(f"Tesseract OCR failed: {e}")
            return []

    def get_engine_name(self) -> str:
        """Get Tesseract engine version string."""
        try:
            import pytesseract

            version = pytesseract.get_tesseract_version()
            return f"tesseract/{version}"
        except Exception:
            return "tesseract/unknown"


class LabelStudioOcrProvider(OcrProvider):
    """OCR provider using Label Studio's OCR module.

    This is a stub that will integrate with the existing label_studio/ocr/
    infrastructure when available.
    """

    def __init__(self):
        """Initialize Label Studio OCR provider."""
        self._available = self._check_ls_ocr_available()

    def _check_ls_ocr_available(self) -> bool:
        """Check if Label Studio OCR module is available."""
        try:
            # Check for Label Studio OCR module
            # This would import from label_studio.ocr when available
            return False  # Stub: not yet integrated
        except ImportError:
            return False

    @property
    def is_available(self) -> bool:
        """Check if this OCR provider is available."""
        return self._available

    def extract_text(
        self,
        image_path: str,
        language: str = "eng",
    ) -> List[Token]:
        """Extract text using Label Studio OCR.

        Stub implementation - returns empty list.
        """
        logger.warning("Label Studio OCR integration not yet implemented")
        return []

    def get_engine_name(self) -> str:
        """Get Label Studio OCR engine identifier."""
        return "label-studio-ocr/1.0"


def get_default_ocr_provider() -> Optional[OcrProvider]:
    """Get the default OCR provider.

    Tries providers in order of preference:
    1. Label Studio OCR (if available)
    2. Tesseract (if available)
    3. None

    Returns:
        OcrProvider instance or None if no OCR available
    """
    # Try Label Studio OCR first
    ls_provider = LabelStudioOcrProvider()
    if ls_provider.is_available:
        return ls_provider

    # Try Tesseract
    tesseract_provider = TesseractOcrProvider()
    if tesseract_provider.is_available:
        return tesseract_provider

    # No OCR available
    logger.warning("No OCR provider available")
    return None


def extract_ocr_layer(
    image_path: str,
    page_width_px: int,
    page_height_px: int,
    language: str = "eng",
    provider: Optional[OcrProvider] = None,
) -> Optional[TextLayer]:
    """Extract OCR text layer from a page image.

    Args:
        image_path: Path to rendered page image (PNG)
        page_width_px: Page width in pixels
        page_height_px: Page height in pixels
        language: OCR language code
        provider: OCR provider to use (uses default if None)

    Returns:
        TextLayer with OCR results, or None if OCR unavailable
    """
    if provider is None:
        provider = get_default_ocr_provider()

    if provider is None:
        logger.warning("No OCR provider available, skipping OCR layer")
        return None

    try:
        # Extract tokens
        tokens = provider.extract_text(image_path, language)

        if not tokens:
            return TextLayer(
                layer_id=LayerId.OCR,
                source_engine=provider.get_engine_name(),
                coverage=0.0,
                word_count=0,
                tokens=[],
                avg_confidence=None,
            )

        # Calculate coverage
        text_area = sum(t.bbox.width * t.bbox.height for t in tokens)
        page_area = page_width_px * page_height_px
        coverage = min(1.0, text_area / page_area) if page_area > 0 else 0.0

        # Calculate average confidence
        confidences = [t.confidence for t in tokens if t.confidence is not None]
        avg_confidence = sum(confidences) / len(confidences) if confidences else None

        return TextLayer(
            layer_id=LayerId.OCR,
            source_engine=provider.get_engine_name(),
            coverage=coverage,
            word_count=len(tokens),
            tokens=tokens,
            avg_confidence=avg_confidence,
        )

    except Exception as e:
        logger.exception(f"OCR extraction failed: {e}")
        return None
