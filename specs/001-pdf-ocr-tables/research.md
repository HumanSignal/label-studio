# Research: PDF OCR Labeling with Table Structure Annotation

**Date**: 2026-01-10
**Feature**: `001-pdf-ocr-tables`
**Status**: Phase 0 Complete

## Executive Summary

This research validates the technical approach for implementing native PDF OCR labeling in Label Studio OSS. Key findings:

1. **PDF.js Integration**: Well-documented, supports canvas rendering with text layer access via `getTextContent()`. Webpack integration available via `pdfjs-dist/webpack.mjs`.
2. **Label Studio Architecture**: MobX-State-Tree patterns well established; Image tag + RectRegion provide proven reference implementations for region annotation.
3. **OCR Token Design**: External OCR pipeline assumption is valid; per-page JSON storage via existing storage backends is feasible.
4. **No Blockers**: All technical approaches are validated with no showstoppers identified.

## Research Questions & Findings

### RQ-1: How to render PDF pages with annotation support?

**Approach**: Use PDF.js for canvas-based rendering with coordinate mapping.

**Findings**:
- PDF.js supports HiDPI rendering via `window.devicePixelRatio` scaling
- Viewport provides coordinate transformation (PDF coordinates → canvas coordinates)
- PDF origin is bottom-left; canvas is top-left - viewport handles this automatically
- Page rendering is async; must queue render operations to avoid race conditions

**Code Pattern** (from Context7):
```javascript
const loadingTask = pdfjsLib.getDocument(url);
const pdf = await loadingTask.promise;
const page = await pdf.getPage(pageNum);
const viewport = page.getViewport({ scale });
const renderContext = {
  canvasContext: context,
  transform: [outputScale, 0, 0, outputScale, 0, 0],
  viewport: viewport,
};
await page.render(renderContext).promise;
```

**Integration Point**: Create `PdfViewer` component wrapping PDF.js, expose `viewport` for coordinate conversion.

### RQ-2: How to access text content with positions?

**Approach**: Use `page.getTextContent()` for embedded PDF text layer.

**Findings**:
- `getTextContent()` returns `{items: TextItem[], styles: {}}`
- Each `TextItem` has: `str` (text), `transform` (6-element matrix), `width`, `height`
- Transform matrix `[a, b, c, d, e, f]` where `e, f` are x, y positions
- For image-only PDFs (scans), this returns empty - external OCR is required
- Text layer is separate from canvas render; positions are in PDF coordinate space

**Design Decision**: Use `getTextContent()` for PDFs with embedded text (digital-native). For scanned PDFs, rely on external OCR pipeline that provides same structure via task.data.

**Token Structure** (matches PDF.js TextItem):
```typescript
interface OcrToken {
  id: string;
  text: string;
  bbox: [x, y, width, height];  // normalized 0-1
  confidence?: number;
  line_id?: string;
  block_id?: string;
}
```

### RQ-3: How do Label Studio tags and regions work?

**Approach**: Analyzed Image.js and RectRegion.jsx as reference implementations.

**Findings**:

**Tag Registration Pattern**:
```javascript
// 1. Define MST model with attributes
const TagAttrs = types.model({ value: types.string, ... });

// 2. Compose with mixins
const PdfOcrModel = types.compose("PdfOcrModel",
  ObjectBase,           // Base object tag functionality
  ProcessAttrsMixin,    // XML attribute parsing
  AnnotationMixin,      // Access to annotation store
  Model
);

// 3. Register tag
Registry.addTag("pdfocr", PdfOcrModel, HtxPdfOcr);
Registry.addObjectType(PdfOcrModel);
```

**Region Pattern** (from RectRegion.jsx:27-71):
- Regions are MST models with `type`, `object` (reference to parent tag), geometry fields
- Regions use `AreaMixin`, `RegionsMixin`, `NormalizationMixin` for consistent behavior
- Konva.js handles canvas drawing for Image-based regions
- Coordinates stored as percentages (0-100) relative to parent dimensions

**Result Serialization** (from Result.js:70-100):
- Results have `from_name` (control tag), `to_name` (object tag), `type`, `value`
- Value structure varies by type (e.g., `rectanglelabels` has bbox + labels)

### RQ-4: How to implement gridline-based table structure?

**Approach**: Research draggable separator UI patterns.

**Findings**:
- Konva.js `Line` or `Rect` can serve as separator handles
- Implement drag constraints to keep separators within table bounds
- Cell computation is pure function of separator positions:
  ```
  cells = cartesian(rowSeparators, colSeparators)
  ```
- Store separators as arrays: `row_lines: [0, 0.25, 0.5, 0.75, 1.0]` (normalized)

**Implementation Strategy**:
1. TableRegion extends RectRegion with `row_lines` and `col_lines` arrays
2. GridlineHandle components for draggable separators
3. CellOverlay renders computed cells with extracted text
4. Add/delete separators via context menu or keyboard shortcuts

### RQ-5: How to integrate with existing E2E tests?

**Approach**: Analyzed existing `ocr.test.js` E2E test.

**Findings** (from `web/libs/editor/tests/e2e/tests/ocr.test.js`):
- Uses CodeceptJS with Playwright
- Pattern: `LabelStudio.init({ config, data, annotations })` → draw regions → `LabelStudio.serialize()` → assert
- Helper objects: `AtImageView`, `AtLabels`, `AtOutliner` for UI interactions
- Tests verify region creation, text input, and serialization/deserialization

