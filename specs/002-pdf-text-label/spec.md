# Feature Specification: PDF Text Labeling

**Feature Branch**: `002-pdf-text-label`
**Created**: 2026-01-12
**Status**: Draft
**Input**: User description: "Now that we are able to draw boxes of certain categories in a PDF, we need to build on these capabilities. Specifically we need to be able to label the text of interest. For instance header = 'Green Bond Report 2025' or publisher = 'Hong Kong'. Additionally, support simple text highlighting where annotators can select text directly and associate it with a label, with position tracking (page, line preferred, paragraph as fallback)."

## Clarifications

### Session 2026-01-12

- Q: Where should text input appear when annotator wants to add text to a region? → A: Text input appears in side panel when region is selected (similar to existing per-region controls)
- Feature expanded to include text highlighting capability with position tracking (page + line preferred, paragraph/offset fallback)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Capture Text Content from PDF Regions (Priority: P1)

An annotator draws a bounding box around text in a PDF document (e.g., a document header) and selects a category label (e.g., "Header"). After creating the region, the annotator needs to capture the actual text content within that box so the annotation includes both the location and the text value.

**Why this priority**: This is the core functionality - without the ability to capture text content, regions are just geometric shapes without semantic meaning. Users need to associate actual text values with their labeled regions.

**Independent Test**: Can be fully tested by drawing a box around "Green Bond Report 2025", selecting "Header" label, entering the text, and verifying the annotation includes both the region coordinates and the text value.

**Acceptance Scenarios**:

1. **Given** an annotator has drawn a bounding box around text and selected a label, **When** they select the region, **Then** a text input field appears in the side panel allowing them to enter the text content.

2. **Given** an annotator has entered text content for a labeled region, **When** they submit/confirm the text, **Then** the annotation data includes both the region (coordinates, label) and the associated text value.

3. **Given** an annotator views a region with text content, **When** they look at the region details panel, **Then** they can see the text value displayed alongside the label.

---

### User Story 2 - Edit Existing Text Labels (Priority: P2)

An annotator reviewing previous annotations needs to correct or update the text content associated with a labeled region. For example, fixing a typo in "Green Bnd Report" to "Green Bond Report".

**Why this priority**: Errors happen during annotation. Users need the ability to fix text content without having to delete and recreate entire regions.

**Independent Test**: Can be fully tested by selecting an existing region with text, editing the text value, and verifying the change persists.

**Acceptance Scenarios**:

1. **Given** an annotator selects a region that has associated text content, **When** they activate edit mode (click/double-click or shortcut), **Then** the text becomes editable.

2. **Given** an annotator has modified the text content, **When** they confirm the edit, **Then** the updated text is saved and displayed.

3. **Given** an annotator is editing text, **When** they cancel (Escape or click away), **Then** the original text is preserved.

---

### User Story 3 - View Text in Region List (Priority: P3)

An annotator working on a document with many annotations needs to quickly scan all labeled regions and their associated text values from a list view, rather than clicking on each region individually.

**Why this priority**: Improves efficiency for quality review and navigation, but the core annotation workflow works without this.

**Independent Test**: Can be fully tested by creating multiple labeled regions with text and verifying they appear in the regions panel with their text values visible.

**Acceptance Scenarios**:

1. **Given** multiple regions exist with text labels, **When** the annotator views the regions panel, **Then** each region shows its label category and text value in the list.

2. **Given** a region has a long text value, **When** displayed in the list, **Then** the text is truncated with an ellipsis but full text is visible on hover or in a tooltip.

---

### User Story 4 - Highlight Text Directly in PDF (Priority: P1)

An annotator needs to select and highlight text directly in a PDF document (similar to highlighting in a web browser or PDF reader), then associate that highlighted text with a label. This is faster than drawing boxes when the text is clearly selectable.

**Why this priority**: Direct text selection is often more intuitive and faster than drawing bounding boxes, especially for well-structured PDFs with embedded text layers. This is a core annotation method alongside box-drawing.

**Independent Test**: Can be fully tested by selecting "Hong Kong" text in a PDF, applying "Publisher" label, and verifying the annotation captures the text, label, and position reference.

**Acceptance Scenarios**:

1. **Given** a PDF with selectable text (text layer available), **When** the annotator clicks and drags to select text, **Then** the text is visually highlighted.

2. **Given** text is selected in the PDF, **When** the annotator clicks a label (e.g., "Header"), **Then** a labeled highlight region is created with the selected text automatically captured.

