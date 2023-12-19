---
title: Cube
type: tags
order: 405
is_new: t
meta_title: Cube Tag for Adding Cube Bounding Box to Images
meta_description: Customize Label Studio with the Cube tag to add Cube bounding boxes to images for machine learning and data science projects.
---

The `Cube` tag is used to add a Cube (Bounding Box) to an image without selecting a label. This can be useful when you have only one label to assign to a Cube.

Use with the following data types: image.

### Parameters

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| name | <code>string</code> |  | Name of the element |
| toName | <code>string</code> |  | Name of the image to label |
| [opacity] | <code>float</code> | <code>0.6</code> | Opacity of Cube |
| [fillColor] | <code>string</code> |  | Cube fill color in hexadecimal |
| [strokeColor] | <code>string</code> | <code>&quot;#f48a42&quot;</code> | Stroke color in hexadecimal |
| [strokeWidth] | <code>number</code> | <code>1</code> | Width of the stroke |
| [canRotate] | <code>boolean</code> | <code>true</code> | Whether to show or hide rotation control |
| [smart] | <code>boolean</code> |  | Show smart tool for interactive pre-annotations |
| [smartOnly] | <code>boolean</code> |  | Only show smart tool for interactive pre-annotations |

### Example

Basic labeling configuration for adding rectangular bounding box regions to an image

```html
<View>
  <Cube name="rect-1" toName="img-1" />
  <Image name="img-1" value="$img" />
</View>
```
