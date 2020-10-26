---
title: KeyPoint
type: tags
order: 407
---

KeyPoint is used to add a keypoint to an image without label selection. It's useful when you have only one label.

### Parameters

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| name | <code>string</code> |  | name of the element |
| toName | <code>string</code> |  | name of the image to label |
| [opacity] | <code>float</code> | <code>0.9</code> | opacity of keypoint |
| [fillColor] | <code>string</code> | <code>&quot;#8bad00&quot;</code> | keypoint fill color |
| [strokeWidth] | <code>number</code> | <code>1</code> | width of the stroke |
| [stokeColor] | <code>string</code> | <code>&quot;#8bad00&quot;</code> | keypoint stroke color |

### Example
```html
<View>
  <KeyPoint name="kp-1" toName="img-1" />
  <Image name="img-1" value="$img" />
</View>
```
