---
title: Image Polygons
type: templates
order: 104
meta_title: Image Polygons Data Labeling Template
meta_description: Label Studio Image Polygons Template for machine learning and data science data labeling projects.
---

Image polygons labeling

<img src="/images/screens/image_polygons.png" class="img-template-example" title="Images Polygons" />

## Run

```bash
label-studio init --template=image_polygons image_polygons_project
label-studio start image_polygons_project 
```

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
