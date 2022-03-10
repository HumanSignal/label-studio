---
title: Object Detection with Ellipses
type: templates
category: Computer Vision
cat: computer-vision
order: 110
meta_title: Object Detection with Ellipses Data Labeling Template
meta_description: Template for adding elliptical regions to images for object detection and segmentation use cases with Label Studio for your machine learning and data science projects.
---

<img src="/images/templates-misc/object-detection-ellipses.png" alt="" class="gif-border" width="600px" height="408px" />

If you want to perform object detection or semantic segmentation using ellipses, use this template.

## Interactive Template Preview

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

## About the labeling configuration

All labeling configurations must be wrapped in [View](/tags/view.html) tags.

Use the [EllipseLabels](/tags/ellipselabels.html) control tag to add ellipses with specific labels to your image.
```xml
<EllipseLabels name="tag" toName="img">
    <Label value="Blood Cell" />
    <Label value="Stem Cell" />
</EllipseLabels>
```

Use the [Image](/tags/image.html) object tag to specify the image data:
```xml
  <Image name="img" value="$image" />
```

## Related tags

- [EllipseLabels](/tags/ellipselabels.html)
- [Label](/tags/label.html)
- [Image](/tags/image.html)