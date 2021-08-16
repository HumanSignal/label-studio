---
title: Polygon
type: tags
order: 414
meta_title: Polygon Tags for Adding Polygons to Images
meta_description: Label Studio Polygon Tags customize Label Studio for adding polygons to images for machine learning and data science projects.
---

Use the Polygon tag to add polygons to an image without selecting a label. It's useful when you have only one label.

### Parameters

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| name | <code>string</code> |  | Name of tag |
| toname | <code>string</code> |  | Name of image to label |
| [opacity] | <code>number</code> | <code>0.6</code> | Opacity of polygon |
| [fillColor] | <code>string</code> | <code>&quot;transparent&quot;</code> | Polygon fill color |
| [strokeColor] | <code>string</code> | <code>&quot;#f48a42&quot;</code> | Stroke color |
| [strokeWidth] | <code>number</code> | <code>3</code> | Width of stroke |
| [pointSize] | <code>small</code> \| <code>medium</code> \| <code>large</code> | <code>small</code> | Size of polygon handle points |
| [pointStyle] | <code>rectangle</code> \| <code>circle</code> | <code>circle</code> | Style of points |

### Example
```html
<View>
  <Polygon name="rect-1" toName="img-1" />
  <Image name="img-1" value="$img" />
</View>
```
