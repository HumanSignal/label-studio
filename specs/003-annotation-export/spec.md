# Feature Specification: PDF Annotation Export in Machine-Readable Formats

**Feature Branch**: `003-annotation-export`
**Created**: 2026-01-12
**Status**: Draft
**Input**: Export labels in machine-readable formats with W3C Web Annotation Data Model support, normalized intermediate representation per page, structural IDs for robust document references

## Clarifications

### Session 2026-01-12
- Q: How should export progress be reported for long-running multi-document exports? → A: Detailed logging only (written to log files, not exposed to caller)
- Q: What should happen when export fails mid-way through a multi-document batch? → A: Partial success (completed docs preserved, failed docs listed in error manifest)
- Q: Who should be authorized to trigger annotation exports for a project? → A: Only project owners/managers (existing Label Studio permission)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Export Annotations with Document Layout Context (Priority: P1)

As a data scientist training document extraction models, I need to export annotations with full document layout context (words, lines, blocks, tables) so that my models can learn from both the visual layout and text structure.

**Why this priority**: Core value proposition - without layout context, annotations are just bounding boxes that lose their semantic meaning when documents are re-rendered or re-OCR'd.

**Independent Test**: Can be fully tested by exporting a labeled PDF project and verifying the export contains layout/page_001.json files with word-level bounding boxes and a canonical text layer.

**Acceptance Scenarios**:

1. **Given** a project with labeled PDFs, **When** I export annotations, **Then** each page has a layout.json with word-level bboxes, line groupings, block groupings, and a canonical text string
2. **Given** a PDF with embedded text, **When** I export, **Then** the pdf_text layer is present with coverage metrics
3. **Given** a scanned PDF with OCR, **When** I export, **Then** the ocr layer is present with confidence scores
4. **Given** a hybrid PDF (partial text + scanned regions), **When** I export, **Then** both layers are present and evidence can reference either layer per-region

---

### User Story 2 - Stable Annotation References with Deterministic IDs (Priority: P1)

As a machine learning engineer, I need annotations to reference stable structural IDs (word_id, line_id, block_id, table_id, cell_id) that are deterministically generated from content, so that annotations remain valid even when document processing is updated.

**Why this priority**: Critical for reproducibility - line numbers and character offsets break when OCR or text extraction changes. Deterministic IDs enable cross-run matching.

**Independent Test**: Can be fully tested by exporting annotations, re-running extraction with the same parameters, and verifying that identical IDs are generated. Also test with different engines and verify quote-based re-anchoring works.

**Acceptance Scenarios**:

1. **Given** a text highlight annotation, **When** I export, **Then** the annotation includes word_ids, line_id, block_id, character offsets, AND a quoted text string
2. **Given** the same PDF exported twice with identical parameters, **When** I compare IDs, **Then** word_ids are identical (deterministic)
3. **Given** an annotation with multiple anchoring methods, **When** the document is re-processed with different engine, **Then** I can re-anchor using quote matching if IDs don't match
4. **Given** any exported layout, **When** I examine the manifest, **Then** I can see the id_algorithm_version used for ID generation

---

### User Story 3 - Export Document Manifest with Complete PDF Geometry (Priority: P1)

As a data governance manager, I need each exported document to include a manifest with processing pipeline versions AND complete PDF geometry (rotation, crop boxes, render scale) so that bounding boxes can be correctly interpreted.

**Why this priority**: Essential for coordinate accuracy - without PDF geometry, bbox overlays fail on rotated/cropped PDFs.

**Independent Test**: Can be fully tested by exporting a rotated PDF and verifying that rendered PNG coordinates match annotation bboxes exactly.

**Acceptance Scenarios**:

1. **Given** a PDF export, **When** I examine the manifest, **Then** it includes doc_id, pdf_path, sha256 hash, num_pages, render settings (dpi, coordinate system)
2. **Given** a PDF with rotation, **When** I export, **Then** each page includes pdf_page_width_pt, pdf_page_height_pt, rotation_deg, crop_box_pt, render_scale, rendered_width_px, rendered_height_px
3. **Given** a re-processed document, **When** I export again, **Then** a new layout_version_id is created and stored in both layout and annotations

