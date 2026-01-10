# Tasks: PDF OCR Labeling with Table Structure Annotation

**Input**: Design documents from `/specs/001-pdf-ocr-tables/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/
**Branch**: `001-pdf-ocr-tables`

**Tests**: Tests are included as constitution mandates test-first development (Principle II).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Backend**: `label_studio/` (Django)
- **Frontend**: `web/libs/editor/src/` (React + MobX-State-Tree)
- **Backend Tests**: `label_studio/tests/`
- **Frontend Tests**: `web/libs/editor/tests/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization, dependencies, and directory structure

- [ ] T001 Create feature branch `001-pdf-ocr-tables` from `custom/develop`
- [ ] T002 [P] Add pdfjs-dist dependency to web/libs/editor/package.json
- [ ] T003 [P] Create backend Django app structure in label_studio/ocr/__init__.py
- [ ] T004 [P] Create frontend directory structure for PdfOcr tag in web/libs/editor/src/tags/object/PdfOcr/
- [ ] T005 [P] Create frontend directory structure for OcrTokenLabels in web/libs/editor/src/tags/control/OcrTokenLabels/
- [ ] T006 [P] Create frontend directory structure for PdfViewer component in web/libs/editor/src/components/PdfViewer/
- [ ] T007 [P] Create frontend directory structure for TableEditor component in web/libs/editor/src/components/TableEditor/
- [ ] T008 [P] Create backend test directory structure in label_studio/tests/ocr/
- [ ] T009 Register OCR Django app in label_studio/core/settings/base.py INSTALLED_APPS
- [ ] T010 Configure PDF.js worker in web/libs/editor/webpack configuration

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**CRITICAL**: No user story work can begin until this phase is complete

### Backend Foundation

- [ ] T011 Implement OCR data fetch utility in label_studio/ocr/utils.py (fetch OCR JSON from storage)
- [ ] T012 [P] Implement reading order sorting algorithm in label_studio/ocr/utils.py (FR-007)
- [ ] T013 [P] Implement token bbox intersection utility in label_studio/ocr/utils.py
- [ ] T014 Create OCR API URL routing in label_studio/ocr/urls.py
- [ ] T015 Register OCR URLs in label_studio/core/urls.py

### Frontend Foundation

- [ ] T016 [P] Create OcrStore MobX-State-Tree store in web/libs/editor/src/stores/OcrStore.js
- [ ] T017 [P] Implement PDF.js loader utility in web/libs/editor/src/utils/pdfLoader.js
- [ ] T018 Create base PdfOcrModel MST model skeleton in web/libs/editor/src/tags/object/PdfOcr/PdfOcrModel.js
- [ ] T019 Register pdfocr tag in web/libs/editor/src/tags/object/index.js

### Test Infrastructure

- [ ] T020 [P] Create backend test fixtures in label_studio/tests/ocr/conftest.py (sample OCR JSON, mock tasks)
- [ ] T021 [P] Create frontend test utilities in web/libs/editor/tests/helpers/pdfTestUtils.js

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - View and Navigate PDF Documents (Priority: P1)

**Goal**: Display PDF documents natively with page navigation, zoom, and rotation controls

**Independent Test**: Load a PDF task and navigate through pages, zoom in/out, and rotate

**Requirements**: FR-001, FR-002, FR-003, FR-004

### Tests for User Story 1

- [ ] T022 [P] [US1] E2E test for PDF rendering in web/libs/editor/tests/e2e/tests/pdf-viewer.test.js
- [ ] T023 [P] [US1] Unit test for page navigation in web/libs/editor/tests/unit/PdfViewer.test.js
- [ ] T024 [P] [US1] Unit test for zoom controls in web/libs/editor/tests/unit/ZoomControls.test.js

### Implementation for User Story 1

