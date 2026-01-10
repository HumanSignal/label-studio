# Contract: Export Format

**Version**: 1.0.0
**Date**: 2026-01-10
**Feature**: `001-pdf-ocr-tables`

## Overview

Defines the JSON export format for PDF OCR annotations (FR-024, FR-025, FR-026).

---

## Export Endpoint

```
GET /api/projects/{project_id}/export?exportType=JSON
```

Standard Label Studio export endpoint with PDF OCR annotations included.

---

## Complete Export Structure

```json
{
  "id": 123,
  "data": {
    "pdf_url": "s3://bucket/documents/invoice.pdf",
    "ocr_url": "s3://bucket/ocr/invoice.json"
  },
  "meta": {
    "document_id": "INV-2026-001"
  },
  "created_at": "2026-01-10T10:00:00.000Z",
  "updated_at": "2026-01-10T12:30:00.000Z",
  "inner_id": 1,
  "total_annotations": 1,
  "cancelled_annotations": 0,
  "total_predictions": 0,
  "comment_count": 0,
  "annotations": [
    {
      "id": 456,
      "created_at": "2026-01-10T12:30:00.000Z",
      "updated_at": "2026-01-10T12:30:00.000Z",
      "completed_by": 789,
      "ground_truth": false,
      "lead_time": 180.5,
      "result": [
        // Region annotations
        // Table annotations
        // Text corrections
      ],
      "was_cancelled": false
    }
  ],
  "predictions": []
}
```

---

## Region Result (FR-024)

Each region annotation includes:

| Field | Type | Description | Requirement |
|-------|------|-------------|-------------|
| `id` | string | Unique region identifier | Required |
| `type` | string | `"pdfregion"` | Required |
| `from_name` | string | Control tag name | Required |
| `to_name` | string | Object tag name | Required |
| `original_width` | number | Page width at annotation time | Required |
| `original_height` | number | Page height at annotation time | Required |
| `value.x` | number | X position (0-100) | Required |
| `value.y` | number | Y position (0-100) | Required |
| `value.width` | number | Width (0-100) | Required |
| `value.height` | number | Height (0-100) | Required |
| `value.rotation` | number | Rotation in degrees | Required |
| `value.page_index` | number | 0-based page number | Required |
| `value.pdfregionlabels` | string[] | Applied labels | Required |
| `meta.suggested_text` | string | OCR-extracted text | Optional |
| `meta.corrected_text` | string | User-corrected text | Optional |
| `meta.token_ids` | string[] | OCR token IDs in region | Optional |
| `meta.confidence` | number | Average token confidence | Optional |

### Example

```json
{
  "id": "region_h1_abc123",
  "type": "pdfregion",
  "from_name": "label",
  "to_name": "pdf",
  "original_width": 612,
  "original_height": 792,
  "value": {
    "x": 10.0,
    "y": 5.0,
    "width": 30.0,
    "height": 4.0,
    "rotation": 0,
    "page_index": 0,
    "pdfregionlabels": ["HEADER"]
  },
  "meta": {
    "suggested_text": "INVOICE #12345",
    "corrected_text": "INVOICE #12345",
    "token_ids": ["p0_t0", "p0_t1"],
    "confidence": 0.98
  }
}
```

---

## Table Result (FR-025)

Each table annotation includes:

| Field | Type | Description | Requirement |
|-------|------|-------------|-------------|
| `id` | string | Unique table identifier | Required |
| `type` | string | `"pdftable"` | Required |
| `from_name` | string | Control tag name | Required |
| `to_name` | string | Object tag name | Required |
| `original_width` | number | Page width | Required |
| `original_height` | number | Page height | Required |
| `value.x` | number | Table X position (0-100) | Required |
| `value.y` | number | Table Y position (0-100) | Required |
| `value.width` | number | Table width (0-100) | Required |
| `value.height` | number | Table height (0-100) | Required |
| `value.rotation` | number | Rotation in degrees | Required |
| `value.page_index` | number | 0-based page number | Required |
| `value.pdfregionlabels` | string[] | `["TABLE"]` | Required |
| `value.row_lines` | number[] | Row separator positions (0-1) | Required |
| `value.col_lines` | number[] | Column separator positions (0-1) | Required |
| `value.cells` | Cell[] | Cell data array | Required |

### Cell Structure

| Field | Type | Description | Requirement |
|-------|------|-------------|-------------|
| `row` | number | 0-based row index | Required |
| `col` | number | 0-based column index | Required |
| `rowspan` | number | Rows spanned (default: 1) | Required |
| `colspan` | number | Columns spanned (default: 1) | Required |
| `bbox` | number[4] | `[x, y, width, height]` normalized 0-1 | Required |
| `suggested_text` | string | OCR-extracted text | Required |
| `corrected_text` | string | User-corrected text | Optional |
| `token_ids` | string[] | OCR token IDs in cell | Optional |
| `confidence` | number | Average token confidence | Required |

### Example

