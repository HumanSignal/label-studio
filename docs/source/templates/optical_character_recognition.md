---
title: Optical Character Recognition
type: templates
category: Computer Vision
cat: computer-vision
order: 105
meta_title: Optical Character Recognition (OCR) Data Labeling Template
meta_description: Template for performing optical character recognition data labeling tasks with Label Studio for your machine learning and data science projects.
---

<img src="/images/templates/optical-character-recognition.png" alt="" class="gif-border" width="552px" height="408px" />

Perform optical character recognition (OCR) tasks using a variety of shapes on an image. Use this template to identify regions using shapes and transcribe the associated text for specific regions of the image.

<!--Removing interactive template because it doesn't work due to the outdated version of LSF in playground-->

## Labeling Configuration

```html
<View>
    <!--Use the Image object tag to specify the image to label-->
  <Image name="image" value="$ocr"/>
    <!--Use the Labels control tag to specify which labels are 
    available to apply to the different shapes added to the image-->
  <Labels name="label" toName="image">
    <Label value="Text" background="green"/>
    <Label value="Handwriting" background="blue"/>
  </Labels>
    <!--Use the Rectangle control tag to add unlabeled rectangles-->
  <Rectangle name="bbox" toName="image" strokeWidth="3"/>
    <!--Use the Polygon control tag to add unlabeled polygons-->
  <Polygon name="poly" toName="image" strokeWidth="3"/>
    <!--Use the TextArea control tag to add transcripts for each region,
    or rectangle or polygon drawn on the image. Each text box has placeholder
    text to help guide the annotator, is set to display in the region sidebar,
    and is a required and editable field.-->
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