---

### User Story 4 - Export Annotations as JSONL with Multi-Span Support (Priority: P2)

As a data pipeline engineer, I need annotations exported as JSONL (one record per annotation) with support for multi-line/discontinuous highlights, so that I can accurately represent real-world text selections.

**Why this priority**: Enables accurate representation of highlights that span lines, columns, or have hyphenation breaks.

**Independent Test**: Can be fully tested by exporting a multi-line highlight and verifying the JSONL contains a bboxes[] array with one box per line fragment.

**Acceptance Scenarios**:

1. **Given** a text field annotation spanning one line, **When** I export, **Then** the evidence includes bboxes[] array with single bbox
2. **Given** a text highlight spanning multiple lines, **When** I export, **Then** the evidence includes bboxes[] with one bbox per line fragment
3. **Given** a discontinuous highlight (e.g., hyphenated word across columns), **When** I export, **Then** bboxes[] contains non-contiguous regions
4. **Given** any annotation, **When** I export, **Then** it includes metadata (annotator_id, created_at, updated_at, confidence, status, source)

---

### User Story 5 - W3C Web Annotation Export (Priority: P2)

As an interoperability engineer, I need annotations exportable in W3C Web Annotation JSON-LD format so that I can integrate with standard annotation tools and archives.

**Why this priority**: Enables standards-based interoperability with external annotation ecosystems.

**Independent Test**: Can be fully tested by exporting annotations in W3C format and validating against the Web Annotation Data Model JSON-LD context.

**Acceptance Scenarios**:

1. **Given** an export request with format=w3c, **When** I export, **Then** output is valid JSON-LD conforming to Web Annotation Data Model
2. **Given** a text highlight, **When** exported as W3C, **Then** it includes TextQuoteSelector, TextPositionSelector, and FragmentSelector (for bbox)
3. **Given** the canonical JSONL format, **When** I need W3C format, **Then** a deterministic mapping spec is included in export bundle

---

### User Story 6 - Page Image Renders (Priority: P3)

As a quality reviewer, I need exported documents to include page image renders so that I can visually verify annotation positions without the original PDF.

**Why this priority**: Enables visual QA workflows and training data visualization.

**Independent Test**: Can be fully tested by exporting and verifying PNG images exist for each page at the specified DPI.

**Acceptance Scenarios**:

1. **Given** a PDF export request, **When** I export, **Then** PNG images are generated for each page in derived/{doc_id}/pages/page_NNN.png
2. **Given** a configurable DPI setting, **When** I export with dpi=200, **Then** images are rendered at 200 DPI
3. **Given** page images and bboxes, **When** I overlay bboxes on PNG, **Then** they align correctly (within 2px tolerance)

---

### User Story 7 - Table Structure Export with Headers and Confidence (Priority: P3)

As a table extraction developer, I need tables exported with full cell structure including header detection, merge spans, and structure confidence so that I can train robust table recognition models.

**Why this priority**: Tables require special handling beyond standard text regions.

**Independent Test**: Can be fully tested by exporting a labeled table and verifying header rows, merged cells, and confidence scores.

**Acceptance Scenarios**:

1. **Given** a labeled table region, **When** I export, **Then** the layout includes table_id, overall bbox, n_rows, n_cols, structure_confidence
2. **Given** a table with header row, **When** I export, **Then** cells include is_header flag
3. **Given** a table with merged cells, **When** I export, **Then** cells include rowspan, colspan, and merged_into_cell_id where applicable
4. **Given** uncertain table structure, **When** I export, **Then** structure_confidence < 0.5 and structure_reason explains uncertainty

---

### User Story 8 - Export Package with Schema and Index (Priority: P3)

As a data engineer, I need exports packaged with JSON schemas and an index file so that I can validate and navigate large export bundles programmatically.

**Why this priority**: Enables validation pipelines and efficient access to multi-document exports.

**Independent Test**: Can be fully tested by exporting and validating all files against included JSON schemas.

**Acceptance Scenarios**:

