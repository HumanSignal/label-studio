---
title: Ellipse
type: tags
order: 406
meta_title: Ellipse Tag for Adding Elliptical Bounding Box to Images
meta_description: Customize Label Studio with ellipse tags to add elliptical bounding boxes to images for machine learning and data science projects.
---

Use the Ellipse tag to add an elliptical bounding box to an image. Use for bounding box image segmentation tasks with ellipses.

Use with the following data types: image

### Parameters

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| name | <code>string</code> |  | Name of the element |
| toName | <code>string</code> |  | Name of the image to label |
| [opacity] | <code>float</code> | <code>0.6</code> | Opacity of ellipse |
| [fillColor] | <code>string</code> |  | Ellipse fill color in hexadecimal |
| [strokeColor] | <code>string</code> | <code>&quot;#f48a42&quot;</code> | Stroke color in hexadecimal |
| [strokeWidth] | <code>number</code> | <code>1</code> | Width of the stroke |
| [canRotate] | <code>boolean</code> | <code>true</code> | Show or hide rotation control |
| [smart] | <code>boolean</code> |  | Show smart tool for interactive pre-annotations |
| [smartOnly] | <code>boolean</code> |  | Only show smart tool for interactive pre-annotations |

### Example
```html
<!--Basic image segmentation with ellipses labeling configuration-->
<View>
  <Ellipse name="ellipse1-1" toName="img-1" />
  <Image name="img-1" value="$img" />
</View>
```