3. **Given** a labeled text highlight exists, **When** viewing the annotation data, **Then** it includes: the highlighted text content, the label, and position reference (page number at minimum).

---

### User Story 5 - Track Text Position with Page and Line Reference (Priority: P1)

When text is highlighted or a region is created, the system must track the position within the document. The preferred reference is page number + line number. If line numbers cannot be determined, paragraph or token position should be used as fallback.

**Why this priority**: Position tracking is essential for document processing workflows. Users need to know not just what text was labeled, but where it appears (e.g., "Header on page 1, line 1" vs "Publishing date on page 3, line 24").

**Independent Test**: Can be fully tested by highlighting text on different pages and verifying the exported annotation includes accurate page and line/position references.

**Acceptance Scenarios**:

1. **Given** text is highlighted on page 3 of a PDF, **When** viewing the annotation, **Then** the page number (3) is included in the position reference.

2. **Given** the PDF has determinable line structure (OCR tokens with vertical positions), **When** text is highlighted, **Then** a line number or line range is calculated and included (e.g., "line 24" or "lines 24-25").

3. **Given** line numbers cannot be reliably determined, **When** text is highlighted, **Then** a fallback position reference is provided (paragraph index, character offset range, or token index range).

4. **Given** an annotation with position reference, **When** exported, **Then** the position data follows a consistent schema: `{page: number, line?: number, paragraph?: number, startOffset?: number, endOffset?: number}`.

---

### User Story 6 - Edit Highlighted Text Selection (Priority: P2)

An annotator needs to adjust the boundaries of a text highlight after it was created - either extending or shrinking the selection.

**Why this priority**: Selection mistakes happen. Adjusting highlights is less disruptive than deleting and recreating.

**Independent Test**: Can be fully tested by creating a highlight, then dragging the start or end boundary to include more or less text.

**Acceptance Scenarios**:

1. **Given** a text highlight region is selected, **When** the annotator drags the start/end handle, **Then** the highlight boundary adjusts and the captured text updates accordingly.

2. **Given** the highlight boundary is adjusted, **When** the change is confirmed, **Then** the position reference (line number, offsets) updates to match the new selection.

---

### Edge Cases

**Manual Text Entry (Box-based regions):**
- What happens when the annotator enters no text? (Region should still be valid with empty/null text value)
- How does system handle very long text entries? (Should support multi-line text up to reasonable limit, e.g., 1000 characters)
- What happens when text contains special characters or non-Latin scripts? (Should support Unicode including CJK, Arabic, etc.)
- How does the system handle text entry when multiple regions are selected? (Should only apply to actively selected single region)

**Text Highlighting:**
- What happens when the PDF has no text layer (scanned image)? (Highlighting unavailable; show informative message, user should use box-drawing instead)
- What happens when selection spans multiple lines? (Capture all text, report line range e.g., "lines 5-7")
- What happens when selection spans multiple pages? (Not supported in initial version; selection limited to single page)
- How does system handle overlapping highlights? (Allow overlapping; each highlight is independent)
- What if OCR tokens are inaccurate or misaligned? (Use token positions as-is; accuracy depends on OCR quality)

**Position Tracking:**
- What happens when line detection fails? (Fall back to paragraph index, then character offsets)
- How are lines determined from OCR tokens? (Group tokens by similar y-coordinate within tolerance threshold)
- What if a PDF has inconsistent line spacing? (Use best-effort line grouping; may report paragraph instead)

## Requirements *(mandatory)*

### Functional Requirements

**Manual Text Entry (Box-based regions):**
- **FR-001**: System MUST allow annotators to associate text content with any labeled PDF region.
- **FR-002**: System MUST display a text input interface in the side panel when the annotator selects a labeled region.
- **FR-003**: System MUST persist the text value as part of the annotation data alongside region coordinates and labels.
- **FR-004**: System MUST allow editing of existing text values for previously annotated regions.
- **FR-005**: System MUST display the text value in the region details/info panel.
- **FR-006**: System MUST display text values in the regions list view for quick reference.
- **FR-007**: System MUST support Unicode text including special characters and non-Latin scripts.
- **FR-008**: System MUST allow empty text values (optional text entry, not mandatory).
- **FR-009**: System MUST validate text length does not exceed maximum limit (1000 characters assumed reasonable default).

**Text Highlighting:**
- **FR-010**: System MUST allow annotators to select text directly in PDFs with available text layers (embedded text or OCR tokens).
- **FR-011**: System MUST visually highlight selected text with a distinct color indicating the selection state.
- **FR-012**: System MUST create a labeled region when a label is applied to selected text, automatically capturing the text content.
- **FR-013**: System MUST allow adjustment of highlight boundaries (extend/shrink) after creation.
- **FR-014**: System MUST support text selection granularity options: character, word, or line level.
- **FR-015**: System MUST indicate when text highlighting is unavailable (no text layer) and guide user to use box-drawing.

