# Implementation Plan: PDF OCR Labeling with Table Structure Annotation

**Branch**: `001-pdf-ocr-tables` | **Date**: 2026-01-10 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-pdf-ocr-tables/spec.md`

## Summary

Native PDF viewing with OCR token layer for Label Studio OSS. Implements region labeling with automatic text capture from OCR tokens, table structure annotation using draggable gridlines (row/column separators), and structured export for document understanding ML pipelines. This is a fork/customization approach since Label Studio Enterprise's OcrLabels tag is not available in OSS.

## Technical Context

**Language/Version**: Python 3.10+ (backend), TypeScript/JavaScript ES2020 (frontend)
**Primary Dependencies**:
- Backend: Django 5.1.8, Django REST Framework 3.15.2
- Frontend: React 18.3.1, MobX 5.15.4, MobX-State-Tree 3.16.0, Konva.js 8.1.3, Ant Design 4.3.3
- PDF Rendering: PDF.js (to be added)
**Storage**: PostgreSQL 13+ (production), SQLite (development), Label Studio storage abstraction layer
**Testing**:
- Backend: pytest 7.2.2, pytest-django 4.9.0, factory-boy 3.3.3
- Frontend: Jest 30.0.5, CodeceptJS 3.3.3 + Playwright 1.55.1 (E2E)
**Target Platform**: Linux server (backend), Modern browsers (frontend)
**Project Type**: Web application (Django backend + React frontend monorepo via Nx)
**Performance Goals**: 60fps labeling interface (per constitution), <500ms API response
**Constraints**: PDFs up to 100 pages, tables up to 100×50 cells, <200ms p95 OCR token fetch
**Scale/Scope**: Extends existing Label Studio codebase (~50k LOC frontend, ~100k LOC backend)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Upstream Compatibility | ✅ PASS | Feature adds new tags/endpoints; doesn't modify core upstream code. Uses existing patterns (Registry, MST models, DRF serializers). |
| II. Test-First Development | ✅ PASS | Spec requires tests; will use pytest for backend, Jest/CodeceptJS for frontend. E2E test file `ocr.test.js` already exists as reference. |
| III. Documentation-Driven Features | ✅ PASS | Spec complete before implementation; quickstart.md and API docs planned in Phase 1. |
| IV. Configuration Over Code | ✅ PASS | New capability exposed via labeling config XML (`<PdfOcr>`, `<OcrTokenLabels>`, `<TableGrid>` tags). Users configure via XML templates. |
| V. Storage Abstraction | ✅ PASS | OCR tokens stored as JSON via existing storage backends (localfiles, S3, GCS, Azure). No direct filesystem access. |
| VI. Security by Default | ✅ PASS | Uses existing project permissions (FR-027); file paths validated against storage roots; no new auth bypasses. |
| VII. Incremental Delivery | ✅ PASS | 5 independent user stories (P1-P5); each delivers standalone value. MVP = P1 (PDF viewing). |

**Result**: All 7 principles satisfied. No violations to track.

## Project Structure

### Documentation (this feature)

```text
specs/001-pdf-ocr-tables/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (API contracts)
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
# Backend (Django)
label_studio/
├── ocr/                          # NEW: OCR data handling
│   ├── __init__.py
│   ├── models.py                 # OcrPageData, OcrToken models
│   ├── serializers.py            # Token/page serializers
│   ├── api.py                    # REST endpoints for OCR data
│   └── utils.py                  # Token clustering, reading order
├── io_storages/                  # Existing storage layer
│   └── [no changes - use existing]
├── tasks/                        # Existing task models
│   └── [extend serializers for export format]
└── tests/
    └── ocr/                      # NEW: OCR test suite
        ├── conftest.py
        ├── test_models.py
        ├── test_api.py
        └── test_export.py

# Frontend (React + MobX-State-Tree)
web/libs/editor/
├── src/
│   ├── tags/object/
│   │   └── PdfOcr/               # NEW: PDF OCR object tag
│   │       ├── PdfOcr.jsx        # Main component with PDF.js
│   │       ├── PdfOcrModel.js    # MST model
│   │       ├── OcrTokenLayer.jsx # Token overlay
│   │       └── index.js
│   ├── tags/control/
│   │   └── OcrTokenLabels/       # NEW: Label control for regions
│   │       ├── OcrTokenLabels.jsx
│   │       └── index.js
│   ├── regions/
│   │   ├── PdfRegion.jsx         # NEW: Region for PDF pages
│   │   └── TableRegion/          # NEW: Table with gridlines
│   │       ├── TableRegion.jsx
│   │       ├── GridlineHandle.jsx
│   │       └── CellOverlay.jsx
│   ├── components/
│   │   ├── PdfViewer/            # NEW: PDF.js wrapper
│   │   │   ├── PdfViewer.jsx
│   │   │   ├── PageNavigation.jsx
│   │   │   └── ZoomControls.jsx
│   │   └── TableEditor/          # NEW: Spreadsheet panel
│   │       ├── TableEditor.jsx
│   │       ├── CellEditor.jsx
│   │       └── KeyboardNav.jsx
│   └── stores/
│       └── OcrStore.js           # NEW: OCR token state management
├── tests/
│   ├── unit/
│   │   └── PdfOcr.test.js        # NEW
│   └── e2e/
│       └── tests/
│           └── pdf-ocr.test.js   # NEW (ocr.test.js exists as reference)
└── package.json                  # Add pdfjs-dist dependency
```

**Structure Decision**: Web application structure (Option 2). Backend extends `label_studio/` with new `ocr/` module. Frontend extends `web/libs/editor/` with new tags, regions, and components following existing patterns (Image tag, RectRegion as references).

## Complexity Tracking

> No constitution violations. All complexity is within acceptable bounds.

| Aspect | Decision | Rationale |
|--------|----------|-----------|
| New Django app (`ocr/`) | Added | Keeps OCR logic separate from core `tasks/` app per Django best practices |
| PDF.js integration | Added | Required for text layer access; no simpler alternative for native PDF rendering |
| New region types | Added | Follows existing pattern (RectRegion, BrushRegion); required for PDF annotation |

---

## Planning Artifacts

### Phase 0: Research (Complete)

**Output**: [research.md](./research.md)

Key findings:
- PDF.js validated for canvas rendering with text layer support
- MobX-State-Tree patterns documented from Image tag and RectRegion
- OCR token storage design: external JSON files via storage abstraction
- Table gridline approach validated; cells computed from row_lines/col_lines

### Phase 1: Design (Complete)

**Outputs**:
- [data-model.md](./data-model.md) - Entity schemas, MST models, validation rules
- [quickstart.md](./quickstart.md) - User guide for PDF OCR labeling
- [contracts/ocr-api.md](./contracts/ocr-api.md) - REST API for OCR tokens
- [contracts/label-config.md](./contracts/label-config.md) - XML tag definitions
- [contracts/export-format.md](./contracts/export-format.md) - Annotation export schema

### Phase 2: Tasks (Pending)

Run `/speckit.tasks` to generate implementation tasks from this plan.

---

## Next Steps

1. **Run `/speckit.tasks`** to generate `tasks.md` with implementation steps
2. **Create feature branch**: `git checkout -b 001-pdf-ocr-tables`
3. **Begin P1 implementation**: PDF viewing (FR-001 through FR-004)
4. **Iterate**: Each user story (P1-P5) delivers independently testable value
