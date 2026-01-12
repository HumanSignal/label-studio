# Quickstart: PDF Annotation Export

**Date**: 2026-01-12
**Feature**: 003-annotation-export

## Overview

This guide shows how to export PDF annotations with full layout context using the PDF ML Export feature.

---

## Prerequisites

- Label Studio project with PDF documents
- Annotations created using PdfOcr tag
- Project owner or manager role

---

## Export via UI

1. Open your project in Label Studio
2. Go to **Data Manager**
3. Click **Export** button
4. Select **PDF ML Export** format
5. Configure options:
   - **DPI**: 200 (default) - higher for better image quality
   - **Include page images**: Yes (for visual QA)
   - **Include W3C format**: Optional (for interoperability)
6. Click **Export**
7. Wait for export to complete
8. Download ZIP archive

---

## Export via API

### Create Export Job

```bash
curl -X POST "https://your-label-studio/api/projects/123/exports/pdf-ml" \
  -H "Authorization: Token YOUR_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "format": "pdf_ml",
    "dpi": 200,
    "include_page_images": true,
    "include_w3c": false,
    "task_filter": {
      "only_with_annotations": true
    }
  }'
```

Response:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "project_id": 123,
  "status": "queued",
  "created_at": "2026-01-12T10:00:00Z"
}
```

### Check Export Status

```bash
curl "https://your-label-studio/api/projects/123/exports/pdf-ml/550e8400-e29b-41d4-a716-446655440000" \
  -H "Authorization: Token YOUR_API_TOKEN"
```

Response:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "completed",
  "progress": {
    "total_tasks": 50,
    "processed_tasks": 50,
    "total_pages": 320,
    "processed_pages": 320,
    "percent_complete": 100
  },
  "download_url": "/api/projects/123/exports/pdf-ml/550e8400.../download"
}
```

### Download Export

```bash
curl -o export.zip "https://your-label-studio/api/projects/123/exports/pdf-ml/550e8400-e29b-41d4-a716-446655440000/download" \
  -H "Authorization: Token YOUR_API_TOKEN"
```

---

## Export Bundle Structure

```
export.zip/
├── manifest.json              # Export metadata
├── export_index.json          # Document index
├── schemas/
│   ├── manifest.schema.json   # JSON schemas
│   ├── page_layout.schema.json
│   ├── annotation_record.schema.json
│   ├── id_algorithm.md        # ID generation docs
│   └── canonical_text_rules.md
├── annotations.jsonl          # All annotations
└── docs/
    └── abc123def456/          # Per-document
        ├── manifest.json
        ├── layout/
        │   ├── page_001.json
        │   └── page_002.json
        └── pages/
            ├── page_001.png
            └── page_002.png
```

---

## Working with Exported Data

### Load Annotations (Python)

```python
import json

# Load all annotations
annotations = []
with open("annotations.jsonl", "r") as f:
    for line in f:
        annotations.append(json.loads(line))

# Filter by label
invoice_dates = [
    ann for ann in annotations
    if ann["label"] == "invoice_date"
]

# Get annotation with evidence
for ann in invoice_dates:
    print(f"Value: {ann['value']}")
    print(f"Quote: {ann['evidence']['quote']}")
    print(f"Page: {ann['page_id']}")
    print(f"Position: char {ann['evidence']['char_start']}-{ann['evidence']['char_end']}")
```

### Load Page Layout (Python)

```python
import json

# Load page layout
with open("docs/abc123def456/layout/page_001.json", "r") as f:
    layout = json.load(f)

# Get all words
for word in layout["words"]:
    print(f"{word['word_id']}: '{word['text']}' at ({word['bbox']['x']}, {word['bbox']['y']})")

# Get canonical text
print(layout["canonical_text"])

# Find word by ID
def find_word(layout, word_id):
    return next((w for w in layout["words"] if w["word_id"] == word_id), None)

# Get character offsets for annotation
ann = annotations[0]
for word_id in ann["evidence"]["word_ids"]:
    word = find_word(layout, word_id)
    print(f"{word['text']} ({word['char_start']}-{word['char_end']})")
```

### Overlay Annotations on Page Image (Python)

