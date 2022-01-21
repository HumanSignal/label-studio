---
title: Optical Character Recognition
type: templates
category: Computer Vision
cat: computer-vision
order: 105
meta_title: Optical Character Recognition (OCR) Data Labeling Template
meta_description: Template for performing optical character recognition data labeling tasks with Label Studio for your machine learning and data science projects.
---

Perform optical character recognition (OCR) tasks using a variety of shapes on an image. Use this template to identify regions using shapes and transcribe the associated text for specific regions of the image.

## Labeling Configuration

```html
<View>
  <Image name="image" value="$ocr"/>
  <Labels name="label" toName="image">
    <Label value="Text" background="green"/>
    <Label value="Handwriting" background="blue"/>
  </Labels>
  <Rectangle name="bbox" toName="image" strokeWidth="3"/>
  <Polygon name="poly" toName="image" strokeWidth="3"/>
  <TextArea name="transcription" toName="image"
            editable="true"
            perRegion="true"
            required="true"
            maxSubmissions="1"
            rows="5"
            placeholder="Recognized Text"
            displayMode="region-list"
            />
</View>
```

## Related tags
- [Image](/tags/image.html)
- [Labels](/tags/labels.html)
- [Rectangle](/tags/rectangle.html)
- [Polygon](/tags/polygon.html)
- [TextArea](/tags/textarea.html)