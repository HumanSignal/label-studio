# Contract: Labeling Configuration Tags

**Version**: 1.0.0
**Date**: 2026-01-10
**Feature**: `001-pdf-ocr-tables`

## Overview

XML tag definitions for PDF OCR labeling configuration.

---

## PdfOcr Tag

The `PdfOcr` tag displays a PDF document with OCR token overlay support.

### Attributes

| Attribute | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `name` | string | Yes | - | Unique identifier for this object |
| `value` | string | Yes | - | Data field containing PDF URL (e.g., `$pdf_url`) |
| `ocrValue` | string | No | - | Data field containing OCR JSON URL (e.g., `$ocr_url`) |
| `zoom` | boolean | No | true | Enable zoom controls |
| `zoomControl` | boolean | No | true | Show zoom control buttons |
| `rotateControl` | boolean | No | true | Show rotation control buttons |
| `pageNavigation` | boolean | No | true | Show page navigation controls |
| `tokenOverlay` | boolean | No | true | Show OCR token boundaries on hover |
| `maxWidth` | string | No | "100%" | Maximum width of viewer |
| `maxHeight` | string | No | "calc(100vh - 200px)" | Maximum height of viewer |

### Example

```xml
<PdfOcr
  name="pdf"
  value="$pdf_url"
  ocrValue="$ocr_url"
  zoomControl="true"
  rotateControl="true"
  pageNavigation="true"
  tokenOverlay="true"
/>
```

### Task Data Format

```json
{
  "pdf_url": "/data/local-files/?d=documents/invoice.pdf",
  "ocr_url": "/data/local-files/?d=ocr/invoice.json"
}
```

---

## OcrTokenLabels Tag

Control tag for labeling PDF regions with automatic OCR text capture.

### Attributes

| Attribute | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `name` | string | Yes | - | Unique identifier for this control |
| `toName` | string | Yes | - | Name of PdfOcr object tag to annotate |
| `allowEmpty` | boolean | No | false | Allow regions without labels |
| `showInline` | boolean | No | true | Show labels inline |
| `opacity` | float | No | 0.6 | Region fill opacity |

### Child Elements

- `<Label>` - Individual label definitions (same as standard Labels tag)

### Example

```xml
<OcrTokenLabels name="label" toName="pdf">
  <Label value="HEADER" background="#FF6B6B"/>
  <Label value="PARAGRAPH" background="#4ECDC4"/>
  <Label value="FOOTER" background="#45B7D1"/>
  <Label value="FIGURE" background="#96CEB4"/>
  <Label value="CAPTION" background="#FFEAA7"/>
  <Label value="TABLE" background="#DDA0DD"/>
  <Label value="OTHER" background="#B0B0B0"/>
</OcrTokenLabels>
```

### Region Result Format

When a region is drawn:

```json
{
  "id": "region_abc123",
  "type": "pdfregion",
  "from_name": "label",
  "to_name": "pdf",
  "original_width": 612,
  "original_height": 792,
  "value": {
    "x": 10.5,
    "y": 5.2,
    "width": 30.0,
    "height": 4.5,
    "rotation": 0,
    "page_index": 0,
    "pdfregionlabels": ["HEADER"]
  }
}
```

---

## TableGrid Tag (Optional - for table-specific labeling)

Control tag for defining table structure with gridlines.

### Attributes

| Attribute | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `name` | string | Yes | - | Unique identifier |
| `toName` | string | Yes | - | Name of PdfOcr object tag |
| `autoDetect` | boolean | No | true | Auto-suggest gridlines from OCR |
| `minRows` | integer | No | 1 | Minimum number of rows |
| `minCols` | integer | No | 1 | Minimum number of columns |
| `maxRows` | integer | No | 100 | Maximum number of rows (FR-032) |
| `maxCols` | integer | No | 50 | Maximum number of columns (FR-032) |

### Example

