---
title: Image Classification
type: templates
category: Computer Vision
cat: computer-vision
order: 106
meta_title: Image Classification Data Labeling Template
meta_description: Template for classifying image data with Label Studio for your machine learning and data science projects.
---

<img src="/images/templates/image-classification.png" alt="" class="gif-border" width="552px" height="408px" />

If you want to train a model to identify the type of content in images, for example for a content moderation use case, use this template to perform image classification with checkboxes.

## Template Preview

Interactively preview this labeling template:

<div id="main-preview"></div>

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

## Related tags

- [Image](/tags/image.html)
- [Choices](/tags/choices.html)