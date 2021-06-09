---
title: Rectangle
type: tags
order: 418
meta_title: Rectangle Label Tags to Label Rectangle Bounding Box in Images
meta_description: Label Studio Rectangle Label Tags customize Label Studio to label rectangle bounding boxes in images for machine learning and data science projects.
---

Rectangle is used to add rectangle (Bounding Box) to an image without label selection. It's useful when you have
only one label.

### Parameters

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| name | <code>string</code> |  | name of the element |
| toName | <code>string</code> |  | name of the image to label |
| [opacity] | <code>float</code> | <code>0.6</code> | opacity of rectangle |
| [fillColor] | <code>string</code> |  | rectangle fill color, default is transparent |
| [strokeColor] | <code>string</code> | <code>&quot;#f48a42&quot;</code> | stroke color |
| [strokeWidth] | <code>number</code> | <code>1</code> | width of the stroke |
| [canRotate] | <code>boolean</code> | <code>true</code> | show or hide rotation handle |

### Example
```html
<View>
  <Rectangle name="rect-1" toName="img-1" />
  <Image name="img-1" value="$img" />
</View>
```