```xml
<TableGrid
  name="tableStructure"
  toName="pdf"
  autoDetect="true"
  maxRows="100"
  maxCols="50"
/>
```

### Activation

TableGrid activates automatically when a region with label "TABLE" is created.

---

## TextArea Tag (Standard)

Used for text correction in regions. Standard Label Studio tag with `perRegion="true"`.

### Example

```xml
<TextArea
  name="text"
  toName="pdf"
  editable="true"
  perRegion="true"
  placeholder="Corrected text"
  displayMode="region-list"
/>
```

---

## Complete Configuration Examples

### Basic Region Labeling

```xml
<View>
  <PdfOcr name="pdf" value="$pdf_url" ocrValue="$ocr_url"/>

  <OcrTokenLabels name="label" toName="pdf">
    <Label value="HEADER" background="#FF6B6B"/>
    <Label value="PARAGRAPH" background="#4ECDC4"/>
    <Label value="FOOTER" background="#45B7D1"/>
  </OcrTokenLabels>

  <TextArea
    name="text"
    toName="pdf"
    editable="true"
    perRegion="true"
    placeholder="Corrected text"
  />
</View>
```

### Full Document Understanding (with Tables)

```xml
<View>
  <Header value="Document Annotation"/>

  <PdfOcr
    name="pdf"
    value="$pdf_url"
    ocrValue="$ocr_url"
    zoomControl="true"
    rotateControl="true"
  />

  <OcrTokenLabels name="label" toName="pdf" allowEmpty="false">
    <Label value="HEADER" background="#FF6B6B" hotkey="1"/>
    <Label value="PARAGRAPH" background="#4ECDC4" hotkey="2"/>
    <Label value="FOOTER" background="#45B7D1" hotkey="3"/>
    <Label value="FIGURE" background="#96CEB4" hotkey="4"/>
    <Label value="CAPTION" background="#FFEAA7" hotkey="5"/>
    <Label value="TABLE" background="#DDA0DD" hotkey="6"/>
    <Label value="OTHER" background="#B0B0B0" hotkey="7"/>
  </OcrTokenLabels>

  <TableGrid name="tableStructure" toName="pdf" autoDetect="true"/>

  <TextArea
    name="correctedText"
    toName="pdf"
    editable="true"
    perRegion="true"
    placeholder="Enter corrected text..."
    displayMode="region-list"
  />
</View>
```

### Minimal PDF Viewing Only

```xml
<View>
  <PdfOcr
    name="pdf"
    value="$pdf_url"
    pageNavigation="true"
    zoomControl="true"
    tokenOverlay="false"
  />
</View>
```

---

## Validation Rules

### Tag Hierarchy

- `<PdfOcr>` must be inside `<View>`
- `<OcrTokenLabels>` must reference a `<PdfOcr>` via `toName`
- `<TableGrid>` must reference a `<PdfOcr>` via `toName`
- `<TextArea perRegion="true">` must reference a `<PdfOcr>` via `toName`

### Name Uniqueness

- All `name` attributes must be unique within the configuration
- `toName` must reference an existing object tag's `name`

### Attribute Validation

| Tag | Attribute | Validation |
|-----|-----------|------------|
| PdfOcr | value | Must start with `$` (data field reference) |
| OcrTokenLabels | toName | Must reference PdfOcr tag |
| TableGrid | maxRows | 1-100 |
| TableGrid | maxCols | 1-50 |
| Label | hotkey | Single character or key combination |

---

## Error Messages

| Error | Cause | Solution |
|-------|-------|----------|
| `Unknown tag: pdfocr` | Tag not registered | Ensure frontend build includes PdfOcr component |
| `toName "pdf" not found` | Invalid reference | Check that PdfOcr has matching `name` |
| `Invalid value format` | Missing `$` prefix | Use `$field_name` syntax for data references |
| `Duplicate name "label"` | Name collision | Use unique names for all tags |
