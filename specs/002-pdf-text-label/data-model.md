# Data Model: PDF Text Labeling

**Feature**: 002-pdf-text-label
**Date**: 2026-01-12

## Entities

### 1. PdfRegion (Extended)

Existing entity extended with text content support.

**Fields**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | Yes | Unique identifier (GUID) |
| pid | string | Yes | Persistent ID |
| type | "pdfregion" | Yes | Region type discriminator |
| object | Reference<PdfOcrModel> | Yes | Parent PDF object tag |
| x | number (0-100) | Yes | X coordinate (percentage) |
| y | number (0-100) | Yes | Y coordinate (percentage) |
| width | number (0-100) | Yes | Width (percentage) |
| height | number (0-100) | Yes | Height (percentage) |
| page | number | Yes | 1-based page number |
| rotation | number | No | 0, 90, 180, 270 (default: 0) |
| **text** | string | No | **NEW**: Manually entered text content |
| **position** | PositionReference | No | **NEW**: Position metadata |

**Validation Rules**:
- text: max 1000 characters, allows empty/null
- x, y, width, height: 0-100 range
- page: >= 1
- rotation: one of [0, 90, 180, 270]

**State Transitions**:
```
[Created] → text empty
    ↓
[Text Added] → text populated
    ↓
[Text Edited] → text updated
    ↓
[Text Cleared] → text empty (valid state)
```

### 2. PdfTextHighlight (New)

New entity for text selection highlights.

**Fields**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | Yes | Unique identifier (GUID) |
| pid | string | Yes | Persistent ID |
| type | "pdftexthighlight" | Yes | Region type discriminator |
| object | Reference<PdfOcrModel> | Yes | Parent PDF object tag |
| text | string | Yes | Captured text content (auto-populated) |
| page | number | Yes | 1-based page number |
| tokenStart | number | Yes | Start token index |
| tokenEnd | number | Yes | End token index (inclusive) |
| position | PositionReference | Yes | Position metadata |
| **Computed at runtime**: | | |
| boundingBox | BoundingBox | Yes | Calculated from tokens |

**Validation Rules**:
- text: auto-populated from selected tokens, max 1000 characters
- tokenStart <= tokenEnd
- page: >= 1
- position.page must match page

**State Transitions**:
```
[Selection Made] → temp highlight (no label)
    ↓
[Label Applied] → permanent highlight created
    ↓
[Boundary Adjusted] → text + position updated
    ↓
[Deleted] → removed
```

### 3. PositionReference (New)

Value object for position tracking.

**Fields**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| page | number | Yes | 1-based page number |
| line | number | No | 1-based line number (start) |
| lineEnd | number | No | End line for multi-line selections |
| paragraph | number | No | 1-based paragraph index (fallback) |
| startOffset | number | No | Character offset from page start (fallback) |
| endOffset | number | No | Character offset end (fallback) |
| tokenStart | number | No | Token index start (debug/advanced) |
| tokenEnd | number | No | Token index end (debug/advanced) |

**Validation Rules**:
- page: >= 1, required
- line: >= 1 if present
- lineEnd: >= line if present
- At least one of: line, paragraph, or startOffset must be present (besides page)

### 4. OCRToken (Existing - Reference)

No changes needed. Used for text selection and line calculation.

**Fields** (existing):
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | Yes | Token identifier |
| text | string | Yes | Token text content |
| bbox | [number, number, number, number] | Yes | [x, y, width, height] normalized 0-1 |

### 5. Line (Computed - Not Persisted)

Logical grouping computed at runtime for position tracking.

**Fields**:
| Field | Type | Description |
|-------|------|-------------|
| lineNumber | number | 1-based line number |
| tokens | OCRToken[] | Tokens in this line |
| yMin | number | Top y-coordinate |
| yMax | number | Bottom y-coordinate |
| yCenter | number | Center y-coordinate |

## Relationships

```
PdfOcrModel (Object Tag)
    │
    ├── 1:N → PdfRegion (Box annotations)
    │           └── has optional text: string
    │           └── has optional position: PositionReference
    │
    └── 1:N → PdfTextHighlight (Text selection annotations)
                └── has required text: string
                └── has required position: PositionReference
                └── references tokenStart/tokenEnd

OCRToken[] (from task data)
    │
    └── grouped into → Line[] (computed at runtime)
                        └── used by → PositionReference.line
```

## Annotation Result Schema

When serialized for export, both region types produce results in this format:

```typescript
// PdfRegion (Box) result
{
  id: string,
  type: "pdflabels",
  from_name: string,
  to_name: string,
  value: {
    pdflabels: string[],      // e.g., ["Header"]
    x: number,                 // 0-100
    y: number,                 // 0-100
    width: number,             // 0-100
    height: number,            // 0-100
    page: number,              // 1-based
    rotation: number,          // 0, 90, 180, 270
    text?: string,             // NEW: manually entered text
    position?: PositionReference  // NEW: position metadata
  }
}

// PdfTextHighlight result
{
  id: string,
  type: "pdflabels",  // Same type for compatibility
  from_name: string,
  to_name: string,
  value: {
    pdflabels: string[],      // e.g., ["Publisher"]
    text: string,              // Auto-captured text
    position: PositionReference,
    // Bounding box computed from tokens
    x: number,
    y: number,
    width: number,
    height: number,
    page: number,
    // Token references for precise selection
    tokenStart: number,
    tokenEnd: number
  }
}
```

## MST Model Definitions

### PdfRegion Extension
```javascript
// In PdfRegion.jsx
const Model = types.model('PdfRegionModel', {
  // ... existing fields ...
  text: types.optional(types.string, ''),
  position: types.maybeNull(types.frozen()), // PositionReference
});
```

### PdfTextHighlight Model
```javascript
// New file: PdfTextHighlight.jsx
const PdfTextHighlightModel = types.model('PdfTextHighlightModel', {
  id: types.optional(types.identifier, guidGenerator),
  pid: types.optional(types.string, guidGenerator),
  type: types.literal('pdftexthighlight'),
  object: types.late(() => types.reference(PdfOcrModel)),
  text: types.string,
  page: types.number,
  tokenStart: types.number,
  tokenEnd: types.number,
  position: types.frozen(), // PositionReference
});
```

### PositionReference (TypeScript interface for documentation)
```typescript
interface PositionReference {
  page: number;
  line?: number;
  lineEnd?: number;
  paragraph?: number;
  startOffset?: number;
  endOffset?: number;
  tokenStart?: number;
  tokenEnd?: number;
}
```
