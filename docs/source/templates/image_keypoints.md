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

## Template Preview

Interactively preview this labeling template:

<div id="main-preview"></div>

## Labeling Configuration

```html
<View>
    <!--Use the KeyPointLabels control tag to add the 
    option to draw labeled key points-->
  <KeyPointLabels name="kp-1" toName="img-1">
      <!--Use the Label control tag to specify 
      the value and color of the key points-->
    <Label value="Face" background="red" />
    <Label value="Nose" background="green" />
  </KeyPointLabels>
    <!-- Use the Image object tag to specify the image-->
  <Image name="img-1" value="$img" />
</View>
```

## Related tags

- [KeyPointLabels](/tags/keypointlabels.html)
- [Image](/tags/image.html)