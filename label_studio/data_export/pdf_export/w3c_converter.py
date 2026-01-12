"""W3C Web Annotation Converter for PDF ML Export.

This module provides conversion from internal annotation format to
W3C Web Annotation Data Model (JSON-LD format).

Implements the W3C Web Annotation Data Model:
https://www.w3.org/TR/annotation-model/

Selectors implemented:
- TextQuoteSelector: exact text with prefix/suffix context
- TextPositionSelector: character start/end positions
- FragmentSelector: Media Fragments for spatial regions (xywh=)
"""

import json
import logging
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import uuid4

from .models import (
    AnnotationEvidence,
    AnnotationRecord,
    BBoxXYWH,
)

logger = logging.getLogger(__name__)

# W3C Web Annotation JSON-LD context
W3C_ANNOTATION_CONTEXT = "http://www.w3.org/ns/anno.jsonld"

# Default context prefix for TextQuoteSelector
DEFAULT_CONTEXT_CHARS = 30


@dataclass
class TextQuoteSelector:
    """W3C TextQuoteSelector for text-based targeting.

    Identifies a text selection by the exact text content along with
    prefix and suffix context for disambiguation.

    W3C Spec: https://www.w3.org/TR/annotation-model/#text-quote-selector

    Attributes:
        exact: Exact text content of the selection
        prefix: Text immediately before the selection (for disambiguation)
        suffix: Text immediately after the selection (for disambiguation)
    """

    exact: str
    prefix: Optional[str] = None
    suffix: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        """Convert to W3C JSON-LD format."""
        result = {
            "type": "TextQuoteSelector",
            "exact": self.exact,
        }
        if self.prefix:
            result["prefix"] = self.prefix
        if self.suffix:
            result["suffix"] = self.suffix
        return result


@dataclass
class TextPositionSelector:
    """W3C TextPositionSelector for character offset targeting.

    Identifies a text selection by character positions in the document.

    W3C Spec: https://www.w3.org/TR/annotation-model/#text-position-selector

    Attributes:
        start: Starting character position (0-indexed, inclusive)
        end: Ending character position (exclusive)
    """

    start: int
    end: int

    def to_dict(self) -> Dict[str, Any]:
        """Convert to W3C JSON-LD format."""
        return {
            "type": "TextPositionSelector",
            "start": self.start,
            "end": self.end,
        }


@dataclass
class FragmentSelector:
    """W3C FragmentSelector for spatial region targeting.

    Uses Media Fragments URI syntax for specifying spatial regions
    on page images (xywh=x,y,width,height).

    W3C Spec: https://www.w3.org/TR/annotation-model/#fragment-selector

    Attributes:
        value: Media fragment URI (xywh=x,y,w,h format)
        conforms_to: Fragment specification URI
    """

    value: str
    conforms_to: str = "http://www.w3.org/TR/media-frags/"

    @classmethod
    def from_bbox(cls, bbox: BBoxXYWH) -> "FragmentSelector":
        """Create FragmentSelector from bounding box.

        Args:
            bbox: Bounding box in pixel coordinates

        Returns:
            FragmentSelector with xywh media fragment
        """
        value = f"xywh=pixel:{bbox.x},{bbox.y},{bbox.width},{bbox.height}"
        return cls(value=value)

    def to_dict(self) -> Dict[str, Any]:
        """Convert to W3C JSON-LD format."""
        return {
            "type": "FragmentSelector",
            "value": self.value,
            "conformsTo": self.conforms_to,
        }


@dataclass
class SpecificResource:
    """W3C SpecificResource for targeting with selectors.

    Wraps a source with one or more selectors to precisely identify
    the target of an annotation.

    W3C Spec: https://www.w3.org/TR/annotation-model/#specific-resources

    Attributes:
        source: URI of the source resource (page or document)
        selectors: List of selectors for targeting
        scope: Optional scope URI (e.g., page within document)
    """

    source: str
    selectors: List[Any] = field(default_factory=list)
    scope: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        """Convert to W3C JSON-LD format."""
        result: Dict[str, Any] = {
            "type": "SpecificResource",
            "source": self.source,
        }
        if self.selectors:
            if len(self.selectors) == 1:
                result["selector"] = self.selectors[0].to_dict()
            else:
                result["selector"] = [s.to_dict() for s in self.selectors]
        if self.scope:
            result["scope"] = self.scope
        return result


