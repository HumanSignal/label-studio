---
title: Image Classification
type: templates
category: Computer Vision
cat: computer-vision
order: 106
meta_title: Image Classification Data Labeling Template
meta_description: Label Studio Image Classification Template for machine learning and data science data labeling projects.
---

Image classification with checkboxes.

## Config 

```html
<View>
  <Image name="img" value="$image"></Image>
  <Choices name="tag" toName="img" choice="single-radio">
    <Choice value="Airbus"></Choice>
    <Choice value="Boeing" background="blue"></Choice>
  </Choices>
</View>
```

## Labeling Configuration

```html
<View>
  <Image name="image" value="$image"/>
  <Choices name="choice" toName="image">
    <Choice value="Adult content"/>
    <Choice value="Weapons" />
    <Choice value="Violence" />
  </Choices>
</View>
```