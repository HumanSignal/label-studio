---
title: Semantic Segmentation with Masks 
type: templates
category: Computer Vision
cat: computer-vision
order: 102
meta_title: Image Segmentation Data Labeling Template
meta_description: Label Studio Image Segmentation Template for machine learning and data science data labeling projects.
---

Image segmentation using a brush and producing a mask.

## Labeling Configuration

```html
<View>
  <Image name="image" value="$image" zoom="true"/>
  <BrushLabels name="tag" toName="image">
    <Label value="Airplane" background="rgba(255, 0, 0, 0.7)"/>
    <Label value="Car" background="rgba(0, 0, 255, 0.7)"/>
  </BrushLabels>
</View>
```

## Related tags

- [Image](/tags/image.html)
- [BrushLabels](/tags/brushlabels.html)
- [Label](/tags/label.html)