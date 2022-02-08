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

Put ellipses on an image for object detection and segmentation use cases. 

## Template Preview

Interactively preview this labeling template:

<div id="main-preview"></div>

## Labeling Configuration 

```html
<View>
  <EllipseLabels name="tag" toName="img">
    <Label value="Blood Cell" />
    <Label value="Stem Cell" />
  </EllipseLabels>
  <Image name="img" value="$image" />
</View>
```

## Related tags

- [EllipseLabels](/tags/ellipselabels.html)
- [Image](/tags/image.html)