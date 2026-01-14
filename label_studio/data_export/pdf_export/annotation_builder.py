"""Annotation Builder for PDF ML Export.

This module provides functions to convert Label Studio annotations to
the ML export format with multi-span bbox support. It handles:
- Multi-bbox calculation for multi-line text selections
- Label Studio annotation parsing
- AnnotationRecord construction
- JSONL streaming output

The key feature is support for discontinuous/multi-line highlights
where a single annotation may span multiple lines, requiring multiple
bounding boxes.
"""

import json
import logging
import os
from typing import Any, Dict, Iterator, List, Optional, Tuple

from .coordinates import merge_bboxes
from .models import (
    AnnotationEvidence,
    AnnotationMetadata,
    AnnotationRecord,
    AnnotationSource,
    AnnotationType,
    BBoxXYWH,
    CanonicalIndex,
    LayerId,
    Line,
    PageLayout,
    Word,
)

logger = logging.getLogger(__name__)


def calculate_multi_bboxes(
    word_ids: List[str],
    words: List[Word],
    lines: List[Line],
) -> List[BBoxXYWH]:
    """Calculate bounding boxes for multi-line text selections.

    For text spanning multiple lines, returns one bbox per line fragment.
    This enables accurate visual representation of discontinuous highlights.

    Args:
        word_ids: List of word IDs in the selection (in reading order)
        words: All word objects on the page
        lines: All line objects on the page

    Returns:
        List of BBoxXYWH, one per contiguous line fragment
    """
    if not word_ids:
        return []

    # Create lookup maps
    word_map = {w.word_id: w for w in words}

    # Get words in selection
    selection_words = [word_map[wid] for wid in word_ids if wid in word_map]
    if not selection_words:
        return []

    # Group words by line
    words_by_line: Dict[str, List[Word]] = {}
    for word in selection_words:
        if word.line_id not in words_by_line:
            words_by_line[word.line_id] = []
        words_by_line[word.line_id].append(word)

    # Calculate bbox for each line fragment
    bboxes = []
    for line_id, line_words in words_by_line.items():
        if line_words:
            # Sort by reading order
            line_words.sort(key=lambda w: w.reading_order)
            # Merge bboxes for this line's words
            word_bboxes = [w.bbox for w in line_words]
            line_bbox = merge_bboxes(word_bboxes)
            bboxes.append(line_bbox)

    # Sort bboxes by vertical position (top to bottom)
    bboxes.sort(key=lambda b: b.y)

    return bboxes


def find_words_in_bbox(
    bbox: BBoxXYWH,
    words: List[Word],
    overlap_threshold: float = 0.5,
) -> List[Word]:
    """Find words that overlap with a bounding box.

    Args:
        bbox: Target bounding box
        words: All word objects to search
        overlap_threshold: Minimum overlap ratio to include word

    Returns:
        List of words overlapping the bbox
    """
    matching = []

    for word in words:
        wb = word.bbox

        # Calculate intersection
        x1 = max(bbox.x, wb.x)
        y1 = max(bbox.y, wb.y)
        x2 = min(bbox.x + bbox.width, wb.x + wb.width)
        y2 = min(bbox.y + bbox.height, wb.y + wb.height)

        if x2 > x1 and y2 > y1:
            # Calculate overlap ratio
            intersection = (x2 - x1) * (y2 - y1)
            word_area = wb.width * wb.height
            overlap = intersection / word_area if word_area > 0 else 0

            if overlap >= overlap_threshold:
                matching.append(word)

    return matching


def determine_annotation_type(
    result_type: str,
    is_table: bool = False,
    is_cell: bool = False,
) -> AnnotationType:
    """Determine annotation type from Label Studio result type.

    Args:
        result_type: Label Studio result type (e.g., "labels", "rectanglelabels")
        is_table: Whether this is a table annotation
        is_cell: Whether this is a table cell annotation

    Returns:
        AnnotationType classification
    """
    if is_cell:
        return AnnotationType.TABLE_CELL_FIELD
    if is_table:
        return AnnotationType.TABLE_REGION

    # Text/region based types
    region_types = {"rectanglelabels", "polygonlabels", "brushlabels", "keypointlabels"}
    if result_type.lower() in region_types:
        return AnnotationType.REGION

    # Default to field (text extraction)
    return AnnotationType.FIELD


