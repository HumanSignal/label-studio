# Implementation Plan: PDF Text Labeling

**Branch**: `002-pdf-text-label` | **Date**: 2026-01-12 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-pdf-text-label/spec.md`

## Summary

This feature extends PDF labeling capabilities with two core annotation methods:
1. **Manual Text Entry**: Associate text content with bounding box regions (e.g., header = "Green Bond Report 2025")
2. **Text Highlighting**: Direct text selection in PDFs with automatic text capture and position tracking

Position tracking includes page number (required) and line number (preferred, with paragraph/offset fallbacks). The implementation leverages existing Label Studio selection utilities (selection-tools.js, HighlightMixin) and extends the PdfOcr/PdfRegion models.

## Technical Context

**Language/Version**: JavaScript/React (Frontend), Python 3.10+ (Backend - minimal changes)
**Primary Dependencies**:
- React 18.x (existing)
- MobX-State-Tree (existing Label Studio state management)
- PDF.js (existing in PdfOcr)
- selection-tools.js, HighlightMixin (existing Label Studio utilities)
**Storage**: N/A (annotations stored via existing Label Studio annotation system)
**Testing**: Jest (frontend unit tests), Cypress (E2E), pytest (backend if needed)
**Target Platform**: Web browsers (Chrome, Firefox, Safari, Edge)
**Project Type**: Web application - frontend-focused feature extending existing editor library
**Performance Goals**:
- Text highlight creation < 3 seconds
- Line number calculation < 100ms per annotation
- 60fps maintained during annotation (per constitution)
**Constraints**:
- API responses < 500ms (per constitution)
- Must work with existing PdfOcr tag without breaking changes
- Single-page text selection only (cross-page deferred)
**Scale/Scope**:
- PDFs with 1-100+ pages
- OCR tokens up to 10,000 per page
- Support documents with 100+ annotations per task

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Evidence/Notes |
|-----------|--------|----------------|
| **I. Upstream Compatibility** | ✅ PASS | Extends existing PdfOcr tag; no modifications to core Label Studio code; new control/region types follow established patterns |
| **II. Test-First Development** | ✅ PLAN | Tests specified in tasks; unit tests for line calculation, integration tests for annotation flow |
| **III. Documentation-Driven Features** | ✅ PLAN | spec.md complete; user docs will be written per acceptance criteria |
| **IV. Configuration Over Code** | ✅ PASS | Text input via per-region controls (configurable); highlight granularity via config options |
| **V. Storage Abstraction** | ✅ N/A | No direct file storage; uses existing annotation persistence |
| **VI. Security by Default** | ✅ PASS | Text input sanitized; no file path handling; uses existing auth |
| **VII. Incremental Delivery** | ✅ PASS | 6 user stories prioritized P1-P3; P1 stories deliver standalone value |

**Gate Result**: PASS - No violations requiring justification.

## Project Structure

### Documentation (this feature)

```text
specs/002-pdf-text-label/
├── spec.md              # Feature specification (complete)
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (annotation schema)
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
web/libs/editor/src/
├── tags/
│   ├── control/
│   │   └── PdfLabels/
│   │       └── PdfLabels.jsx        # Extend with text input support
│   └── object/
│       └── PdfOcr/
│           ├── PdfOcr.jsx           # Add text selection handling
│           ├── PdfOcrModel.js       # Add highlight region support
│           └── components/
│               ├── TextHighlight.jsx    # NEW: Text highlight rendering
│               └── PositionTracker.js   # NEW: Line/position calculation
├── regions/
│   └── PdfRegion/
│       ├── PdfRegion.jsx            # Add text property
│       └── PdfTextHighlight.jsx     # NEW: Text highlight region model
├── mixins/
│   └── PdfHighlightMixin.js         # NEW: Adapt HighlightMixin for PDF
└── utils/
    └── pdf-selection.js             # NEW: PDF-specific selection utilities

web/libs/editor/tests/
├── unit/
│   ├── PdfTextHighlight.test.js     # NEW
│   └── PositionTracker.test.js      # NEW
└── integration/
    └── pdf-text-labeling.test.js    # NEW
```

**Structure Decision**: Extends existing web/libs/editor structure. New components follow established patterns in tags/object/ and regions/. Utilities added to utils/ following existing conventions.

## Complexity Tracking

> No violations requiring justification - all gates passed.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| N/A | N/A | N/A |
