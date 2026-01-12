# Data Model: PDF Annotation Export

**Date**: 2026-01-12
**Feature**: 003-annotation-export

## Overview

This document defines the data structures for PDF annotation export, including layout models, annotation records, and export metadata.

---

## Core Entities

### 1. ExportBundle

Top-level container for a complete export operation.

```typescript
interface ExportBundle {
  // Metadata
  export_id: string;           // UUID for this export
  export_schema_version: string; // Semver (e.g., "1.0.0")
  created_at: string;          // ISO8601 timestamp
  created_by: string;          // User ID who triggered export

  // Content summary
  project_id: number;
  total_documents: number;
  total_annotations: number;
  total_pages: number;

  // Export options
  options: ExportOptions;

  // Paths (relative to bundle root)
  documents: DocumentRef[];
  annotation_files: string[];  // ["annotations.jsonl"] or ["annotations_part_0001.jsonl", ...]

  // Status
  status: "completed" | "partial";
  errors?: ExportError[];
}

interface ExportOptions {
  format: "pdf_ml" | "pdf_ml_w3c";
  render_dpi: number;          // Default: 200
  include_page_images: boolean; // Default: true
  include_w3c: boolean;        // Default: false
}

interface DocumentRef {
  doc_id: string;
  task_id: number;
  manifest_path: string;       // "docs/{doc_id}/manifest.json"
  page_count: number;
  annotation_count: number;
}

interface ExportError {
  doc_id: string;
  task_id: number;
  error_type: string;
  error_message: string;
  timestamp: string;
}
```

---

### 2. DocumentManifest

Per-document metadata and processing information.

```typescript
interface DocumentManifest {
  // Identity
  doc_id: string;              // Deterministic from task_id + pdf_hash
  task_id: number;             // Label Studio task ID
  pdf_path: string;            // Original PDF path/URL
  sha256: string;              // PDF content hash

  // Document info
  num_pages: number;
  title?: string;              // PDF metadata if available
  author?: string;

  // Processing versions
  layout_version_id: string;   // UUID for this extraction run
  id_algorithm_version: string; // "sha256_v1"
  export_schema_version: string;

  // Pipeline versions
  pipeline: {
    pdf_text_engine: string;   // "pdfplumber/0.10.x"
    ocr_engine?: string;       // "tesseract/5.x" if OCR used
    layout_engine: string;     // "label-studio-pdf-export/1.0.0"
  };

  // Render settings
  render: {
    dpi: number;
    coordinate_system: "pixel_top_left_xywh";
  };

  // Paths (relative to doc folder)
  layout_files: string[];      // ["layout/page_001.json", ...]
  page_images?: string[];      // ["pages/page_001.png", ...]
}
```

---

### 3. PageLayout

Per-page layout structure with text layers and structural elements.

```typescript
interface PageLayout {
  // Identity
  page_id: string;             // "{doc_id}:page_{NNN}"
  page_number: number;         // 1-indexed
  doc_id: string;
  layout_version_id: string;

  // PDF geometry (source dimensions)
  geometry: PageGeometry;

  // Text layers
  layers: {
    pdf_text?: TextLayer;      // Native PDF text if available
    ocr?: TextLayer;           // OCR layer if needed
  };

  // Canonical layer selection
  canonical: {
    layer_id: "pdf_text" | "ocr";
    reason: string;            // "pdf_text_coverage >= 0.7"
  };

  // Canonical text and index
  canonical_text: string;      // Full page text with normalized formatting
  canonical_index: CanonicalIndex;

  // Structural elements
  words: Word[];
  lines: Line[];
  blocks: Block[];
  tables: Table[];

  // Figures (non-text regions)
  figures?: Figure[];
}

interface PageGeometry {
  // PDF source dimensions (points)
  pdf_page_width_pt: number;
  pdf_page_height_pt: number;
  rotation_deg: number;        // 0, 90, 180, 270
  media_box_pt: BBox;          // [x0, y0, x1, y1]
  crop_box_pt: BBox;

  // Rendered dimensions (pixels)
  render_dpi: number;
  render_scale: number;        // dpi / 72
  rendered_width_px: number;
  rendered_height_px: number;
}

type BBox = [number, number, number, number]; // [x0, y0, x1, y1] or [x, y, w, h]
```

---

### 4. TextLayer

Collection of text tokens from a single extraction source.

