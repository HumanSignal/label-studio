# PDF Annotation Export for ML Training

## Overview

This document describes the PDF ML export feature developed for Label Studio, which exports PDF annotations in a format optimized for AI/ML training and fine-tuning.

## The Challenge

Label Studio provides a native JSON export format (`mydata/lularge-labels/`), but we needed a more comprehensive export that captures:

1. **Actual label values** (Header, Publishing Date, etc.) - not just the annotation type
2. **Pixel-based bounding boxes** - for layout-aware models like LayoutLM
3. **Word-level token linkage** - connecting annotations to extracted text
4. **Full page context** - all words on each page with positions and font info

## Journey & Hard Learnings

### Issue 1: Path Resolution Bug

**Symptom**: Export failed with "PDF file does not exist: /data/upload/7/..."

**Root Cause**: In `_get_pdf_path_from_task()`, the check for generic paths (`/`) was evaluated BEFORE specific `/data/upload/` paths:

```python
# WRONG ORDER - /data/upload/... matches this first!
if pdf_url.startswith("/"):
    return pdf_url  # Returns URL as filesystem path!

if pdf_url.startswith("/data/upload/"):  # Never reached
    ...
```

**Fix**: Reordered checks so specific patterns are evaluated first.

**File**: `label_studio/data_export/pdf_export/tasks.py` (lines 599-630)

---

### Issue 2: Missing Actual Labels

**Symptom**: Export showed `"label": "pdflabels"` instead of actual values like "Header"

**Root Cause**: The code looked for labels in `value.labels` or `value.choices`, but PDF annotations store them in `value.{result_type}` (e.g., `value.pdflabels`):

```python
# WRONG - doesn't find labels in value.pdflabels
labels = value.get("labels", value.get("choices", []))

# CORRECT - checks value.{result_type} first
labels = value.get(result_type, value.get("labels", value.get("choices", [])))
```

**File**: `label_studio/data_export/pdf_export/annotation_builder.py` (line 227)

---

### Issue 3: Duplicate Annotations (672 vs 12)

**Symptom**: 672 annotation records exported for only 12 actual annotations

**Root Cause**: The code looped through ALL 56 pages for EACH annotation:

```python
# WRONG - creates N annotations × 56 pages = 672 duplicates
for annotation in annotations:
    for page_layout in page_layouts:  # 56 pages!
        records = convert_ls_annotation_to_records(...)
```

**Fix**: Use `value.page` from each annotation result to process only the correct page:

```python
# CORRECT - process each result with its specific page
page_layout_map = {pl.page_number: pl for pl in page_layouts}
for annotation in annotations:
    for result in annotation_data.get("result", []):
        page_num = result.get("value", {}).get("page", 1)
        page_layout = page_layout_map.get(page_num)
        if page_layout:
            # Process only this result with its correct page
            ...
```

**File**: `label_studio/data_export/pdf_export/tasks.py` (lines 565-600)

---

### Issue 4: Empty Bounding Boxes & Word IDs

**Symptom**: `"bboxes": []` and `"word_ids": []` were always empty

**Root Cause**: The code handled `labels`, `textarea`, and `rectanglelabels` types, but PDF annotations use `pdflabels` type which wasn't handled:

```python
# WRONG - pdflabels not handled
if result_type in ("labels", "textarea"):
    ...
elif result_type == "rectanglelabels":
    ...
# pdflabels falls through with no processing!

# CORRECT - include pdflabels
elif result_type in ("rectanglelabels", "pdflabels"):
    # Convert percentage coords to pixels
    # Find words in bbox
    ...
```

**File**: `label_studio/data_export/pdf_export/annotation_builder.py` (lines 255-290)

## Final Export Format

### Before Fixes
```json
{
  "label": "pdflabels",
  "evidence": {
    "bboxes": [],
    "word_ids": [],
    "quote": ""
  }
}
```
**Records**: 672 (56 pages × 12 annotations)