1. **Given** an export bundle, **When** I examine it, **Then** it includes schemas/annotation_record.schema.json and schemas/page_layout.schema.json
2. **Given** a multi-document export, **When** I examine it, **Then** export_index.json lists all docs, annotation counts, and paths
3. **Given** a large export, **When** annotations exceed threshold, **Then** they are sharded into annotations_part_NNNN.jsonl files

---

### Edge Cases

- What happens when a PDF page has no extractable text (pure image)? System uses OCR layer as canonical with coverage=1.0
- What happens when OCR confidence is very low? System still exports OCR layer but marks avg_conf metric for filtering
- What happens when an annotation spans multiple pages? Each page gets separate annotation records linked by a shared group_id
- What happens when table structure detection fails? Table region is exported with structure_confidence=0, structure_reason="detection_failed"
- What happens when word-level bboxes are unavailable? Falls back to line-level or block-level granularity with granularity_level flag
- What happens with rotated/cropped PDFs? Full PDF geometry is exported and all bboxes reference rendered PNG coordinates
- What happens with hybrid PDFs (mixed good text and scanned regions)? Evidence can reference different layers per-region; canonical is for offsets/search convenience only

## Requirements *(mandatory)*

### Functional Requirements

**Document Processing**

- **FR-001**: System MUST generate a manifest.json for each exported document containing doc_id, pdf_path, sha256, num_pages, render settings, pipeline versions, and export_schema_version
- **FR-002**: System MUST extract word-level bounding boxes from PDF text layer when available
- **FR-003**: System MUST generate OCR tokens with confidence scores when PDF text layer is unavailable or low quality
- **FR-004**: System MUST compute coverage and average confidence metrics for each text layer
- **FR-005**: System MUST select a canonical layer per page based on coverage threshold (pdf_text if coverage >= 0.7, else ocr); canonical is for offset indexing, not a truth constraint

**ID Generation (Determinism)**

- **FR-ID-001**: System MUST generate word_ids deterministically from: page_id + normalized_text + quantized_bbox (rounded to nearest 2px) + reading_order
- **FR-ID-002**: System MUST include id_algorithm_version in manifest to track ID generation method changes
- **FR-ID-003**: System MUST generate a layout_version_id (UUID) per extraction run and store it in both layout files and annotations
- **FR-ID-004**: System MUST document the ID algorithm in export bundle (schemas/id_algorithm.md) so consumers can reproduce or match IDs

**Coordinate System**

- **FR-COORD-001**: System MUST include per-page PDF geometry: pdf_page_width_pt, pdf_page_height_pt, rotation_deg, media_box_pt, crop_box_pt
- **FR-COORD-002**: System MUST include per-page render parameters: render_dpi, render_scale, rendered_width_px, rendered_height_px
- **FR-COORD-003**: All exported bboxes MUST be in rendered PNG pixel coordinates (origin top-left, integer values)
- **FR-COORD-004**: System MUST declare coordinate frame explicitly: "All bboxes are {x, y, width, height} in rendered PNG pixels, origin top-left"
- **FR-COORD-005**: System MUST specify bbox inclusivity rules: x,y is top-left corner inclusive; width,height extend right and down

**Canonical Text Construction**

- **FR-TEXT-001**: System MUST define canonical text construction rules in export bundle (schemas/canonical_text_rules.md)
- **FR-TEXT-002**: Canonical text MUST use Unicode NFC normalization
- **FR-TEXT-003**: Words MUST be joined by single space; line breaks MUST be represented as \n; block boundaries MUST be represented as \n\n
- **FR-TEXT-004**: Hyphenation at line breaks MUST be preserved with hyphen character; no automatic dehyphenation
- **FR-TEXT-005**: Character offsets (char_start, char_end) MUST be defined against the exact canonical text procedure

**Layout Model**

- **FR-006**: System MUST generate layout/page_NNN.json for each page containing layers, canonical selection, and structural elements
- **FR-007**: System MUST assign stable unique IDs to words (w_xxx), lines (l_xxx), blocks (b_xxx), tables (t_xxx), cells (t_xxx:rNNcNN)
- **FR-008**: System MUST build character offset index mapping word_ids to char_start/char_end positions in canonical text
- **FR-009**: System MUST group words into lines based on vertical proximity and reading order
- **FR-010**: System MUST group lines into blocks (paragraphs, headers, etc.) with block type classification
- **FR-011**: System MUST assign reading_order to blocks for document flow reconstruction