```python
from PIL import Image, ImageDraw

# Load page image
img = Image.open("docs/abc123def456/pages/page_001.png")
draw = ImageDraw.Draw(img)

# Draw annotation bboxes
for ann in annotations:
    if ann["page_id"] != "abc123def456:page_001":
        continue

    for bbox in ann["evidence"]["bboxes"]:
        x, y, w, h = bbox["x"], bbox["y"], bbox["width"], bbox["height"]
        draw.rectangle([x, y, x+w, y+h], outline="red", width=2)

img.save("page_001_annotated.png")
```

### Re-anchor Annotations

```python
def re_anchor_by_quote(new_layout, quote, context_chars=50):
    """Re-anchor annotation by quote matching."""
    canonical = new_layout["canonical_text"]

    # Find quote in canonical text
    idx = canonical.find(quote)
    if idx == -1:
        return None

    # Build word_ids from character range
    word_ids = []
    for word in new_layout["words"]:
        if word["char_start"] >= idx and word["char_end"] <= idx + len(quote):
            word_ids.append(word["word_id"])

    return {
        "char_start": idx,
        "char_end": idx + len(quote),
        "word_ids": word_ids
    }

# Re-anchor after re-OCR
new_evidence = re_anchor_by_quote(new_layout, ann["evidence"]["quote"])
if new_evidence:
    print(f"Re-anchored: {new_evidence}")
else:
    print("Quote not found - manual review needed")
```

---

## Validation

### Validate Export Against Schemas

```python
import json
import jsonschema

# Load schema
with open("schemas/annotation_record.schema.json") as f:
    schema = json.load(f)

# Validate annotations
with open("annotations.jsonl") as f:
    for i, line in enumerate(f):
        ann = json.loads(line)
        try:
            jsonschema.validate(ann, schema)
        except jsonschema.ValidationError as e:
            print(f"Annotation {i} invalid: {e.message}")
```

### Verify Deterministic IDs

```bash
# Export same project twice
curl -X POST ".../exports/pdf-ml" -d '{"format": "pdf_ml"}' > export1.json
curl -X POST ".../exports/pdf-ml" -d '{"format": "pdf_ml"}' > export2.json

# Compare layout files (should be byte-identical)
diff export1/docs/abc123/layout/page_001.json export2/docs/abc123/layout/page_001.json
```

---

## Test Scenarios

### Scenario 1: Basic Export

**Given**: Project with 10 annotated PDFs
**When**: Export with default options
**Then**:
- [ ] Export completes successfully
- [ ] Each page has layout/page_NNN.json
- [ ] Each page has pages/page_NNN.png
- [ ] annotations.jsonl contains all annotations
- [ ] All files validate against schemas

### Scenario 2: Multi-Line Highlight

**Given**: Text annotation spanning 3 lines
**When**: Export annotation
**Then**:
- [ ] `evidence.bboxes` has 3 entries (one per line)
- [ ] `evidence.word_ids` includes all selected words
- [ ] `evidence.quote` contains full selected text

### Scenario 3: Table Annotation

**Given**: Annotation on table cell
**When**: Export annotation
**Then**:
- [ ] `evidence.table_id` references table
- [ ] `evidence.cell_id` references cell
- [ ] Table in layout has correct row/col structure

### Scenario 4: Rotated PDF

**Given**: PDF with 90-degree rotation
**When**: Export
**Then**:
- [ ] `geometry.rotation_deg` is 90
- [ ] Bboxes align with PNG when overlaid
- [ ] Coordinate conversion is correct

### Scenario 5: Partial Failure

**Given**: 10 PDFs, 1 corrupted
**When**: Export
**Then**:
- [ ] Status is "partial"
- [ ] 9 documents exported successfully
- [ ] `export_errors.json` lists failed document
- [ ] Error includes doc_id, error_type, message

---

## Troubleshooting

### Export Fails Immediately

- Check you have project owner/manager role
- Verify project has PDF tasks with PdfOcr tag
- Check server logs for details

### Missing Page Images

- Ensure `include_page_images: true` in request
- Check Poppler/pdf2image is installed on server

### Bboxes Don't Align with PNG

- Verify DPI matches between export and viewing
- Check `geometry.rotation_deg` is handled
- Use `render_scale` for coordinate conversion

### IDs Changed Between Exports

- Verify same DPI and options used
- Check `id_algorithm_version` matches
- PDF content hash must be identical
