---
title: Keypoint Labeling
type: templates
category: Computer Vision
cat: computer-vision
order: 104
meta_title: Image Keypoint Data Labeling Template
meta_description: Template for adding keypoints to images with Label Studio for your machine learning and data science projects.
---

<img src="/images/templates/keypoints.png" alt="" class="gif-border" width="552px" height="408px"/>

If you want to identify specific key points for facial recognition and other use cases, use this template to perform key point labeling on images.

## Interactive Template Preview

<div id="main-preview"></div>

## Labeling Configuration

```html
<View>
  <KeyPointLabels name="kp-1" toName="img-1">
    <Label value="Face" background="red" />
    <Label value="Nose" background="green" />
  </KeyPointLabels>
  <Image name="img-1" value="$img" />
</View>
```

## About the labeling configuration

All labeling configurations must be wrapped in [View](/tags/view.html) tags.


Use the [KeyPointLabels](/tags/keypointlabels.html) control tag to add the option to draw labeled key points:
```xml
<KeyPointLabels name="kp-1" toName="img-1">
```
  
Use the [Label](/tags/label.html) control tag with the KeyPointLabels to specify the value and color of the key points:
```xml
    <Label value="Face" background="red" />
    <Label value="Nose" background="green" />
</KeyPointLabels>
```

Use the [Image](/tags/image.html) object tag to specify the image key: 
```xml
  <Image name="img-1" value="$img" />
```

## Related tags

- [KeyPointLabels](/tags/keypointlabels.html)
- [Image](/tags/image.html)