**Table Handling**

- **FR-012**: System MUST detect tables and assign table_id with overall bounding box
- **FR-013**: System MUST extract table structure (n_rows, n_cols) when detectable, with structure_confidence score
- **FR-014**: System MUST extract cell-level data including cell_id, row, col, bbox, text, source_layer, and is_header flag
- **FR-015**: System MUST handle merged cells by recording rowspan, colspan, and merged_into_cell_id
- **FR-016**: System MUST include structure_reason when structure_confidence < 0.5 (e.g., "irregular_grid", "nested_tables", "detection_failed")

**Annotation Export (Evidence)**

- **FR-EVID-001**: Evidence MUST support multiple bounding boxes via bboxes[] array (one per line fragment or discontinuous region)
- **FR-EVID-002**: Evidence MUST include word_ids[] array for text selections
- **FR-EVID-003**: Evidence MUST include quote (exact text), char_start, char_end relative to canonical text
- **FR-EVID-004**: Evidence MUST include layer_id to indicate source layer (pdf_text or ocr) per evidence block
- **FR-EVID-005**: Evidence MAY reference different layers for different annotations on same page (hybrid support)

**Annotation Export (Records)**

- **FR-017**: System MUST export annotations as JSONL with one JSON record per annotation
- **FR-018**: System MUST include ann_id, doc_id, page_id, type, layout_version_id for every annotation record
- **FR-019**: System MUST include evidence block with appropriate references (word_ids, line_id, block_id, table_id, cell_id, bboxes, quote, char_start/end)
- **FR-020**: System MUST support annotation types: field, region, table_region, table_cell_field
- **FR-021**: System MUST include value and value_format for field-type annotations

**Annotation Metadata (Provenance)**

- **FR-META-001**: System MUST include annotator_id and created_at timestamp for every annotation
- **FR-META-002**: System MUST include updated_at timestamp when annotation is modified
- **FR-META-003**: System MUST include source field indicating origin: "manual", "model_assisted", "imported"
- **FR-META-004**: System SHOULD include reviewer_id, reviewed_at, review_decision (approved/rejected/needs_changes) when review workflow is used
- **FR-META-005**: System SHOULD include parent_ann_id for correction/revision chains

**W3C Web Annotation Support**

- **FR-W3C-001**: System MUST support export in W3C Web Annotation JSON-LD format as alternate output mode
- **FR-W3C-002**: W3C export MUST include TextQuoteSelector (exact + prefix + suffix), TextPositionSelector (start, end), and FragmentSelector (xywh for bbox)
- **FR-W3C-003**: System MUST include mapping specification (schemas/w3c_mapping.md) documenting JSONL-to-W3C field correspondence
- **FR-W3C-004**: W3C export MUST validate against Web Annotation Data Model JSON-LD context

**Page Rendering**

- **FR-022**: System MUST render page images as PNG at configurable DPI (default: 200)
- **FR-023**: System MUST store page images in derived/{doc_id}/pages/page_NNN.png path structure
- **FR-024**: System MUST record coordinate system in manifest (pixel_top_left_xywh)

**Schema and Packaging**

- **FR-SCHEMA-001**: Export bundle MUST include JSON Schema files: schemas/manifest.schema.json, schemas/page_layout.schema.json, schemas/annotation_record.schema.json
- **FR-SCHEMA-002**: All exported JSON files MUST validate against their corresponding schemas
- **FR-SCHEMA-003**: Export MUST include export_schema_version at top level (manifest) using semver format
- **FR-INDEX-001**: Multi-document exports MUST include export_index.json with list of all docs, annotation counts, and relative paths
- **FR-INDEX-002**: Large exports (>100k annotations) MUST shard annotations into annotations_part_NNNN.jsonl files
- **FR-INDEX-003**: Export bundle MUST use deterministic file ordering for reproducibility

**Versioning**

- **FR-025**: System MUST track extraction pipeline versions in manifest (pdf_text engine, ocr engine, layout engine)
- **FR-026**: System MUST generate new layout_version_id when reprocessing with different pipeline versions
- **FR-027**: System MUST preserve word_ids across re-exports when content and geometry are unchanged (deterministic IDs)

