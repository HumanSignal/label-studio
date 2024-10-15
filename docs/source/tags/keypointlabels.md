---
title: KeyPointLabels
type: tags
order: 410
meta_title: Keypoint Label Tag for Labeling Keypoints
meta_description: Customize Label Studio with the KeyPointLabels tag to label keypoints for computer vision machine learning and data science projects.
---

The `KeyPointLabels` tag creates labeled keypoints. Use to apply labels to identified key points, such as identifying facial features for a facial recognition labeling project.

Use with the following data types: image.

### Parameters

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| name | <code>string</code> |  | Name of the element |
| toName | <code>string</code> |  | Name of the image to label |
| [choice] | <code>single</code> \| <code>multiple</code> | <code>single</code> | Configure whether you can select one or multiple labels |
| [maxUsages] | <code>number</code> |  | Maximum number of times a label can be used per task |
| [showInline] | <code>boolean</code> | <code>true</code> | Show labels in the same visual line |
| [opacity] | <code>float</code> | <code>0.9</code> | Opacity of the keypoint |
| [strokeWidth] | <code>number</code> | <code>1</code> | Width of the stroke |
| [snap] | <code>pixel</code> \| <code>none</code> | <code>none</code> | Snap keypoint to image pixels |

### Sample Results JSON

| Name | Type | Description |
| --- | --- | --- |
| original_width | <code>number</code> | width of the original image (px) |
| original_height | <code>number</code> | height of the original image (px) |
| image_rotation | <code>number</code> | rotation degree of the image (deg) |
| value | <code>Object</code> |  |
| value.x | <code>number</code> | x coordinate by percentage of the image size (0-100) |
| value.y | <code>number</code> | y coordinate by percentage of the image size (0-100) |
| value.width | <code>number</code> | point size by percentage of the image size (0-100) |

### Example JSON
```json
{
  "original_width": 1920,
  "original_height": 1280,
  "image_rotation": 0,
  "value": {
    "x": 3.1,
    "y": 8.2,
    "width": 2,
    "keypointlabels": ["Car"]
  }
}
```

### Example

Basic keypoint image labeling configuration for multiple regions

```html
<View>
  <KeyPointLabels name="kp-1" toName="img-1">
    <Label value="Face" />
    <Label value="Nose" />
  </KeyPointLabels>
  <Image name="img-1" value="$img" />
</View>
```
