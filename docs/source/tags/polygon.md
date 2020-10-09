---
title: Polygon
type: tags
order: 413
---

Polygon is used to add polygons to an image without label selection. It's useful when you have only one label.

### Parameters

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| name | <code>string</code> |  | name of tag |
| toname | <code>string</code> |  | name of image to label |
| [opacity] | <code>number</code> | <code>0.6</code> | opacity of polygon |
| [fillColor] | <code>string</code> |  | rectangle fill color, default is transparent |
| [strokeColor] | <code>string</code> |  | stroke color |
| [strokeWidth] | <code>number</code> | <code>1</code> | width of stroke |
| [pointSize] | <code>small</code> \| <code>medium</code> \| <code>large</code> | <code>medium</code> | size of polygon handle points |
| [pointStyle] | <code>rectangle</code> \| <code>circle</code> | <code>circle</code> | style of points |

### Example
```html
<View>
  <Polygon name="rect-1" toName="img-1" />
  <Image name="img-1" value="$img" />
</View>
```
