---
title: Ellipse
type: tags
order: 404
meta_title: Ellipse Tags for Adding Elliptical Bounding Box to Images
meta_description: Label Studio Ellipse Tags customize Label Studio to add elliptical bounding boxes to images for machine learning and data science projects.
---

Ellipse
Ellipse is used to add ellipse (elliptical Bounding Box) to an image

### Parameters

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| name | <code>string</code> |  | Name of the element |
| toName | <code>string</code> |  | Name of the image to label |
| [opacity] | <code>float</code> | <code>0.6</code> | Opacity of ellipse |
| [fillColor] | <code>string</code> |  | Ellipse fill color |
| [strokeColor] | <code>string</code> | <code>&quot;#f48a42&quot;</code> | Stroke color in hexadecimal |
| [strokeWidth] | <code>number</code> | <code>1</code> | Width of the stroke |
| [canRotate] | <code>boolean</code> | <code>true</code> | Show or hide rotation control |

### Example
```html
<View>
  <Ellipse name="ellipse1-1" toName="img-1" />
  <Image name="img-1" value="$img" />
</View>
```