```typescript
interface TextLayer {
  layer_id: "pdf_text" | "ocr";
  source_engine: string;       // "pdfplumber/0.10.x" or "tesseract/5.x"

  // Quality metrics
  coverage: number;            // 0.0-1.0 (ratio of page with text)
  avg_confidence?: number;     // 0.0-1.0 (OCR only)
  word_count: number;

  // Raw tokens (before grouping)
  tokens: Token[];
}

interface Token {
  token_id: string;            // Temporary ID for processing
  text: string;
  bbox: BBoxXYWH;              // In rendered pixels
  confidence?: number;         // 0.0-1.0 (OCR only)

  // Font info (pdf_text layer)
  font_name?: string;
  font_size?: number;
  is_bold?: boolean;
  is_italic?: boolean;
}

interface BBoxXYWH {
  x: number;                   // Top-left x (pixels)
  y: number;                   // Top-left y (pixels)
  width: number;
  height: number;
}
```

---

### 5. Structural Elements

#### Word

```typescript
interface Word {
  word_id: string;             // "w_{hash8}" - deterministic
  text: string;                // Unicode NFC normalized
  bbox: BBoxXYWH;

  // Hierarchy references
  line_id: string;
  block_id: string;

  // Position
  reading_order: number;       // Global within page

  // Character offsets in canonical text
  char_start: number;
  char_end: number;

  // Source
  layer_id: "pdf_text" | "ocr";
  confidence?: number;         // OCR only
}
```

#### Line

```typescript
interface Line {
  line_id: string;             // "l_{hash8}"
  bbox: BBoxXYWH;              // Bounding box of all words

  // Hierarchy
  block_id: string;
  word_ids: string[];          // Ordered by reading position

  // Text
  text: string;                // Space-joined words
  char_start: number;
  char_end: number;

  // Position
  reading_order: number;       // Within block
}
```

#### Block

```typescript
interface Block {
  block_id: string;            // "b_{hash8}"
  bbox: BBoxXYWH;

  // Type classification
  block_type: "paragraph" | "heading" | "list_item" | "caption" | "other";

  // Hierarchy
  line_ids: string[];

  // Text
  text: string;                // Lines joined by \n
  char_start: number;
  char_end: number;

  // Position
  reading_order: number;       // Within page
}
```

---

### 6. Table Structure

```typescript
interface Table {
  table_id: string;            // "t_{hash8}"
  bbox: BBoxXYWH;

  // Structure
  n_rows: number;
  n_cols: number;
  cells: Cell[];

  // Confidence
  structure_confidence: number; // 0.0-1.0
  structure_reason?: string;   // Set when confidence < 0.5

  // Block reference (tables are special blocks)
  block_id: string;
  reading_order: number;
}

interface Cell {
  cell_id: string;             // "t_{table_hash}:r{NN}c{NN}"
  row: number;                 // 0-indexed
  col: number;

  bbox: BBoxXYWH;
  text: string;
  source_layer: "pdf_text" | "ocr";

  // Merge info
  rowspan: number;             // Default: 1
  colspan: number;             // Default: 1
  merged_into_cell_id?: string; // If this cell is merged into another

  // Header detection
  is_header: boolean;

  // Word references
  word_ids: string[];
}
```

---

### 7. CanonicalIndex

Mapping from structural IDs to character positions.

```typescript
interface CanonicalIndex {
  // Word-level index
  words: {
    [word_id: string]: {
      char_start: number;
      char_end: number;
    };
  };

  // Line-level index
  lines: {
    [line_id: string]: {
      char_start: number;
      char_end: number;
    };
  };

  // Block-level index
  blocks: {
    [block_id: string]: {
      char_start: number;
      char_end: number;
    };
  };
}
```

---

### 8. AnnotationRecord

Single annotation in JSONL format.

```typescript
interface AnnotationRecord {
  // Identity
  ann_id: string;              // Unique annotation ID
  doc_id: string;
  page_id: string;
  layout_version_id: string;

  // Type
  type: "field" | "region" | "table_region" | "table_cell_field";

  // Label
  label: string;               // Label name from labeling config
  value?: string;              // Extracted value (field types)
  value_format?: string;       // "text" | "number" | "date" | etc.

  // Evidence (location anchors)
  evidence: AnnotationEvidence;

  // Metadata (provenance)
  metadata: AnnotationMetadata;

  // Review (optional)
  review?: ReviewInfo;

  // Grouping (for multi-page annotations)
  group_id?: string;
}

interface AnnotationEvidence {
  // Text anchors
  quote: string;               // Exact selected text
  char_start: number;          // Position in canonical text
  char_end: number;

  // Structural anchors
  word_ids: string[];
  line_id?: string;            // If single line
  block_id?: string;           // If single block

  // Table anchors (table annotations)
  table_id?: string;
  cell_id?: string;
  cell_ids?: string[];         // Multiple cells

  // Spatial anchors
  bboxes: BBoxXYWH[];          // One per line fragment or region
  layer_id: "pdf_text" | "ocr"; // Source layer
}

interface AnnotationMetadata {
  annotator_id: number;        // Label Studio user ID
  created_at: string;          // ISO8601
  updated_at: string;          // ISO8601
  source: "manual" | "model_assisted" | "imported";
  confidence?: number;         // Model confidence if model_assisted
  parent_ann_id?: string;      // For revision chains
}

interface ReviewInfo {
  reviewer_id: number;
  reviewed_at: string;
  review_decision: "approved" | "rejected" | "needs_changes";
  review_comment?: string;
}
```