**Observability**

- **FR-OBS-001**: System MUST write export progress to log files (document started, document completed, errors)
- **FR-OBS-002**: System MUST NOT expose progress events to caller API (logging only, no callbacks/events)

**Reliability**

- **FR-REL-001**: System MUST support partial success for multi-document exports (completed documents preserved when later documents fail)
- **FR-REL-002**: System MUST generate an error manifest (export_errors.json) listing failed documents with doc_id, error_type, and error_message
- **FR-REL-003**: System MUST update export_index.json to reflect actual completed documents (not planned documents)

**Security**

- **FR-SEC-001**: System MUST restrict export access to project owners and managers (existing Label Studio permission model)
- **FR-SEC-002**: System MUST NOT introduce new export-specific permissions; reuse existing project-level authorization

### Key Entities

- **Document Manifest**: Represents exported document metadata including doc_id, source path, content hash, page count, render settings, pipeline versions, export_schema_version, and id_algorithm_version
- **Page Geometry**: Per-page PDF source dimensions (points), rotation, crop/media boxes, and rendered dimensions (pixels) with scale factor
- **Page Layout**: Represents single page structure with multiple text layers (pdf_text, ocr), canonical layer selection, word/line/block hierarchy, tables, and figures
- **Text Layer**: Collection of words with bounding boxes, optionally with confidence scores; has coverage and quality metrics
- **Canonical Index**: Character offset mapping linking structural IDs (word_id, line_id, block_id) to positions in canonical text string, with explicit construction rules
- **Table Structure**: Detected table with cell grid, including cell IDs, positions, content, merge information, header flags, and structure confidence
- **Annotation Record**: Single labeled fact/region/cell with unique ID, document reference, type, value, evidence block (with multi-bbox support), and provenance metadata
- **Export Index**: Top-level manifest for multi-document exports listing all documents, counts, and paths
- **Export Errors**: Error manifest listing failed documents with doc_id, error_type, and error_message for partial success scenarios

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Exported annotations can be re-anchored to re-processed documents with 95%+ accuracy using deterministic word_ids or quote matching
- **SC-002**: Layout export includes word-level granularity for 90%+ of text content in digital PDFs
- **SC-003**: Annotation JSONL files stream-process at 10,000+ records per second
- **SC-004**: Page image coordinates match annotation bboxes within 2 pixel tolerance on all PDFs including rotated/cropped
- **SC-005**: Export completes within 5 seconds per page for documents under 100 pages
- **SC-006**: Manifest includes complete pipeline version and PDF geometry information for 100% of exports
- **SC-007**: Table cell annotations correctly reference table structure with 100% ID consistency
- **SC-008**: Same PDF exported twice with identical parameters produces byte-identical layout files (determinism)
- **SC-009**: W3C Web Annotation exports validate against official JSON-LD context with 100% pass rate
- **SC-010**: All exported files validate against included JSON schemas with 100% pass rate

## Assumptions

- PDF.js or pdfplumber will be used for PDF text extraction (standard tools)
- Tesseract or similar OCR engine is available for scanned documents
- Documents are primarily single-column or simple multi-column layouts (complex magazine layouts may have reduced accuracy)
- Export storage is local filesystem or S3-compatible object storage
- Coordinate system uses top-left origin with x,y,width,height format (consistent with PDF.js)
- Coverage threshold of 0.7 (70%) for canonical layer selection is appropriate (can be made configurable)
- Bounding box quantization to 2px is sufficient for deterministic ID generation while handling minor extraction variations
- Unicode NFC normalization is appropriate for canonical text (covers most languages)

## Out of Scope

- Real-time streaming export during annotation (batch export only)
- Export to proprietary formats (COCO, Pascal VOC) - focus is on the canonical format and W3C
- Document comparison or diff between export versions
- Automatic re-anchoring service (export includes data for re-anchoring, but the matching logic is external)
- PDF modification or annotation embedding back into source PDF
- Complex table structures: nested tables, tables spanning multiple pages (flagged with low confidence)
- Automatic dehyphenation or text reflow reconstruction
