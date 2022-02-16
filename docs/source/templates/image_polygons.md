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

If you need to perform semantic segmentation on images using polygons, use this template.

## Template Preview

Interactively preview this labeling template:

<div id="main-preview"></div>

## Labeling Configuration

```html
<View>
    <!--Use the Header tag to provide instructions to annotators-->
  <Header value="Select label and click the image to start"/>
    <!--Use the Image object tag to specify the image data and
    allow annotators to zoom the image-->
  <Image name="image" value="$image" zoom="true"/>
    <!--Use the PolygonLabels control tag to allow annotators
    to create polygons for specific labels. You can control the 
    color of the labels and the styling of the polygon tool.-->
  <PolygonLabels name="label" toName="image"
                 strokeWidth="3" pointSize="small"
                 opacity="0.9">
    <Label value="Airplane" background="red"/>
    <Label value="Car" background="blue"/>
  </PolygonLabels>
</View>
```

## Related tags

- [Header](/tags/header.html)
- [Image](/tags/image.html)
- [PolygonLabels](/tags/polygonlabels.html)
- [Label](/tags/label.html)