def determine_annotation_source(
    annotation_data: Dict[str, Any],
) -> AnnotationSource:
    """Determine annotation source from Label Studio annotation data.

    Args:
        annotation_data: Label Studio annotation dictionary

    Returns:
        AnnotationSource classification
    """
    # Check for model predictions
    if annotation_data.get("was_cancelled"):
        return AnnotationSource.IMPORTED

    # Check for prediction source
    result = annotation_data.get("result", [])
    if result and isinstance(result, list) and len(result) > 0:
        first_result = result[0]
        if first_result.get("from_name") == "model":
            return AnnotationSource.MODEL_ASSISTED

    # Default to manual
    return AnnotationSource.MANUAL


def convert_ls_annotation_to_records(
    annotation_data: Dict[str, Any],
    task_id: int,
    doc_id: str,
    page_layout: PageLayout,
) -> List[AnnotationRecord]:
    """Convert Label Studio annotation to AnnotationRecords.

    Parses a Label Studio annotation and creates one AnnotationRecord
    per result (label application).

    Args:
        annotation_data: Label Studio annotation dictionary
        task_id: Label Studio task ID
        doc_id: Document ID
        page_layout: Page layout with words, lines, canonical index

    Returns:
        List of AnnotationRecord objects
    """
    records = []

    annotation_id = str(annotation_data.get("id", ""))
    results = annotation_data.get("result", [])

    # Build metadata
    source = determine_annotation_source(annotation_data)
    metadata = AnnotationMetadata(
        annotator_id=annotation_data.get("completed_by", 0),
        source=source,
        created_at=annotation_data.get("created_at", ""),
        updated_at=annotation_data.get("updated_at"),
        lead_time_seconds=annotation_data.get("lead_time"),
    )

    for result in results:
        result_id = result.get("id", "")
        result_type = result.get("type", "")
        from_name = result.get("from_name", "")
        to_name = result.get("to_name", "")
        value = result.get("value", {})

        # Extract label - check value.{result_type} first (e.g., value.pdflabels),
        # then fallback to value.labels or value.choices
        labels = value.get(result_type, value.get("labels", value.get("choices", [])))
        label = labels[0] if labels else result_type

        # Get text value if present - check multiple possible keys
        text_value = value.get("text") or value.get("extractedText")

        # Determine annotation type
        annotation_type = determine_annotation_type(result_type)

        # Find words covered by this annotation
        # This depends on the result type
        word_ids = []
        bboxes = []

        if result_type in ("labels", "textarea"):
            # Text-based selection using start/end offsets
            start = value.get("start", 0)
            end = value.get("end", 0)

            # Find words in character range
            from .canonical_text import find_word_ids_in_range

            word_ids = find_word_ids_in_range(
                start, end, page_layout.canonical_index
            )
            bboxes = calculate_multi_bboxes(word_ids, page_layout.words, page_layout.lines)

        elif result_type in ("rectanglelabels", "pdflabels"):
            # Bounding box selection (PDF labels use percentage coords like rectanglelabels)
            x = value.get("x", 0)
            y = value.get("y", 0)
            width = value.get("width", 0)
            height = value.get("height", 0)

            # Convert from percentage to pixels
            page_width = page_layout.geometry.rendered_width_px
            page_height = page_layout.geometry.rendered_height_px

            bbox = BBoxXYWH(
                x=int(x * page_width / 100),
                y=int(y * page_height / 100),
                width=int(width * page_width / 100),
                height=int(height * page_height / 100),
            )
            bboxes = [bbox]

            # Find words in this bbox
            matching_words = find_words_in_bbox(bbox, page_layout.words)
            matching_words.sort(key=lambda w: w.reading_order)
            word_ids = [w.word_id for w in matching_words]

            # For pdflabels, also try to use position offsets if available
            if result_type == "pdflabels" and not word_ids:
                position = value.get("position", {})
                start_offset = position.get("startOffset", 0)
                end_offset = position.get("endOffset", 0)
                if start_offset or end_offset:
                    from .canonical_text import find_word_ids_in_range
                    word_ids = find_word_ids_in_range(
                        start_offset, end_offset, page_layout.canonical_index
                    )
                    if word_ids:
                        bboxes = calculate_multi_bboxes(
                            word_ids, page_layout.words, page_layout.lines
                        )

        # Get char positions if we have word IDs
        char_start = 0
        char_end = 0
        quote = ""

        if word_ids:
            from .canonical_text import get_char_range_for_word_ids

            try:
                char_start, char_end = get_char_range_for_word_ids(
                    word_ids, page_layout.canonical_index
                )
                quote = page_layout.canonical_text[char_start:char_end]
            except ValueError:
                logger.warning(f"Could not find char range for word_ids in result {result_id}")

        # Build evidence
        evidence = AnnotationEvidence(
            bboxes=bboxes,
            word_ids=word_ids,
            quote=quote,
            char_start=char_start,
            char_end=char_end,
            page_id=page_layout.page_id,
            layer_id=page_layout.canonical.layer_id,
        )

        # Create record
        record = AnnotationRecord(
            annotation_id=annotation_id,
            task_id=task_id,
            doc_id=doc_id,
            annotation_type=annotation_type,
            label=label,
            evidence=evidence,
            metadata=metadata,
            value=text_value,
            result_id=result_id,
            from_name=from_name,
            to_name=to_name,
        )
        records.append(record)

    return records


