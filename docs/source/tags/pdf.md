---
title: PDF
type: tags
order: 307
meta_title: PDF tag for loading PDF documents
meta_description: Label Studio PDF tag for loading PDF documents for machine learning and data science projects.
---

The `Pdf` tag displays a PDF document in the labeling interface. You can use this tag to:

- Perform document-level annotations such as classification, transcription, and summarization. 
- Perform OCR validation on supported PDFs. <span class="badge"></span>

Supports:
* Zoom
* Rotation
* PDFs up to 100 pages

Use with the following data types: PDF.

!!! error Enterprise
    You can also use the PDF tag with [Prompts](https://docs.humansignal.com/guide/prompts_overview) to perform auto-labeling work such as PDF summarization, classification, information extraction, and document intelligence. 

{% insertmd includes/tags/pdf.md %}

## Example: PDF classification

Labeling configuration apply document-level classification to PDF documents:

```html
<View>
  <Pdf name="pdf" value="$pdf" />
  <Choices name="choices" toName="pdf">
    <Choice value="Legal" />
    <Choice value="Financial" />
    <Choice value="Technical" />
  </Choices>
</View>
```

#### Example Input data:

```json
{
  "pdf": "https://app.humansignal.com/static/samples/opossum-cuteness.pdf"
}
```

## Example: OCR <span class="badge"></span>

!!! error Enterprise
    Label Studio Enterprise only. 

    For Community and Starter Cloud users who want to apply labels for OCR tasks, you will need to convert the PDF into images first and then use a labeling configuration similar to the [Multi-Page Document Annotation](/templates/multi-page-document-annotation) template. 

Labeling configuration for PDFs:

```xml
<View>
  <OcrLabels name="ocr" toName="pdf">
    <Label value="Typo"/>
    <Label value="Incorrect amount"/>
    <Label value="Incorrect name"/>
  </OcrLabels>

  <Pdf name="pdf" value="$pdf"/>
</View>
```

#### Example Input data:

```json
{
  "pdf": "https://app.humansignal.com/static/samples/opossum-cuteness.pdf"
}
```

#### PDF styling

PDF renders the full height of the current page. If you want to limit it you can apply styles to the `.htx-pdf` class to set the height. Good default would be `calc(100vh - 250px)` but you might need to adjust the number of pixels based on extra elements you have in config:
```xml
<Style>
  .htx-pdf { height: calc(100vh - 250px); }
</Style>
```

### OcrLabels 

This tag adds bounding boxes to the PDF and allows you to assign labels to them. 


This tag must have one or more `Label` tag children, and supports standard parameters such as `maxUsages` (see [RectangleLabels](rectanglelabels) as an example).

#### Supported PDFs

PDFs that work best with the new OCR labeling are those that already contain a selectable text layer (text overlay). 

In these PDFs, when you draw a bounding box, the tool can read and highlight the underlying text from that layer (see the video below). 

Image-only PDFs such as scans or phone photos without a text layer won’t return text. For those, you may need to use an external OCR tool to add a text layer first. If a PDF’s text layer is misaligned or low quality, captured text may be incomplete or incorrect, and this feature can help you audit and improve those overlays. 

**Results:**

| Result | Type | Description |
| --- | --- | --- |
| `x`, `y`, `width`, `height` | Number | Numbers from 0 to 1 that are relative to the page dimensions. | 
| `rotation`| Number | Number in degrees clockwise from 0–360. Rotation is calculated with the origin at `(x, y)` (the top-left corner of the region). |
| `pageIndex` | Number | Page number, 1-based. |
| `ocrtext` | String | Captured text.  This can be edited by selecting the region and then editing the text from the **Info** panel. |

!!! note
    When you are rotating within the UI, it appears to originate from the center of the region. However, we store the origin as `(x, y)` - meaning in the top left corner of the region.

<br/>
<br/>

<video style="max-width: 800px;" class="gif-border" autoplay loop muted>
  <source src="/images/tags/pdf-ocr.mp4">
</video>