- [ ] T025 [P] [US1] Implement PdfViewer component with PDF.js canvas rendering in web/libs/editor/src/components/PdfViewer/PdfViewer.jsx
- [ ] T026 [P] [US1] Implement PageNavigation component (next/prev/goto) in web/libs/editor/src/components/PdfViewer/PageNavigation.jsx
- [ ] T027 [P] [US1] Implement ZoomControls component (in/out/fit) in web/libs/editor/src/components/PdfViewer/ZoomControls.jsx
- [ ] T028 [P] [US1] Implement RotationControls component (90-degree increments) in web/libs/editor/src/components/PdfViewer/RotationControls.jsx
- [ ] T029 [US1] Complete PdfOcrModel with page state management in web/libs/editor/src/tags/object/PdfOcr/PdfOcrModel.js
- [ ] T030 [US1] Create HtxPdfOcr React component integrating PdfViewer in web/libs/editor/src/tags/object/PdfOcr/PdfOcr.jsx
- [ ] T031 [US1] Add PdfOcr tag index export in web/libs/editor/src/tags/object/PdfOcr/index.js
- [ ] T032 [US1] Handle 100-page PDF performance (lazy loading, canvas pooling) in web/libs/editor/src/components/PdfViewer/PdfViewer.jsx
- [ ] T033 [US1] Add PdfOcr styles in web/libs/editor/src/tags/object/PdfOcr/PdfOcr.module.scss

**Checkpoint**: User Story 1 complete - PDF viewing is fully functional and testable independently

---

## Phase 4: User Story 2 - Label Document Regions with OCR Text Capture (Priority: P2)

**Goal**: Draw bounding boxes, assign labels, auto-extract OCR text, and edit corrections

**Independent Test**: Draw a region on PDF, verify label assignment, text extraction, and editing

**Requirements**: FR-005, FR-006, FR-007, FR-008, FR-009, FR-010, FR-011, FR-012, FR-028

### Tests for User Story 2

- [ ] T034 [P] [US2] Backend API test for OCR token fetch in label_studio/tests/ocr/test_api.py
- [ ] T035 [P] [US2] E2E test for region labeling workflow in web/libs/editor/tests/e2e/tests/pdf-region-labeling.test.js
- [ ] T036 [P] [US2] Unit test for token intersection in web/libs/editor/tests/unit/tokenIntersection.test.js

### Backend Implementation for User Story 2

- [ ] T037 [P] [US2] Implement OcrPageSerializer in label_studio/ocr/serializers.py
- [ ] T038 [P] [US2] Implement OcrTokenSerializer in label_studio/ocr/serializers.py
- [ ] T039 [US2] Implement GET /api/ocr/tasks/{task_id}/pages endpoint in label_studio/ocr/api.py
- [ ] T040 [US2] Implement GET /api/ocr/tasks/{task_id}/pages/{page_index}/tokens endpoint in label_studio/ocr/api.py
- [ ] T041 [US2] Implement GET /api/ocr/tasks/{task_id}/pages/{page_index}/tokens/region endpoint in label_studio/ocr/api.py
- [ ] T042 [US2] Add project permission checks to OCR API endpoints in label_studio/ocr/api.py (FR-027)

### Frontend Implementation for User Story 2

- [ ] T043 [P] [US2] Implement OcrTokenLayer overlay component in web/libs/editor/src/tags/object/PdfOcr/OcrTokenLayer.jsx
- [ ] T044 [P] [US2] Create PdfRegionModel MST model in web/libs/editor/src/regions/PdfRegion.jsx
- [ ] T045 [P] [US2] Register pdfregion result type in web/libs/editor/src/regions/Result.js
- [ ] T046 [US2] Implement OcrTokenLabels control tag model in web/libs/editor/src/tags/control/OcrTokenLabels/OcrTokenLabelsModel.js
- [ ] T047 [US2] Implement OcrTokenLabels React component in web/libs/editor/src/tags/control/OcrTokenLabels/OcrTokenLabels.jsx
- [ ] T048 [US2] Register ocrtokenlabels tag in web/libs/editor/src/tags/control/index.js
- [ ] T049 [US2] Add region drawing tool integration to PdfOcrModel in web/libs/editor/src/tags/object/PdfOcr/PdfOcrModel.js
- [ ] T050 [US2] Implement text extraction from OCR tokens on region creation in web/libs/editor/src/regions/PdfRegion.jsx
- [ ] T051 [US2] Implement TextCorrection side panel component in web/libs/editor/src/components/TextCorrection/TextCorrection.jsx
- [ ] T052 [US2] Implement "Recompute text" action on region resize in web/libs/editor/src/regions/PdfRegion.jsx
- [ ] T053 [US2] Add OCR unavailable warning UI in web/libs/editor/src/tags/object/PdfOcr/PdfOcr.jsx (FR-028)
- [ ] T054 [US2] Implement token hover highlighting in web/libs/editor/src/tags/object/PdfOcr/OcrTokenLayer.jsx (FR-006)

