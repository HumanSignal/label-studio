---
title: Keypoint Labeling
type: templates
category: Computer Vision
cat: computer-vision
order: 104
meta_title: Image Keypoint Data Labeling Template
meta_description: Template for adding keypoints to images with Label Studio for your machine learning and data science projects.
---

Key Point labeling for images when you want to identify specific key points for facial recognition and other use cases.

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

## Related tags

- [KeyPointLabels](/tags/keypointlabels.html)
- [Image](/tags/image.html)