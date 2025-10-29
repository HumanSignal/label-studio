---
title: OCR Labeling for PDFs
type: templates
category: Computer Vision
cat: computer-vision
order: 126
meta_title: PDF OCR Data Labeling Template
meta_description: Template for correcting text in a PDF document.
---

Use this template to perform region-level OCR directly on native PDFs. 

The `Pdf` tag renders multi-page documents (up to 100 pages) with zoom and rotation, while OcrLabels lets you draw bounding boxes, assign labels, and capture editable OCR text per region. 

Each region stores normalized coordinates, rotation, and a page index, making outputs reliable for downstream extraction tasks. 

Ideal for document intelligence, QA on OCR output, and structured data capture workflows. 

!!! error Enterprise
    This template can only be used with in Label Studio Enterprise.

![Screenshot](/images/templates-misc/pdf-opossum.png)

## Labeling Configuration

```xml
<View>
  <Style>
    .htx-pdf { calc(100vh - 250px) }
  </Style>
  <Header value="Select text to correct" size="4"/>
  <OcrLabels name="ocr" toName="pdf">
    <Label value="Typo" />
    <Label value="Incorrect Amount" />
    <Label value="Incorrect Name" />
  </OcrLabels>
  <Pdf name="pdf" value="$pdf"/>
</View>

<!-- {
  "data": {
    "pdf": "/static/samples/opossum-cuteness.pdf"
  }
} -->
```

## About the labeling configuration

* **`Pdf`**

    This will display your PDF natively in Label Studio, allowing you to zoom in and rotate as needed. 

    Support for PDFs up to 100 pages. 

* **`OcrLabels`**
  
  Used only with the `Pdf` tag, and allows you to draw bounding boxes around text. Note that the PDF must have a text overlay for this to work (for example, verify whether you can highlight text in the PDF using your cursor).

  Select the text under the **Regions** panel to correct it. 

  <img src="/images/templates-misc/ocrlabels.png" alt="" class="gif-border" style="max-width:400px" />

* **`Style`**

  Use `.htx-pdf` to apply styling to the PDF. For example, adding a border or changing the size. 



## Input data

```json
{
    "data": {
      "pdf": "/static/samples/opossum-cuteness.pdf"
    }
}
```

## Related tags
- [Header](/tags/header.html)
- [Pdf](/tags/pdf.html)
- [Style](/tags/style.html)