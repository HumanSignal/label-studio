# Data Model: PDF OCR Labeling with Table Structure Annotation

**Date**: 2026-01-10
**Feature**: `001-pdf-ocr-tables`

## Overview

This document defines the data structures for PDF OCR labeling, including OCR tokens, region annotations, table structures, and export formats.

## Entity Relationship Diagram

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│      Task       │────<│   OcrPageData    │────<│    OcrToken     │
│                 │ 1:N │                  │ 1:N │                 │
│ - id            │     │ - page_index     │     │ - id            │
│ - data (JSON)   │     │ - width          │     │ - text          │
│ - project_id    │     │ - height         │     │ - bbox          │
└────────┬────────┘     │ - tokens_url     │     │ - confidence    │
         │              └──────────────────┘     │ - line_id       │
         │ 1:N                                   │ - block_id      │
         ▼                                       └─────────────────┘
┌─────────────────┐
│   Annotation    │
│                 │
│ - id            │
│ - result (JSON) │────> Contains RegionResult[] and TableResult[]
│ - task_id       │
└─────────────────┘
```

## Core Data Structures

### Task Data Schema

The task's `data` field contains PDF and OCR URLs:

```json
{
  "pdf_url": "string (required) - URL to PDF file",
  "ocr_url": "string (optional) - URL to OCR JSON file",
  "meta": {
    "document_id": "string (optional) - External document identifier",
    "total_pages": "integer (optional) - Total page count"
  }
}
```

**Example**:
```json
{
  "pdf_url": "/data/local-files/?d=documents/invoice-001.pdf",
  "ocr_url": "/data/local-files/?d=ocr/invoice-001.json"
}
```

### OCR Data Schema

OCR data is stored as a JSON file per document (all pages):

```typescript
interface OcrDocument {
  document_id?: string;
  pages: OcrPageData[];
  ocr_engine?: string;      // e.g., "tesseract", "azure", "aws-textract"
  ocr_version?: string;
  created_at?: string;      // ISO 8601 timestamp
}

interface OcrPageData {
  page_index: number;       // 0-based page number
  width: number;            // Original page width in points (72 DPI)
  height: number;           // Original page height in points
  rotation?: number;        // Page rotation in degrees (0, 90, 180, 270)
  tokens: OcrToken[];
}

