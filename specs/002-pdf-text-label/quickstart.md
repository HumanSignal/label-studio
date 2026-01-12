# Quickstart: PDF Text Labeling

**Feature**: 002-pdf-text-label
**Date**: 2026-01-12

## Overview

This feature adds two text annotation capabilities to PDF labeling:
1. **Manual Text Entry**: Type text content for box regions (e.g., header = "Green Bond Report 2025")
2. **Text Highlighting**: Select text directly in PDFs with automatic capture and position tracking

## Prerequisites

- Label Studio with PdfOcr tag functional
- PDF with OCR tokens (for text highlighting)
- Development environment with Node.js 18+, yarn

## Quick Test

### 1. Start Development Server

```bash
cd /Users/matthias_home/Documents/ML-Projects/lularge_label-studio
yarn dev
```

### 2. Create Test Project

Use this labeling config:

```xml
<View>
  <PdfLabels name="label" toName="pdf">
    <Label value="Header" background="#FF0000"/>
    <Label value="Publisher" background="#00FF00"/>
    <Label value="Date" background="#0000FF"/>
    <Label value="Table" background="#FFFF00"/>
  </PdfLabels>
  <PdfOcr name="pdf" value="$pdf" ocrvalue="$ocr"/>
</View>
```

### 3. Test Manual Text Entry (Box Regions)

1. Draw a bounding box around text in the PDF
2. Click a label (e.g., "Header")
3. **NEW**: In the side panel, enter the text content (e.g., "Green Bond Report 2025")
4. Submit the annotation
5. Verify the result includes `text` field

Expected result structure:
```json
{
  "type": "pdflabels",
  "value": {
    "pdflabels": ["Header"],
    "x": 10, "y": 5, "width": 30, "height": 3,
    "page": 1,
    "text": "Green Bond Report 2025",
    "position": { "page": 1, "line": 1 }
  }
}
```

### 4. Test Text Highlighting

1. Click and drag to select text directly in the PDF
2. Click a label to apply
3. **NEW**: Text is automatically captured
4. Verify position reference includes page and line

Expected result structure:
```json
{
  "type": "pdflabels",
  "value": {
    "pdflabels": ["Publisher"],
    "text": "Hong Kong",
    "position": { "page": 3, "line": 24 },
    "x": 45, "y": 60, "width": 15, "height": 2,
    "page": 3,
    "tokenStart": 142,
    "tokenEnd": 143
  }
}
```

## Key Files to Modify

| File | Purpose |
|------|---------|
| `web/libs/editor/src/regions/PdfRegion/PdfRegion.jsx` | Add text property, position tracking |
| `web/libs/editor/src/tags/object/PdfOcr/PdfOcr.jsx` | Add text selection handling |
| `web/libs/editor/src/tags/control/PdfLabels/PdfLabels.jsx` | Ensure text input renders |

## Key Files to Create

| File | Purpose |
|------|---------|
| `web/libs/editor/src/regions/PdfRegion/PdfTextHighlight.jsx` | New text highlight region model |
| `web/libs/editor/src/tags/object/PdfOcr/components/TextHighlight.jsx` | Text highlight rendering |
| `web/libs/editor/src/tags/object/PdfOcr/components/PositionTracker.js` | Line number calculation |
| `web/libs/editor/src/utils/pdf-selection.js` | PDF-specific selection utilities |

## Development Workflow

### Step 1: Add Text Property to PdfRegion

```javascript
// In PdfRegion.jsx Model definition
text: types.optional(types.string, ''),
position: types.maybeNull(types.frozen()),
```

### Step 2: Add TextArea to Region Details

Look at how RichTextRegion handles per-region text input and adapt for PdfRegion.

### Step 3: Implement Line Calculation

```javascript
// PositionTracker.js
export function calculateLineNumber(tokens, targetTokenIndex) {
  // Sort tokens by y-coordinate
  // Group by similar y (tolerance = 0.5 * avg height)
  // Return line number for target token
}
```

### Step 4: Implement Text Selection

```javascript
// pdf-selection.js
export function handleTextSelection(event, tokens, onSelect) {
  // Track mousedown/mousemove/mouseup
  // Calculate which tokens intersect selection
  // Return { tokenStart, tokenEnd, text }
}
```

## Testing Checklist

- [ ] Draw box, add text in side panel, verify in export
- [ ] Edit existing text, verify update persists
- [ ] View multiple regions in list, verify text visible
- [ ] Select text in PDF, apply label, verify auto-capture
- [ ] Verify page number in position reference
- [ ] Verify line number calculation (for regular PDFs)
- [ ] Test position fallback when line detection fails
- [ ] Adjust highlight boundaries, verify text updates

## Common Issues

### Text Selection Not Working

Check that:
- PDF has OCR tokens (ocrvalue prop populated)
- Tokens are rendered in overlay
- Mouse events not blocked by other elements

### Line Numbers Missing

Check that:
- Tokens have valid bbox coordinates
- Line grouping tolerance is appropriate for document
- Falls back to paragraph/offset when line detection fails

### Text Not Persisting

Check that:
- PdfRegion serialize() includes text field
- Result.js resultValues has text handling
- Annotation submission includes updated region

## Related Documentation

- [spec.md](./spec.md) - Full feature specification
- [data-model.md](./data-model.md) - Entity definitions
- [contracts/annotation-schema.json](./contracts/annotation-schema.json) - JSON Schema
- [research.md](./research.md) - Technical decisions
