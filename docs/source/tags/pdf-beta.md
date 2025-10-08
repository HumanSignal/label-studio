---
title: PDF - Beta 🧪
type: tags
order: 307
meta_title: PDF tag for loading PDF documents
meta_description: Label Studio PDF tag for loading PDF documents for machine learning and data science projects.
---

!!! note
    We’re testing a new PDF tag. To enable it for your account please contact your Customer Success Manager or apply here: [https://humansignal.com/pdf-interest-signup](https://humansignal.com/pdf-interest-signup)

The `Pdf` tag displays a PDF document in the labeling interface. You can use this tag to:

- Perform document-level annotations such as classification, transcription, and summarization. See [PDF](pdf#Example) for an example labeling config. 
- Create regions within pages for OCR, NER, and other types of annotations (beta). <span class="badge"></span>

Supports:
* Zoom
* Rotation
* PDFs up to 100 pages

Use with the following data types: PDF.

!!! error Enterprise
    You can also use the PDF tag with [Prompts](https://docs.humansignal.com/guide/prompts_overview) to perform auto-labeling work such as PDF summarization, classification, information extraction, and document intelligence. 

    Note that since this tag is still in beta, Label Studio’s AI tools will default to the basic implementation of the tag that only supports document-level classification.

{% insertmd includes/tags/pdf.md %}


## Example: OCR 🧪 <span class="badge"></span>

Beta and Label Studio Enterprise only.

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

**Example Input data:**

```json
{
  "pdf": "https://app.humansignal.com/static/samples/ocr-receipts.pdf"
}
```

### OcrLabels 

The above example uses `OcrLabels`. 

This is a new tag to add bounding boxes to the PDF and assign labels to them. This tag must have one or more `Label` tag children, and supports standard parameters such as `maxUsages` (see [RectangleLabels](rectanglelabels) as an example).

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
  <source src="/images/tags/pdf2-ocr.mp4">
</video>