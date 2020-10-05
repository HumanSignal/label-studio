---
title: KeyPoint
type: tags
order: 407
---

KeyPoint tag
KeyPoint is used to add a keypoint to an image

### Parameters

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| name | <code>string</code> |  | name of the element |
| toName | <code>string</code> |  | name of the image to label |
| [opacity] | <code>float</code> | <code>0.9</code> | opacity of keypoint |
| [fillColor] | <code>string</code> | <code>&quot;#8bad00&quot;</code> | keypoint color |
| [strokeWidth] | <code>number</code> | <code>1</code> | size of keypoint |

### Example
```html
<View>
  <KeyPoint name="kp-1" toName="img-1" strokeWidth="4" fillColor="red" />
  <Image name="img-1" value="$img" />
</View>
```
