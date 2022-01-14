---
title: Image Ellipse
type: templates
category: Computer Vision
cat: computer-vision
order: 110
meta_title: Image Ellipse Data Labeling Template
meta_description: Label Studio Image Ellipse Template for machine learning and data science data labeling projects.
---

Put ellipses on an image for object detection and segmentation use cases. 

<img src="/images/screens/image_ellipse.png" class="img-template-example" title="Images Ellipse" />

## Config 

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