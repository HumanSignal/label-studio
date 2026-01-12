# Implementation Plan: PDF Annotation Export

**Branch**: `003-annotation-export` | **Date**: 2026-01-12 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/003-annotation-export/spec.md`

## Summary

Export PDF annotations with full document layout context (words, lines, blocks, tables), deterministic structural IDs, and W3C Web Annotation support. The export system generates machine-readable JSONL format with page-level layout files containing OCR/text layer data, enabling ML model training and reproducible annotation anchoring.

## Technical Context

**Language/Version**: Python 3.10+ (backend), TypeScript/React (frontend for export UI)
**Primary Dependencies**:
- Django 4.x + Django REST Framework (existing backend)
- pdfplumber (PDF text extraction - per spec assumption)
- Tesseract/pytesseract (OCR - per spec assumption)
- Pillow (PNG rendering)
- hashlib (deterministic ID generation)
- jsonschema (export validation)

**Storage**:
- Local filesystem (existing EXPORT_DIR, DELAYED_EXPORT_DIR)
- S3-compatible via existing io_storages abstraction

**Testing**: pytest (Django), Jest (frontend)
**Target Platform**: Linux server (Docker), MacOS dev
**Project Type**: Web application (Django backend + React frontend)
**Performance Goals**:
- 10,000+ annotation records/sec streaming (SC-003)
- 5 seconds/page export time (SC-005)
- 2px bbox tolerance (SC-004)

**Constraints**:
- Must use existing Label Studio export infrastructure (data_export module)
- Must integrate with existing OCR module (label_studio/ocr/)
- Must use storage abstraction layer (io_storages)
- Must maintain upstream compatibility

**Scale/Scope**:
- Multi-document exports with 100k+ annotations (sharding at threshold)
- 100+ page documents

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Evidence |
|-----------|--------|----------|
| I. Upstream Compatibility | PASS | New export format added alongside existing formats; no changes to core export flow |
| II. Test-First Development | PASS | Spec includes testable acceptance criteria per user story; tests required |
| III. Documentation-Driven Features | PASS | Schema docs (id_algorithm.md, canonical_text_rules.md, w3c_mapping.md) are part of deliverables |
| IV. Configuration Over Code | PASS | Export format is selectable parameter; DPI configurable |
| V. Storage Abstraction | PASS | Uses existing io_storages; export writes via ExportStorage interface |
| VI. Security by Default | PASS | FR-SEC-001/002 use existing project owner/manager permissions |
| VII. Incremental Delivery | PASS | 8 user stories (P1→P2→P3) with independent test criteria |

**Gate Result**: PASSED - No violations requiring justification.

## Project Structure

### Documentation (this feature)

```text
specs/003-annotation-export/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (OpenAPI specs)
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
# Backend (Django)
label_studio/
├── data_export/
│   ├── api.py                    # Extend with new export format
│   ├── serializers.py            # Add PDF annotation serializer
│   └── pdf_export/               # NEW: PDF export module
│       ├── __init__.py
│       ├── exporter.py           # Main export orchestration
│       ├── layout_extractor.py   # Word/line/block extraction
│       ├── id_generator.py       # Deterministic ID generation
│       ├── canonical_text.py     # Canonical text construction
│       ├── page_renderer.py      # PNG rendering
│       ├── table_handler.py      # Table structure extraction
│       ├── w3c_converter.py      # W3C Web Annotation format
│       └── schemas/              # JSON schemas for validation
│           ├── manifest.schema.json
│           ├── page_layout.schema.json
│           └── annotation_record.schema.json
├── ocr/                          # EXISTING: OCR module
│   ├── api.py                    # May need minor extensions
│   └── utils.py                  # Reuse token extraction logic

# Tests
label_studio/tests/
├── data_export/
│   └── test_pdf_export.py        # Unit tests for PDF export
├── integration/
│   └── test_pdf_export_e2e.py    # End-to-end export tests

# Frontend (minimal - export trigger UI)
web/apps/labelstudio/
├── src/pages/DataManager/
│   └── ExportDialog/             # Extend existing export dialog
```

**Structure Decision**: Extends existing `data_export` module with new `pdf_export` submodule. Uses existing storage abstraction and OCR infrastructure. Frontend changes minimal (export format selection in existing dialog).

## Complexity Tracking

> No violations to justify - Constitution Check passed.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| N/A | N/A | N/A |