@dataclass
class W3CAnnotation:
    """W3C Web Annotation with JSON-LD context.

    Complete annotation in W3C Web Annotation Data Model format.

    W3C Spec: https://www.w3.org/TR/annotation-model/

    Attributes:
        id: Annotation IRI/URI
        body: Annotation body (label, value, or structured content)
        target: Annotation target (SpecificResource with selectors)
        motivation: Optional motivation (e.g., "tagging", "describing")
        creator: Optional creator agent
        created: Optional creation timestamp
        modified: Optional modification timestamp
    """

    id: str
    body: Any
    target: Any
    motivation: Optional[str] = None
    creator: Optional[Dict[str, Any]] = None
    created: Optional[str] = None
    modified: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        """Convert to W3C JSON-LD format."""
        result: Dict[str, Any] = {
            "@context": W3C_ANNOTATION_CONTEXT,
            "id": self.id,
            "type": "Annotation",
        }

        # Add body
        if isinstance(self.body, dict):
            result["body"] = self.body
        elif hasattr(self.body, "to_dict"):
            result["body"] = self.body.to_dict()
        else:
            result["body"] = self.body

        # Add target
        if isinstance(self.target, dict):
            result["target"] = self.target
        elif hasattr(self.target, "to_dict"):
            result["target"] = self.target.to_dict()
        else:
            result["target"] = self.target

        if self.motivation:
            result["motivation"] = self.motivation
        if self.creator:
            result["creator"] = self.creator
        if self.created:
            result["created"] = self.created
        if self.modified:
            result["modified"] = self.modified

        return result

    def to_json(self, indent: int = 2) -> str:
        """Convert to JSON string."""
        return json.dumps(self.to_dict(), ensure_ascii=False, indent=indent)

    def to_jsonld_line(self) -> str:
        """Convert to single-line JSONLD for streaming output."""
        return json.dumps(self.to_dict(), ensure_ascii=False)


def extract_prefix_suffix(
    canonical_text: str,
    char_start: int,
    char_end: int,
    context_chars: int = DEFAULT_CONTEXT_CHARS,
) -> tuple:
    """Extract prefix and suffix context for TextQuoteSelector.

    Extracts surrounding text for disambiguation while avoiding
    word boundaries mid-word when possible.

    Args:
        canonical_text: Full canonical text
        char_start: Start position of selection
        char_end: End position of selection
        context_chars: Maximum context characters (default 30)

    Returns:
        Tuple of (prefix, suffix) strings
    """
    # Extract prefix
    prefix_start = max(0, char_start - context_chars)
    prefix = canonical_text[prefix_start:char_start]

    # Try to start prefix at word boundary
    if prefix_start > 0 and prefix:
        space_idx = prefix.find(" ")
        if space_idx != -1 and space_idx < len(prefix) - 5:
            prefix = prefix[space_idx + 1 :]

    # Extract suffix
    suffix_end = min(len(canonical_text), char_end + context_chars)
    suffix = canonical_text[char_end:suffix_end]

    # Try to end suffix at word boundary
    if suffix_end < len(canonical_text) and suffix:
        space_idx = suffix.rfind(" ")
        if space_idx != -1 and space_idx > 5:
            suffix = suffix[:space_idx]

    return prefix, suffix


def create_annotation_body(
    label: str,
    value: Optional[str] = None,
) -> Dict[str, Any]:
    """Create W3C annotation body from label and optional value.

    Args:
        label: Annotation label/tag
        value: Optional text value

    Returns:
        Body dictionary in W3C format
    """
    if value:
        return {
            "type": "TextualBody",
            "purpose": "tagging",
            "value": label,
            "format": "text/plain",
        }
    else:
        return {
            "type": "TextualBody",
            "purpose": "tagging",
            "value": label,
            "format": "text/plain",
        }


