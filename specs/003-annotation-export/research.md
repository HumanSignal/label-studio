# Research: PDF Annotation Export

**Date**: 2026-01-12
**Feature**: 003-annotation-export

## Overview

This document captures technical research and decisions for implementing PDF annotation export with layout context, deterministic IDs, and W3C Web Annotation support.

---

## Decision 1: PDF Text Extraction Library

**Decision**: Use pdfplumber for PDF text extraction

**Rationale**:
- Already compatible with existing Label Studio ecosystem (Python 3.10+)
- Provides word-level bounding boxes with `page.extract_words()`
- Returns rich attributes: `x0`, `top`, `x1`, `bottom`, `text`, `fontname`, `size`
- Supports page geometry: `page.width`, `page.height`, mediabox, cropbox
- Table detection with `page.find_tables()` including row/column structure
- Handles rotated text via character matrix (`pdfplumber.ctm.CTM`)
- High-quality library (Context7 score: 95/100, High reputation)

**Alternatives Considered**:
- **PyMuPDF (fitz)**: Faster but less accurate word grouping; better for image rendering
- **pdfminer.six**: Lower-level; more complex API for our use case
- **python-poppler**: Good for rendering but pdfplumber better for text extraction

**Implementation Notes**:
```python
import pdfplumber

with pdfplumber.open(pdf_path) as pdf:
    page = pdf.pages[0]

    # Word-level extraction with bbox
    words = page.extract_words(extra_attrs=["fontname", "size"])
    # Returns: [{"text": "Hello", "x0": 72.0, "top": 100.5, "x1": 120.0, "bottom": 115.0, ...}]

    # Page geometry
    width_pt = page.width
    height_pt = page.height

    # Coordinate conversion (PDF origin bottom-left → our origin top-left)
    # pdfplumber already converts to top-left origin via "top" attribute
```

---

## Decision 2: Deterministic ID Generation Algorithm

**Decision**: Hash-based ID using SHA-256 with content+position+order inputs

**Rationale**:
- Reproducible across runs with same parameters (SC-008)
- Survives minor extraction variations via bbox quantization (2px)
- Fast computation (hashlib built-in)
- Short IDs via truncation (8 characters sufficient for document scope)

**Algorithm**:
```python
import hashlib
import unicodedata

def generate_word_id(page_id: str, text: str, bbox: tuple, reading_order: int) -> str:
    """Generate deterministic word_id.

    Args:
        page_id: Page identifier (e.g., "doc_abc123:page_001")
        text: Word text (will be NFC normalized)
        bbox: (x, y, width, height) quantized to 2px
        reading_order: Sequential position in reading order

    Returns:
        word_id like "w_a1b2c3d4"
    """
    # Normalize text to NFC
    normalized_text = unicodedata.normalize('NFC', text)

    # Quantize bbox to 2px grid
    qx, qy, qw, qh = (round(v / 2) * 2 for v in bbox)

    # Build hash input
    hash_input = f"{page_id}|{normalized_text}|{qx},{qy},{qw},{qh}|{reading_order}"

    # Generate hash and truncate
    hash_bytes = hashlib.sha256(hash_input.encode('utf-8')).hexdigest()[:8]

    return f"w_{hash_bytes}"
```

**Line/Block IDs**: Derived similarly from constituent word_ids:
```python
def generate_line_id(page_id: str, word_ids: list[str]) -> str:
    hash_input = f"{page_id}|{','.join(sorted(word_ids))}"
    return f"l_{hashlib.sha256(hash_input.encode()).hexdigest()[:8]}"
```

**Alternatives Considered**:
- **UUID per extraction**: Not deterministic; IDs change on re-export
- **Sequential numbering**: Fragile; insertions break all subsequent IDs
- **MD5**: Deprecated for new uses; SHA-256 preferred

---

## Decision 3: W3C Web Annotation Format Mapping

**Decision**: Support W3C Web Annotation JSON-LD as alternate export format

**Rationale**:
- Industry standard for annotation interoperability
- Enables integration with annotation archives and tools
- JSON-LD context provides semantic meaning

**W3C Context**: `"@context": "http://www.w3.org/ns/anno.jsonld"`

**Selector Mapping** (JSONL → W3C):

| JSONL Field | W3C Selector Type | W3C Fields |
|-------------|-------------------|------------|
| `quote`, `char_start`, `char_end` | TextQuoteSelector + TextPositionSelector | `exact`, `prefix`, `suffix`, `start`, `end` |
| `bboxes[]` | FragmentSelector (per bbox) | `value: "xywh=x,y,w,h"`, `conformsTo: "http://www.w3.org/TR/media-frags/"` |

