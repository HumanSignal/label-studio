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
| [strokeWidth] | <code>number</code> | <code>1</code> | size of keypoint |

### Example
```html
<View>
  <KeyPointLabels name="kp-1" toName="img-1" strokeWidth="4">
    <Label value="Face" background="red" />
    <Label value="Nose" background="blue" />
  </KeyPointLabels>
  <Image name="img-1" value="$img" />
</View>
```
