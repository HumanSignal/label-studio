---
title: Semantic Segmentation with Polygons
type: templates
category: Computer Vision
cat: computer-vision
order: 101
meta_title: Semantic Segmentation with Polygons Data Labeling Template
meta_description: Template for performing semantic segmentation with polygons with Label Studio for your machine learning and data science projects.
---

Add polygons to images to perform semantic segmentation. 

<img src="/images/screens/image_polygons.png" class="img-template-example" title="Images Polygons" />

## Config 

```html
<View style="display: flex">
  <View style="width: 100px">
    <Header value="Pick label" />
    <PolygonLabels name="tag" toName="img" strokewidth="2" pointstyle="circle" pointsize="small" showInline="false">
      <Label value="Car" background="blue" />
      <Label value="Sign" background="blue" />
      <Label value="Person" background="blue" />
      <Label value="Tree" background="green" />
    </PolygonLabels>
    </View>
  <View>
    <Image name="img" value="$image" showMousePos="true" zoom="true" />
  </View>
</View>
```

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