**Example Mapping**:
```json
// JSONL input
{
  "ann_id": "ann_001",
  "evidence": {
    "quote": "important text",
    "char_start": 150,
    "char_end": 164,
    "bboxes": [{"x": 100, "y": 200, "width": 80, "height": 12}]
  }
}

// W3C output
{
  "@context": "http://www.w3.org/ns/anno.jsonld",
  "id": "urn:labelstudio:ann_001",
  "type": "Annotation",
  "target": {
    "source": "urn:labelstudio:doc_abc123:page_001",
    "selector": [
      {
        "type": "TextQuoteSelector",
        "exact": "important text",
        "prefix": "some text before ",
        "suffix": " and text after"
      },
      {
        "type": "TextPositionSelector",
        "start": 150,
        "end": 164
      },
      {
        "type": "FragmentSelector",
        "conformsTo": "http://www.w3.org/TR/media-frags/",
        "value": "xywh=100,200,80,12"
      }
    ]
  }
}
```

**Alternatives Considered**:
- **Custom JSON only**: Misses interoperability benefits
- **Full RDF/Turtle**: Overkill; JSON-LD provides sufficient semantics

**References**:
- [W3C Web Annotation Data Model](https://www.w3.org/TR/annotation-model/)
- [W3C Media Fragments](https://www.w3.org/TR/media-frags/)

---

## Decision 4: Canonical Text Construction

**Decision**: Space-joined words with explicit line/block delimiters

**Rationale**:
- Unambiguous reconstruction from word list
- Enables reliable character offset calculation
- Preserves document structure for downstream NLP

**Rules** (documented in `canonical_text_rules.md`):
1. Text normalization: Unicode NFC
2. Word joining: Single space between words on same line
3. Line breaks: `\n` at end of each line
4. Block boundaries: `\n\n` between blocks
5. Hyphenation: Preserve hyphen at line break (no automatic dehyphenation)

**Example**:
```
Words: ["Hello", "world", "-", "con-", "tinued"]
Lines: [["Hello", "world"], ["-", "con-"], ["tinued"]]
Blocks: [[line1, line2], [line3]]

Canonical text:
"Hello world\n- con-\n\ntinued"
     ^            ^     ^^
     |            |     |+-- block boundary
     |            +--------  line break
     +---------------------  word space
```

**Offset Calculation**:
```python
def build_canonical_index(blocks: list) -> tuple[str, dict]:
    """Build canonical text and word offset index."""
    canonical = ""
    index = {}  # word_id -> (char_start, char_end)

    for block_idx, block in enumerate(blocks):
        if block_idx > 0:
            canonical += "\n\n"  # Block boundary

        for line_idx, line in enumerate(block):
            if line_idx > 0:
                canonical += "\n"  # Line break

            for word_idx, word in enumerate(line):
                if word_idx > 0:
                    canonical += " "  # Word space

                char_start = len(canonical)
                canonical += word["text"]
                char_end = len(canonical)

                index[word["id"]] = (char_start, char_end)

    return canonical, index
```

---

## Decision 5: Table Structure Detection

**Decision**: Use pdfplumber's table finder with confidence scoring

**Rationale**:
- pdfplumber provides robust table detection via line/text analysis
- `find_tables()` returns row/column counts and cell boundaries
- Can compute confidence based on detection quality signals

**Implementation**:
```python
def extract_table_structure(page, table) -> dict:
    """Extract table structure with confidence."""
    cells = []
    structure_issues = []

    for row_idx, row in enumerate(table.rows):
        for col_idx, cell in enumerate(row.cells):
            if cell is None:
                structure_issues.append(f"missing_cell_r{row_idx}c{col_idx}")
                continue

            x0, top, x1, bottom = cell
            cell_text = page.within_bbox(cell).extract_text() or ""

            cells.append({
                "cell_id": f"t_{table_id}:r{row_idx:02d}c{col_idx:02d}",
                "row": row_idx,
                "col": col_idx,
                "bbox": {"x": x0, "y": top, "width": x1-x0, "height": bottom-top},
                "text": cell_text,
                "is_header": row_idx == 0  # Simple heuristic
            })

    # Confidence scoring
    expected_cells = len(table.rows) * len(table.rows[0].cells) if table.rows else 0
    actual_cells = len([c for c in cells if c])
    confidence = actual_cells / expected_cells if expected_cells > 0 else 0.0

    return {
        "n_rows": len(table.rows),
        "n_cols": max(len(r.cells) for r in table.rows) if table.rows else 0,
        "cells": cells,
        "structure_confidence": confidence,
        "structure_reason": ", ".join(structure_issues) if structure_issues else None
    }
```

**Alternatives Considered**:
- **Camelot**: More accurate but heavier dependency
- **tabula-py**: Java dependency; pdfplumber sufficient for our needs

---

## Decision 6: PNG Rendering Approach

**Decision**: Use pdf2image (Poppler) for high-quality PNG rendering

**Rationale**:
- Consistent rendering across platforms
- Configurable DPI (default 200)
- Handles rotated/cropped pages correctly
- pdfplumber's `to_image()` uses same backend

**Implementation**:
```python
from pdf2image import convert_from_path

def render_page_png(pdf_path: str, page_num: int, dpi: int = 200) -> tuple[bytes, dict]:
    """Render page to PNG and return image bytes + geometry."""
    images = convert_from_path(
        pdf_path,
        dpi=dpi,
        first_page=page_num + 1,
        last_page=page_num + 1,
        fmt="png"
    )

    img = images[0]

    # Get rendered dimensions
    rendered_width, rendered_height = img.size

    # Save to bytes
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")

    geometry = {
        "render_dpi": dpi,
        "rendered_width_px": rendered_width,
        "rendered_height_px": rendered_height
    }

    return buffer.getvalue(), geometry
```

---

## Decision 7: Coordinate System Conventions

**Decision**: All exported bboxes in rendered PNG pixel coordinates, origin top-left

**Rationale**:
- Matches common image annotation tools
- Avoids PDF coordinate complexity (bottom-left origin, points)
- Direct overlay on exported PNG images

**Coordinate Frame** (documented in exports):
```
"All bboxes are {x, y, width, height} in rendered PNG pixels, origin top-left.
x,y is top-left corner inclusive; width,height extend right and down."
```

**Conversion from PDF points to PNG pixels**:
```python
def pdf_to_png_coords(
    x_pt: float, y_pt: float, w_pt: float, h_pt: float,
    page_height_pt: float,
    scale: float
) -> dict:
    """Convert PDF coordinates to PNG pixel coordinates.

    PDF origin is bottom-left; PNG origin is top-left.
    """
    # Convert y from bottom-left to top-left
    y_top_pt = page_height_pt - y_pt - h_pt

    # Scale to pixels
    return {
        "x": int(round(x_pt * scale)),
        "y": int(round(y_top_pt * scale)),
        "width": int(round(w_pt * scale)),
        "height": int(round(h_pt * scale))
    }
```

---

## Decision 8: Export Format Structure

**Decision**: Hierarchical directory structure per document

**Structure**:
```
export_bundle/
├── manifest.json              # Top-level manifest
├── export_index.json          # Multi-doc index
├── export_errors.json         # Failed docs (if any)
├── schemas/
│   ├── manifest.schema.json
│   ├── page_layout.schema.json
│   ├── annotation_record.schema.json
│   ├── id_algorithm.md
│   ├── canonical_text_rules.md
│   └── w3c_mapping.md
├── annotations.jsonl          # All annotations (or sharded)
└── docs/
    └── {doc_id}/
        ├── manifest.json      # Per-doc manifest
        ├── layout/
        │   ├── page_001.json
        │   ├── page_002.json
        │   └── ...
        └── pages/
            ├── page_001.png
            ├── page_002.png
            └── ...
```

---

## Decision 9: Integration with Label Studio Export System

**Decision**: Register as new export format in existing data_export module

**Rationale**:
- Leverages existing async export infrastructure (django-rq)
- Uses existing permission checks (project owner/manager)
- Supports existing storage backends via io_storages

**Integration Points**:
1. Register format in `DataExport.get_export_formats()`
2. Implement format handler in `pdf_export/exporter.py`
3. Extend `ExportParamSerializer` for PDF-specific options (dpi, format)
4. Use `ExportStorage` for writing output files

**Format Registration**:
```python
# In data_export/api.py or formats.py
EXPORT_FORMATS = {
    ...
    'PDF_ML': {
        'title': 'PDF ML Export',
        'description': 'Machine-readable PDF annotations with layout context',
        'link': 'https://labelstud.io/guide/export#pdf-ml-format',
        'converter': PdfMlExporter,
    }
}
```

---

## Open Questions (Resolved)

| Question | Resolution |
|----------|------------|
| Progress reporting? | Logging only (per clarification) |
| Partial failure handling? | Partial success with error manifest (per clarification) |
| Export permissions? | Project owner/manager only (per clarification) |

---

## References

- [pdfplumber Documentation](https://github.com/jsvine/pdfplumber)
- [W3C Web Annotation Data Model](https://www.w3.org/TR/annotation-model/)
- [W3C Media Fragments URI](https://www.w3.org/TR/media-frags/)
- [Label Studio Export Documentation](https://labelstud.io/guide/export)
