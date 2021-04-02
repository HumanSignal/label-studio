---
title: Image Object Detection
type: templates
order: 102
meta_title: Image Object Detection Data Labeling Template
meta_description: Label Studio Image Object Detection Template for machine learning and data science data labeling projects.
---

Image bounding box labeling

<img src="/images/screens/image_bbox.png" class="img-template-example" title="Images Bbounding box" />

## Run

```bash
label-studio init --template=image_bbox image_bbox_project
label-studio start image_bbox_project 
```

## Config 

```html
<View>
  <Image name="img" value="$image"></Image>
  <RectangleLabels name="tag" toName="img">
    <Label value="Planet"></Label>
    <Label value="Moonwalker" background="blue"></Label>
  </RectangleLabels>
</View>
```
