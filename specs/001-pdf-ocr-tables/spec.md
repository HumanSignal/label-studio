# Feature Specification: PDF OCR Labeling with Table Structure Annotation

**Feature Branch**: `001-pdf-ocr-tables`
**Created**: 2026-01-10
**Status**: Draft
**Input**: Native PDF viewer with OCR token layer, region labeling with text capture/edit, and table structure annotation using gridline separators

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View and Navigate PDF Documents (Priority: P1)

As an annotator, I want to view PDF documents natively within Label Studio with standard navigation controls so that I can efficiently work through multi-page documents without leaving the application.

**Why this priority**: This is the foundational capability - without PDF viewing, no other annotation features can function. It enables the core workflow of document-based labeling.

**Independent Test**: Can be fully tested by loading a PDF task and navigating through pages. Delivers immediate value by enabling document viewing within Label Studio.

**Acceptance Scenarios**:

1. **Given** a task containing a PDF URL, **When** the annotator opens the task, **Then** the PDF renders in a dedicated viewer with the first page displayed
2. **Given** a multi-page PDF is displayed, **When** the annotator uses page navigation controls, **Then** they can move between pages (next, previous, go-to-page)
3. **Given** a PDF is displayed, **When** the annotator uses zoom controls, **Then** the document scales appropriately while maintaining readability
4. **Given** a PDF is displayed, **When** the annotator uses rotation controls, **Then** the page rotates in 90-degree increments

---

### User Story 2 - Label Document Regions with OCR Text Capture (Priority: P2)

As an annotator, I want to draw bounding boxes around document regions (headers, paragraphs, footers, etc.) and have the system automatically extract text from OCR tokens, which I can then review and correct.

**Why this priority**: This delivers the core labeling capability for non-table content. It's the most common annotation task for document understanding and can be used independently of table features.

**Independent Test**: Can be fully tested by drawing a region on a PDF page and verifying text extraction and editing. Delivers value for all text-region labeling tasks.

**Acceptance Scenarios**:

1. **Given** a PDF page with OCR tokens available, **When** the annotator draws a rectangular region, **Then** they can assign a label (HEADER, PARAGRAPH, FOOTER, etc.)
2. **Given** a labeled region is created, **When** the region intersects OCR tokens, **Then** the system automatically populates suggested text from those tokens in reading order
3. **Given** suggested text is displayed, **When** the annotator reviews it, **Then** they can edit and save corrected text in a side panel
4. **Given** a region is resized, **When** the annotator clicks "Recompute text", **Then** the suggested text updates based on newly intersected tokens
5. **Given** the annotator hovers over a region, **When** tokens are available, **Then** the included OCR tokens are visually highlighted

---

### User Story 3 - Define Table Structure Using Gridlines (Priority: P3)

As an annotator, I want to label table regions and define their row/column structure using draggable separator lines instead of boxing each cell, so that I can efficiently annotate complex tables.

**Why this priority**: Table annotation is the most complex feature but builds on the foundation of region labeling. The gridline approach is significantly faster than per-cell boxing for real-world tables.

**Independent Test**: Can be fully tested by drawing a table region and defining gridlines. Delivers value for document intelligence tasks requiring structured table extraction.

**Acceptance Scenarios**:

1. **Given** a PDF page is displayed, **When** the annotator draws a region and labels it as TABLE, **Then** the system enters table-structure editing mode
2. **Given** table-structure mode is active, **When** the annotator views the table region, **Then** they see initial row/column separator suggestions based on OCR token clustering
3. **Given** separator lines are displayed, **When** the annotator drags a line, **Then** the line position updates and cell boundaries recalculate
4. **Given** a table has defined separators, **When** the annotator adds a new separator, **Then** a new row or column is created at the specified position
5. **Given** a table has defined separators, **When** the annotator deletes a separator, **Then** adjacent cells merge into one

---

### User Story 4 - Review and Correct Table Cell Text (Priority: P4)

As an annotator, I want to view extracted text for each table cell in a spreadsheet-like interface and correct OCR errors efficiently using keyboard navigation.

