---
title: Image Ellipse Labeling
type: templates
category: Computer Vision
cat: computer-vision
order: 110
meta_title: Image Ellipse Data Labeling Template
meta_description: Template for adding elliptical regions to images for object detection and segmentation use cases with Label Studio for your machine learning and data science projects.
---

<img src="/images/templates-misc/object-detection-ellipses.png" alt="" class="gif-border" width="600px" height="408px" />

If you want to perform object detection or semantic segmentation using ellipses, use this template.

## Template Preview

Interactively preview this labeling template:

<div id="main-preview"></div>

## Labeling Configuration 

```html
<View>
    <!--Use the EllipseLabels control tag to add ellipses with specific labels
    to your image.-->
  <EllipseLabels name="tag" toName="img">
    <Label value="Blood Cell" />
    <Label value="Stem Cell" />
  </EllipseLabels>
    <!--Use the Image object tag to specify the image data-->
  <Image name="img" value="$image" />
</View>
```

## Related tags

- [EllipseLabels](/tags/ellipselabels.html)
- [Label](/tags/label.html)
- [Image](/tags/image.html)