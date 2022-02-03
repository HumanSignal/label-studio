---
title: Object Detection with Bounding Boxes
type: templates
category: Computer Vision
cat: computer-vision
order: 103
meta_title: Image Object Detection Data Labeling Template
meta_description: Template for performing object detection with rectangular bounding boxes with Label Studio for your machine learning and data science projects.
---

Perform image bounding box labeling for object detection. 

<img src="/images/screens/image_bbox.png" class="img-template-example" title="Images Bbounding box" />

## Labeling Configuration

```html
<View>
  <Image name="image" value="$image"/>
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