**Why this priority**: Completes the table annotation workflow by enabling cell-level text correction, which is essential for data quality in downstream ML pipelines.

**Independent Test**: Can be fully tested by defining a table structure and editing cell text. Delivers value by enabling quality assurance of extracted table data.

**Acceptance Scenarios**:

1. **Given** a table structure is defined, **When** cells are computed from gridlines, **Then** each cell displays suggested text extracted from intersecting OCR tokens
2. **Given** cells are displayed, **When** the annotator clicks a cell in the spreadsheet panel, **Then** they can edit the corrected text for that cell
3. **Given** the annotator is editing a cell, **When** they press Tab or Enter, **Then** focus moves to the next cell (right or down)
4. **Given** the annotator is editing a cell, **When** they press arrow keys, **Then** focus moves in the corresponding direction

---

### User Story 5 - Export Annotations with Structured Data (Priority: P5)

As a data engineer, I want annotation exports to include structured data for both regions and tables so that I can use the labeled data for training document understanding models.

**Why this priority**: Export is essential for downstream use but depends on all annotation features being complete. The structured format enables ML pipeline integration.

**Independent Test**: Can be fully tested by completing annotations and exporting results. Delivers value by enabling the labeled data to be used for model training.

**Acceptance Scenarios**:

1. **Given** region annotations exist, **When** the project is exported, **Then** each region includes: page_index, normalized bbox, label, suggested_text, corrected_text, and confidence score
2. **Given** table annotations exist, **When** the project is exported, **Then** each table includes: table_bbox, page_index, row_lines, col_lines, and cells array
3. **Given** a table with cells, **When** exported, **Then** each cell includes: row, col, rowspan, colspan, bbox, suggested_text, corrected_text, and confidence

---

### Edge Cases

- What happens when a PDF has no text layer (image-only scans)? System relies on external OCR pipeline; displays warning if no tokens available for a page
- How does system handle rotated pages? Rotation is stored per-region; coordinates are normalized to page dimensions regardless of rotation
- What happens when OCR confidence is very low? Low-confidence tokens are flagged visually; confidence-driven review queue prioritizes these tasks
- How does system handle tables with merged cells? Cell metadata supports rowspan/colspan attributes; annotators can merge cells after initial gridline definition
- What happens when a table spans multiple pages? Each page is annotated separately; cross-page table linking is out of scope for MVP
- What happens when OCR token endpoint fails? System displays warning, allows annotation to continue without auto-text capture; annotators can enter text manually

## Requirements *(mandatory)*

### Functional Requirements

**PDF Viewing**
- **FR-001**: System MUST render PDF documents natively with page navigation (next, previous, go-to-page)
- **FR-002**: System MUST provide zoom controls (in, out, fit-to-width, fit-to-page)
- **FR-003**: System MUST provide page rotation controls (90-degree increments)
- **FR-004**: System MUST support PDFs up to 100 pages

**OCR Token Integration**
- **FR-005**: System MUST retrieve OCR tokens per page when available
- **FR-006**: System MUST display OCR token boundaries on hover (optional visualization)
- **FR-007**: System MUST sort tokens into reading order (top-to-bottom, left-to-right within lines)
- **FR-028**: System MUST allow annotation to continue when OCR tokens are unavailable, displaying a warning and enabling manual text entry

**Region Labeling**
- **FR-008**: System MUST allow users to draw rectangular regions on PDF pages
- **FR-009**: System MUST support region labels: HEADER, PARAGRAPH, FOOTER, FIGURE, CAPTION, TABLE, OTHER
- **FR-010**: System MUST auto-populate suggested text from OCR tokens intersecting the region
- **FR-011**: System MUST allow users to edit corrected text in a side panel
- **FR-012**: System MUST provide a "Recompute text" action when region is resized

