---
title: Semantic Segmentation with Masks 
type: templates
category: Computer Vision
cat: computer-vision
order: 102
meta_title: Semantic Segmentation with Masks Data Labeling Template
meta_description: Template for performing semantic segmentation with brush masks with Label Studio for your machine learning and data science projects.
---

<img src="/images/templates/semantic-segmentation-with-masks.png" alt="" class="gif-border" width="552px" height="408px" />

Image segmentation using a brush and producing a mask.

## Interactive Template Preview

<div id="main-preview"></div>

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

## About the labeling configuration

All labeling configurations must be wrapped in [View](/tags/view.html) tags.


Use the [Image](/tags/image.html) object tag to display the image and allow the annotator to zoom the image:
```xml
<Image name="image" value="$image" zoom="true"/>
```

Use the [BrushLabels](/tags/brushlabels.html) control tag to apply brush masks to the image, using the [Label](/tags/label.html) tag to specify the value and color of the brush mask:
```xml
  <BrushLabels name="tag" toName="image">
    <Label value="Airplane" background="rgba(255, 0, 0, 0.7)"/>
    <Label value="Car" background="rgba(0, 0, 255, 0.7)"/>
  </BrushLabels>
```

## Related tags

- [Image](/tags/image.html)
- [BrushLabels](/tags/brushlabels.html)
- [Label](/tags/label.html)