### After Fixes
```json
{
  "annotation_id": "1",
  "task_id": 4,
  "doc_id": "fb3c59894bd2",
  "annotation_type": "field",
  "label": "Header",
  "evidence": {
    "bboxes": [{"x": 984, "y": 417, "width": 661, "height": 175}],
    "word_ids": ["w_f88fd8f0", "w_60c963fc", "w_bfe88c3f", "w_c623f4dc"],
    "quote": "Green Bond\nReport 2025",
    "char_start": 75,
    "char_end": 97,
    "page_id": "fb3c59894bd2:page_001",
    "layer_id": "pdf_text"
  },
  "metadata": {
    "annotator_id": 2,
    "source": "manual",
    "created_at": "2026-01-11T14:16:07.559418+00:00",
    "updated_at": "2026-01-14T09:24:18.103144+00:00",
    "lead_time_seconds": 6893.138
  },
  "value": "Green Bond Report 2025",
  "result_id": "t_dK2Q3KWt",
  "from_name": "regions",
  "to_name": "pdf"
}
```
**Records**: 12 (one per actual annotation)

## Export Structure

```
label_export/
├── annotations.jsonl      # All annotations in JSONL format (one per line)
├── export_index.json      # Export metadata and statistics
├── docs/
│   └── {doc_id}/
│       ├── manifest.json  # Document metadata (SHA256, page count, etc.)
│       ├── layout/        # Per-page JSON with all extracted words
│       │   ├── page_001.json
│       │   ├── page_002.json
│       │   └── ...
│       └── pages/         # Rendered page images (PNG)
│           ├── page_001.png
│           └── ...
└── schemas/               # JSON Schema definitions for validation
```

## Page Layout Format

Each page layout (`layout/page_XXX.json`) contains:

```json
{
  "page_id": "fb3c59894bd2:page_001",
  "page_number": 1,
  "geometry": {
    "pdf_page_width_pt": 595.276,
    "pdf_page_height_pt": 841.89,
    "rendered_width_px": 1654,
    "rendered_height_px": 2339,
    "render_dpi": 200
  },
  "layers": {
    "pdf_text": {
      "tokens": [
        {
          "token_id": "tok_000000",
          "text": "Green",
          "bbox": {"x": 1065, "y": 459, "width": 243, "height": 84},
          "font_name": "WBLURF+Avenir-Black",
          "font_size": 30.3,
          "is_bold": true,
          "is_italic": false
        }
      ]
    }
  }
}
```

## Key Differences from Standard Export

| Feature | Standard Export | ML Export |
|---------|----------------|-----------|
| Coordinates | Percentage (0-100) | Pixels |
| Labels | In `value.pdflabels[]` | Top-level `label` field |
| Text extraction | Only labeled regions | All words on all pages |
| Font info | Not included | Included (bold, italic, font name) |
| Word-level bboxes | Not included | Included for every word |
| Format | JSON per annotation | JSONL (streaming) |

## Usage

### API Endpoint
```bash
POST /api/projects/{project_id}/exports/pdf-ml/
Authorization: Bearer {token}
Content-Type: application/json

{}  # Optional: {"task_ids": [1,2,3], "include_page_images": true}
```

### Response
Returns export job config. Export files are saved to:
```
{MEDIA_ROOT}/pdf_exports/{project_id}/{export_id}/
```

## Files Modified

1. **`label_studio/data_export/pdf_export/tasks.py`**
   - Path resolution ordering fix
   - Page-aware annotation processing

2. **`label_studio/data_export/pdf_export/annotation_builder.py`**
   - Label extraction from `value.{result_type}`
   - `pdflabels` type handling
   - Text value extraction from `extractedText`

## Lessons Learned

1. **Check ordering matters**: Specific patterns must be checked before generic fallbacks
2. **Know your data structure**: Label Studio annotation format varies by annotation type
3. **Avoid cartesian products**: Don't loop all pages × all annotations
4. **Test with real data**: Synthetic tests may not reveal format-specific bugs
5. **Compare with native export**: Standard export reveals expected data structure
