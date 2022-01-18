---
title: Keypoint Labeling
type: templates
category: Computer Vision
cat: computer-vision
order: 104
meta_title: Image Keypoints Data Labeling Template
meta_description: Label Studio Image Keypoints Template for machine learning and data science data labeling projects.
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