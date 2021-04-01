---
title: Image Segmentation
type: templates
order: 103
meta_title: Image Segmentation Data Labeling Template
meta_description: Label Studio Image Segmentation Template for machine learning and data science data labeling projects.
---

Image segmentation using a brush and producing a mask

## Run

```bash
label-studio init image_segmentation_project
label-studio start image_segmentation_project
```

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