def convert_annotation_to_w3c(
    record: AnnotationRecord,
    canonical_text: str,
    base_uri: str,
    page_image_uri: Optional[str] = None,
) -> W3CAnnotation:
    """Convert AnnotationRecord to W3C Web Annotation.

    Creates a W3C annotation with appropriate selectors:
    - TextQuoteSelector with prefix/suffix for text context
    - TextPositionSelector for character offsets
    - FragmentSelector for each bounding box

    Args:
        record: Internal annotation record
        canonical_text: Full canonical text for context extraction
        base_uri: Base URI for annotation IDs
        page_image_uri: Optional URI for page image (for fragment selectors)

    Returns:
        W3CAnnotation object
    """
    evidence = record.evidence

    # Build selectors
    selectors = []

    # TextQuoteSelector - for text content
    if evidence.quote:
        prefix, suffix = extract_prefix_suffix(
            canonical_text,
            evidence.char_start,
            evidence.char_end,
        )
        text_quote = TextQuoteSelector(
            exact=evidence.quote,
            prefix=prefix if prefix else None,
            suffix=suffix if suffix else None,
        )
        selectors.append(text_quote)

    # TextPositionSelector - for character offsets
    text_position = TextPositionSelector(
        start=evidence.char_start,
        end=evidence.char_end,
    )
    selectors.append(text_position)

    # FragmentSelectors - for bounding boxes
    for bbox in evidence.bboxes:
        fragment = FragmentSelector.from_bbox(bbox)
        selectors.append(fragment)

    # Build target
    source_uri = page_image_uri or f"{base_uri}/{evidence.page_id}"
    target = SpecificResource(
        source=source_uri,
        selectors=selectors,
    )

    # Build body
    body = create_annotation_body(record.label, record.value)

    # Build creator if available
    creator = None
    if record.metadata.annotator_id:
        creator = {
            "type": "Person",
            "id": f"user:{record.metadata.annotator_id}",
        }
        if record.metadata.annotator_email:
            creator["email"] = record.metadata.annotator_email

    # Create annotation
    annotation_uri = f"{base_uri}/annotations/{record.annotation_id}"
    if record.result_id:
        annotation_uri = f"{annotation_uri}/{record.result_id}"

    return W3CAnnotation(
        id=annotation_uri,
        body=body,
        target=target,
        motivation="tagging",
        creator=creator,
        created=record.metadata.created_at,
        modified=record.metadata.updated_at,
    )


def convert_records_to_w3c(
    records: List[AnnotationRecord],
    canonical_text: str,
    base_uri: str,
    page_image_uri: Optional[str] = None,
) -> List[W3CAnnotation]:
    """Convert multiple annotation records to W3C format.

    Args:
        records: List of internal annotation records
        canonical_text: Full canonical text
        base_uri: Base URI for annotation IDs
        page_image_uri: Optional page image URI

    Returns:
        List of W3CAnnotation objects
    """
    return [
        convert_annotation_to_w3c(record, canonical_text, base_uri, page_image_uri)
        for record in records
    ]


def export_w3c_annotations(
    records: List[AnnotationRecord],
    canonical_text: str,
    base_uri: str,
    output_path: str,
    page_image_uri: Optional[str] = None,
) -> int:
    """Export annotations to W3C JSONLD file.

    Args:
        records: List of annotation records
        canonical_text: Full canonical text
        base_uri: Base URI for annotation IDs
        output_path: Path to output file
        page_image_uri: Optional page image URI

    Returns:
        Number of annotations exported
    """
    w3c_annotations = convert_records_to_w3c(
        records, canonical_text, base_uri, page_image_uri
    )

    with open(output_path, "w", encoding="utf-8") as f:
        for annotation in w3c_annotations:
            f.write(annotation.to_jsonld_line())
            f.write("\n")

    return len(w3c_annotations)