---

### 9. W3C Web Annotation (Alternate Format)

```typescript
interface W3CAnnotation {
  "@context": "http://www.w3.org/ns/anno.jsonld";
  id: string;                  // IRI
  type: "Annotation";

  // Timing
  created: string;             // ISO8601
  modified?: string;
  creator?: Creator;

  // Body (the annotation content)
  body: AnnotationBody | AnnotationBody[];

  // Target (what is annotated)
  target: AnnotationTarget;

  // Provenance
  generator?: Generator;
}

interface AnnotationBody {
  type: "TextualBody";
  value: string;               // Label + value
  purpose: "tagging" | "describing";
  format?: "text/plain";
}

interface AnnotationTarget {
  source: string;              // Document/page IRI
  selector: Selector[];        // Multiple selectors for redundancy
}

type Selector = TextQuoteSelector | TextPositionSelector | FragmentSelector;

interface TextQuoteSelector {
  type: "TextQuoteSelector";
  exact: string;
  prefix?: string;             // 20-50 chars before
  suffix?: string;             // 20-50 chars after
}

interface TextPositionSelector {
  type: "TextPositionSelector";
  start: number;
  end: number;
}

interface FragmentSelector {
  type: "FragmentSelector";
  conformsTo: "http://www.w3.org/TR/media-frags/";
  value: string;               // "xywh=x,y,w,h"
}

interface Creator {
  type: "Person";
  id: string;                  // User IRI
  name?: string;
}

interface Generator {
  type: "Software";
  id: "https://labelstud.io";
  name: "Label Studio";
}
```

---

## Entity Relationships

```
ExportBundle
    ├── DocumentRef[] ─────────────> DocumentManifest
    │                                    ├── PageLayout[]
    │                                    │       ├── TextLayer[]
    │                                    │       │       └── Token[]
    │                                    │       ├── Word[]
    │                                    │       ├── Line[] ────> Word[]
    │                                    │       ├── Block[] ───> Line[]
    │                                    │       ├── Table[]
    │                                    │       │       └── Cell[] ──> Word[]
    │                                    │       └── CanonicalIndex
    │                                    └── (page images)
    │
    └── AnnotationRecord[] ────────────────────────────────────> evidence
                                                                    ├── word_ids -> Word
                                                                    ├── line_id -> Line
                                                                    ├── block_id -> Block
                                                                    ├── table_id -> Table
                                                                    └── cell_id -> Cell
```

---

## Validation Rules

### Identity Rules
- `doc_id` MUST be deterministic: `hash(task_id + sha256(pdf_content))[:12]`
- `word_id` MUST be deterministic per algorithm in research.md
- `layout_version_id` MUST be unique UUID per extraction run

### Referential Integrity
- Every `word_id` in `evidence.word_ids` MUST exist in page's `words[]`
- Every `line_id` MUST reference valid `word_ids`
- Every `cell.word_ids` MUST reference words within cell's `bbox`

### Coordinate Rules
- All `bbox` values MUST be in rendered PNG pixel coordinates
- All `bbox.x` and `bbox.y` MUST be non-negative integers
- `char_start` MUST be < `char_end`
- Character offsets MUST be within canonical text length

### Coverage Rules
- `coverage` MUST be 0.0-1.0
- `confidence` MUST be 0.0-1.0 when present
- `structure_confidence < 0.5` MUST have `structure_reason` set

---

## State Transitions

### Export Status
```
QUEUED → IN_PROGRESS → COMPLETED
                    ↘ PARTIAL (with errors)
                    ↘ FAILED
```

### Annotation Lifecycle
```
created (source=manual) → updated → reviewed (approved/rejected)
                                        ↓
                               revision (parent_ann_id set)
```
