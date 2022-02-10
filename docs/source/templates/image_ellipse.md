---
title: Image Ellipse Labeling
type: templates
category: Computer Vision
cat: computer-vision
order: 110
meta_title: Image Ellipse Data Labeling Template
meta_description: Template for adding elliptical regions to images for object detection and segmentation use cases with Label Studio for your machine learning and data science projects.
---

Put ellipses on an image for object detection and segmentation use cases. 

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