---
title: KeyPoint
type: tags
order: 408
meta_title: Keypoint Tags for Adding Keypoints to Images
meta_description: Label Studio Keypoint Tags customize Label Studio for adding keypoints to images for machine learning and data science projects.
---

KeyPoint is used to add a keypoint to an image without label selection. It's useful when you have only one label.

### Parameters

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| name | <code>string</code> |  | Name of the element |
| toName | <code>string</code> |  | Name of the image to label |
| [opacity] | <code>float</code> | <code>0.9</code> | Opacity of keypoint |
| [fillColor] | <code>string</code> | <code>&quot;#8bad00&quot;</code> | Keypoint fill color |
| [strokeWidth] | <code>number</code> | <code>1</code> | Width of the stroke |
| [stokeColor] | <code>string</code> | <code>&quot;#8bad00&quot;</code> | Keypoint stroke color |

### Example
```html
<View>
  <KeyPoint name="kp-1" toName="img-1" />
  <Image name="img-1" value="$img" />
</View>
```