**Checkpoint**: User Story 2 complete - Region labeling with OCR text capture is independently testable

---

## Phase 5: User Story 3 - Define Table Structure Using Gridlines (Priority: P3)

**Goal**: Create TABLE regions with draggable row/column separator lines

**Independent Test**: Draw table region, manipulate gridlines (drag/add/delete), verify cell recalculation

**Requirements**: FR-013, FR-014, FR-015, FR-016, FR-017, FR-018, FR-032

### Tests for User Story 3

- [ ] T055 [P] [US3] E2E test for table gridline manipulation in web/libs/editor/tests/e2e/tests/pdf-table-gridlines.test.js
- [ ] T056 [P] [US3] Unit test for gridline drag in web/libs/editor/tests/unit/GridlineHandle.test.js
- [ ] T057 [P] [US3] Unit test for cell computation from gridlines in web/libs/editor/tests/unit/cellComputation.test.js

### Backend Implementation for User Story 3

- [ ] T058 [P] [US3] Implement token clustering algorithm for gridline suggestions in label_studio/ocr/utils.py (FR-018)

### Frontend Implementation for User Story 3

- [ ] T059 [P] [US3] Create TableRegionModel extending PdfRegionModel in web/libs/editor/src/regions/TableRegion/TableRegionModel.js
- [ ] T060 [P] [US3] Create TableCellModel MST model in web/libs/editor/src/regions/TableRegion/TableCellModel.js
- [ ] T061 [P] [US3] Register pdftable result type in web/libs/editor/src/regions/Result.js
- [ ] T062 [US3] Implement TableRegion React component in web/libs/editor/src/regions/TableRegion/TableRegion.jsx
- [ ] T063 [US3] Implement GridlineHandle draggable component in web/libs/editor/src/regions/TableRegion/GridlineHandle.jsx
- [ ] T064 [US3] Implement cell computation from row_lines/col_lines in web/libs/editor/src/regions/TableRegion/TableRegionModel.js
- [ ] T065 [US3] Implement add separator action (click to split) in web/libs/editor/src/regions/TableRegion/TableRegion.jsx (FR-016)
- [ ] T066 [US3] Implement delete separator action (context menu/key) in web/libs/editor/src/regions/TableRegion/TableRegion.jsx (FR-017)
- [ ] T067 [US3] Implement auto-suggest gridlines from token clustering in web/libs/editor/src/regions/TableRegion/TableRegionModel.js (FR-018)
- [ ] T068 [US3] Handle TABLE label to trigger table-structure mode in web/libs/editor/src/regions/PdfRegion.jsx (FR-013)
- [ ] T069 [US3] Support 100x50 table performance in web/libs/editor/src/regions/TableRegion/TableRegion.jsx (FR-032)
- [ ] T070 [US3] Add TableRegion index export in web/libs/editor/src/regions/TableRegion/index.js

**Checkpoint**: User Story 3 complete - Table gridline structure editing is independently testable

---

## Phase 6: User Story 4 - Review and Correct Table Cell Text (Priority: P4)

**Goal**: Spreadsheet-like panel for viewing and editing cell text with keyboard navigation

**Independent Test**: Define table, navigate cells with keyboard, edit text, verify persistence

**Requirements**: FR-019, FR-020, FR-021, FR-022, FR-023

### Tests for User Story 4

- [ ] T071 [P] [US4] E2E test for cell text editing workflow in web/libs/editor/tests/e2e/tests/pdf-table-cells.test.js
- [ ] T072 [P] [US4] Unit test for keyboard navigation in web/libs/editor/tests/unit/KeyboardNav.test.js

### Frontend Implementation for User Story 4

