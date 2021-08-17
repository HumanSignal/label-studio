---
title: PolygonLabels
type: tags
order: 415
meta_title: Polygon Label Tags for Labeling Polygons in Images
meta_description: Label Studio Polygon Label Tags customize Label Studio for labeling polygons in images for machine learning and data science projects.
---

PolygonLabels tag, create labeled polygons

### Parameters

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| name | <code>string</code> |  | Name of tag |
| toName | <code>string</code> |  | Name of image to label |
| [choice] | <code>single</code> \| <code>multiple</code> | <code>single</code> | Configure whether you can select one or multiple labels |
| [maxUsages] | <code>number</code> |  | Maximum available uses of the label |
| [showInline] | <code>boolean</code> | <code>true</code> | Show items in the same visual line |
| [opacity] | <code>number</code> | <code>0.2</code> | Opacity of polygon |
| [fillColor] | <code>string</code> |  | Polygon fill color |
| [strokeColor] | <code>string</code> |  | Stroke color |
| [strokeWidth] | <code>number</code> | <code>1</code> | Width of stroke |
| [pointSize] | <code>small</code> \| <code>medium</code> \| <code>large</code> | <code>medium</code> | Size of polygon handle points |
| [pointStyle] | <code>rectangle</code> \| <code>circle</code> | <code>rectangle</code> | Style of points |

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