class JsonlWriter:
    """Streaming JSONL writer for annotation export.

    Writes annotation records to a JSONL file one at a time,
    enabling memory-efficient export of large annotation sets.
    """

    def __init__(self, filepath: str):
        """Initialize JSONL writer.

        Args:
            filepath: Path to output JSONL file
        """
        self.filepath = filepath
        self._file = None
        self._count = 0

    def __enter__(self) -> "JsonlWriter":
        """Open file for writing."""
        os.makedirs(os.path.dirname(self.filepath) or ".", exist_ok=True)
        self._file = open(self.filepath, "w", encoding="utf-8")
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        """Close file."""
        if self._file:
            self._file.close()
            self._file = None

    def write(self, record: AnnotationRecord) -> None:
        """Write a single annotation record.

        Args:
            record: AnnotationRecord to write
        """
        if self._file is None:
            raise RuntimeError("Writer not opened. Use 'with' statement.")

        line = json.dumps(record.to_dict(), ensure_ascii=False)
        self._file.write(line)
        self._file.write("\n")
        self._count += 1

    def write_all(self, records: Iterator[AnnotationRecord]) -> int:
        """Write multiple annotation records.

        Args:
            records: Iterator of AnnotationRecord objects

        Returns:
            Number of records written
        """
        for record in records:
            self.write(record)
        return self._count

    @property
    def count(self) -> int:
        """Number of records written."""
        return self._count


def export_annotations_jsonl(
    annotations: List[Dict[str, Any]],
    task_id: int,
    doc_id: str,
    page_layouts: Dict[str, PageLayout],
    output_path: str,
) -> int:
    """Export annotations to JSONL file.

    Args:
        annotations: List of Label Studio annotation dictionaries
        task_id: Label Studio task ID
        doc_id: Document ID
        page_layouts: Dict mapping page_id to PageLayout
        output_path: Path to output JSONL file

    Returns:
        Number of annotation records written
    """
    with JsonlWriter(output_path) as writer:
        for annotation_data in annotations:
            # Get page for this annotation (use first page by default)
            page_id = None
            results = annotation_data.get("result", [])
            if results:
                # Try to get page from first result
                first_value = results[0].get("value", {})
                page_num = first_value.get("pageNumber", 1)
                page_id = f"{doc_id}:page_{page_num:03d}"

            if page_id and page_id in page_layouts:
                page_layout = page_layouts[page_id]
            elif page_layouts:
                # Use first available page
                page_layout = next(iter(page_layouts.values()))
            else:
                logger.warning(f"No page layout available for annotation {annotation_data.get('id')}")
                continue

            records = convert_ls_annotation_to_records(
                annotation_data, task_id, doc_id, page_layout
            )

            for record in records:
                writer.write(record)

    return writer.count
