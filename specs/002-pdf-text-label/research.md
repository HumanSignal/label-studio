# Research: PDF Text Labeling

**Feature**: 002-pdf-text-label
**Date**: 2026-01-12

## Research Topics

### 1. Text Selection in PDF with OCR Tokens

**Decision**: Use OCR token-based selection rather than native browser text selection

**Rationale**:
- PdfOcr already renders OCR tokens as positioned overlays with `data-token-id` attributes
- OCR tokens have bounding box coordinates suitable for position tracking
- Browser native selection on PDF.js text layer is unreliable for precise token boundaries
- Token-based selection allows calculating line numbers from y-coordinates

**Alternatives Considered**:
- **Native PDF.js text layer selection**: Rejected - inconsistent across browsers, difficult to map selection to token boundaries
- **Canvas-based selection**: Rejected - would require custom rendering, incompatible with existing token overlay

**Implementation Pattern**:
```javascript
// Select tokens by tracking mousedown/mousemove/mouseup on token overlay
// Calculate selected tokens by checking which tokens intersect selection rectangle
// Use existing extractTokenText() pattern from OcrTokenLabels
```

### 2. Line Number Calculation from OCR Tokens

**Decision**: Calculate line numbers by grouping tokens with similar y-coordinates using a tolerance threshold

**Rationale**:
- OCR tokens have bbox coordinates [x, y, width, height] in normalized 0-1 space
- Tokens on the same line will have similar y values (center or top)
- Tolerance threshold handles slight variations from OCR imprecision
- This approach is used by document AI systems (Azure Form Recognizer, Google Document AI)

**Algorithm**:
```
1. Sort tokens by y-coordinate (ascending)
2. Group tokens where y-coordinate difference < threshold (e.g., 0.5 * avg_token_height)
3. Assign sequential line numbers to groups
4. For multi-line selections, report line range (e.g., lines 5-7)
```

**Alternatives Considered**:
- **Fixed line height assumption**: Rejected - PDF documents have variable line heights
- **Paragraph-only tracking**: Rejected - less precise than line numbers; used as fallback only
- **External OCR service re-processing**: Rejected - adds latency and external dependency

**Fallback Strategy**:
- If line detection fails (tokens have erratic y-values): fall back to paragraph index
- If paragraph detection fails: fall back to character/token offset range

### 3. Text Input for Box Regions

**Decision**: Add TextArea per-region control in side panel, similar to existing per-region controls

**Rationale**:
- Label Studio already has per-region controls pattern (e.g., per-region classifications)
- Side panel provides consistent UX without cluttering the PDF view
- TextArea component exists and handles Unicode, multi-line text
- Aligns with clarification answer from spec session

**Implementation Pattern**:
```javascript
// In PdfRegion model, add:
text: types.optional(types.string, '')

// In region details panel, render TextArea when region is selected
// Use existing per-region control patterns from RichTextRegion/HyperTextRegion
```

**Alternatives Considered**:
- **Inline overlay on PDF**: Rejected - clutters view, difficult to position on rotated/zoomed PDFs
- **Modal dialog**: Rejected - interrupts workflow for common operation
- **Automatic OCR extraction**: Out of scope - separate feature (this is manual entry)

### 4. Highlight Visualization

**Decision**: Use CSS-based highlighting on token overlay elements

**Rationale**:
- Tokens are already DOM elements with absolute positioning
- CSS classes can apply background colors matching label colors
- Follows pattern from HighlightMixin used by RichText/HyperText
- Supports label color inheritance for visual consistency

**Implementation Pattern**:
```javascript
// Apply .htx-highlight class to selected token elements
// Use label background color for highlight
// Add .htx-active for currently selected highlight
// Add resize handles at start/end tokens for boundary adjustment
```

**Alternatives Considered**:
- **Canvas overlay drawing**: Rejected - would require separate render layer, complicates interaction
- **SVG overlay**: Rejected - additional complexity for same visual result

### 5. Position Reference Schema

**Decision**: Use extensible JSON schema with required and optional fields

**Rationale**:
- Page number is always available (required)
- Line number is best-effort (optional)
- Multiple fallback levels ensure always-present position data
- Schema is forward-compatible for future enhancements (column detection)

**Schema**:
```typescript
interface PositionReference {
  page: number;           // Required: 1-based page number
  line?: number;          // Optional: 1-based line number (start)
  lineEnd?: number;       // Optional: end line for multi-line selections
  paragraph?: number;     // Fallback: 1-based paragraph index
  startOffset?: number;   // Fallback: character offset from page start
  endOffset?: number;     // Fallback: character offset end
  tokenStart?: number;    // Debug: token index start
  tokenEnd?: number;      // Debug: token index end
}
```

**Alternatives Considered**:
- **Single line field only**: Rejected - doesn't handle multi-line selections
- **Separate Box vs Highlight schemas**: Rejected - unified schema simpler for consumers

### 6. Integration with Existing Result System

**Decision**: Extend existing pdflabels result type to include text and position

**Rationale**:
- pdflabels result type already exists and works with PdfRegion
- Adding text and position fields follows existing patterns in Result.js
- No new result type needed; maintains backward compatibility

**Implementation Pattern**:
```javascript
// In Result.js resultValues, pdflabels already exists
// PdfRegion serialize() will include text and position in value object
// Result schema:
{
  type: "pdflabels",
  value: {
    pdflabels: ["Header"],
    text: "Green Bond Report 2025",
    position: { page: 1, line: 1 },
    // existing fields: x, y, width, height, page, rotation
  }
}
```

**Alternatives Considered**:
- **New result type "pdftextlabels"**: Rejected - unnecessary complexity; extend existing type
- **Separate text result**: Rejected - text belongs with the region that captures it

## Dependencies Verified

| Dependency | Status | Notes |
|------------|--------|-------|
| selection-tools.js | ✅ Available | Can adapt captureSelection pattern |
| HighlightMixin | ✅ Available | Can use for highlight styling |
| PdfOcr OCR overlay | ✅ Available | Tokens already rendered as DOM |
| OcrTokenLabels extractTokenText | ✅ Available | Token text extraction |
| Result.js pdflabels | ✅ Available | Exists, needs text/position extension |
| PdfRegion model | ✅ Available | Needs text property addition |

## Open Questions Resolved

All NEEDS CLARIFICATION items from Technical Context have been resolved through this research. No blocking unknowns remain.
