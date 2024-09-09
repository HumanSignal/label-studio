---
title: Rectangle
type: tags
order: 421
meta_title: Rectangle Tag for Adding Rectangle Bounding Box to Images
meta_description: Customize Label Studio with the Rectangle tag to add rectangle bounding boxes to images for machine learning and data science projects.
---

The `Rectangle` tag is used to add a rectangle (Bounding Box) to an image without selecting a label. This can be useful when you have only one label to assign to a rectangle.

Use with the following data types: image.

### Parameters

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| name | <code>string</code> |  | Name of the element |
| toName | <code>string</code> |  | Name of the image to label |
| [opacity] | <code>float</code> | <code>0.6</code> | Opacity of rectangle |
| [fillColor] | <code>string</code> |  | Rectangle fill color in hexadecimal |
| [strokeColor] | <code>string</code> | <code>&quot;#f48a42&quot;</code> | Stroke color in hexadecimal |
| [strokeWidth] | <code>number</code> | <code>1</code> | Width of the stroke |
| [canRotate] | <code>boolean</code> | <code>true</code> | Whether to show or hide rotation control. Note that the anchor point in the results is different than the anchor point used when rotating with the rotation tool. For more information, see [Rotation](/templates/image_bbox#Rotation). |
| [smart] | <code>boolean</code> |  | Show smart tool for interactive pre-annotations |
| [smartOnly] | <code>boolean</code> |  | Only show smart tool for interactive pre-annotations |

### Example

Basic labeling configuration for adding rectangular bounding box regions to an image

```html
<View>
  <Rectangle name="rect-1" toName="img-1" />
  <Image name="img-1" value="$img" />
</View>
```
