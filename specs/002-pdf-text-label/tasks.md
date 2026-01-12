# Tasks: PDF Text Labeling

**Input**: Design documents from `/specs/002-pdf-text-label/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Included per constitution requirement (Test-First Development - Principle II)

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US4, US5)
- Include exact file paths in descriptions

## Path Conventions

- **Editor library**: `web/libs/editor/src/`
- **Tests**: `web/libs/editor/tests/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and verify existing components

- [ ] T001 Verify PdfOcr tag and PdfRegion are functional in web/libs/editor/src/tags/object/PdfOcr/
- [ ] T002 [P] Verify OCR token overlay renders correctly in PdfOcr.jsx
- [ ] T003 [P] Review existing selection-tools.js patterns in web/libs/editor/src/utils/selection-tools.js
- [ ] T004 [P] Review existing HighlightMixin patterns in web/libs/editor/src/mixins/HighlightMixin.js

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core utilities that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Tests for Foundational Components

- [ ] T005 [P] Unit test for PositionTracker line calculation in web/libs/editor/tests/unit/PositionTracker.test.js
- [ ] T006 [P] Unit test for pdf-selection token selection in web/libs/editor/tests/unit/pdf-selection.test.js

### Implementation for Foundational Components

- [ ] T007 [P] Create PositionTracker utility for line number calculation in web/libs/editor/src/tags/object/PdfOcr/components/PositionTracker.js
- [ ] T008 [P] Create pdf-selection utility for token-based text selection in web/libs/editor/src/utils/pdf-selection.js
- [ ] T009 Verify T005 and T006 tests pass after T007 and T008 implementation

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 + 5 - Manual Text Entry with Position Tracking (Priority: P1) 🎯 MVP

**Goal**: Annotators can enter text content for box regions with position reference (page + line)

**Independent Test**: Draw box around "Green Bond Report 2025", select "Header" label, enter text in side panel, verify annotation includes text and position

### Tests for User Story 1+5

- [ ] T010 [P] [US1] Integration test for text entry flow in web/libs/editor/tests/integration/pdf-text-entry.test.js

### Implementation for User Story 1+5

- [ ] T011 [P] [US1] Add text property to PdfRegion model in web/libs/editor/src/regions/PdfRegion/PdfRegion.jsx
- [ ] T012 [P] [US5] Add position property to PdfRegion model in web/libs/editor/src/regions/PdfRegion/PdfRegion.jsx
- [ ] T013 [US1] Update PdfRegion serialize() to include text and position in web/libs/editor/src/regions/PdfRegion/PdfRegion.jsx
- [ ] T014 [US1] Add TextArea per-region control for text input in side panel (follow RichTextRegion pattern)
- [ ] T015 [US5] Integrate PositionTracker to calculate line number when region is created
- [ ] T016 [US1] Add text display in region details panel
- [ ] T017 [US1] Add validation for text length (max 1000 characters)
- [ ] T018 [US1] Verify T010 test passes after implementation

**Checkpoint**: User Story 1+5 should be fully functional - annotators can add text to box regions with position tracking

---

## Phase 4: User Story 4 - Highlight Text Directly in PDF (Priority: P1)

**Goal**: Annotators can select text directly in PDF and apply labels with automatic text capture

**Independent Test**: Select "Hong Kong" text in PDF, click "Publisher" label, verify highlight created with text and position

### Tests for User Story 4

- [ ] T019 [P] [US4] Unit test for PdfTextHighlight region model in web/libs/editor/tests/unit/PdfTextHighlight.test.js
- [ ] T020 [P] [US4] Integration test for text highlighting flow in web/libs/editor/tests/integration/pdf-text-highlighting.test.js

### Implementation for User Story 4

- [ ] T021 [P] [US4] Create PdfTextHighlight region model in web/libs/editor/src/regions/PdfRegion/PdfTextHighlight.jsx
- [ ] T022 [P] [US4] Create PdfHighlightMixin for highlight styling in web/libs/editor/src/mixins/PdfHighlightMixin.js
- [ ] T023 [US4] Register PdfTextHighlight in Area.js union in web/libs/editor/src/regions/Area.js
- [ ] T024 [US4] Add pdftexthighlight to Result.js resultTypes in web/libs/editor/src/regions/Result.js
- [ ] T025 [US4] Create TextHighlight rendering component in web/libs/editor/src/tags/object/PdfOcr/components/TextHighlight.jsx
- [ ] T026 [US4] Add text selection event handling to PdfOcr.jsx in web/libs/editor/src/tags/object/PdfOcr/PdfOcr.jsx
- [ ] T027 [US4] Integrate pdf-selection utility for token selection in PdfOcr
- [ ] T028 [US4] Create highlight region when label applied to selection
- [ ] T029 [US4] Add visual feedback for selection state (pre-label)
- [ ] T030 [US4] Handle "no text layer" case with informative message
- [ ] T031 [US4] Verify T019 and T020 tests pass after implementation

**Checkpoint**: User Story 4 should be fully functional - annotators can highlight text directly

---

## Phase 5: User Story 2 - Edit Existing Text Labels (Priority: P2)

**Goal**: Annotators can edit text content for previously annotated regions

**Independent Test**: Select existing region with text, edit the text value, verify change persists after deselection

### Tests for User Story 2

- [ ] T032 [P] [US2] Integration test for text editing in web/libs/editor/tests/integration/pdf-text-edit.test.js

### Implementation for User Story 2