interface OcrToken {
  id: string;               // Unique token identifier (e.g., "p0_t42")
  text: string;             // Token text content
  bbox: [number, number, number, number];  // [x, y, width, height] normalized 0-1
  confidence?: number;      // OCR confidence score 0-1
  line_id?: string;         // Line grouping identifier
  block_id?: string;        // Block/paragraph grouping identifier
  font_size?: number;       // Detected font size in points
  is_bold?: boolean;        // Bold text flag
  is_italic?: boolean;      // Italic text flag
}
```

**Example OCR JSON**:
```json
{
  "document_id": "invoice-001",
  "pages": [
    {
      "page_index": 0,
      "width": 612,
      "height": 792,
      "tokens": [
        {
          "id": "p0_t0",
          "text": "INVOICE",
          "bbox": [0.1, 0.05, 0.2, 0.03],
          "confidence": 0.99,
          "line_id": "p0_l0",
          "block_id": "p0_b0",
          "is_bold": true
        },
        {
          "id": "p0_t1",
          "text": "#12345",
          "bbox": [0.31, 0.05, 0.1, 0.03],
          "confidence": 0.97,
          "line_id": "p0_l0",
          "block_id": "p0_b0"
        }
      ]
    }
  ],
  "ocr_engine": "tesseract",
  "ocr_version": "5.3.0"
}
```

## Annotation Result Structures

### Region Annotation Result

For labeled document regions (HEADER, PARAGRAPH, FOOTER, etc.):

```typescript
interface RegionResult {
  id: string;                // Region unique ID (e.g., "region_abc123")
  type: "pdfregion";         // Result type identifier
  from_name: string;         // Control tag name (e.g., "label")
  to_name: string;           // Object tag name (e.g., "pdf")
  original_width: number;    // Page width at creation
  original_height: number;   // Page height at creation
  value: {
    x: number;               // X position (0-100 percentage)
    y: number;               // Y position (0-100 percentage)
    width: number;           // Width (0-100 percentage)
    height: number;          // Height (0-100 percentage)
    rotation: number;        // Rotation in degrees
    page_index: number;      // 0-based page number
    pdfregionlabels: string[];  // Applied labels (e.g., ["HEADER"])
  };
  meta?: {
    suggested_text: string;  // Auto-extracted text from OCR tokens
    corrected_text?: string; // User-corrected text
    token_ids: string[];     // IDs of OCR tokens in region
    confidence: number;      // Average confidence of included tokens
  };
}
```

**Example**:
```json
{
  "id": "region_h1",
  "type": "pdfregion",
  "from_name": "label",
  "to_name": "pdf",
  "original_width": 612,
  "original_height": 792,
  "value": {
    "x": 10,
    "y": 5,
    "width": 30,
    "height": 4,
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

### Table Annotation Result

For table regions with gridline structure:

```typescript
interface TableResult {
  id: string;                // Table unique ID
  type: "pdftable";          // Result type identifier
  from_name: string;         // Control tag name
  to_name: string;           // Object tag name
  original_width: number;
  original_height: number;
  value: {
    x: number;               // Table X position (0-100)
    y: number;               // Table Y position (0-100)
    width: number;           // Table width (0-100)
    height: number;          // Table height (0-100)
    rotation: number;
    page_index: number;
    pdfregionlabels: ["TABLE"];

    // Table structure
    row_lines: number[];     // Normalized row separator positions (0-1 within table)
    col_lines: number[];     // Normalized column separator positions (0-1 within table)

    // Cell data
    cells: TableCell[];
  };
}

interface TableCell {
  row: number;               // 0-based row index
  col: number;               // 0-based column index
  rowspan: number;           // Number of rows this cell spans (default: 1)
  colspan: number;           // Number of columns this cell spans (default: 1)
  bbox: [number, number, number, number];  // Computed from gridlines [x, y, w, h] normalized
  suggested_text: string;    // Auto-extracted text
  corrected_text?: string;   // User-corrected text
  token_ids: string[];       // OCR tokens in this cell
  confidence: number;        // Average token confidence
}
```

**Example**:
```json
{
  "id": "table_1",
  "type": "pdftable",
  "from_name": "label",
  "to_name": "pdf",
  "original_width": 612,
  "original_height": 792,
  "value": {
    "x": 10,
    "y": 30,
    "width": 80,
    "height": 25,
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
        "suggested_text": "Quantity",
        "token_ids": ["p0_t11"],
        "confidence": 0.98
      }
    ]
  }
}
```

### Text Correction Result

For text corrections attached to regions:

```typescript
interface TextResult {
  id: string;
  type: "textarea";
  from_name: string;         // TextArea tag name (e.g., "text")
  to_name: string;           // Object tag name
  value: {
    text: string[];          // Corrected text (array for multi-line)
  };
}
```

## Export Format

The complete export format combines all result types per annotation:

```typescript
interface AnnotationExport {
  id: number;
  created_at: string;
  updated_at: string;
  completed_by: number;
  result: (RegionResult | TableResult | TextResult)[];
  was_cancelled: boolean;
  ground_truth: boolean;
  lead_time: number;         // Annotation duration in seconds
}

interface TaskExport {
  id: number;
  data: {
    pdf_url: string;
    ocr_url?: string;
  };
  meta?: object;
  created_at: string;
  updated_at: string;
  annotations: AnnotationExport[];
  predictions: PredictionExport[];
}
```

## Database Schema (Backend)

No new database tables required. OCR data stored as JSON files in storage backends. Region/table annotations stored in existing `Annotation.result` JSON field.

### Optional: OCR Cache Model

If OCR data caching is needed for performance:

```python
class OcrPageCache(models.Model):
    """Cache for frequently accessed OCR page data."""

    task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name='ocr_cache')
    page_index = models.IntegerField()
    token_count = models.IntegerField()
    data = models.JSONField()  # OcrPageData as JSON
    fetched_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['task', 'page_index']
        indexes = [
            models.Index(fields=['task', 'page_index']),
        ]
```

## Frontend State Models (MobX-State-Tree)

### PdfOcrModel

```javascript
const PdfOcrModel = types.compose("PdfOcrModel",
  ObjectBase,
  ProcessAttrsMixin,
  AnnotationMixin,
  types.model({
    type: "pdfocr",
    value: types.maybeNull(types.string),      // PDF URL field
    ocrvalue: types.maybeNull(types.string),   // OCR URL field

    // Runtime state
    _pdfUrl: types.maybeNull(types.string),
    _ocrUrl: types.maybeNull(types.string),
    _currentPage: types.optional(types.number, 0),
    _totalPages: types.optional(types.number, 0),
    _scale: types.optional(types.number, 1.0),
    _rotation: types.optional(types.number, 0),

    // Page dimensions (for coordinate conversion)
    _pageWidth: types.maybeNull(types.number),
    _pageHeight: types.maybeNull(types.number),
  })
);
```

### PdfRegionModel

```javascript
const PdfRegionModel = types.compose("PdfRegionModel",
  RegionsMixin,
  AreaMixin,
  NormalizationMixin,
  types.model({
    id: types.optional(types.identifier, guidGenerator),
    type: "pdfregion",
    object: types.late(() => types.reference(PdfOcrModel)),

    // Geometry
    x: types.number,
    y: types.number,
    width: types.number,
    height: types.number,
    rotation: types.optional(types.number, 0),
    page_index: types.number,

    // Text
    suggested_text: types.optional(types.string, ""),
    corrected_text: types.maybeNull(types.string),
    token_ids: types.optional(types.array(types.string), []),
  })
);
```

### TableRegionModel

```javascript
const TableRegionModel = types.compose("TableRegionModel",
  PdfRegionModel,
  types.model({
    type: "pdftable",

    // Gridlines (normalized 0-1 within table bounds)
    row_lines: types.optional(types.array(types.number), [0, 1]),
    col_lines: types.optional(types.array(types.number), [0, 1]),

    // Computed cells
    cells: types.optional(types.array(TableCellModel), []),
  })
);

const TableCellModel = types.model({
  row: types.number,
  col: types.number,
  rowspan: types.optional(types.number, 1),
  colspan: types.optional(types.number, 1),
  suggested_text: types.optional(types.string, ""),
  corrected_text: types.maybeNull(types.string),
  token_ids: types.optional(types.array(types.string), []),
  confidence: types.optional(types.number, 0),
});
```

## Validation Rules

### OCR Data Validation

| Field | Rule |
|-------|------|
| `page_index` | Must be >= 0, sequential within document |
| `bbox` | All values 0-1, x+width <= 1, y+height <= 1 |
| `confidence` | 0-1 range if present |
| `tokens` | Must have at least `id`, `text`, `bbox` |

### Region Validation

| Field | Rule |
|-------|------|
| `x`, `y` | 0-100 range |
| `width`, `height` | > 0, x+width <= 100, y+height <= 100 |
| `page_index` | 0 <= page_index < total_pages |
| `rotation` | Multiple of 90 |

### Table Validation

| Field | Rule |
|-------|------|
| `row_lines` | Sorted ascending, first=0, last=1, min 2 values |
| `col_lines` | Sorted ascending, first=0, last=1, min 2 values |
| `cells` | Count = (row_lines.length-1) * (col_lines.length-1) minus merged cells |
| `rowspan`, `colspan` | >= 1 |

## Coordinate Systems

### PDF Coordinates
- Origin: Bottom-left
- Units: Points (72 per inch)
- Handled by PDF.js viewport transformation

### Normalized Coordinates (Storage)
- Origin: Top-left
- Range: 0-1 (or 0-100 for Label Studio regions)
- Conversion: `normalized = actual / page_dimension`

### Canvas Coordinates (Rendering)
- Origin: Top-left
- Units: Pixels (scaled by devicePixelRatio)
- Conversion handled by viewport

## Backward Compatibility

This data model is additive - does not modify existing Label Studio structures:
- New result types (`pdfregion`, `pdftable`) extend existing patterns
- Existing `Annotation.result` JSON field accommodates new structures
- No database migrations required for core functionality
