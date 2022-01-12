---
title: Semantic Segmentation with Masks 
type: templates
category: Computer Vision
cat: computer-vision
order: 102
meta_title: Image Segmentation Data Labeling Template
meta_description: Label Studio Image Segmentation Template for machine learning and data science data labeling projects.
---

Image segmentation using a brush and producing a mask

## Run

```bash
label-studio init image_segmentation_project
label-studio start image_segmentation_project
```

After starting Label Studio, set up the labeling interface and browse to this template.

## Config 

```html
<View>
  <BrushLabels name="tag" toName="img">
    <Label value="Planet" />
    <Label value="Moonwalker" background="rgba(255,0,0,0.5)" />
  </BrushLabels>
  <Image name="img" value="$image" zoom="true" zoomControl="true" />
</View>
```

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