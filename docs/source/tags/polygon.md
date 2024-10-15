---
title: Polygon
type: tags
order: 417
meta_title: Polygon Tag for Adding Polygons to Images
meta_description: Customize Label Studio with the Polygon tag by adding polygons to images for segmentation machine learning and data science projects.
---

The `Polygon` tag is used to add polygons to an image without selecting a label. This can be useful when you have only one label to assign to the polygon. Use for image segmentation tasks.

Use with the following data types: image.

### Parameters

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| name | <code>string</code> |  | Name of tag |
| toname | <code>string</code> |  | Name of image to label |
| [opacity] | <code>number</code> | <code>0.6</code> | Opacity of polygon |
| [fillColor] | <code>string</code> | <code>&quot;transparent&quot;</code> | Polygon fill color in hexadecimal or HTML color name |
| [strokeColor] | <code>string</code> | <code>&quot;#f48a42&quot;</code> | Stroke color in hexadecimal |
| [strokeWidth] | <code>number</code> | <code>3</code> | Width of stroke |
| [pointSize] | <code>small</code> \| <code>medium</code> \| <code>large</code> | <code>small</code> | Size of polygon handle points |
| [pointStyle] | <code>rectangle</code> \| <code>circle</code> | <code>circle</code> | Style of points |
| [smart] | <code>boolean</code> |  | Show smart tool for interactive pre-annotations |
| [smartOnly] | <code>boolean</code> |  | Only show smart tool for interactive pre-annotations |
| [snap] | <code>pixel</code> \| <code>none</code> | <code>none</code> | Snap polygon to image pixels |

### Example

Basic labeling configuration for polygonal image segmentation

```html
<View>
  <Polygon name="rect-1" toName="img-1" />
  <Image name="img-1" value="$img" />
</View>
```