**Position Tracking:**
- **FR-016**: System MUST include page number in all annotation position references.
- **FR-017**: System SHOULD calculate and include line number when determinable from OCR token positions.
- **FR-018**: System MUST provide fallback position reference (paragraph index or character offsets) when line numbers cannot be determined.
- **FR-019**: System MUST export position data in a consistent schema: `{page, line?, lineEnd?, paragraph?, startOffset?, endOffset?, tokenStart?, tokenEnd?}`.
- **FR-020**: System MUST calculate line numbers by grouping OCR tokens with similar vertical (y) positions within a configurable tolerance.

### Key Entities

- **PDF Region (Box)**: A bounded rectangular area on a PDF page with coordinates (x, y, width, height), page number, and associated label. Extended to include optional manually-entered text content.
- **PDF Text Highlight**: A text selection region defined by start/end token indices or character offsets. Contains automatically captured text content, label, and position reference.
- **Position Reference**: Location metadata for any annotation, containing: page number (required), line number or range (preferred), paragraph index (fallback), character offsets (fallback).
- **OCR Token**: A unit of text from OCR or embedded PDF text layer, with bounding box coordinates and text content. Used for text selection and line calculation.
- **Line**: A logical grouping of OCR tokens at similar vertical positions. Calculated dynamically for position tracking.
- **Annotation Result**: The complete annotation output including region/highlight geometry, category label, text content, and position reference.

## Success Criteria *(mandatory)*

### Measurable Outcomes

**Manual Text Entry:**
- **SC-001**: Annotators can capture text content for a labeled region within 5 seconds of creating the region.
- **SC-002**: Text content is correctly persisted and exported in annotation results 100% of the time.
- **SC-003**: 95% of annotators can successfully add text to a region on their first attempt without documentation.
- **SC-004**: Text values are visible in the regions list, reducing time to review annotations by at least 30% compared to clicking each region individually.

**Text Highlighting:**
- **SC-005**: Annotators can create a labeled text highlight in under 3 seconds (select text + click label).
- **SC-006**: Text highlighting is 50% faster than box-drawing for well-structured text regions.
- **SC-007**: Highlighted text is captured with 100% accuracy (exact match to selected text).

**Position Tracking:**
- **SC-008**: Page number is included in 100% of annotations.
- **SC-009**: Line number is successfully calculated for at least 80% of highlights in PDFs with regular text layout.
- **SC-010**: Position reference fallback (paragraph/offset) is provided for 100% of cases where line detection fails.

## Assumptions

**General:**
- The existing PDF labeling infrastructure (bounding boxes with category labels) is functional and stable.
- A single text value per region/highlight is sufficient (no need for multiple text fields per annotation).
- Maximum text length of 1000 characters is acceptable for typical document annotation use cases.

**Manual Text Entry:**
- Text content for box regions is manually entered by annotators (not automatically extracted).
- Standard Label Studio TextArea component or similar can be adapted for text input.

**Text Highlighting:**
- PDFs with text layers (embedded or OCR-generated) will have token data available for selection.
- Existing Label Studio selection utilities (selection-tools.js, HighlightMixin) can be adapted for PDF text layer.
- OCR tokens include bounding box coordinates that can be used for line calculation.
- Text selection is limited to single pages (cross-page selection is out of scope for initial version).

**Position Tracking:**
- Line numbers are calculated heuristically from OCR token y-coordinates; 100% accuracy is not guaranteed.
- A reasonable tolerance threshold (e.g., 5-10 pixels or percentage of line height) can be used for grouping tokens into lines.
- When line detection fails, paragraph index or character offsets are acceptable fallbacks.
- Position schema should be extensible for future enhancements (e.g., column detection).

## Existing Capabilities to Reuse

The following existing Label Studio components can be leveraged:

- **selection-tools.js**: `captureSelection()`, `applyTextGranularity()`, `highlightRange()` for text selection handling
- **HighlightMixin**: Visual highlighting with span elements, resize handles
- **RichText/HyperText models**: Character offset and global offset tracking patterns
- **PdfOcr OCR token overlay**: Existing token rendering and intersection detection
- **OcrTokenLabels**: `extractTokenText()` for getting text from token ranges
- **PdfRegion**: Page tracking, coordinate normalization patterns