```json
{
  "id": "table_1_xyz789",
  "type": "pdftable",
  "from_name": "label",
  "to_name": "pdf",
  "original_width": 612,
  "original_height": 792,
  "value": {
    "x": 10.0,
    "y": 30.0,
    "width": 80.0,
    "height": 25.0,
    "rotation": 0,
    "page_index": 0,
    "pdfregionlabels": ["TABLE"],
    "row_lines": [0, 0.2, 0.4, 0.6, 0.8, 1.0],
    "col_lines": [0, 0.33, 0.66, 1.0],
    "cells": [
      {
        "row": 0,
        "col": 0,
        "rowspan": 1,
        "colspan": 1,
        "bbox": [0, 0, 0.33, 0.2],
        "suggested_text": "Item",
        "corrected_text": "Item",
        "token_ids": ["p0_t10"],
        "confidence": 0.99
      },
      {
        "row": 0,
        "col": 1,
        "rowspan": 1,
        "colspan": 1,
        "bbox": [0.33, 0, 0.33, 0.2],
        "suggested_text": "Qty",
        "corrected_text": "Quantity",
        "token_ids": ["p0_t11"],
        "confidence": 0.95
      },
      {
        "row": 0,
        "col": 2,
        "rowspan": 1,
        "colspan": 1,
        "bbox": [0.66, 0, 0.34, 0.2],
        "suggested_text": "Price",
        "corrected_text": "Price",
        "token_ids": ["p0_t12"],
        "confidence": 0.98
      },
      {
        "row": 1,
        "col": 0,
        "rowspan": 1,
        "colspan": 1,
        "bbox": [0, 0.2, 0.33, 0.2],
        "suggested_text": "Widget A",
        "token_ids": ["p0_t20"],
        "confidence": 0.97
      }
    ]
  }
}
```

---

## Text Correction Result

When text is corrected via TextArea:

```json
{
  "id": "text_region_h1_abc123",
  "type": "textarea",
  "from_name": "correctedText",
  "to_name": "pdf",
  "value": {
    "text": ["INVOICE #12345"]
  }
}
```

---

## Coordinate Normalization (FR-026)

All coordinates are normalized:

### Region Coordinates
- `x`, `y`, `width`, `height`: **0-100 range** (percentage of page dimensions)
- Consistent with existing Label Studio Image tag behavior

### Table Internal Coordinates
- `row_lines`, `col_lines`: **0-1 range** (within table bounds)
- `cells[].bbox`: **0-1 range** (within table bounds)

### Conversion Formulas

```python
# Page coordinates (0-100) to absolute pixels
abs_x = (region.x / 100) * page_width
abs_y = (region.y / 100) * page_height

# Table-relative to absolute
cell_abs_x = table_abs_x + (cell.bbox[0] * table_abs_width)
cell_abs_y = table_abs_y + (cell.bbox[1] * table_abs_height)
```

---

## Complete Export Example

```json
{
  "id": 123,
  "data": {
    "pdf_url": "s3://bucket/documents/invoice.pdf",
    "ocr_url": "s3://bucket/ocr/invoice.json"
  },
  "annotations": [
    {
      "id": 456,
      "completed_by": 789,
      "result": [
        {
          "id": "region_h1",
          "type": "pdfregion",
          "from_name": "label",
          "to_name": "pdf",
          "original_width": 612,
          "original_height": 792,
          "value": {
            "x": 10.0,
            "y": 5.0,
            "width": 30.0,
            "height": 4.0,
            "rotation": 0,
            "page_index": 0,
            "pdfregionlabels": ["HEADER"]
          },
          "meta": {
            "suggested_text": "INVOICE #12345",
            "corrected_text": "INVOICE #12345",
            "token_ids": ["p0_t0", "p0_t1"],
            "confidence": 0.98
          }
        },
        {
          "id": "region_p1",
          "type": "pdfregion",
          "from_name": "label",
          "to_name": "pdf",
          "original_width": 612,
          "original_height": 792,
          "value": {
            "x": 10.0,
            "y": 12.0,
            "width": 80.0,
            "height": 15.0,
            "rotation": 0,
            "page_index": 0,
            "pdfregionlabels": ["PARAGRAPH"]
          },
          "meta": {
            "suggested_text": "Thank you for your business...",
            "token_ids": ["p0_t5", "p0_t6", "p0_t7", "p0_t8"],
            "confidence": 0.96
          }
        },
        {
          "id": "table_1",
          "type": "pdftable",
          "from_name": "label",
          "to_name": "pdf",
          "original_width": 612,
          "original_height": 792,
          "value": {
            "x": 10.0,
            "y": 30.0,
            "width": 80.0,
            "height": 25.0,
            "rotation": 0,
            "page_index": 0,
            "pdfregionlabels": ["TABLE"],
            "row_lines": [0, 0.25, 0.5, 0.75, 1.0],
            "col_lines": [0, 0.4, 0.7, 1.0],
            "cells": [
              {"row": 0, "col": 0, "rowspan": 1, "colspan": 1, "bbox": [0, 0, 0.4, 0.25], "suggested_text": "Item", "confidence": 0.99},
              {"row": 0, "col": 1, "rowspan": 1, "colspan": 1, "bbox": [0.4, 0, 0.3, 0.25], "suggested_text": "Qty", "confidence": 0.98},
              {"row": 0, "col": 2, "rowspan": 1, "colspan": 1, "bbox": [0.7, 0, 0.3, 0.25], "suggested_text": "Price", "confidence": 0.99}
            ]
          }
        },
        {
          "id": "text_region_h1",
          "type": "textarea",
          "from_name": "correctedText",
          "to_name": "pdf",
          "value": {
            "text": ["INVOICE #12345"]
          }
        }
      ]
    }
  ]
}
```

---

## Schema Validation

Export must pass JSON Schema validation (SC-006):

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["id", "data", "annotations"],
  "properties": {
    "id": {"type": "integer"},
    "data": {
      "type": "object",
      "required": ["pdf_url"],
      "properties": {
        "pdf_url": {"type": "string", "format": "uri-reference"},
        "ocr_url": {"type": "string", "format": "uri-reference"}
      }
    },
    "annotations": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["id", "result"],
        "properties": {
          "result": {
            "type": "array",
            "items": {
              "oneOf": [
                {"$ref": "#/definitions/pdfregion"},
                {"$ref": "#/definitions/pdftable"},
                {"$ref": "#/definitions/textarea"}
              ]
            }
          }
        }
      }
    }
  }
}
```

Full schema available at `specs/001-pdf-ocr-tables/contracts/export-schema.json`.
