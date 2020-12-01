---
title: PolygonLabels
type: tags
order: 416
---

PolygonLabels tag, create labeled polygons

### Parameters

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| name | <code>string</code> |  | name of tag |
| toName | <code>string</code> |  | name of image to label |
| [opacity] | <code>number</code> | <code>0.6</code> | opacity of polygon |
| [fillColor] | <code>string</code> |  | rectangle fill color, default is transparent |
| [strokeColor] | <code>string</code> |  | stroke color |
| [strokeWidth] | <code>number</code> | <code>1</code> | width of stroke |
| [pointSize] | <code>small</code> \| <code>medium</code> \| <code>large</code> | <code>medium</code> | size of polygon handle points |
| [pointStyle] | <code>rectangle</code> \| <code>circle</code> | <code>rectangle</code> | style of points |

### Example
```html
<View>
  <Image name="image" value="$image" />
  <PolygonLabels name="lables" toName="image">
    <Label value="Car" />
    <Label value="Sign" />
  </PolygonLabels>
</View>
```
