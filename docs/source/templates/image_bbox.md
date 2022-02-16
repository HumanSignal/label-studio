---
title: Object Detection with Bounding Boxes
type: templates
category: Computer Vision
cat: computer-vision
order: 103
meta_title: Image Object Detection Data Labeling Template
meta_description: Template for performing object detection with rectangular bounding boxes with Label Studio for your machine learning and data science projects.
---

<img src="/images/templates/object-detection-with-bounding-boxes.png" alt="" class="gif-border" width="552px" height="408px" />

If you want to perform object detection, you need to create a labeled dataset. Use this template to add rectangular bounding boxes to images, and label the contents of the bounding boxes.

## Template Preview

Interactively preview this labeling template:

<div id="main-preview"></div>

## Labeling Configuration

```html
<View>
    <!--Use the Image object tag to specify the image to label-->
  <Image name="image" value="$image"/>
    <!--Use the RectangleLabels control tag to add labels and rectangular
    bounding boxes to your image at the same time. Use the Label tag to control
    the color of the boxes. -->
  <RectangleLabels name="label" toName="image">
    <Label value="Airplane" background="green"/>
    <Label value="Car" background="blue"/>
  </RectangleLabels>
</View>
```

## Related tags

- [Image](/tags/image.html)
- [RectangleLabels](/tags/rectanglelabels.html)
- [Rectangle](/tags/rectangle.html)
- [Label](/tags/label.html)