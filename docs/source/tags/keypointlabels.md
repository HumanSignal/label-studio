---
title: KeyPointLabels
type: tags
order: 408
---

KeyPointLabels tag
KeyPointLabels tag creates labeled keypoints

### Parameters

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| name | <code>string</code> |  | name of the element |
| toName | <code>string</code> |  | name of the image to label |
| [opacity] | <code>float</code> | <code>0.9</code> | opacity of keypoint |
| [fillColor] | <code>string</code> |  | keypoint fill color, default is transparent |
| [strokeWidth] | <code>number</code> | <code>1</code> | width of the stroke |
| [stokeColor] | <code>string</code> | <code>&quot;#8bad00&quot;</code> | keypoint stroke color |

### Example
```html
<View>
  <KeyPointLabels name="kp-1" toName="img-1">
    <Label value="Face" />
    <Label value="Nose" />
  </KeyPointLabels>
  <Image name="img-1" value="$img" />
</View>
```
