# Quickstart: PDF OCR Labeling with Table Structure Annotation

**Feature**: `001-pdf-ocr-tables`
**Date**: 2026-01-10

## Overview

This guide shows how to set up PDF document annotation with OCR text capture and table structure labeling in Label Studio.

## Prerequisites

- Label Studio running (development or production)
- PDFs pre-processed with OCR (produces JSON token files)
- Storage backend configured (local files, S3, GCS, or Azure)

## Step 1: Prepare Your Data

### PDF Files

Place your PDF files in your configured storage location:

```
storage/
└── documents/
    ├── invoice-001.pdf
    ├── invoice-002.pdf
    └── contract-001.pdf
```

### OCR Data

Run your OCR pipeline to generate token JSON files:

```
storage/
└── ocr/
    ├── invoice-001.json
    ├── invoice-002.json
    └── contract-001.json
```

**OCR JSON Format**:

```json
{
  "pages": [
    {
      "page_index": 0,
      "width": 612,
      "height": 792,
      "tokens": [
        {
          "id": "p0_t0",
          "text": "INVOICE",
          "bbox": [0.1, 0.05, 0.2, 0.03],
          "confidence": 0.99
        }
      ]
    }
  ]
}
```

See [data-model.md](./data-model.md) for complete OCR schema.

## Step 2: Create a Project

### Via UI

1. Go to **Projects** → **Create Project**
2. Enter project name: "Document Understanding"
3. Click **Create**

### Via API

```bash
curl -X POST "http://localhost:8080/api/projects" \
  -H "Authorization: Token YOUR_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Document Understanding",
    "description": "PDF OCR labeling with table annotation"
  }'
```

## Step 3: Configure Labeling Interface

Go to **Settings** → **Labeling Interface** and paste:

### Basic Region Labeling

```xml
<View>
  <PdfOcr name="pdf" value="$pdf_url" ocrValue="$ocr_url"/>

  <OcrTokenLabels name="label" toName="pdf">
    <Label value="HEADER" background="#FF6B6B" hotkey="1"/>
    <Label value="PARAGRAPH" background="#4ECDC4" hotkey="2"/>
    <Label value="FOOTER" background="#45B7D1" hotkey="3"/>
    <Label value="TABLE" background="#DDA0DD" hotkey="4"/>
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

### Full Configuration (with Table Structure)

```xml
<View>
  <Header value="Document Annotation"/>

  <PdfOcr
    name="pdf"
    value="$pdf_url"
    ocrValue="$ocr_url"
    zoomControl="true"
    rotateControl="true"
    pageNavigation="true"
    tokenOverlay="true"
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

## Step 4: Import Tasks

### Task JSON Format

Create `tasks.json`:

```json
[
  {
    "data": {
      "pdf_url": "/data/local-files/?d=documents/invoice-001.pdf",
      "ocr_url": "/data/local-files/?d=ocr/invoice-001.json"
    },
    "meta": {
      "document_id": "INV-001"
    }
  },
  {
    "data": {
      "pdf_url": "/data/local-files/?d=documents/invoice-002.pdf",
      "ocr_url": "/data/local-files/?d=ocr/invoice-002.json"
    },
    "meta": {
      "document_id": "INV-002"
    }
  }
]
```

### Import via UI

1. Go to project → **Import**
2. Upload `tasks.json`
3. Click **Import**

### Import via API

```bash
curl -X POST "http://localhost:8080/api/projects/{project_id}/import" \
  -H "Authorization: Token YOUR_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d @tasks.json
```

## Step 5: Annotate Documents

### PDF Navigation

- **Page Navigation**: Use Previous/Next buttons or page number input
- **Zoom**: Mouse wheel or +/- buttons
- **Rotation**: Click rotate button (90° increments)

### Region Labeling

1. Select a label (e.g., "HEADER") or press hotkey (1-7)
2. Click and drag to draw a rectangle on the PDF
3. Release to create the region
4. The **suggested text** from OCR tokens appears automatically
5. Edit text in the side panel if corrections needed

### Table Annotation

1. Select "TABLE" label (hotkey: 6)
2. Draw a rectangle around the entire table
3. System enters **table structure mode**:
   - Initial gridlines are auto-suggested from OCR token clustering
   - Drag gridlines to adjust row/column boundaries
   - Double-click to add new separators
   - Right-click separator to delete (merges cells)
4. Click cells in the **spreadsheet panel** to edit text
5. Use Tab/Enter/Arrow keys for keyboard navigation

### Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Select HEADER | 1 |
| Select PARAGRAPH | 2 |
| Select FOOTER | 3 |
| Select FIGURE | 4 |
| Select CAPTION | 5 |
| Select TABLE | 6 |
| Select OTHER | 7 |
| Submit annotation | Ctrl+Enter |
| Previous page | Left Arrow |
| Next page | Right Arrow |
| Zoom in | Ctrl++ |
| Zoom out | Ctrl+- |
| Delete region | Backspace/Delete |

## Step 6: Export Annotations

### Via UI

1. Go to project → **Export**
2. Select format: **JSON**
3. Click **Export**

### Via API

```bash
curl -X GET "http://localhost:8080/api/projects/{project_id}/export?exportType=JSON" \
  -H "Authorization: Token YOUR_API_TOKEN" \
  -o annotations.json
```

### Export Format

See [contracts/export-format.md](./contracts/export-format.md) for complete schema.

**Example output**:

```json
{
  "id": 123,
  "data": {
    "pdf_url": "/data/local-files/?d=documents/invoice-001.pdf",
    "ocr_url": "/data/local-files/?d=ocr/invoice-001.json"
  },
  "annotations": [
    {
      "result": [
        {
          "type": "pdfregion",
          "value": {
            "x": 10.0,
            "y": 5.0,
            "width": 30.0,
            "height": 4.0,
            "page_index": 0,
            "pdfregionlabels": ["HEADER"]
          },
          "meta": {
            "suggested_text": "INVOICE #12345",
            "corrected_text": "INVOICE #12345"
          }
        }
      ]
    }
  ]
}
```

## Using Pre-Annotations (Predictions)

### Create Predictions via API

```bash
curl -X POST "http://localhost:8080/api/predictions" \
  -H "Authorization: Token YOUR_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "task": 123,
    "model_version": "doc-layout-v1",
    "result": [
      {
        "type": "pdfregion",
        "from_name": "label",
        "to_name": "pdf",
        "value": {
          "x": 10.0,
          "y": 5.0,
          "width": 30.0,
          "height": 4.0,
          "page_index": 0,
          "pdfregionlabels": ["HEADER"]
        }
      }
    ]
  }'
```

Predictions appear as pre-annotations when annotators open tasks.

## Troubleshooting

### PDF not displaying

- Check PDF URL is accessible
- Verify CORS headers if using external URLs
- Check browser console for errors

### OCR tokens not appearing

- Verify `ocrValue` attribute points to valid URL
- Check OCR JSON format matches expected schema
- Ensure tokens have valid `bbox` coordinates (0-1 range)

### Table gridlines not showing

- Ensure region is labeled as "TABLE"
- Check that OCR tokens exist within the table bounds
- Try manual gridline placement if auto-detect fails

### Text not extracting correctly

- Verify OCR token bounding boxes align with visible text
- Check OCR confidence scores (low confidence may indicate issues)
- Use "Recompute text" button after resizing regions

## Next Steps

- See [API Contract](./contracts/ocr-api.md) for programmatic OCR data access
- See [Label Config Contract](./contracts/label-config.md) for all tag options
- See [Export Format](./contracts/export-format.md) for ML pipeline integration
