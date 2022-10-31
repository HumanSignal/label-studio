---
title: KeyPoint
type: tags
order: 409
meta_title: Keypoint Tag for Adding Keypoints to Images
meta_description: Customize Label Studio with the KeyPoint tag to add key points to images for computer vision machine learning and data science projects.
---

Use the KeyPoint tag to add a key point to an image without selecting a label. This can be useful when you have only one label to assign to the key point.

Use with the following data types: image

### Parameters

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| name | <code>string</code> |  | Name of the element |
| toName | <code>string</code> |  | Name of the image to label |
| [opacity] | <code>float</code> | <code>0.9</code> | Opacity of keypoint |
| [fillColor] | <code>string</code> | <code>&quot;#8bad00&quot;</code> | Keypoint fill color in hexadecimal |
| [strokeWidth] | <code>number</code> | <code>1</code> | Width of the stroke |
| [strokeColor] | <code>string</code> | <code>&quot;#8bad00&quot;</code> | Keypoint stroke color in hexadecimal |
| [smart] | <code>boolean</code> |  | Show smart tool for interactive pre-annotations |
| [smartOnly] | <code>boolean</code> |  | Only show smart tool for interactive pre-annotations |

### Example
```html
<!--Basic keypoint image labeling configuration-->
<View>
  <KeyPoint name="kp-1" toName="img-1" />
  <Image name="img-1" value="$img" />
</View>
```