- [ ] T033 [US2] Add edit mode activation for text input (click/double-click) in side panel
- [ ] T034 [US2] Implement text update action in PdfRegion model
- [ ] T035 [US2] Handle cancel (Escape) to preserve original text
- [ ] T036 [US2] Add undo support for text edits
- [ ] T037 [US2] Verify T032 test passes after implementation

**Checkpoint**: User Story 2 should be fully functional - annotators can edit text on existing regions

---

## Phase 6: User Story 6 - Edit Highlighted Text Selection (Priority: P2)

**Goal**: Annotators can adjust highlight boundaries after creation

**Independent Test**: Create highlight, drag start/end handle, verify text and position update

### Tests for User Story 6

- [ ] T038 [P] [US6] Integration test for highlight boundary adjustment in web/libs/editor/tests/integration/pdf-highlight-resize.test.js

### Implementation for User Story 6

- [ ] T039 [US6] Add resize handles to TextHighlight component at start/end tokens
- [ ] T040 [US6] Implement boundary drag handling in PdfTextHighlight model
- [ ] T041 [US6] Update text content when boundaries change
- [ ] T042 [US6] Update position reference when boundaries change
- [ ] T043 [US6] Verify T038 test passes after implementation

**Checkpoint**: User Story 6 should be fully functional - annotators can resize highlights

---

## Phase 7: User Story 3 - View Text in Region List (Priority: P3)

**Goal**: Text values visible in regions panel for quick review

**Independent Test**: Create multiple regions with text, verify text values appear in regions list

### Tests for User Story 3

- [ ] T044 [P] [US3] Integration test for text display in regions list in web/libs/editor/tests/integration/pdf-regions-list.test.js

### Implementation for User Story 3

- [ ] T045 [US3] Add text property display to region list item component
- [ ] T046 [US3] Add text truncation with ellipsis for long values
- [ ] T047 [US3] Add tooltip/hover to show full text
- [ ] T048 [US3] Support both PdfRegion and PdfTextHighlight text display
- [ ] T049 [US3] Verify T044 test passes after implementation

**Checkpoint**: User Story 3 should be fully functional - text visible in regions list

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T050 [P] Add selection granularity option (character/word/line) to PdfOcr config
- [ ] T051 [P] Add position display in region details panel (page X, line Y)
- [ ] T052 [P] Documentation: Update user guide with text labeling instructions
- [ ] T053 Code cleanup: Remove console.logs and debug code
- [ ] T054 Performance: Optimize line calculation for large documents (>5000 tokens)
- [ ] T055 Run quickstart.md validation scenarios end-to-end
- [ ] T056 Cross-browser testing (Chrome, Firefox, Safari, Edge)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-7)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3)
- **Polish (Phase 8)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1+5 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 4 (P1)**: Can start after Foundational (Phase 2) - No dependencies on US1 (independent annotation method)
- **User Story 2 (P2)**: Requires US1 complete (edits text from US1)
- **User Story 6 (P2)**: Requires US4 complete (edits highlights from US4)
- **User Story 3 (P3)**: Requires US1 or US4 complete (displays text from either)

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- Models/utilities before components
- Components before integration
- Core implementation before polish
- Story complete before moving to next priority

### Parallel Opportunities

- T002, T003, T004 can run in parallel (Phase 1)
- T005, T006 can run in parallel (Phase 2 tests)
- T007, T008 can run in parallel (Phase 2 implementation)
- T011, T012 can run in parallel (Phase 3 - different properties)
- T019, T020 can run in parallel (Phase 4 tests)
- T021, T022 can run in parallel (Phase 4 - different files)
- US1+5 and US4 can run in parallel by different developers (both P1, no dependencies)

---

## Parallel Example: Phase 4 (User Story 4)

```bash
# Launch tests first (parallel):
Task: "Unit test for PdfTextHighlight region model in tests/unit/PdfTextHighlight.test.js"
Task: "Integration test for text highlighting flow in tests/integration/pdf-text-highlighting.test.js"

# Launch model + mixin (parallel):
Task: "Create PdfTextHighlight region model in regions/PdfRegion/PdfTextHighlight.jsx"
Task: "Create PdfHighlightMixin in mixins/PdfHighlightMixin.js"
```

---

## Implementation Strategy

### MVP First (User Story 1+5 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1+5
4. **STOP and VALIDATE**: Test manual text entry with position tracking
5. Deploy/demo if ready - annotators can add text to box regions

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1+5 → Test independently → Deploy/Demo (MVP!)
3. Add User Story 4 → Test independently → Deploy/Demo (text highlighting)
4. Add User Story 2 → Test independently → Deploy/Demo (edit text)
5. Add User Story 6 → Test independently → Deploy/Demo (edit highlights)
6. Add User Story 3 → Test independently → Deploy/Demo (regions list)
7. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1+5 (manual text entry)
   - Developer B: User Story 4 (text highlighting)
3. After P1 stories complete:
   - Developer A: User Story 2 (edit text from US1)
   - Developer B: User Story 6 (edit highlights from US4)
4. User Story 3 can be done by either developer

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- US1 and US5 are combined because position tracking is integral to text entry

## Task Summary

| Phase | User Story | Task Count | Priority |
|-------|------------|------------|----------|
| 1 | Setup | 4 | - |
| 2 | Foundational | 5 | - |
| 3 | US1+US5 | 9 | P1 |
| 4 | US4 | 13 | P1 |
| 5 | US2 | 6 | P2 |
| 6 | US6 | 6 | P2 |
| 7 | US3 | 6 | P3 |
| 8 | Polish | 7 | - |
| **Total** | | **56** | |
