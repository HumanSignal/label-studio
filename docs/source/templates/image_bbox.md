---
title: Object Detection with Bounding Boxes
type: templates
category: Computer Vision
cat: computer-vision
order: 103
meta_title: Image Object Detection Data Labeling Template
meta_description: Label Studio Image Object Detection Template for machine learning and data science data labeling projects.
---

Perform image bounding box labeling.

<img src="/images/screens/image_bbox.png" class="img-template-example" title="Images Bbounding box" />

## Run

```bash
label-studio init image_bbox_project
label-studio start image_bbox_project 
```

After starting Label Studio, set up the labeling interface and browse to this template.

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