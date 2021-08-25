---
title: Rectangle
type: tags
order: 420
meta_title: Rectangle Tags for Adding Rectangle Bounding Box to Images
meta_description: Label Studio Rectangle Tags customize Label Studio for adding rectangle bounding boxes to images for machine learning and data science projects.
---

Rectangle is used to add rectangle (Bounding Box) to an image without label selection. It's useful when you have
only one label.

### Parameters

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| name | <code>string</code> |  | Name of the element |
| toName | <code>string</code> |  | Name of the image to label |
| [opacity] | <code>float</code> | <code>0.6</code> | Opacity of rectangle |
| [fillColor] | <code>string</code> |  | Rectangle fill color |
| [strokeColor] | <code>string</code> | <code>&quot;#f48a42&quot;</code> | Stroke color |
| [strokeWidth] | <code>number</code> | <code>1</code> | Width of the stroke |
| [canRotate] | <code>boolean</code> | <code>true</code> | Show or hide rotation control |

### Example
```html
<View>
  <Rectangle name="rect-1" toName="img-1" />
  <Image name="img-1" value="$img" />
</View>
```
