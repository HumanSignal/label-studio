# Tasks: PDF Annotation Export

**Input**: Design documents from `/specs/003-annotation-export/`
**Prerequisites**: plan.md, spec.md, data-model.md, contracts/pdf-export-api.yaml, research.md

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

Based on plan.md project structure:
- **Backend**: `label_studio/data_export/pdf_export/`
- **Tests**: `label_studio/tests/data_export/`
- **Schemas**: `label_studio/data_export/pdf_export/schemas/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and module structure

- [ ] T001 Create pdf_export module directory structure in label_studio/data_export/pdf_export/
- [ ] T002 Create __init__.py with module exports in label_studio/data_export/pdf_export/__init__.py
- [ ] T003 [P] Add pdfplumber dependency to requirements.txt
- [ ] T004 [P] Add pdf2image dependency to requirements.txt
- [ ] T005 [P] Add jsonschema dependency to requirements.txt
- [ ] T006 Create schemas/ directory in label_studio/data_export/pdf_export/schemas/

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**CRITICAL**: No user story work can begin until this phase is complete

- [ ] T007 Create base ExportOptions dataclass in label_studio/data_export/pdf_export/models.py
- [ ] T008 Create BBoxXYWH dataclass in label_studio/data_export/pdf_export/models.py
- [ ] T009 [P] Create coordinate conversion utilities (PDF points to PNG pixels) in label_studio/data_export/pdf_export/coordinates.py
- [ ] T010 [P] Create Unicode NFC text normalization utility in label_studio/data_export/pdf_export/text_utils.py
- [ ] T011 Register PDF_ML export format in Label Studio's export formats in label_studio/data_export/api.py
- [ ] T012 Create PdfExportParamSerializer extending ExportParamSerializer in label_studio/data_export/serializers.py
- [ ] T013 Create export job model for async processing in label_studio/data_export/pdf_export/models.py
- [ ] T014 Setup logging configuration for pdf_export module in label_studio/data_export/pdf_export/logging_config.py

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Export with Document Layout Context (Priority: P1) MVP

**Goal**: Export annotations with full document layout context (words, lines, blocks, tables)

**Independent Test**: Export a labeled PDF project and verify layout/page_001.json files contain word-level bboxes, line groupings, block groupings, and canonical text string

### Implementation for User Story 1

- [ ] T015 [P] [US1] Create TextLayer dataclass with tokens, coverage, avg_confidence in label_studio/data_export/pdf_export/models.py
- [ ] T016 [P] [US1] Create Word dataclass with word_id, text, bbox, line_id, block_id in label_studio/data_export/pdf_export/models.py
- [ ] T017 [P] [US1] Create Line dataclass with line_id, bbox, word_ids, text in label_studio/data_export/pdf_export/models.py
- [ ] T018 [P] [US1] Create Block dataclass with block_id, bbox, line_ids, block_type in label_studio/data_export/pdf_export/models.py
- [ ] T019 [US1] Implement PDF text extraction using pdfplumber in label_studio/data_export/pdf_export/layout_extractor.py
- [ ] T020 [US1] Implement word grouping into lines (vertical proximity + reading order) in label_studio/data_export/pdf_export/layout_extractor.py
- [ ] T021 [US1] Implement line grouping into blocks with block_type classification in label_studio/data_export/pdf_export/layout_extractor.py
- [ ] T022 [US1] Implement coverage calculation for text layers in label_studio/data_export/pdf_export/layout_extractor.py
- [ ] T023 [US1] Implement canonical layer selection (pdf_text if coverage >= 0.7, else ocr) in label_studio/data_export/pdf_export/layout_extractor.py
- [ ] T024 [US1] Create PageLayout model combining layers and structural elements in label_studio/data_export/pdf_export/models.py
- [ ] T025 [US1] Implement page layout JSON serialization (layout/page_NNN.json) in label_studio/data_export/pdf_export/serializers.py
- [ ] T026 [US1] Implement main export orchestration (single document) in label_studio/data_export/pdf_export/exporter.py
- [ ] T027 [US1] Add OCR fallback integration with existing label_studio/ocr/ module in label_studio/data_export/pdf_export/layout_extractor.py

**Checkpoint**: User Story 1 complete - can export PDFs with full layout context

---

## Phase 4: User Story 2 - Deterministic IDs (Priority: P1)

**Goal**: Stable structural IDs (word_id, line_id, block_id) deterministically generated from content

**Independent Test**: Export same PDF twice with identical parameters, verify word_ids are byte-identical

### Implementation for User Story 2

- [ ] T028 [P] [US2] Implement generate_word_id() with SHA-256 hash in label_studio/data_export/pdf_export/id_generator.py
- [ ] T029 [P] [US2] Implement generate_line_id() derived from word_ids in label_studio/data_export/pdf_export/id_generator.py
- [ ] T030 [P] [US2] Implement generate_block_id() derived from line_ids in label_studio/data_export/pdf_export/id_generator.py
- [ ] T031 [US2] Implement bbox quantization (round to 2px grid) in label_studio/data_export/pdf_export/id_generator.py
- [ ] T032 [US2] Integrate ID generation into layout_extractor word/line/block creation in label_studio/data_export/pdf_export/layout_extractor.py
- [ ] T033 [US2] Add id_algorithm_version constant and include in manifest in label_studio/data_export/pdf_export/id_generator.py
- [ ] T034 [US2] Create id_algorithm.md documentation file in label_studio/data_export/pdf_export/schemas/id_algorithm.md

**Checkpoint**: User Story 2 complete - IDs are deterministic and reproducible

---

## Phase 5: User Story 3 - Document Manifest with PDF Geometry (Priority: P1)

**Goal**: Document manifest with pipeline versions and complete PDF geometry (rotation, crop boxes, render scale)

**Independent Test**: Export a rotated PDF and verify rendered PNG coordinates match annotation bboxes exactly

### Implementation for User Story 3

- [ ] T035 [P] [US3] Create PageGeometry dataclass with pdf dimensions, rotation, media_box, crop_box in label_studio/data_export/pdf_export/models.py
- [ ] T036 [P] [US3] Create DocumentManifest dataclass with doc_id, sha256, pipeline versions in label_studio/data_export/pdf_export/models.py
- [ ] T037 [US3] Implement PDF geometry extraction from pdfplumber page in label_studio/data_export/pdf_export/layout_extractor.py
- [ ] T038 [US3] Implement layout_version_id UUID generation per extraction run in label_studio/data_export/pdf_export/exporter.py
- [ ] T039 [US3] Implement manifest.json serialization with all required fields in label_studio/data_export/pdf_export/serializers.py
- [ ] T040 [US3] Extract pipeline versions (pdfplumber version, tesseract if used) in label_studio/data_export/pdf_export/exporter.py
- [ ] T041 [US3] Add render_scale calculation (dpi / 72) and rendered dimensions in label_studio/data_export/pdf_export/layout_extractor.py

**Checkpoint**: User Story 3 complete - manifests include full PDF geometry

---

## Phase 6: User Story 4 - JSONL with Multi-Span Support (Priority: P2)

**Goal**: Export annotations as JSONL with bboxes[] array supporting multi-line/discontinuous highlights

**Independent Test**: Export a multi-line highlight and verify JSONL contains bboxes[] array with one box per line fragment

### Implementation for User Story 4

- [ ] T042 [P] [US4] Create AnnotationEvidence dataclass with bboxes[], word_ids[], quote, char_start/end in label_studio/data_export/pdf_export/models.py
- [ ] T043 [P] [US4] Create AnnotationMetadata dataclass with annotator_id, timestamps, source in label_studio/data_export/pdf_export/models.py
- [ ] T044 [P] [US4] Create AnnotationRecord dataclass combining evidence and metadata in label_studio/data_export/pdf_export/models.py
- [ ] T045 [US4] Implement canonical text construction (space-joined words, \n lines, \n\n blocks) in label_studio/data_export/pdf_export/canonical_text.py
- [ ] T046 [US4] Build canonical index mapping word_ids to char_start/char_end in label_studio/data_export/pdf_export/canonical_text.py
- [ ] T047 [US4] Implement multi-bbox calculation for multi-line text selections in label_studio/data_export/pdf_export/annotation_builder.py
- [ ] T048 [US4] Implement Label Studio annotation to AnnotationRecord conversion in label_studio/data_export/pdf_export/annotation_builder.py
- [ ] T049 [US4] Implement JSONL streaming writer for annotations.jsonl in label_studio/data_export/pdf_export/exporter.py
- [ ] T050 [US4] Add layer_id to evidence (pdf_text or ocr source) in label_studio/data_export/pdf_export/annotation_builder.py
- [ ] T051 [US4] Create canonical_text_rules.md documentation in label_studio/data_export/pdf_export/schemas/canonical_text_rules.md

**Checkpoint**: User Story 4 complete - annotations export as JSONL with multi-span support

---

## Phase 7: User Story 5 - W3C Web Annotation Export (Priority: P2)

**Goal**: Export annotations in W3C Web Annotation JSON-LD format

**Independent Test**: Export in W3C format and validate against Web Annotation Data Model JSON-LD context

### Implementation for User Story 5

- [ ] T052 [P] [US5] Create TextQuoteSelector dataclass with exact, prefix, suffix in label_studio/data_export/pdf_export/w3c_converter.py
- [ ] T053 [P] [US5] Create TextPositionSelector dataclass with start, end in label_studio/data_export/pdf_export/w3c_converter.py
- [ ] T054 [P] [US5] Create FragmentSelector dataclass for xywh bbox in label_studio/data_export/pdf_export/w3c_converter.py
- [ ] T055 [US5] Implement W3CAnnotation model with JSON-LD context in label_studio/data_export/pdf_export/w3c_converter.py
- [ ] T056 [US5] Implement JSONL to W3C annotation conversion in label_studio/data_export/pdf_export/w3c_converter.py
- [ ] T057 [US5] Extract prefix/suffix context (20-50 chars) for TextQuoteSelector in label_studio/data_export/pdf_export/w3c_converter.py
- [ ] T058 [US5] Add include_w3c option to export and generate w3c_annotations.jsonld in label_studio/data_export/pdf_export/exporter.py
- [ ] T059 [US5] Create w3c_mapping.md documentation in label_studio/data_export/pdf_export/schemas/w3c_mapping.md

**Checkpoint**: User Story 5 complete - W3C Web Annotation export available

---

## Phase 8: User Story 6 - Page Image Renders (Priority: P3)

**Goal**: Export page images as PNG at configurable DPI

**Independent Test**: Export and verify PNG images exist for each page at specified DPI with correct dimensions

### Implementation for User Story 6

- [ ] T060 [P] [US6] Implement page rendering using pdf2image in label_studio/data_export/pdf_export/page_renderer.py
- [ ] T061 [US6] Add DPI configuration to export options (default 200) in label_studio/data_export/pdf_export/models.py
- [ ] T062 [US6] Implement PNG file saving to pages/page_NNN.png path in label_studio/data_export/pdf_export/page_renderer.py
- [ ] T063 [US6] Add rendered dimensions (rendered_width_px, rendered_height_px) to page layout in label_studio/data_export/pdf_export/page_renderer.py
- [ ] T064 [US6] Integrate page rendering into main export flow in label_studio/data_export/pdf_export/exporter.py
- [ ] T065 [US6] Add include_page_images option (default true) in label_studio/data_export/pdf_export/exporter.py

**Checkpoint**: User Story 6 complete - page images rendered and included in export

---

## Phase 9: User Story 7 - Table Structure Export (Priority: P3)

**Goal**: Export tables with cell structure, header detection, merge spans, and confidence

**Independent Test**: Export a labeled table and verify header rows, merged cells, and confidence scores

### Implementation for User Story 7

- [ ] T066 [P] [US7] Create Table dataclass with table_id, bbox, n_rows, n_cols, structure_confidence in label_studio/data_export/pdf_export/models.py
- [ ] T067 [P] [US7] Create Cell dataclass with cell_id, row, col, rowspan, colspan, is_header in label_studio/data_export/pdf_export/models.py
- [ ] T068 [US7] Implement table detection using pdfplumber find_tables() in label_studio/data_export/pdf_export/table_handler.py
- [ ] T069 [US7] Implement cell extraction with text and bbox in label_studio/data_export/pdf_export/table_handler.py
- [ ] T070 [US7] Implement header row detection heuristic in label_studio/data_export/pdf_export/table_handler.py
- [ ] T071 [US7] Implement merged cell detection (rowspan, colspan) in label_studio/data_export/pdf_export/table_handler.py
- [ ] T072 [US7] Implement structure_confidence calculation in label_studio/data_export/pdf_export/table_handler.py
- [ ] T073 [US7] Add structure_reason when confidence < 0.5 in label_studio/data_export/pdf_export/table_handler.py
- [ ] T074 [US7] Integrate table handler into layout extraction in label_studio/data_export/pdf_export/layout_extractor.py

**Checkpoint**: User Story 7 complete - tables exported with full structure

---

## Phase 10: User Story 8 - Export Package with Schema and Index (Priority: P3)

**Goal**: Package exports with JSON schemas and index file for validation and navigation

**Independent Test**: Export and validate all files against included JSON schemas

### Implementation for User Story 8

- [ ] T075 [P] [US8] Create manifest.schema.json in label_studio/data_export/pdf_export/schemas/manifest.schema.json
- [ ] T076 [P] [US8] Create page_layout.schema.json in label_studio/data_export/pdf_export/schemas/page_layout.schema.json
- [ ] T077 [P] [US8] Create annotation_record.schema.json in label_studio/data_export/pdf_export/schemas/annotation_record.schema.json
- [ ] T078 [US8] Implement export_index.json generation with doc list and counts in label_studio/data_export/pdf_export/exporter.py
- [ ] T079 [US8] Implement annotation sharding (>100k → annotations_part_NNNN.jsonl) in label_studio/data_export/pdf_export/exporter.py
- [ ] T080 [US8] Implement schema validation for all exported JSON files in label_studio/data_export/pdf_export/validator.py
- [ ] T081 [US8] Add export_schema_version (semver) to manifest in label_studio/data_export/pdf_export/exporter.py
- [ ] T082 [US8] Copy schema files to export bundle schemas/ directory in label_studio/data_export/pdf_export/exporter.py
- [ ] T083 [US8] Implement deterministic file ordering for reproducibility in label_studio/data_export/pdf_export/exporter.py

**Checkpoint**: User Story 8 complete - exports packaged with schemas and index

---

## Phase 11: API Endpoints & Integration

**Purpose**: REST API endpoints and Label Studio integration

- [ ] T084 Create PdfExportJob Django model for job tracking in label_studio/data_export/pdf_export/django_models.py
- [ ] T085 Create POST /projects/{id}/exports/pdf-ml endpoint in label_studio/data_export/api.py
- [ ] T086 Create GET /projects/{id}/exports/pdf-ml/{export_id} status endpoint in label_studio/data_export/api.py
- [ ] T087 Create DELETE /projects/{id}/exports/pdf-ml/{export_id} endpoint in label_studio/data_export/api.py
- [ ] T088 Create GET /exports/pdf-ml/{export_id}/download endpoint in label_studio/data_export/api.py
- [ ] T089 Create GET /exports/pdf-ml/{export_id}/manifest endpoint in label_studio/data_export/api.py
- [ ] T090 Implement async export job using django-rq in label_studio/data_export/pdf_export/tasks.py
- [ ] T091 Add project owner/manager permission check using existing Label Studio permissions in label_studio/data_export/api.py
- [ ] T092 Implement ZIP archive generation for download in label_studio/data_export/pdf_export/exporter.py

---

## Phase 12: Error Handling & Reliability

**Purpose**: Partial success, error manifests, and logging

- [ ] T093 Implement partial success handling (preserve completed docs on failure) in label_studio/data_export/pdf_export/exporter.py
- [ ] T094 Create ExportError model and export_errors.json generation in label_studio/data_export/pdf_export/models.py
- [ ] T095 Implement detailed logging (doc started, completed, errors) in label_studio/data_export/pdf_export/exporter.py
- [ ] T096 Update export_index.json to reflect actual completed docs in label_studio/data_export/pdf_export/exporter.py
- [ ] T097 Add error recovery for corrupted PDFs (skip and log) in label_studio/data_export/pdf_export/exporter.py

---

## Phase 13: Polish & Cross-Cutting Concerns

**Purpose**: Improvements affecting multiple user stories

- [ ] T098 [P] Add unit tests for id_generator in label_studio/tests/data_export/test_id_generator.py
- [ ] T099 [P] Add unit tests for layout_extractor in label_studio/tests/data_export/test_layout_extractor.py
- [ ] T100 [P] Add unit tests for canonical_text in label_studio/tests/data_export/test_canonical_text.py
- [ ] T101 [P] Add unit tests for w3c_converter in label_studio/tests/data_export/test_w3c_converter.py
- [ ] T102 Add integration test for full export flow in label_studio/tests/integration/test_pdf_export_e2e.py
- [ ] T103 Add test for determinism (same PDF exports to identical files) in label_studio/tests/data_export/test_determinism.py
- [ ] T104 Performance optimization for large documents (streaming, batching) in label_studio/data_export/pdf_export/exporter.py
- [ ] T105 Run quickstart.md validation scenarios
- [ ] T106 Security review: validate file paths against document roots

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-10)**: All depend on Foundational phase completion
  - US1, US2, US3 (P1): Core features, implement first
  - US4, US5 (P2): Depend on US1 layout extraction
  - US6, US7, US8 (P3): Can run in parallel after P2
- **API & Integration (Phase 11)**: Depends on core user stories (US1-US4)
- **Error Handling (Phase 12)**: Depends on Phase 11
- **Polish (Phase 13)**: Depends on all desired user stories being complete

### User Story Dependencies

- **US1 (Layout)**: Can start after Foundational - No dependencies on other stories
- **US2 (IDs)**: Can start after Foundational - Integrates with US1 layout extractor
- **US3 (Manifest)**: Can start after Foundational - Integrates with US1
- **US4 (JSONL)**: Depends on US1 (uses layout) + US2 (uses IDs)
- **US5 (W3C)**: Depends on US4 (converts JSONL to W3C)
- **US6 (Images)**: Depends on US1 (coordinates from layout)
- **US7 (Tables)**: Depends on US1 (layout infrastructure)
- **US8 (Schemas)**: Depends on US1-US4 (schemas for those formats)

### Within Each User Story

- Models/dataclasses before services
- Services before serializers
- Core implementation before integration
- Story complete before moving to next priority

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- All Foundational tasks marked [P] can run in parallel
- Within US1: T015-T018 (models) can run in parallel
- Within US2: T028-T030 (ID generators) can run in parallel
- Within US4: T042-T044 (models) can run in parallel
- Within US5: T052-T054 (selectors) can run in parallel
- Within US7: T066-T067 (models) can run in parallel
- Within US8: T075-T077 (schemas) can run in parallel
- Phase 13 tests: T098-T101 can run in parallel

---

## Parallel Example: User Story 1

```bash
# Launch all models for User Story 1 together:
Task: "T015 Create TextLayer dataclass in label_studio/data_export/pdf_export/models.py"
Task: "T016 Create Word dataclass in label_studio/data_export/pdf_export/models.py"
Task: "T017 Create Line dataclass in label_studio/data_export/pdf_export/models.py"
Task: "T018 Create Block dataclass in label_studio/data_export/pdf_export/models.py"
```

---

## Implementation Strategy

### MVP First (User Stories 1-3 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: US1 - Layout Context
4. Complete Phase 4: US2 - Deterministic IDs
5. Complete Phase 5: US3 - Manifests
6. **STOP and VALIDATE**: Test exports work with layout files
7. Deploy/demo if ready

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. Add US1 + US2 + US3 → Test layout exports → MVP!
3. Add US4 → Test JSONL output → Can use for ML training
4. Add US5 → Test W3C format → Interoperability ready
5. Add US6 → Test PNG images → Visual QA ready
6. Add US7 → Test tables → Table extraction ready
7. Add US8 → Test schemas → Validation pipelines ready
   8. Add API + Error handling → Production ready

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Total: 106 tasks across 13 phases
