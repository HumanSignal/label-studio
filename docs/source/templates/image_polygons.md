---
title: Semantic Segmentation with Polygons
type: templates
category: Computer Vision
cat: computer-vision
order: 101
meta_title: Semantic Segmentation with Polygons Data Labeling Template
meta_description: Template for performing semantic segmentation with polygons with Label Studio for your machine learning and data science projects.
---

<img src="/images/templates/semantic-segmentation-with-polygons.png" alt="" class="gif-border" width="552px" height="408px" />

Add polygons to images to perform semantic segmentation.

## Template Preview

Interactively preview this labeling template:

<div id="main-preview"></div>

## Labeling Configuration

```html
<View>
  <Header value="Select label and click the image to start"/>
  <Image name="image" value="$image" zoom="true"/>
  <PolygonLabels name="label" toName="image"
                 strokeWidth="3" pointSize="small"
                 opacity="0.9">
    <Label value="Airplane" background="red"/>
    <Label value="Car" background="blue"/>
  </PolygonLabels>
</View>
```

## Related tags

- [Image](/tags/image.html)
- [PolygonLabels](/tags/polygonlabels.html)
- [Label](/tags/label.html)