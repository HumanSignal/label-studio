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

## Interactive Template Preview

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

## About the labeling configuration

All labeling configurations must be wrapped in [View](/tags/view.html) tags.

You can add a [header](/tags/header.html) to provide instructions to the annotator:
```xml
<Header value="Select label and click the image to start"/>
```

Use the [Image](/tags/image.html) object tag to specify the image data and allow annotators to zoom the image:
```xml
<Image name="image" value="$image" zoom="true"/>
```

Use the [PolygonLabels](/tags/polygonlabels.html) control tag to allow annotators to create polygons for specific labels. 
```xml
  <PolygonLabels name="label" toName="image"
                 strokeWidth="3" pointSize="small"
                 opacity="0.9">
    <Label value="Airplane" background="red"/>
    <Label value="Car" background="blue"/>
  </PolygonLabels>
```
Annotators can control the opacity of the polygons using the `opacity` argument, and the styling of the polygon tool using the `pointSize` and `strokeWidth` arguments. Use the `background` argument with the [Label](/tags/label.html) control tag to control the color of each polygon.

## Related tags

- [Header](/tags/header.html)
- [Image](/tags/image.html)
- [PolygonLabels](/tags/polygonlabels.html)
- [Label](/tags/label.html)