- [ ] T073 [P] [US4] Implement CellOverlay component showing cell text in web/libs/editor/src/regions/TableRegion/CellOverlay.jsx
- [ ] T074 [P] [US4] Implement TableEditor spreadsheet panel in web/libs/editor/src/components/TableEditor/TableEditor.jsx
- [ ] T075 [P] [US4] Implement CellEditor inline text input in web/libs/editor/src/components/TableEditor/CellEditor.jsx
- [ ] T076 [US4] Implement KeyboardNav for Tab/Enter/Arrow navigation in web/libs/editor/src/components/TableEditor/KeyboardNav.jsx (FR-022)
- [ ] T077 [US4] Implement cell text extraction from OCR tokens in TableCellModel in web/libs/editor/src/regions/TableRegion/TableCellModel.js (FR-020)
- [ ] T078 [US4] Implement rowspan/colspan metadata for merged cells in web/libs/editor/src/regions/TableRegion/TableCellModel.js (FR-023)
- [ ] T079 [US4] Connect TableEditor to TableRegion selection state in web/libs/editor/src/components/TableEditor/TableEditor.jsx
- [ ] T080 [US4] Add TableEditor styles in web/libs/editor/src/components/TableEditor/TableEditor.module.scss

**Checkpoint**: User Story 4 complete - Table cell text editing is independently testable

---

## Phase 7: User Story 5 - Export Annotations with Structured Data (Priority: P5)

**Goal**: Export region and table annotations in structured JSON format for ML pipelines

**Independent Test**: Complete annotations, export, verify JSON schema matches contracts/export-format.md

**Requirements**: FR-024, FR-025, FR-026

### Tests for User Story 5

- [ ] T081 [P] [US5] Backend test for region export format in label_studio/tests/ocr/test_export.py
- [ ] T082 [P] [US5] Backend test for table export format in label_studio/tests/ocr/test_export.py
- [ ] T083 [P] [US5] E2E test for export roundtrip in web/libs/editor/tests/e2e/tests/pdf-export.test.js

### Backend Implementation for User Story 5

- [ ] T084 [US5] Extend AnnotationSerializer for pdfregion result type in label_studio/tasks/serializers.py (FR-024)
- [ ] T085 [US5] Extend AnnotationSerializer for pdftable result type in label_studio/tasks/serializers.py (FR-025)
- [ ] T086 [US5] Implement coordinate normalization validation in label_studio/ocr/utils.py (FR-026)

### Frontend Implementation for User Story 5

- [ ] T087 [US5] Implement PdfRegion serialization in web/libs/editor/src/regions/PdfRegion.jsx
- [ ] T088 [US5] Implement TableRegion serialization including cells array in web/libs/editor/src/regions/TableRegion/TableRegionModel.js
- [ ] T089 [US5] Implement deserialization for loading existing annotations in web/libs/editor/src/regions/PdfRegion.jsx
- [ ] T090 [US5] Implement TableRegion deserialization in web/libs/editor/src/regions/TableRegion/TableRegionModel.js

**Checkpoint**: User Story 5 complete - Export/import is independently testable

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Observability, documentation, and final integration

### Observability (FR-029, FR-030, FR-031)

- [ ] T091 [P] Add structured logging for annotation events in label_studio/ocr/api.py
- [ ] T092 [P] Add metrics for OCR token fetch latency in label_studio/ocr/api.py
- [ ] T093 [P] Add distributed tracing spans to OCR endpoints in label_studio/ocr/api.py

### Documentation

- [ ] T094 [P] Validate quickstart.md workflow end-to-end
- [ ] T095 [P] Add inline code comments for complex logic in label_studio/ocr/utils.py
- [ ] T096 [P] Add JSDoc comments to MST models in web/libs/editor/src/tags/object/PdfOcr/

### Final Integration

- [ ] T097 Run full E2E test suite for all user stories
- [ ] T098 Performance validation: 100-page PDF, 100x50 table (SC-005, FR-032)
- [ ] T099 Code cleanup and linting across all new files
- [ ] T100 Create PR with complete feature for review

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1: Setup ─────────────────────────────┐
                                            │
Phase 2: Foundational ──────────────────────┤
                                            │
    ┌───────────────────────────────────────┴────────────────────────────────────┐
    │                                                                            │
    ▼                                                                            │
Phase 3: US1 (PDF Viewing) ──┐                                                   │
                             │                                                   │
                             ▼                                                   │
Phase 4: US2 (Region Labeling) ──────────────────────────────────────────────────┤
                             │                                                   │
                             ▼                                                   │
Phase 5: US3 (Table Gridlines) ─────┐                                            │
                                    │                                            │
                                    ▼                                            │