**Test Strategy for PDF OCR**:
1. Create `AtPdfView` helper extending image view patterns
2. Test scenarios:
   - PDF page navigation (FR-001, FR-002)
   - Region drawing with label assignment (FR-008, FR-009)
   - Table gridline manipulation (FR-015, FR-016, FR-017)
   - Serialization round-trip

### RQ-6: Backend API patterns for OCR data?

**Approach**: Analyzed `io_storages/api.py` and `tasks/serializers.py`.

**Findings**:

**API Pattern** (from io_storages/api.py):
```python
class ImportStorageListAPI(generics.ListCreateAPIView):
    permission_required = ViewClassPermission(
        GET=all_permissions.storages_view,
        POST=all_permissions.storages_change,
    )
    serializer_class = ImportStorageSerializer

    def get_queryset(self):
        project_pk = self.request.query_params.get('project')
        # ... filter by project
```

**Serializer Validation** (from tasks/serializers.py:82-110):
- Uses `LabelInterface` from label-studio-sdk for validation
- Predictions validated against project's label_config

**OCR API Design**:
```
GET  /api/ocr/tasks/{task_id}/pages/{page_num}/tokens
POST /api/ocr/tasks/{task_id}/pages/{page_num}/tokens  (batch import)
```

Response format:
```json
{
  "page_index": 0,
  "width": 612,
  "height": 792,
  "tokens": [
    {"id": "t1", "text": "Hello", "bbox": [0.1, 0.1, 0.15, 0.02], "confidence": 0.98}
  ]
}
```

## Technical Decisions

### D-1: PDF.js vs alternatives

**Decision**: Use `pdfjs-dist` via npm

**Rationale**:
- Mozilla-maintained, well-documented, actively developed
- Native text layer access (eliminates need for OCR on digital PDFs)
- Webpack integration simplifies bundling
- 112 code snippets in Context7 documentation

**Alternatives Rejected**:
- `<embed>` tag (current): No text layer, no annotation support
- `react-pdf`: Wrapper adds complexity, may lag behind pdfjs-dist

### D-2: OCR data storage location

**Decision**: Store OCR tokens in separate JSON files, referenced via task.data

**Task Data Format**:
```json
{
  "pdf_url": "s3://bucket/document.pdf",
  "ocr_url": "s3://bucket/document_ocr.json"
}
```

**Rationale**:
- Keeps task.data lightweight (doesn't embed potentially large OCR output)
- Works with all storage backends via existing abstraction
- Allows OCR to be updated without modifying task
- Frontend fetches OCR data on-demand per page

**Alternative Rejected**:
- Embed in task.meta: Can bloat database for large documents

### D-3: Region coordinate system

**Decision**: Normalized coordinates (0-1) relative to page dimensions

**Rationale**:
- Matches existing Label Studio pattern (RectRegion uses 0-100 percentages)
- Resolution-independent
- Simplifies export/import across different renderings
- FR-026 explicitly requires 0-1 normalization

### D-4: Table cell identification

**Decision**: Cells identified by grid position (row, col), not unique IDs

**Rationale**:
- Cells are computed from gridlines, not independent entities
- Avoids ID management complexity when adding/removing separators
- Matches spreadsheet mental model
- rowspan/colspan supported via cell metadata

### D-5: Control tag design

**Decision**: Create `OcrTokenLabels` control tag for region labeling

**Rationale**:
- Follows existing pattern (`Labels`, `RectangleLabels`)
- Reuses proven Label component infrastructure
- Integrates naturally with results serialization

**Tag Usage Example**:
```xml
<View>
  <PdfOcr name="pdf" value="$pdf_url" ocrValue="$ocr_url" />
  <OcrTokenLabels name="label" toName="pdf">
    <Label value="HEADER" background="#FF0000"/>
    <Label value="PARAGRAPH" background="#00FF00"/>
    <Label value="TABLE" background="#0000FF"/>
  </OcrTokenLabels>
  <TextArea name="text" toName="pdf" perRegion="true" editable="true"/>
</View>
```

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| PDF.js performance on large PDFs | Medium | Medium | Lazy page loading, render queue, canvas pooling |
| OCR token alignment issues | Medium | High | Include OCR preprocessing validation; allow manual token bbox adjustment |
| Konva.js + PDF.js interaction | Low | Medium | Render PDF to canvas, overlay Konva stage for annotations |
| Table gridline UX complexity | Medium | Medium | Incremental delivery; P3 can be refined based on P1/P2 feedback |
| Export format changes break ML pipelines | Low | High | Schema versioning in export; contract tests |

## Dependencies Identified

**Frontend (to be added to package.json)**:
```json
{
  "pdfjs-dist": "^4.0.0"
}
```

**Backend (no new dependencies)**:
- Uses existing Django/DRF infrastructure
- ujson already available for JSON parsing

## Open Questions (Resolved)

1. ~~Should we support PDF text layer extraction or only external OCR?~~
   → **Support both**: Use `getTextContent()` for digital PDFs, external OCR for scans

2. ~~How to handle multi-page table continuations?~~
   → **Out of scope** per spec: "Each page is annotated separately; cross-page table linking is out of scope for MVP"

3. ~~What coordinate system for tokens?~~
   → **Normalized 0-1** per FR-026

## References

- PDF.js Documentation: https://mozilla.github.io/pdf.js/
- Context7 PDF.js Library: /mozilla/pdf.js (112 snippets)
- Label Studio Image Tag: `web/libs/editor/src/tags/object/Image/Image.js`
- Label Studio RectRegion: `web/libs/editor/src/regions/RectRegion.jsx`
- Existing OCR E2E Test: `web/libs/editor/tests/e2e/tests/ocr.test.js`
- Storage API Pattern: `label_studio/io_storages/api.py`
