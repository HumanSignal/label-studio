---
title: Semantic Segmentation with Masks 
type: templates
category: Computer Vision
cat: computer-vision
order: 102
meta_title: Semantic Segmentation with Masks Data Labeling Template
meta_description: Template for performing semantic segmentation with brush masks with Label Studio for your machine learning and data science projects.
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