Phase 6: US4 (Cell Text Editing) ───┼────────────────────────────────────────────┤
                                    │                                            │
Phase 7: US5 (Export) ──────────────┴────────────────────────────────────────────┤
                                                                                 │
Phase 8: Polish ◄────────────────────────────────────────────────────────────────┘
```

### User Story Dependencies

| Story | Depends On | Can Start After |
|-------|------------|-----------------|
| US1 (PDF Viewing) | Foundational (Phase 2) | T021 complete |
| US2 (Region Labeling) | US1 (PdfOcr tag must exist) | T033 complete |
| US3 (Table Gridlines) | US2 (Region labeling foundation) | T054 complete |
| US4 (Cell Text Editing) | US3 (Table structure must exist) | T070 complete |
| US5 (Export) | US2, US3 (Regions and tables must be serializable) | T054, T070 complete |

### Within Each User Story

1. Tests MUST be written and FAIL before implementation
2. Models before services/components
3. Backend before frontend (when frontend depends on API)
4. Core implementation before integration
5. Story complete before moving to next priority

### Parallel Opportunities

**Phase 1 (Setup)**: T002-T010 can all run in parallel

**Phase 2 (Foundational)**:
- Backend: T011-T013 in parallel, then T014-T015
- Frontend: T016-T018 in parallel, then T019
- Tests: T020-T021 in parallel

**Phase 3 (US1)**:
- Tests: T022-T024 in parallel
- Components: T025-T028 in parallel
- Integration: T029-T033 sequential

**Phase 4 (US2)**:
- Tests: T034-T036 in parallel
- Backend: T037-T038 in parallel, then T039-T042 sequential
- Frontend: T043-T045 in parallel, then T046-T054 sequential

**Phase 5 (US3)**:
- Tests: T055-T057 in parallel
- Models: T059-T061 in parallel
- Components: T062-T070 mostly sequential (gridline logic interdependent)

**Phase 6 (US4)**:
- Tests: T071-T072 in parallel
- Components: T073-T075 in parallel
- Integration: T076-T080 sequential

**Phase 7 (US5)**:
- Tests: T081-T083 in parallel
- Backend: T084-T086 sequential
- Frontend: T087-T090 sequential

**Phase 8 (Polish)**:
- T091-T096 all in parallel
- T097-T100 sequential

---

## Parallel Example: User Story 1

```bash
# Launch all tests for User Story 1 together:
Task: "E2E test for PDF rendering in web/libs/editor/tests/e2e/tests/pdf-viewer.test.js"
Task: "Unit test for page navigation in web/libs/editor/tests/unit/PdfViewer.test.js"
Task: "Unit test for zoom controls in web/libs/editor/tests/unit/ZoomControls.test.js"

# Launch all component implementations together:
Task: "Implement PdfViewer component in web/libs/editor/src/components/PdfViewer/PdfViewer.jsx"
Task: "Implement PageNavigation component in web/libs/editor/src/components/PdfViewer/PageNavigation.jsx"
Task: "Implement ZoomControls component in web/libs/editor/src/components/PdfViewer/ZoomControls.jsx"
Task: "Implement RotationControls component in web/libs/editor/src/components/PdfViewer/RotationControls.jsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T010)
2. Complete Phase 2: Foundational (T011-T021)
3. Complete Phase 3: User Story 1 (T022-T033)
4. **STOP and VALIDATE**: Test PDF viewing independently
5. Deploy/demo if ready - annotators can view PDFs

### Incremental Delivery

| Milestone | Stories Complete | Value Delivered |
|-----------|-----------------|-----------------|
| MVP | US1 | PDF viewing in Label Studio |
| Alpha | US1 + US2 | Region labeling with OCR text |
| Beta | US1 + US2 + US3 | Table structure annotation |
| RC | US1 + US2 + US3 + US4 | Full table editing |
| GA | All | Export for ML pipelines |

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (PDF Viewing)
   - Developer B: Backend APIs for User Story 2
3. After US1 complete:
   - Developer A: User Story 2 Frontend
   - Developer B: User Story 3 Backend + Frontend
4. Continue parallelizing by story

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Constitution Principle II mandates test-first development
- All coordinates use 0-100 (regions) or 0-1 (tables, OCR) normalization per FR-026