**Table Structure**
- **FR-013**: System MUST enter table-structure mode when a TABLE region is created
- **FR-014**: System MUST display row and column separator lines within the table region
- **FR-015**: System MUST allow users to drag separator lines to adjust positions
- **FR-016**: System MUST allow users to add new separators (split cells)
- **FR-017**: System MUST allow users to delete separators (merge cells)
- **FR-018**: System MUST auto-suggest initial separators based on OCR token clustering
- **FR-032**: System MUST support tables up to 100 rows × 50 columns without degradation

**Cell Text**
- **FR-019**: System MUST compute cells as rectangles between consecutive separator lines
- **FR-020**: System MUST extract suggested text for each cell from intersecting tokens
- **FR-021**: System MUST display cells in a spreadsheet-like panel for text correction
- **FR-022**: System MUST support keyboard navigation between cells (Tab, Enter, arrow keys)
- **FR-023**: System MUST support cell merge/split via rowspan and colspan metadata

**Export**
- **FR-024**: System MUST export region annotations with: page_index, bbox, label, suggested_text, corrected_text, token_ids, confidence
- **FR-025**: System MUST export table annotations with: table_bbox, page_index, row_lines, col_lines, cells array
- **FR-026**: System MUST normalize all coordinates to 0-1 range relative to page dimensions

**Authorization**
- **FR-027**: System MUST enforce existing Label Studio project permissions for all PDF annotation features (project members only)

**Observability**
- **FR-029**: System MUST emit structured logs for annotation events (region created, table defined, export triggered)
- **FR-030**: System MUST expose metrics for monitoring (annotation throughput, OCR token fetch latency, error rates)
- **FR-031**: System MUST support distributed tracing for end-to-end request tracking across frontend and backend

### Key Entities

- **PDF Document**: The source document being annotated; stored unchanged in object storage; referenced by URL in task data
- **OCR Token**: A word or text fragment extracted by OCR; has text, bounding box, confidence, optional line_id and block_id; stored per-page as JSON
- **Region Annotation**: A labeled rectangular area on a page; has label, bbox, suggested_text, corrected_text, associated token_ids
- **Table Annotation**: A special region type with structured sub-data; includes row_lines, col_lines arrays defining the grid
- **Table Cell**: An implicit rectangle defined by adjacent separator lines; has row/col index, rowspan, colspan, suggested_text, corrected_text

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Annotators can complete region labeling for a typical document page in under 2 minutes (excluding tables)
- **SC-002**: Annotators can define table structure (gridlines) in under 1 minute for a standard 5x5 table
- **SC-003**: 90% of suggested text requires less than 20% character edits (measured by Levenshtein distance)
- **SC-004**: Annotators can correct cell text for a 5x5 table in under 3 minutes using keyboard navigation
- **SC-005**: System supports documents with 100+ pages without noticeable performance degradation
- **SC-006**: Exported annotations pass schema validation 100% of the time
- **SC-007**: Time to annotate a table is reduced by 60% compared to per-cell bounding box approach

## Assumptions

- PDFs are pre-processed by an external OCR pipeline that produces per-page token JSON files
- OCR tokens include bounding boxes in normalized page coordinates (0-1 range)
- The existing Label Studio task/project structure can accommodate the new annotation types
- Frontend customization is achieved via fork/rebuild approach (not Enterprise plugins)
- Users have basic familiarity with Label Studio annotation workflows
- Concurrent annotation conflicts follow standard Label Studio behavior (last save wins, no locking)

## Out of Scope

- OCR processing (external pipeline assumed)
- Cross-page table linking
- Automatic table detection (tables must be manually identified)
- Advanced table features: nested tables, irregular cell shapes
- Real-time collaborative annotation

## Clarifications

### Session 2026-01-10

- Q: What authorization model should control access to PDF annotation features? → A: Use existing Label Studio project permissions (project members only)
- Q: How should the system behave when OCR token endpoint is unavailable? → A: Allow annotation without text capture (show warning, manual text entry only)
- Q: How should concurrent annotation conflicts be resolved? → A: Last save wins (no locking, standard Label Studio behavior)
- Q: What level of observability is required? → A: Full observability (structured logs, metrics dashboards, distributed tracing)
- Q: What is the maximum table size to support? → A: 100×50 (large tables, no practical limit)
