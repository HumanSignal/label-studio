---
title: RectangleLabels
type: tags
order: 420
---

RectangleLabels tag creates labeled rectangles
Used only for Image

### Parameters

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| name | <code>string</code> |  | name of the element |
| toName | <code>string</code> |  | name of the image to label |
| [opacity] | <code>float</code> | <code>0.6</code> | opacity of rectangle |
| [fillColor] | <code>string</code> |  | rectangle fill color, default is transparent |
| [strokeColor] | <code>string</code> |  | stroke color |
| [strokeWidth] | <code>number</code> | <code>1</code> | width of stroke |
| [canRotate] | <code>boolean</code> | <code>true</code> | show or hide rotation handle |

### Example
```html
<View>
  <RectangleLabels name="labels" toName="image">
    <Label value="Person" />
    <Label value="Animal" />
  </RectangleLabels>
  <Image name="image" value="$image" />
</View>
```
